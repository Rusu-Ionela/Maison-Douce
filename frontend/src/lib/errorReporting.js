import { authStorage } from "./authStorage";
import { BASE_URL } from "./api";

const REPORT_WINDOW_MS = 15000;
const recentReports = new Map();

function cleanupRecentReports(now) {
  for (const [key, timestamp] of recentReports.entries()) {
    if (now - timestamp > REPORT_WINDOW_MS) {
      recentReports.delete(key);
    }
  }
}

function toSafeString(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.message || value.name || "Error";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || "Unknown error",
      stack: error.stack || "",
    };
  }

  return {
    message: toSafeString(error) || "Unknown error",
    stack: "",
  };
}

function getUserSnapshot() {
  try {
    return authStorage.getUser();
  } catch {
    return {
      userId: null,
      userEmail: "",
      userRol: "",
    };
  }
}

function createReportKey(payload) {
  return [
    payload.kind,
    payload.message,
    payload.componentStack,
    payload.url,
  ].join("|");
}

function shouldSkipDuplicate(payload) {
  const now = Date.now();
  cleanupRecentReports(now);
  const key = createReportKey(payload);
  const lastSeen = recentReports.get(key);
  recentReports.set(key, now);
  return Boolean(lastSeen && now - lastSeen < REPORT_WINDOW_MS);
}

export async function reportClientError({
  kind = "manual_report",
  error,
  info,
  metadata = {},
  requestId = "",
} = {}) {
  if (typeof window === "undefined") {
    return { ok: false, skipped: true };
  }

  const normalized = normalizeError(error);
  const currentUser = getUserSnapshot();
  const componentStack =
    typeof info === "string" ? info : String(info?.componentStack || "");
  const payload = {
    kind,
    message: normalized.message,
    stack: normalized.stack,
    componentStack,
    url: window.location.href,
    userId: currentUser.userId || "",
    userEmail: currentUser.userEmail || "",
    userRole: currentUser.userRol || "",
    release: String(import.meta.env.VITE_APP_VERSION || import.meta.env.MODE || "unknown"),
    requestId,
    metadata,
  };

  if (shouldSkipDuplicate(payload)) {
    return { ok: true, skipped: true };
  }

  try {
    const response = await fetch(`${BASE_URL}/monitoring/client-error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    return {
      ok: response.ok,
      status: response.status,
    };
  } catch (networkError) {
    if (import.meta.env.DEV) {
      console.warn("client error reporting failed", networkError);
    }
    return {
      ok: false,
      error: networkError,
    };
  }
}

export function normalizeRejectionReason(reason) {
  if (reason instanceof Error) {
    return reason;
  }

  const message = toSafeString(reason) || "Unhandled promise rejection";
  return new Error(message);
}
