import { io } from "socket.io-client";
import { appLogger } from "./appLogger";

const sockets = new Map();

export function getSocket(namespace = "") {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const normalizedApi = apiBase.replace(/\/$/, "");
  const base = normalizedApi.replace(/\/api$/, "");
  const ns = namespace
    ? namespace.startsWith("/")
      ? namespace
      : `/${namespace}`
    : "";
  const url = `${base}${ns}`;

  if (sockets.has(url)) return sockets.get(url);

  const socket = io(url, {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  const healthUrl = normalizedApi.endsWith("/api")
    ? `${normalizedApi}/health`
    : `${normalizedApi}/api/health`;

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
