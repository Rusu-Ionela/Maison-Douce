const express = require("express");
const rateLimit = require("express-rate-limit");
const Utilizator = require("../models/Utilizator");
const { authRequired } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const { signAuthToken } = require("../utils/jwt");
const { hashResetToken } = require("../utils/resetTokens");
const {
  fail,
  readArray,
  readBoolean,
  readEmail,
  readEnum,
  readObject,
  readString,
} = require("../utils/validation");
const {
  getDefaultProvider,
  listPublicProviders,
} = require("../utils/providerDirectory");
const {
  isProviderRole,
  normalizeUserRole,
} = require("../utils/roles");
const { isProductionEnv } = require("../utils/runtime");

const router = express.Router();
const isTestEnv = process.env.NODE_ENV === "test";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 5000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 5000 : 12,
  standardHeaders: true,
  legacyHeaders: false,
});

const securityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 5000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
});

function createToken(user) {
  return signAuthToken(user);
}

function hasOwnField(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function normalizeRequestedRole(rawRole) {
  return normalizeUserRole(rawRole || "client");
}

function serializeUser(user) {
  const normalizedRole = normalizeUserRole(user.rol || user.role);
  return {
    id: user._id,
    nume: user.nume,
    prenume: user.prenume || "",
    email: user.email,
    rol: normalizedRole,
    activ: user.activ !== false,
    deactivatedAt: user.deactivatedAt || null,
    lastPasswordChangeAt: user.lastPasswordChangeAt || null,
    telefon: user.telefon || "",
    adresa: user.adresa || "",
    preferinte: user.preferinte || {},
    adreseSalvate: user.adreseSalvate || [],
    setariNotificari: user.setariNotificari || {},
    providerProfile: isProviderRole(normalizedRole)
      ? {
          displayName: user.providerProfile?.displayName || "",
          slug: user.providerProfile?.slug || "",
          bio: user.providerProfile?.bio || "",
          isPublic: user.providerProfile?.isPublic !== false,
          isDefaultProvider: Boolean(user.providerProfile?.isDefaultProvider),
          acceptsOrders: user.providerProfile?.acceptsOrders !== false,
        }
      : undefined,
  };
}

function parseSavedAddress(item, index) {
  const field = `adreseSalvate[${index}]`;
  const address = readObject(item, {
    field,
    required: true,
  });

  return {
    label: readString(address.label, {
      field: `${field}.label`,
      max: 60,
      defaultValue: "Acasa",
    }) || "Acasa",
    address: readString(address.address, {
      field: `${field}.address`,
      required: true,
      min: 5,
      max: 255,
    }),
    isDefault: readBoolean(address.isDefault, {
      field: `${field}.isDefault`,
      defaultValue: false,
    }),
  };
}

function parseStringList(value, field, maxItems = 20) {
  const list = readArray(value, {
    field,
    maxItems,
    defaultValue: undefined,
    parser: (item, index) =>
      readString(item, {
        field: `${field}[${index}]`,
        max: 80,
        defaultValue: "",
      }),
  });

  if (!list) {
    return undefined;
  }

  return list.filter(Boolean);
}

function parsePreferences(value) {
  const preferences = readObject(value, {
    field: "preferinte",
    defaultValue: undefined,
  });
  if (!preferences) {
    return undefined;
  }

  return {
    alergii: parseStringList(preferences.alergii, "preferinte.alergii", 50) || [],
    evit: parseStringList(preferences.evit, "preferinte.evit", 50) || [],
    note: readString(preferences.note, {
      field: "preferinte.note",
      max: 500,
      defaultValue: "",
    }),
  };
}

function parseNotificationSettings(value) {
  const settings = readObject(value, {
    field: "setariNotificari",
    defaultValue: undefined,
  });
  if (!settings) {
    return undefined;
  }

  const parsed = {};

  if (hasOwnField(settings, "email")) {
    parsed.email = readBoolean(settings.email, {
      field: "setariNotificari.email",
      required: true,
    });
  }
  if (hasOwnField(settings, "inApp")) {
    parsed.inApp = readBoolean(settings.inApp, {
      field: "setariNotificari.inApp",
      required: true,
    });
  }
  if (hasOwnField(settings, "push")) {
    parsed.push = readBoolean(settings.push, {
      field: "setariNotificari.push",
      required: true,
    });
  }

  return parsed;
}

router.post(
  "/register",
  authLimiter,
  withValidation((req) => ({
    nume: readString(req.body?.nume, {
      field: "nume",
      required: true,
      min: 2,
      max: 120,
    }),
    prenume: readString(req.body?.prenume, {
      field: "prenume",
      max: 120,
      defaultValue: "",
    }),
    email: readEmail(req.body?.email, {
      field: "email",
      required: true,
      max: 160,
    }),
    parola: readString(req.body?.parola || req.body?.password, {
      field: "parola",
      required: true,
      min: 8,
      max: 200,
    }),
    rol: readEnum(req.body?.rol || req.body?.role || "client", [
      "client",
      "admin",
      "patiser",
      "prestator",
    ], {
      field: "rol",
      defaultValue: "client",
    }),
    inviteCode: readString(req.body?.inviteCode, {
      field: "inviteCode",
      max: 120,
      defaultValue: "",
    }),
    telefon: readString(req.body?.telefon, {
      field: "telefon",
      max: 40,
      defaultValue: "",
    }),
    adresa: readString(req.body?.adresa, {
      field: "adresa",
      max: 255,
      defaultValue: "",
    }),
  }), async (req, res) => {
    try {
      const {
        nume,
        prenume,
        email,
        parola,
        rol,
        inviteCode,
        telefon,
        adresa,
      } = req.validated;

      const requestedRole = normalizeRequestedRole(rol);
      if (requestedRole === "admin") {
        return res.status(403).json({
          message: "Rolul admin nu poate fi creat prin inregistrare publica.",
        });
      }
      if (!["client", "patiser"].includes(requestedRole)) {
        return res.status(400).json({ message: "Rol invalid pentru inregistrare." });
      }

      if (requestedRole === "patiser") {
        const requiredCode = process.env.PATISER_INVITE_CODE || "PATISER-INVITE";
        if (inviteCode !== requiredCode) {
          return res.status(403).json({
            message: "Cod invitatie invalid.",
            hint: isProductionEnv()
              ? "Solicita codul de invitatie de la administrator."
              : `In mediul local, codul activ este ${requiredCode}.`,
          });
        }
      }

      const existing = await Utilizator.findOne({ email });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Exista deja un cont cu acest email." });
      }

      const user = new Utilizator({
        nume,
        prenume,
        email,
        rol: requestedRole,
        telefon,
        adresa,
      });
      await user.setPassword(parola);
      await user.save();

      const token = createToken(user);
      res.status(201).json({
        token,
        user: serializeUser(user),
      });
    } catch (e) {
      console.error("register error:", e.message);
      res.status(500).json({ message: "Eroare server la inregistrare." });
    }
  })
);

