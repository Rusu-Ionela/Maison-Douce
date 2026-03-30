const express = require("express");
const { authOptional } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const { readString } = require("../utils/validation");
const { createLogger, serializeError } = require("../utils/log");
const { buildAssistantReply } = require("../services/assistantKnowledge");

const router = express.Router();
const logger = createLogger("assistant_route");

function sanitizePreview(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

router.post(
  "/reply",
  authOptional,
  withValidation(
    (req) => ({
      query: readString(req.body?.query, {
        field: "query",
        max: 400,
      }),
      pathname: readString(req.body?.pathname, {
        field: "pathname",
        max: 200,
        defaultValue: "/",
      }),
    }),
    async (req, res) => {
      try {
        const reply = await buildAssistantReply({
          query: req.validated.query,
          pathname: req.validated.pathname,
          user: req.user || null,
        });

        logger.info("assistant_reply_generated", {
          requestId: req.id,
          userId: String(req.user?._id || req.user?.id || ""),
          role: String(req.user?.rol || req.user?.role || "guest"),
          pathname: sanitizePreview(req.validated.pathname, 120),
          queryPreview: sanitizePreview(req.validated.query),
          intentId: reply.intentId,
        });

        res.json(reply);
      } catch (error) {
        logger.error("assistant_reply_failed", {
          requestId: req.id,
          userId: String(req.user?._id || req.user?.id || ""),
          pathname: sanitizePreview(req.body?.pathname, 120),
          queryPreview: sanitizePreview(req.body?.query),
          error: serializeError(error),
        });
        res.status(500).json({
          success: false,
          message: "Nu am putut genera raspunsul asistentului.",
          requestId: req.id,
        });
      }
    }
  )
);

module.exports = router;
