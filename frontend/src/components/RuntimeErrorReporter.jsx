import { useEffect } from "react";
import {
  normalizeRejectionReason,
  reportClientError,
} from "../lib/errorReporting";

function serializeReason(reason) {
  if (reason == null) {
    return "";
  }

  if (typeof reason === "string") {
    return reason;
  }

  if (reason instanceof Error) {
    return reason.message;
  }

  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

export default function RuntimeErrorReporter() {
  useEffect(() => {
    const handleWindowError = (event) => {
      reportClientError({
        kind: "window_error",
        error: event.error || event.message || "Window error",
        metadata: {
          filename: event.filename || "",
          line: Number(event.lineno || 0),
          column: Number(event.colno || 0),
        },
      });
    };

    const handleUnhandledRejection = (event) => {
      reportClientError({
        kind: "unhandled_rejection",
        error: normalizeRejectionReason(event.reason),
        metadata: {
          reason: serializeReason(event.reason),
        },
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
