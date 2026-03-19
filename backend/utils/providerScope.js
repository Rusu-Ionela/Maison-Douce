function getRequestRole(req) {
  return String(req?.user?.rol || req?.user?.role || "").trim().toLowerCase();
}

function getRequestUserId(req) {
  return String(req?.user?._id || req?.user?.id || "").trim();
}

function isAdminRequest(req) {
  return getRequestRole(req) === "admin";
}

function getScopedPrestatorId(req) {
  if (isAdminRequest(req)) return "";

  const role = getRequestRole(req);
  if (role === "patiser" || role === "prestator") {
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
