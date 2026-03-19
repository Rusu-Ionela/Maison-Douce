import { io } from "socket.io-client";
import { appLogger } from "./appLogger";
import { getApiBaseUrl } from "./runtimeConfig";

const sockets = new Map();

function readAuthToken() {
  if (typeof window === "undefined") return "";
  return String(window.localStorage.getItem("token") || "").trim();
}

export function getSocket(namespace = "") {
  const apiBase = getApiBaseUrl();
  const normalizedApi = apiBase.replace(/\/$/, "");
  const base = normalizedApi.replace(/\/api$/, "");
  const ns = namespace
    ? namespace.startsWith("/")
      ? namespace
      : `/${namespace}`
    : "";
  const url = `${base}${ns}`;
  const token = readAuthToken();

  if (sockets.has(url)) {
    const existing = sockets.get(url);
    existing.auth = { token };
    return existing;
  }

  const socket = io(url, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: { token },
  });

  const healthUrl = normalizedApi.endsWith("/api")
    ? `${normalizedApi}/health`
    : `${normalizedApi}/api/health`;

  if (!token) {
    appLogger.warn("socket_auth_missing", { url });
    sockets.set(url, socket);
    return socket;
  }

  fetch(healthUrl, { cache: "no-store" })
    .then(() => socket.connect())
    .catch(() => {
      appLogger.warn("socket_server_offline", {
        url,
      });
    });

  sockets.set(url, socket);
  return socket;
}
