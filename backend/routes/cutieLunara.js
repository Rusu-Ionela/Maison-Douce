const express = require("express");
const router = express.Router();
const { authRequired, roleCheck } = require("../middleware/auth");
const CutieLunara = require("../models/CutieLunara");
const Comanda = require("../models/Comanda");
const { notifyUser } = require("../utils/notifications");
const {
  normalizePlan,
  getPlanPrice,
  isPaidOrder,
  isSubscriptionOrder,
  activateCutieFromComanda,
} = require("../utils/subscriptions");

function isStaff(role) {
  return ["admin", "patiser", "prestator"].includes(String(role || ""));
}

function getAuthUserId(req) {
  return String(req.user?.id || req.user?._id || "");
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

// POST /api/cutie-lunara
// Manual activation (admin/patiser) - keeps backward compatibility for internal use.
router.post("/", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const plan = normalizePlan(req.body?.plan || "basic");
    const preferinte = String(req.body?.preferinte || "").trim();
    const clientId = String(req.body?.clientId || "").trim();
    const effectiveClientId = clientId || getAuthUserId(req);
    if (!plan) {
      return res.status(400).json({ message: "Plan invalid." });
    }
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
          ultimaPlataLa: new Date(),
        },
        $setOnInsert: { dataActivare: new Date() },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ ok: true, abonament: abon });
  } catch (e) {
    console.error("cutie-lunara manual POST error:", e);
    res.status(500).json({ ok: false, message: e.message || "Eroare server" });
  }
});

// POST /api/cutie-lunara/checkout
// Creates a dedicated order for subscription checkout.
router.post("/checkout", authRequired, async (req, res) => {
  try {
    const plan = normalizePlan(req.body?.plan || "basic");
    const preferinte = String(req.body?.preferinte || "").trim();
    const clientId = getAuthUserId(req);

    if (!plan) {
      return res.status(400).json({ message: "Plan invalid." });
    }
    if (!clientId) {
      return res.status(401).json({ message: "Utilizator neautentificat." });
    }

    const pretLunar = getPlanPrice(plan) || 0;
    if (pretLunar <= 0) {
      return res.status(400).json({ message: "Pret invalid pentru plan." });
    }

    const comanda = await Comanda.create({
      clientId,
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
      statusHistory: [{ status: "plasata", note: "Comanda abonament creata" }],
      tip: "abonament_cutie",
      customDetails: {
        plan,
        preferinte,
      },
      notesClient: preferinte || "",
    });

    await CutieLunara.findOneAndUpdate(
      { clientId },
      {
        $set: {
          plan,
          preferinte,
          activ: false,
          pretLunar,
          statusPlata: "pending",
          pendingOrderId: comanda._id,
          ultimaComandaId: comanda._id,
        },
        $setOnInsert: { dataActivare: null },
      },
      { upsert: true, new: true, runValidators: true }
    );

    await notifyUser(clientId, {
      titlu: "Comanda abonament creata",
      mesaj: `Finalizeaza plata pentru ${buildPlanName(plan)}.`,
      tip: "abonament",
      link: `/plata?comandaId=${comanda._id}`,
    });

    res.status(201).json({
      ok: true,
      comandaId: comanda._id,
      total: pretLunar,
      plan,
    });
  } catch (e) {
    console.error("cutie-lunara checkout error:", e);
    res.status(500).json({ ok: false, message: e.message || "Eroare server" });
  }
});

// POST /api/cutie-lunara/activate-from-order/:comandaId
router.post("/activate-from-order/:comandaId", authRequired, async (req, res) => {
  try {
    const comanda = await Comanda.findById(req.params.comandaId);
    if (!comanda) {
      return res.status(404).json({ message: "Comanda inexistenta." });
    }

    const role = req.user?.rol || req.user?.role;
    const staff = isStaff(role);
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

    const result = await activateCutieFromComanda(comanda);
    if (!result?.abonament) {
      return res.status(400).json({ message: "Nu am putut activa abonamentul." });
    }

    if (!result.wasAlreadyActive) {
      await notifyUser(comanda.clientId, {
        titlu: "Abonament activat",
        mesaj: `Abonamentul ${buildPlanName(result.abonament.plan)} este acum activ.`,
        tip: "abonament",
        link: "/abonament/form",
      });
    }

    res.json({ ok: true, abonament: result.abonament });
  } catch (e) {
    console.error("cutie-lunara activate-from-order error:", e);
    res.status(500).json({ message: e.message || "Eroare la activarea abonamentului." });
  }
});

// GET /api/cutie-lunara/me
router.get("/me", authRequired, async (req, res) => {
  try {
    const abon = await CutieLunara.findOne({ clientId: getAuthUserId(req) }).lean();
    res.json({ abonament: abon || null });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/cutie-lunara
router.get("/", authRequired, roleCheck("admin"), async (_req, res) => {
  try {
    const list = await CutieLunara.find()
      .populate("clientId", "nume email")
      .sort({ updatedAt: -1 })
      .lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// PATCH /api/cutie-lunara/:id/stop
router.patch("/:id/stop", authRequired, async (req, res) => {
  try {
    const abon = await CutieLunara.findById(req.params.id);
    if (!abon) {
      return res.status(404).json({ message: "Abonament inexistent" });
    }

    const role = req.user?.rol || req.user?.role;
    const staff = isStaff(role);
    if (!staff && String(abon.clientId) !== getAuthUserId(req)) {
      return res.status(403).json({ message: "Nu ai dreptul sa modifici acest abonament" });
    }

    abon.activ = false;
    await abon.save();
    res.json({ ok: true, abonament: abon });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
