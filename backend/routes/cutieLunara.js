const express = require("express");
const router = express.Router();
const { authRequired, roleCheck } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const CutieLunara = require("../models/CutieLunara");
const Comanda = require("../models/Comanda");
const { recordAuditLog } = require("../utils/audit");
const { createLogger, serializeError } = require("../utils/log");
const { notifyUser } = require("../utils/notifications");
const {
  normalizePlan,
  getPlanPrice,
  isPaidOrder,
  isSubscriptionOrder,
  activateCutieFromComanda,
} = require("../utils/subscriptions");
const {
  fail,
  readMongoId,
  readString,
} = require("../utils/validation");

const subscriptionLog = createLogger("subscriptions");

function isStaff(role) {
  return ["admin", "patiser", "prestator"].includes(String(role || ""));
}

function getAuthUserId(req) {
  return String(req.user?.id || req.user?._id || "");
}

function getRole(req) {
  return String(req.user?.rol || req.user?.role || "");
}

function getPlanLabel(plan) {
  switch (plan) {
    case "premium":
      return "Premium";
    case "deluxe":
      return "Deluxe";
    default:
      return "Basic";
  }
}

function buildPlanName(plan) {
  return `Abonament cutie lunara - ${getPlanLabel(plan)}`;
}

function formatSubscription(abonament) {
  if (!abonament) return null;
  const doc = abonament.toObject ? abonament.toObject() : { ...abonament };
  return {
    ...doc,
    status: doc.activ ? "active" : "inactive",
    currentPlanLabel: getPlanLabel(doc.plan),
    pendingPlanLabel: doc.pendingPlan ? getPlanLabel(doc.pendingPlan) : "",
    hasPendingCheckout: Boolean(doc.pendingOrderId),
  };
}

function buildSubscriptionOrderPayload(plan, preferinte, pretLunar) {
  return {
    items: [
      {
        productId: `abonament-${plan}`,
        name: buildPlanName(plan),
        qty: 1,
        price: pretLunar,
        lineTotal: pretLunar,
      },
    ],
    subtotal: pretLunar,
    taxaLivrare: 0,
    total: pretLunar,
    totalFinal: pretLunar,
    metodaLivrare: "ridicare",
    status: "plasata",
    statusPlata: "unpaid",
    paymentStatus: "unpaid",
    statusHistory: [{ status: "plasata", note: "Comanda abonament creata" }],
    stripePaymentId: "",
    tip: "abonament_cutie",
    customDetails: {
      plan,
      preferinte,
    },
    notesClient: preferinte || "",
  };
}

function isPendingSubscriptionOrder(comanda) {
  return Boolean(
    comanda &&
      isSubscriptionOrder(comanda) &&
      !isPaidOrder(comanda) &&
      ["plasata", "in_asteptare", "confirmata", "inregistrata"].includes(
        String(comanda.status || "plasata")
      )
  );
}

async function resolvePendingOrder(abonament) {
  if (!abonament?.pendingOrderId) {
    return null;
  }

  const comanda = await Comanda.findById(abonament.pendingOrderId);
  if (!isPendingSubscriptionOrder(comanda)) {
    return null;
  }

  return comanda;
}

async function upsertPendingOrder({ abonament, clientId, plan, preferinte, pretLunar }) {
  const existingPendingOrder = await resolvePendingOrder(abonament);
  if (existingPendingOrder) {
    Object.assign(
      existingPendingOrder,
      buildSubscriptionOrderPayload(plan, preferinte, pretLunar)
    );
    existingPendingOrder.clientId = clientId;
    await existingPendingOrder.save();
    return { comanda: existingPendingOrder, reused: true };
  }

  const comanda = await Comanda.create({
    clientId,
    ...buildSubscriptionOrderPayload(plan, preferinte, pretLunar),
  });
  return { comanda, reused: false };
}

