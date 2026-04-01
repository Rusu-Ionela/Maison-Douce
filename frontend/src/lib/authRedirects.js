import { isStaffRole } from "./roles";

const AUTH_PATHS = [
  "/login",
  "/register",
  "/admin/login",
  "/reset-parola",
  "/resetare-parola",
];

function normalizeRedirectTarget(target) {
  if (!target) return "";

  if (typeof target === "string") {
    return target.trim();
  }

  const pathname = String(target.pathname || "").trim();
  if (!pathname) return "";

  const search = target.search ? String(target.search) : "";
  const hash = target.hash ? String(target.hash) : "";
  return `${pathname}${search}${hash}`;
}

function isAuthTarget(target) {
  return AUTH_PATHS.some((path) => target === path || target.startsWith(`${path}?`));
}

function canAccessTarget(target, user) {
  if (!target) return false;

  if (target === "/harta-site" || target.startsWith("/admin/")) {
    return isStaffRole(user?.rol || user?.role);
  }

  return true;
}

export function resolvePostAuthRedirect({
  user,
  requestedTarget,
  clientFallback = "/calendar",
  staffFallback = "/admin/calendar",
} = {}) {
  const normalizedTarget = normalizeRedirectTarget(requestedTarget);
  const fallback = isStaffRole(user?.rol || user?.role)
    ? staffFallback
    : clientFallback;

  if (!normalizedTarget) return fallback;
  if (isAuthTarget(normalizedTarget)) return fallback;
  if (!canAccessTarget(normalizedTarget, user)) return fallback;

  return normalizedTarget;
}

export function buildRedirectState(location) {
  if (!location?.pathname) return {};

  return {
    from: {
      pathname: location.pathname,
      search: location.search || "",
      hash: location.hash || "",
    },
  };
}
