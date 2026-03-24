export function normalizeRole(rawRole) {
  const role = String(rawRole || "client").trim().toLowerCase();
  if (["prestator", "provider", "baker"].includes(role)) {
    return "patiser";
  }
  return role || "client";
}

export function isAdminRole(role) {
  return normalizeRole(role) === "admin";
}

export function isProviderRole(role) {
  return normalizeRole(role) === "patiser";
}

export function isStaffRole(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "patiser";
}
