const express = require("express");
const router = express.Router();
const { authOptional, authRequired, roleCheck } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const {
  readEmail,
  readEnum,
  readMongoId,
  readNumber,
  readString,
} = require("../utils/validation");
const {
  appendConversationMessage,
  createConversation,
  getConversationForUser,
  getConversationMessages,
  listConversationsForUser,
  normalizeConversationStatus,
  updateConversationStatus,
} = require("../services/contactConversations");

function sendRouteError(res, routeName, error) {
  console.error(`${routeName} error:`, error);
  return res.status(error?.status || 500).json({
    message:
      error?.status && error.status < 500
        ? error.message
        : "Nu am putut procesa conversatia de contact.",
    error: error?.message || "unknown_error",
  });
}

router.post(
  "/",
  authOptional,
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

    try {
      const created = await createConversation({
        user: req.user || null,
        nume,
        email,
        telefon,
        subiect,
        mesaj,
        source: readString(req.get("origin") || "", {
          field: "origin",
          max: 255,
        }),
      });

      return res.status(201).json({
        ok: true,
        conversationId: created.conversation?._id,
        messageId: created.message?._id,
        status: created.conversation?.status || "noua",
        message: "Mesajul a fost trimis cu succes.",
      });
    } catch (error) {
      return sendRouteError(res, "POST /contact", error);
    }
  })
);

router.get(
  "/",
  authRequired,
  roleCheck("admin", "patiser"),
  withValidation(
    (req) => ({
      status: readEnum(
        req.query?.status,
        ["nou", "noua", "in_proces", "in_progres", "rezolvat", "finalizata"],
        {
          field: "status",
          defaultValue: "",
        }
      ),
      limit: readNumber(req.query?.limit, {
        field: "limit",
        min: 1,
        max: 200,
        integer: true,
        defaultValue: 100,
      }),
      search: readString(req.query?.search, {
        field: "search",
        max: 160,
      }),
    }),
    async (req, res) => {
      try {
        const list = await listConversationsForUser(req.user, {
          status: req.validated.status,
          limit: req.validated.limit,
          search: req.validated.search,
        });
        res.json(list);
      } catch (e) {
        return sendRouteError(res, "GET /contact", e);
      }
    }
  )
);

router.get("/mine", authRequired, async (req, res) => {
  try {
    const list = await listConversationsForUser(req.user, {
      limit: req.query?.limit || 100,
      status: req.query?.status || "",
    });
    res.json(list);
  } catch (error) {
    return sendRouteError(res, "GET /contact/mine", error);
  }
});

router.get(
  "/:id",
  authRequired,
  withValidation(
    (req) => ({
      id: readMongoId(req.params?.id, {
        field: "id",
        required: true,
      }),
    }),
    async (req, res) => {
      try {
        const conversation = await getConversationForUser(req.validated.id, req.user);
        if (!conversation) {
          return res.status(404).json({ message: "Conversatia nu exista." });
        }
        res.json(conversation);
      } catch (error) {
        return sendRouteError(res, "GET /contact/:id", error);
      }
    }
  )
);

router.get(
  "/:id/messages",
  authRequired,
  withValidation(
    (req) => ({
      id: readMongoId(req.params?.id, {
        field: "id",
        required: true,
      }),
    }),
    async (req, res) => {
      try {
        const conversation = await getConversationForUser(req.validated.id, req.user);
        if (!conversation) {
          return res.status(404).json({ message: "Conversatia nu exista." });
        }
        const messages = await getConversationMessages(req.validated.id);
        res.json(messages);
      } catch (error) {
        return sendRouteError(res, "GET /contact/:id/messages", error);
      }
    }
  )
);

router.post(
  "/:id/messages",
  authRequired,
  withValidation(
    (req) => ({
      id: readMongoId(req.params?.id, {
        field: "id",
        required: true,
      }),
      mesaj: readString(req.body?.mesaj || req.body?.text, {
        field: "mesaj",
        required: true,
        min: 1,
        max: 4000,
      }),
    }),
    async (req, res) => {
      try {
        const created = await appendConversationMessage({
          conversationId: req.validated.id,
          user: req.user,
          text: req.validated.mesaj,
        });
        res.status(201).json(created);
      } catch (error) {
        return sendRouteError(res, "POST /contact/:id/messages", error);
      }
    }
  )
);

router.patch(
  "/:id/status",
  authRequired,
  roleCheck("admin", "patiser"),
  withValidation(
    (req) => ({
      id: readMongoId(req.params?.id, {
        field: "id",
        required: true,
      }),
      status: readEnum(
        req.body?.status,
        ["nou", "noua", "in_proces", "in_progres", "rezolvat", "finalizata"],
        {
          field: "status",
          required: true,
        }
      ),
    }),
    async (req, res) => {
      try {
        const updated = await updateConversationStatus({
          conversationId: req.validated.id,
          user: req.user,
          status: normalizeConversationStatus(req.validated.status),
        });
        if (!updated) {
          return res.status(404).json({ message: "Conversatia nu exista." });
        }
        res.json(updated);
      } catch (error) {
        return sendRouteError(res, "PATCH /contact/:id/status", error);
      }
    }
  )
);

module.exports = router;
