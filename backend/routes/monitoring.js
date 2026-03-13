const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { withValidation } = require("../middleware/validate");
const { log } = require("../utils/log");
const {
  readEmail,
  readEnum,
  readMongoId,
  readObject,
  readString,
  readUrl,
} = require("../utils/validation");

const monitoringLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = [
  process.env.BASE_CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
].filter(Boolean);

router.post(
  "/client-error",
  monitoringLimiter,
  withValidation((req) => ({
    kind: readEnum(
      req.body?.kind || "manual_report",
      [
        "manual_report",
        "react_render_error",
        "window_error",
        "unhandled_rejection",
      ],
      {
        field: "kind",
        defaultValue: "manual_report",
      }
    ),
    message: readString(req.body?.message, {
      field: "message",
      required: true,
      min: 1,
      max: 500,
    }),
    stack: readString(req.body?.stack, {
      field: "stack",
      defaultValue: "",
      max: 12000,
    }),
    componentStack: readString(req.body?.componentStack, {
      field: "componentStack",
      defaultValue: "",
      max: 12000,
    }),
    url: readUrl(req.body?.url, {
      field: "url",
      defaultValue: "",
      allowedOrigins,
    }),
    userId: readMongoId(req.body?.userId, {
      field: "userId",
      defaultValue: "",
    }),
    userEmail: readEmail(req.body?.userEmail, {
      field: "userEmail",
      defaultValue: "",
    }),
    userRole: readString(req.body?.userRole, {
      field: "userRole",
      defaultValue: "",
      max: 40,
    }),
    release: readString(req.body?.release, {
      field: "release",
      defaultValue: "",
      max: 120,
    }),
    requestId: readString(req.body?.requestId, {
      field: "requestId",
      defaultValue: "",
      max: 120,
    }),
    metadata: readObject(req.body?.metadata, {
      field: "metadata",
      defaultValue: {},
    }),
  }), async (req, res) => {
    log("error", "client_runtime_error", {
      requestId: req.id,
      clientRequestId: req.validated.requestId,
      ip: req.ip,
      userAgent: req.get("user-agent") || "",
      clientError: {
        kind: req.validated.kind,
        message: req.validated.message,
        stack: req.validated.stack,
        componentStack: req.validated.componentStack,
        url: req.validated.url,
        userId: req.validated.userId,
        userEmail: req.validated.userEmail,
        userRole: req.validated.userRole,
        release: req.validated.release,
        metadata: req.validated.metadata,
      },
    });

    return res.status(202).json({ ok: true });
  })
);

module.exports = router;