async function findAuthorizedSubscription(req, subscriptionId) {
  const abonament = await CutieLunara.findById(subscriptionId);
  if (!abonament) {
    return { status: 404, message: "Abonament inexistent", abonament: null };
  }

  const staff = isStaff(getRole(req));
  if (!staff && String(abonament.clientId) !== getAuthUserId(req)) {
    return {
      status: 403,
      message: "Nu ai dreptul sa modifici acest abonament",
      abonament: null,
    };
  }

  return { status: 200, abonament };
}

function canResumeSubscription(abonament) {
  return abonament?.statusPlata === "paid" || Boolean(abonament?.ultimaPlataLa);
}

async function maybeNotifySubscriptionOwner(req, abonament, message, link = "/abonament") {
  const actorId = getAuthUserId(req);
  if (!abonament?.clientId || String(abonament.clientId) === actorId) {
    return;
  }

  await notifyUser(abonament.clientId, {
    titlu: "Abonament actualizat",
    mesaj: message,
    tip: "abonament",
    link,
  });
}

function parsePlan(rawPlan, { required = false } = {}) {
  const value = readString(rawPlan, {
    field: "plan",
    required,
    trim: true,
    lowercase: true,
    defaultValue: "",
  });
  if (!value && !required) return "";

  const normalized = normalizePlan(value);
  if (!normalized) {
    fail("plan is invalid", "plan");
  }
  return normalized;
}

// POST /api/cutie-lunara
// Manual activation (admin/patiser) - keeps backward compatibility for internal use.
router.post(
  "/",
  authRequired,
  roleCheck("admin", "patiser"),
  withValidation((req) => ({
    plan: parsePlan(req.body?.plan || "basic", { required: true }),
    preferinte: readString(req.body?.preferinte, {
      field: "preferinte",
      max: 500,
      defaultValue: "",
    }),
    clientId: readMongoId(req.body?.clientId, {
      field: "clientId",
      defaultValue: "",
    }),
  }), async (req, res) => {
    try {
      const { plan, preferinte, clientId } = req.validated;
      const effectiveClientId = clientId || getAuthUserId(req);
      if (!effectiveClientId) {
        return res.status(400).json({ message: "clientId lipsa." });
      }

      const pretLunar = getPlanPrice(plan) || 0;
      const abon = await CutieLunara.findOneAndUpdate(
        { clientId: effectiveClientId },
        {
          $set: {
            plan,
            preferinte,
            activ: true,
            pretLunar,
            statusPlata: "paid",
            pendingOrderId: null,
            pendingPreferinte: "",
            ultimaPlataLa: new Date(),
          },
          $unset: {
            pendingPlan: 1,
          },
          $setOnInsert: { dataActivare: new Date() },
        },
        { upsert: true, new: true, runValidators: true }
      );

      if (!abon.dataActivare) {
        abon.dataActivare = new Date();
        await abon.save();
      }

      await recordAuditLog(req, {
        action: "subscription.manual_activated",
        entityType: "subscription",
        entityId: abon._id,
        summary: `Abonamentul clientului ${effectiveClientId} a fost activat manual.`,
        metadata: {
          plan,
          clientId: effectiveClientId,
        },
      });

      res.json({ ok: true, abonament: formatSubscription(abon) });
    } catch (error) {
      subscriptionLog.error("manual_activation_failed", {
        requestId: req.id,
        error: serializeError(error),
      });
      res.status(500).json({ ok: false, message: error.message || "Eroare server" });
    }
  })
);

