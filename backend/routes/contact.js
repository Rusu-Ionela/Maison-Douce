const express = require("express");
const router = express.Router();
const ContactMessage = require("../models/ContactMessage");
const { authRequired, roleCheck } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const {
  readEmail,
  readEnum,
  readMongoId,
  readNumber,
  readString,
} = require("../utils/validation");
const { notifyAdmins } = require("../utils/notifications");

router.post(
  "/",
  withValidation((req) => ({
    nume: readString(req.body?.nume, {
      field: "nume",
      required: true,
      min: 2,
      max: 120,
    }),
    email: readEmail(req.body?.email, {
      field: "email",
      required: true,
      max: 160,
    }),
    telefon: readString(req.body?.telefon, {
      field: "telefon",
      max: 40,
    }),
    subiect: readString(req.body?.subiect, {
      field: "subiect",
      max: 160,
    }),
    mesaj: readString(req.body?.mesaj, {
      field: "mesaj",
      required: true,
      min: 10,
      max: 4000,
    }),
  }), async (req, res) => {
    const { nume, email, telefon, subiect, mesaj } = req.validated;

    const contact = await ContactMessage.create({
      nume,
      email,
      telefon,
      subiect,
      mesaj,
      sursa: readString(req.get("origin") || "", {
        field: "origin",
        max: 255,
      }),
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
  })
);

router.get(
  "/",
  authRequired,
  roleCheck("admin", "patiser"),
  withValidation((req) => ({
    status: readEnum(req.query?.status, ["nou", "in_proces", "rezolvat"], {
      field: "status",
      defaultValue: "",
    }),
    limit: readNumber(req.query?.limit, {
      field: "limit",
      min: 1,
      max: 200,
      integer: true,
      defaultValue: 100,
    }),
  }), async (req, res) => {
    try {
      const query = {};
      if (req.validated.status) {
        query.status = req.validated.status;
      }

      const list = await ContactMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(req.validated.limit || 100)
        .lean();
      res.json(list);
    } catch (e) {
      console.error("GET /contact error:", e);
      res.status(500).json({ message: "Nu am putut incarca mesajele." });
    }
  })
);

router.patch(
  "/:id/status",
  authRequired,
  roleCheck("admin", "patiser"),
  withValidation((req) => ({
    id: readMongoId(req.params?.id, {
      field: "id",
      required: true,
    }),
    status: readEnum(req.body?.status, ["nou", "in_proces", "rezolvat"], {
      field: "status",
      required: true,
    }),
  }), async (req, res) => {
    const updated = await ContactMessage.findByIdAndUpdate(
      req.validated.id,
      {
        $set: {
          status: req.validated.status,
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
  })
);

module.exports = router;
