const router = require("express").Router();
const AuditLog = require("../models/AuditLog");
const { authRequired, roleCheck } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const { readNumber, readString } = require("../utils/validation");

router.get(
  "/",
  authRequired,
  roleCheck("admin"),
  withValidation((req) => ({
    action: readString(req.query?.action, {
      field: "action",
      max: 120,
      defaultValue: "",
    }),
    entityType: readString(req.query?.entityType, {
      field: "entityType",
      max: 80,
      defaultValue: "",
    }),
    entityId: readString(req.query?.entityId, {
      field: "entityId",
      max: 120,
      defaultValue: "",
    }),
    actorId: readString(req.query?.actorId, {
      field: "actorId",
      max: 120,
      defaultValue: "",
    }),
    limit: readNumber(req.query?.limit, {
      field: "limit",
      min: 1,
      max: 200,
      integer: true,
      defaultValue: 50,
    }),
  }), async (req, res) => {
    try {
      const { action, entityType, entityId, actorId, limit } = req.validated;
      const filter = {};

      if (action) filter.action = action;
      if (entityType) filter.entityType = entityType;
      if (entityId) filter.entityId = entityId;
      if (actorId) filter.actorId = actorId;

      const items = await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return res.json({ items });
    } catch (err) {
      return res.status(500).json({ message: "Eroare la incarcare audit log." });
    }
  })
);

module.exports = router;
