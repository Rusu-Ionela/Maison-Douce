function normalizeUserRole(rawRole) {
  const role = String(rawRole || "client").trim().toLowerCase();
  if (["prestator", "provider", "baker"].includes(role)) {
    return "patiser";
  }
  return role || "client";
}

function isAdminRole(rawRole) {
  return normalizeUserRole(rawRole) === "admin";
}

function isProviderRole(rawRole) {
  return normalizeUserRole(rawRole) === "patiser";
}

function isClientRole(rawRole) {
  return normalizeUserRole(rawRole) === "client";
}

function isStaffRole(rawRole) {
  const role = normalizeUserRole(rawRole);
  return role === "admin" || role === "patiser";
}

module.exports = {
  isAdminRole,
  isClientRole,
  isProviderRole,
  isStaffRole,
  normalizeUserRole,
};