router.post(
  "/login",
  authLimiter,
  withValidation((req) => ({
    email: readEmail(req.body?.email, {
      field: "email",
      required: true,
      max: 160,
    }),
    parola: readString(req.body?.parola || req.body?.password, {
      field: "parola",
      required: true,
      min: 1,
      max: 200,
    }),
  }), async (req, res) => {
    try {
      const { email, parola } = req.validated;

      const user = await Utilizator.findOne({ email }).select("+parolaHash +parola");
      if (!user) {
        return res.status(401).json({ message: "Email sau parola gresite" });
      }
      if (user.activ === false) {
        return res.status(403).json({ message: "Contul este dezactivat." });
      }

      const ok = await user.comparePassword(parola);
      if (!ok) {
        return res.status(401).json({ message: "Email sau parola gresite" });
      }

      const token = createToken(user);
      res.json({
        token,
        user: serializeUser(user),
      });
    } catch (e) {
      console.error("login error:", e.message);
      res.status(500).json({ message: "Eroare server la login" });
    }
  })
);

router.get("/providers", async (_req, res) => {
  try {
    const items = await listPublicProviders();
    const defaultProvider = await getDefaultProvider();
    res.json({
      items,
      defaultProviderId: defaultProvider?.id || "",
    });
  } catch (e) {
    console.error("/providers error:", e.message);
    res.status(500).json({ message: "Nu am putut incarca lista de prestatori." });
  }
});

