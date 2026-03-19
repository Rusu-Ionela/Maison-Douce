const router = require("express").Router();
const { authRequired, roleCheck } = require("../middleware/auth");
const Rezervare = require("../models/Rezervare");
const { notifyUser } = require("../utils/notifications");
const {
  applyScopedPrestatorFilter,
  hasScopedPrestatorAccess,
} = require("../utils/providerScope");

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

router.get("/", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const q = {};
    if (req.query.status) q.status = normalizeRezervareStatus(req.query.status);

    if (role === "admin" || role === "patiser" || role === "prestator") {
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
    const role = req.user?.rol || req.user?.role;
    const q = { _id: req.params.id };
    if (role !== "admin" && role !== "patiser" && role !== "prestator") {
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
    await r.save();
    await notifyUser(r.clientId, {
      titlu: "Rezervare actualizata",
      mesaj: `Rezervarea ta este acum: ${status}.`,
      tip: "rezervare",
      link: "/calendar",
    });
    res.json(r);
  } catch (_e) {
    res.status(500).json({ message: "Eroare la actualizare status" });
  }
});

module.exports = router;
