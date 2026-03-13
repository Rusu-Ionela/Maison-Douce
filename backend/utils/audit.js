const AuditLog = require("../models/AuditLog");
const { createLogger, serializeError } = require("./log");

const auditLog = createLogger("audit");

function getActorSnapshot(req) {
  return {
    actorId: String(req?.user?._id || req?.user?.id || ""),
    actorEmail: String(req?.user?.email || ""),
    actorRole: String(req?.user?.rol || req?.user?.role || ""),
  };
}

async function recordAuditLog(
  req,
  { action, entityType, entityId = "", summary = "", metadata = {} } = {}
) {
  if (!action || !entityType) {
    return;
  }

  try {
    await AuditLog.create({
      ...getActorSnapshot(req),
      action,
      entityType,
      entityId: String(entityId || ""),
      summary,
      metadata,
      requestId: String(req?.id || ""),
      ip: String(req?.ip || ""),
      userAgent: String(req?.get?.("user-agent") || ""),
    });
  } catch (err) {
    auditLog.warn("audit_write_failed", {
      action,
      entityType,
      error: serializeError(err),
    });
  }
}

module.exports = {
  recordAuditLog,
};
