const { isAdminRole, isProviderRole, normalizeUserRole } = require("./roles");

function getRequestRole(req) {
  return normalizeUserRole(req?.user?.rol || req?.user?.role || "");
}

function getRequestUserId(req) {
  return String(req?.user?._id || req?.user?.id || "").trim();
}

function isAdminRequest(req) {
  return isAdminRole(getRequestRole(req));
}

function getScopedPrestatorId(req) {
  if (isAdminRequest(req)) return "";

  const role = getRequestRole(req);
  if (isProviderRole(role)) {
    return getRequestUserId(req);
  }

  return "";
}

function hasScopedPrestatorAccess(req, prestatorId) {
  const scopedPrestatorId = getScopedPrestatorId(req);
  if (!scopedPrestatorId) return true;
  return String(prestatorId || "").trim() === scopedPrestatorId;
}

function applyScopedPrestatorFilter(req, filter = {}, field = "prestatorId") {
  const scopedPrestatorId = getScopedPrestatorId(req);
  if (!scopedPrestatorId) return { ...(filter || {}) };
  return {
    ...(filter || {}),
    [field]: scopedPrestatorId,
  };
}

module.exports = {
  applyScopedPrestatorFilter,
  getRequestUserId,
  getScopedPrestatorId,
  hasScopedPrestatorAccess,
  isAdminRequest,
};
