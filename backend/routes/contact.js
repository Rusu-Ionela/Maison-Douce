const express = require("express");
const router = express.Router();
const ContactMessage = require("../models/ContactMessage");
const { authRequired, roleCheck } = require("../middleware/auth");
const { notifyAdmins } = require("../utils/notifications");

function cleanText(value, max = 200) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function parseLimit(value, fallback = 50) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

// POST /api/contact
router.post("/", async (req, res) => {
  try {
    const nume = cleanText(req.body?.nume, 120);
    const email = cleanText(req.body?.email, 160).toLowerCase();
    const telefon = cleanText(req.body?.telefon, 40);
    const subiect = cleanText(req.body?.subiect, 160);
    const mesaj = cleanText(req.body?.mesaj, 4000);

    if (!nume) {
      return res.status(400).json({ message: "Numele este obligatoriu." });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Email invalid." });
    }
    if (!mesaj || mesaj.length < 10) {
      return res.status(400).json({ message: "Mesajul trebuie sa aiba minimum 10 caractere." });
    }

    const contact = await ContactMessage.create({
      nume,
      email,
      telefon,
      subiect,
      mesaj,
      sursa: cleanText(req.get("origin") || "", 255),
      userId: null,
    });

    await notifyAdmins({
      titlu: "Mesaj nou din formularul de contact",
      mesaj: `${nume} (${email}) a trimis un mesaj nou.`,
      tip: "info",
      link: "/admin/notificari",
    });

    return res.status(201).json({
      ok: true,
      messageId: contact._id,
      message: "Mesajul a fost trimis cu succes.",
    });
  } catch (e) {
    console.error("POST /contact error:", e);
    return res.status(500).json({ message: "Nu am putut trimite mesajul." });
  }
});

// GET /api/contact
router.get("/", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const status = cleanText(req.query?.status, 20);
    const limit = parseLimit(req.query?.limit, 100);
    const query = {};
    if (["nou", "in_proces", "rezolvat"].includes(status)) {
      query.status = status;
    }

    const list = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(list);
  } catch (e) {
    console.error("GET /contact error:", e);
    res.status(500).json({ message: "Nu am putut incarca mesajele." });
  }
});

// PATCH /api/contact/:id/status
router.patch(
  "/:id/status",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const status = cleanText(req.body?.status, 20);
      if (!["nou", "in_proces", "rezolvat"].includes(status)) {
        return res.status(400).json({ message: "Status invalid." });
      }

      const updated = await ContactMessage.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status,
            gestionatDe: req.user.id || req.user._id,
            gestionatLa: new Date(),
          },
        },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) {
        return res.status(404).json({ message: "Mesajul nu exista." });
      }
      res.json(updated);
    } catch (e) {
      console.error("PATCH /contact/:id/status error:", e);
      res.status(500).json({ message: "Nu am putut actualiza statusul." });
    }
  }
);

module.exports = router;
