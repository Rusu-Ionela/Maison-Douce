const router = require("express").Router();
const { authRequired, roleCheck } = require("../middleware/auth");
const Rezervare = require("../models/Rezervare");
const Comanda = require("../models/Comanda");
const { notifyUser, notifyProviderById } = require("../utils/notifications");
const {
  applyScopedPrestatorFilter,
  hasScopedPrestatorAccess,
} = require("../utils/providerScope");
const { normalizeUserRole } = require("../utils/roles");

function getAuthUserId(req) {
  return String(req.user?._id || req.user?.id || "");
}

function normalizeRezervareStatus(status) {
  switch (String(status || "").trim()) {
    case "anulata":
    case "cancelled":
      return "canceled";
    case "confirmata":
      return "confirmed";
    case "livrata":
    case "ridicat_client":
      return "completed";
    default:
      return status;
  }
}

function mapRezervareStatusToOrderStatus(status, rezervare) {
  switch (String(status || "").trim()) {
    case "canceled":
      return "anulata";
    case "completed":
      return rezervare?.handoffMethod === "delivery" ? "livrata" : "ridicata";
    case "confirmed":
      return "confirmata";
    default:
      return String(status || "").trim() || "in_asteptare";
  }
}

function mapRezervareStatusToHandoffStatus(status, rezervare) {
  switch (String(status || "").trim()) {
    case "canceled":
      return "canceled";
    case "completed":
      return rezervare?.handoffMethod === "delivery" ? "delivered" : "picked_up";
    case "confirmed":
      return "scheduled";
    default:
      return rezervare?.handoffStatus || "scheduled";
  }
}

router.get("/", authRequired, async (req, res) => {
  try {
    const role = normalizeUserRole(req.user?.rol || req.user?.role);
    const q = {};
    if (req.query.status) q.status = normalizeRezervareStatus(req.query.status);

    if (role === "admin" || role === "patiser") {
      if (req.query.clientId) q.clientId = String(req.query.clientId);
    } else {
      q.clientId = getAuthUserId(req);
    }

    const list = await Rezervare.find(applyScopedPrestatorFilter(req, q))
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (_e) {
    res.status(500).json({ message: "Eroare la preluare rezervari" });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  try {
    const role = normalizeUserRole(req.user?.rol || req.user?.role);
    const q = { _id: req.params.id };
    if (role !== "admin" && role !== "patiser") {
      q.clientId = getAuthUserId(req);
    }
    const r = await Rezervare.findOne(applyScopedPrestatorFilter(req, q)).lean();
    if (!r) return res.status(404).json({ message: "Rezervare inexistenta" });
    res.json(r);
  } catch (_e) {
    res.status(500).json({ message: "Eroare la preluare rezervare" });
  }
});

router.patch("/:id/status", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const status = normalizeRezervareStatus(req.body?.status);
    const r = await Rezervare.findById(req.params.id);
    if (!r) return res.status(404).json({ message: "Rezervare inexistenta" });
    if (!hasScopedPrestatorAccess(req, r.prestatorId)) {
      return res.status(403).json({ message: "Acces interzis pentru acest prestator." });
    }
    r.status = status;
    r.handoffStatus = mapRezervareStatusToHandoffStatus(status, r);
    await r.save();
    if (r.comandaId) {
      const comanda = await Comanda.findById(r.comandaId);
      if (comanda) {
        comanda.status = mapRezervareStatusToOrderStatus(status, r);
        comanda.handoffStatus = r.handoffStatus;
        comanda.statusHistory = Array.isArray(comanda.statusHistory)
          ? [...comanda.statusHistory, { status: comanda.status, note: req.body?.note || "" }]
          : [{ status: comanda.status, note: req.body?.note || "" }];
        await comanda.save();
      }
    }
    await notifyUser(r.clientId, {
      titlu: "Rezervare actualizata",
      mesaj: `Rezervarea ta este acum: ${status}.`,
      tip: "rezervare",
      link: "/profil",
      prestatorId: r.prestatorId,
      actorId: req.user?._id || req.user?.id,
      actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
      meta: {
        rezervareId: String(r._id),
        comandaId: r.comandaId ? String(r.comandaId) : "",
      },
    });
    await notifyProviderById(r.prestatorId, {
      titlu: "Rezervare actualizata",
      mesaj: `Rezervarea #${r._id} este acum: ${status}.`,
      tip: "rezervare",
      link: "/admin/calendar",
      prestatorId: r.prestatorId,
      actorId: req.user?._id || req.user?.id,
      actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
      meta: {
        rezervareId: String(r._id),
        comandaId: r.comandaId ? String(r.comandaId) : "",
      },
    });
    res.json(r);
  } catch (_e) {
    res.status(500).json({ message: "Eroare la actualizare status" });
  }
});

module.exports = router;