// POST /api/cutie-lunara/checkout
// Creates or updates the pending checkout used to activate a new subscription
// or to switch plan for an already active one.
router.post(
  "/checkout",
  authRequired,
  withValidation((req) => ({
    plan: parsePlan(req.body?.plan, { required: true }),
    preferinte: readString(req.body?.preferinte, {
      field: "preferinte",
      max: 500,
      defaultValue: "",
    }),
  }), async (req, res) => {
    try {
      const { plan, preferinte } = req.validated;
      const clientId = getAuthUserId(req);

      if (!clientId) {
        return res.status(401).json({ message: "Utilizator neautentificat." });
      }

      const pretLunar = getPlanPrice(plan) || 0;
      if (pretLunar <= 0) {
        return res.status(400).json({ message: "Pret invalid pentru plan." });
      }

      let abonament = await CutieLunara.findOne({ clientId });
      if (
        abonament?.activ &&
        abonament.plan === plan &&
        String(abonament.preferinte || "") === preferinte &&
        !abonament.pendingOrderId
      ) {
        return res.status(409).json({
          message: "Abonamentul este deja activ pe acest plan. Poti doar actualiza preferintele.",
        });
      }

      const { comanda, reused } = await upsertPendingOrder({
        abonament,
        clientId,
        plan,
        preferinte,
        pretLunar,
      });

      if (!abonament) {
        abonament = new CutieLunara({
          clientId,
          plan,
          preferinte,
          activ: false,
          pretLunar,
          statusPlata: "pending",
          pendingOrderId: comanda._id,
          ultimaComandaId: comanda._id,
        });
      } else if (abonament.activ) {
        abonament.pendingPlan = plan;
        abonament.pendingPreferinte = preferinte;
        abonament.pendingOrderId = comanda._id;
        abonament.ultimaComandaId = comanda._id;
      } else {
        abonament.plan = plan;
        abonament.preferinte = preferinte;
        abonament.activ = false;
        abonament.pretLunar = pretLunar;
        abonament.statusPlata = "pending";
        abonament.pendingOrderId = comanda._id;
        abonament.pendingPlan = undefined;
        abonament.pendingPreferinte = "";
        abonament.ultimaComandaId = comanda._id;
      }

      await abonament.save();

      const changingActivePlan = Boolean(abonament.activ && abonament.pendingPlan);
      await notifyUser(clientId, {
        titlu: changingActivePlan
          ? "Checkout schimbare plan creat"
          : "Comanda abonament creata",
        mesaj: changingActivePlan
          ? `Finalizeaza plata pentru schimbarea la planul ${getPlanLabel(plan)}.`
          : `Finalizeaza plata pentru ${buildPlanName(plan)}.`,
        tip: "abonament",
        link: `/plata?comandaId=${comanda._id}`,
      });

      res.status(reused ? 200 : 201).json({
        ok: true,
        comandaId: comanda._id,
        total: pretLunar,
        plan,
        reused,
        mode: changingActivePlan ? "change_pending" : "activation_pending",
        abonament: formatSubscription(abonament),
      });
    } catch (error) {
      subscriptionLog.error("checkout_failed", {
        requestId: req.id,
        error: serializeError(error),
      });
      res.status(500).json({ ok: false, message: error.message || "Eroare server" });
    }
  })
);

// POST /api/cutie-lunara/activate-from-order/:comandaId
router.post(
  "/activate-from-order/:comandaId",
  authRequired,
  withValidation((req) => ({
    comandaId: readMongoId(req.params?.comandaId, {
      field: "comandaId",
      required: true,
    }),
  }), async (req, res) => {
    try {
      const comanda = await Comanda.findById(req.validated.comandaId);
      if (!comanda) {
        return res.status(404).json({ message: "Comanda inexistenta." });
      }

      const staff = isStaff(getRole(req));
      const authUserId = getAuthUserId(req);
      if (!staff && String(comanda.clientId || "") !== authUserId) {
        return res.status(403).json({ message: "Nu ai acces la aceasta comanda." });
      }

      if (!isSubscriptionOrder(comanda)) {
        return res.status(400).json({ message: "Comanda nu este de tip abonament." });
      }
      if (!isPaidOrder(comanda)) {
        return res.status(409).json({ message: "Abonamentul poate fi activat doar dupa plata." });
      }

      const previousSubscription = await CutieLunara.findOne({
        clientId: comanda.clientId,
      }).lean();
      const hadPendingChange = Boolean(previousSubscription?.pendingOrderId);

      const result = await activateCutieFromComanda(comanda);
      if (!result?.abonament) {
        return res.status(400).json({ message: "Nu am putut activa abonamentul." });
      }

      if (hadPendingChange) {
        await notifyUser(comanda.clientId, {
          titlu: "Plan abonament actualizat",
          mesaj: `Abonamentul a fost actualizat la planul ${buildPlanName(result.abonament.plan)}.`,
          tip: "abonament",
          link: "/abonament",
        });
      } else if (!result.wasAlreadyActive) {
        await notifyUser(comanda.clientId, {
          titlu: "Abonament activat",
          mesaj: `Abonamentul ${buildPlanName(result.abonament.plan)} este acum activ.`,
          tip: "abonament",
          link: "/abonament",
        });
      }

      res.json({ ok: true, abonament: formatSubscription(result.abonament) });
    } catch (error) {
      subscriptionLog.error("activation_failed", {
        requestId: req.id,
        error: serializeError(error),
      });
      res.status(500).json({
        message: error.message || "Eroare la activarea abonamentului.",
      });
    }
  })
);