router.get("/provider-invite-info", (_req, res) => {
  const configuredCode = String(process.env.PATISER_INVITE_CODE || "").trim();
  const activeCode = configuredCode || "PATISER-INVITE";
  const production = isProductionEnv();

  res.json({
    inviteRequired: true,
    message: production
      ? "Codul de invitatie pentru patiser este oferit de administratorul Maison-Douce."
      : "In mediul local poti folosi codul de test pentru a crea un cont de patiser.",
    code: production ? "" : activeCode,
    source: configuredCode ? "env" : "default",
  });
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const user = await Utilizator.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(404).json({ message: "Utilizator inexistent" });
    }

    res.json(serializeUser(user));
  } catch (e) {
    console.error("/me error:", e.message);
    res.status(500).json({ message: "Eroare server" });
  }
});

router.put(
  "/me",
  authRequired,
  withValidation((req) => ({
    nume: readString(req.body?.nume, {
      field: "nume",
      min: 2,
      max: 120,
      defaultValue: undefined,
    }),
    prenume: readString(req.body?.prenume, {
      field: "prenume",
      max: 120,
      defaultValue: undefined,
    }),
    telefon: readString(req.body?.telefon, {
      field: "telefon",
      max: 40,
      defaultValue: undefined,
    }),
    adresa: readString(req.body?.adresa, {
      field: "adresa",
      max: 255,
      defaultValue: undefined,
    }),
    adreseSalvate: readArray(req.body?.adreseSalvate, {
      field: "adreseSalvate",
      maxItems: 10,
      defaultValue: undefined,
      parser: parseSavedAddress,
    }),
    preferinte: parsePreferences(req.body?.preferinte),
    setariNotificari: parseNotificationSettings(req.body?.setariNotificari),
  }), async (req, res) => {
    try {
      const user = await Utilizator.findById(req.user.id || req.user._id);
      if (!user) {
        return res.status(404).json({ message: "Utilizator inexistent" });
      }

      if (hasOwnField(req.body, "nume")) user.nume = req.validated.nume;
      if (hasOwnField(req.body, "prenume")) user.prenume = req.validated.prenume;
      if (hasOwnField(req.body, "telefon")) user.telefon = req.validated.telefon;
      if (hasOwnField(req.body, "adresa")) user.adresa = req.validated.adresa;
      if (hasOwnField(req.body, "adreseSalvate")) {
        const addresses = req.validated.adreseSalvate || [];
        const defaultsCount = addresses.filter((item) => item.isDefault).length;
        if (defaultsCount > 1) {
          fail("adreseSalvate can have only one default address", "adreseSalvate");
        }
        user.adreseSalvate = addresses;
      }
      if (hasOwnField(req.body, "preferinte")) {
        user.preferinte = req.validated.preferinte || {
          alergii: [],
          evit: [],
          note: "",
        };
      }
      if (hasOwnField(req.body, "setariNotificari")) {
        user.setariNotificari = {
          ...(user.setariNotificari || {}),
          ...(req.validated.setariNotificari || {}),
        };
      }

      await user.save();

      res.json({
        ok: true,
        user: serializeUser(user),
      });
    } catch (e) {
      console.error("/me update error:", e.message);
      res.status(500).json({ message: "Eroare server la actualizare profil." });
    }
  })
);