// GET /api/cutie-lunara/me
router.get("/me", authRequired, async (req, res) => {
  try {
    const abon = await CutieLunara.findOne({ clientId: getAuthUserId(req) }).lean();
    res.json({ abonament: formatSubscription(abon) });
  } catch (error) {
    subscriptionLog.error("load_me_failed", {
      requestId: req.id,
      error: serializeError(error),
    });
    res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/cutie-lunara
router.get("/", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const list = await CutieLunara.find()
      .populate("clientId", "nume email rol role")
      .sort({ updatedAt: -1 })
      .lean();
    res.json(list.map((item) => formatSubscription(item)));
  } catch (error) {
    subscriptionLog.error("list_failed", {
      requestId: req.id,
      error: serializeError(error),
    });
    res.status(500).json({ ok: false, message: error.message });
  }
});

// PATCH /api/cutie-lunara/:id
router.patch(
  "/:id",
  authRequired,
  withValidation((req) => ({
    id: readMongoId(req.params?.id, { field: "id", required: true }),
    plan: Object.prototype.hasOwnProperty.call(req.body || {}, "plan")
      ? parsePlan(req.body?.plan, { required: true })
      : "",
    preferinte: Object.prototype.hasOwnProperty.call(req.body || {}, "preferinte")
      ? readString(req.body?.preferinte, {
          field: "preferinte",
          max: 500,
          defaultValue: "",
        })
      : undefined,
  }), async (req, res) => {
    try {
      const access = await findAuthorizedSubscription(req, req.validated.id);
      if (!access.abonament) {
        return res.status(access.status).json({ message: access.message });
      }

      const abonament = access.abonament;
      const staff = isStaff(getRole(req));
      const hasPlan = Boolean(req.validated.plan);
      const hasPreferinte = typeof req.validated.preferinte === "string";

      if (!hasPlan && !hasPreferinte) {
        return res.status(400).json({ message: "Nu exista campuri de actualizat." });
      }

      if (hasPlan && abonament.activ && !staff && req.validated.plan !== abonament.plan) {
        return res.status(409).json({
          message: "Schimbarea planului pentru un abonament activ necesita un checkout nou.",
        });
      }

      const previousPlan = abonament.plan;
      if (hasPlan) {
        abonament.plan = req.validated.plan;
        abonament.pretLunar = getPlanPrice(req.validated.plan) || abonament.pretLunar;
      }
      if (hasPreferinte) {
        abonament.preferinte = req.validated.preferinte;
      }

      await abonament.save();

      if (staff) {
        await recordAuditLog(req, {
          action: "subscription.updated",
          entityType: "subscription",
          entityId: abonament._id,
          summary: `Abonamentul ${abonament._id} a fost actualizat din admin.`,
          metadata: {
            previousPlan,
            nextPlan: abonament.plan,
            updatedPreferinte: hasPreferinte,
          },
        });
        await maybeNotifySubscriptionOwner(
          req,
          abonament,
          "Datele abonamentului tau au fost actualizate din administratie."
        );
      }

      res.json({ ok: true, abonament: formatSubscription(abonament) });
    } catch (error) {
      subscriptionLog.error("update_failed", {
        requestId: req.id,
        error: serializeError(error),
      });
      res.status(500).json({ ok: false, message: error.message });
    }
  })
);

// PATCH /api/cutie-lunara/:id/pause
router.patch(
  "/:id/pause",
  authRequired,
  withValidation((req) => ({
    id: readMongoId(req.params?.id, { field: "id", required: true }),
  }), async (req, res) => {
    try {
      const access = await findAuthorizedSubscription(req, req.validated.id);
      if (!access.abonament) {
        return res.status(access.status).json({ message: access.message });
      }

      const abonament = access.abonament;
      abonament.activ = false;
      await abonament.save();

      if (isStaff(getRole(req))) {
        await recordAuditLog(req, {
          action: "subscription.paused",
          entityType: "subscription",
          entityId: abonament._id,
          summary: `Abonamentul ${abonament._id} a fost pus pe pauza.`,
        });
        await maybeNotifySubscriptionOwner(
          req,
          abonament,
          "Abonamentul tau a fost pus pe pauza din administratie."
        );
      }

      res.json({ ok: true, abonament: formatSubscription(abonament) });
    } catch (error) {
      subscriptionLog.error("pause_failed", {
        requestId: req.id,
        error: serializeError(error),
      });
      res.status(500).json({ ok: false, message: error.message });
    }
  })
);

// PATCH /api/cutie-lunara/:id/resume
router.patch(
  "/:id/resume",
  authRequired,
  withValidation((req) => ({
    id: readMongoId(req.params?.id, { field: "id", required: true }),
  }), async (req, res) => {
    try {
      const access = await findAuthorizedSubscription(req, req.validated.id);
      if (!access.abonament) {
        return res.status(access.status).json({ message: access.message });
      }

      const abonament = access.abonament;
      if (!canResumeSubscription(abonament)) {
        return res.status(409).json({
          message: "Abonamentul poate fi reluat doar dupa ce plata a fost confirmata.",
        });
      }

      abonament.activ = true;
      await abonament.save();

      if (isStaff(getRole(req))) {
        await recordAuditLog(req, {
          action: "subscription.resumed",
          entityType: "subscription",
          entityId: abonament._id,
          summary: `Abonamentul ${abonament._id} a fost reactivat.`,
        });
        await maybeNotifySubscriptionOwner(
          req,
          abonament,
          "Abonamentul tau a fost reactivat din administratie."
        );
      }

      res.json({ ok: true, abonament: formatSubscription(abonament) });
    } catch (error) {
      subscriptionLog.error("resume_failed", {
        requestId: req.id,
        error: serializeError(error),
      });
      res.status(500).json({ ok: false, message: error.message });
    }
  })
);

// PATCH /api/cutie-lunara/:id/stop
router.patch(
  "/:id/stop",
  authRequired,
  withValidation((req) => ({
    id: readMongoId(req.params?.id, { field: "id", required: true }),
  }), async (req, res) => {
    try {
      const access = await findAuthorizedSubscription(req, req.validated.id);
      if (!access.abonament) {
        return res.status(access.status).json({ message: access.message });
      }

      const abonament = access.abonament;
      abonament.activ = false;
      abonament.pendingOrderId = null;
      abonament.pendingPlan = undefined;
      abonament.pendingPreferinte = "";
      await abonament.save();

      if (isStaff(getRole(req))) {
        await recordAuditLog(req, {
          action: "subscription.stopped",
          entityType: "subscription",
          entityId: abonament._id,
          summary: `Abonamentul ${abonament._id} a fost oprit.`,
        });
        await maybeNotifySubscriptionOwner(
          req,
          abonament,
          "Abonamentul tau a fost oprit din administratie."
        );
      }

      res.json({ ok: true, abonament: formatSubscription(abonament) });
    } catch (error) {
      subscriptionLog.error("stop_failed", {
        requestId: req.id,
        error: serializeError(error),
      });
      res.status(500).json({ ok: false, message: error.message });
    }
  })
);

module.exports = router;