router.post(
  "/me/change-password",
  authRequired,
  securityLimiter,
  withValidation((req) => ({
    currentPassword: readString(req.body?.currentPassword, {
      field: "currentPassword",
      required: true,
      min: 1,
      max: 200,
    }),
    newPassword: readString(req.body?.newPassword, {
      field: "newPassword",
      required: true,
      min: 8,
      max: 200,
    }),
  }), async (req, res) => {
    try {
      const user = await Utilizator.findById(req.user.id || req.user._id).select("+parolaHash +parola");
      if (!user) {
        return res.status(404).json({ message: "Utilizator inexistent" });
      }
      if (user.activ === false) {
        return res.status(403).json({ message: "Contul este dezactivat." });
      }

      const { currentPassword, newPassword } = req.validated;
      const ok = await user.comparePassword(currentPassword);
      if (!ok) {
        return res.status(401).json({ message: "Parola curenta este incorecta." });
      }
      if (currentPassword === newPassword) {
        return res.status(409).json({
          message: "Noua parola trebuie sa fie diferita de parola curenta.",
        });
      }

      await user.setPassword(newPassword);
      user.resetToken = "";
      user.resetTokenExp = undefined;
      await user.save();

      res.json({
        ok: true,
        message: "Parola a fost schimbata cu succes.",
        user: serializeUser(user),
      });
    } catch (e) {
      console.error("change-password error:", e.message);
      res.status(500).json({ message: "Eroare server la schimbare parola." });
    }
  })
);

router.post(
  "/me/deactivate",
  authRequired,
  securityLimiter,
  withValidation((req) => ({
    currentPassword: readString(req.body?.currentPassword, {
      field: "currentPassword",
      required: true,
      min: 1,
      max: 200,
    }),
    reason: readString(req.body?.reason, {
      field: "reason",
      max: 500,
      defaultValue: "",
    }),
  }), async (req, res) => {
    try {
      const user = await Utilizator.findById(req.user.id || req.user._id).select("+parolaHash +parola");
      if (!user) {
        return res.status(404).json({ message: "Utilizator inexistent" });
      }
      if (user.activ === false) {
        return res.status(409).json({ message: "Contul este deja dezactivat." });
      }

      const ok = await user.comparePassword(req.validated.currentPassword);
      if (!ok) {
        return res.status(401).json({ message: "Parola curenta este incorecta." });
      }

      user.activ = false;
      user.deactivatedAt = new Date();
      user.resetToken = "";
      user.resetTokenExp = undefined;
      user.setariNotificari = {
        email: false,
        inApp: false,
        push: false,
      };
      if (req.validated.reason) {
        user.preferinte = {
          ...(user.preferinte || {}),
          note: [user.preferinte?.note || "", `Dezactivare cont: ${req.validated.reason}`]
            .filter(Boolean)
            .join("\n"),
        };
      }
      await user.save();

      res.json({
        ok: true,
        message: "Contul a fost dezactivat.",
      });
    } catch (e) {
      console.error("deactivate-account error:", e.message);
      res.status(500).json({ message: "Eroare server la dezactivare cont." });
    }
  })
);

router.post(
  "/reset-password",
  resetLimiter,
  withValidation((req) => ({
    token: readString(req.body?.token, {
      field: "token",
      required: true,
      min: 32,
      max: 256,
    }),
    newPassword: readString(req.body?.newPassword, {
      field: "newPassword",
      required: true,
      min: 8,
      max: 200,
    }),
  }), async (req, res) => {
    try {
      const { token, newPassword } = req.validated;

      const hashedToken = hashResetToken(token);
      const user = await Utilizator.findOne({
        resetToken: hashedToken,
        resetTokenExp: { $gt: new Date() },
      }).select("+parolaHash +parola");

      if (!user) {
        return res
          .status(400)
          .json({ message: "Linkul de resetare este invalid sau expirat." });
      }
      if (user.activ === false) {
        return res.status(403).json({ message: "Contul este dezactivat." });
      }

      await user.setPassword(newPassword);
      user.resetToken = "";
      user.resetTokenExp = undefined;
      await user.save();

      res.json({
        ok: true,
        message: "Parola a fost resetata cu succes.",
      });
    } catch (e) {
      console.error("reset-password error:", e.message);
      res.status(500).json({ message: "Eroare server la resetare parola" });
    }
  })
);

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

module.exports = router;
