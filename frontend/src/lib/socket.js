
import { io } from "socket.io-client";

// cache per-namespace ca să nu creezi mai multe conexiuni din greșeală
const sockets = new Map();

/**
 * Obține (sau creează) un socket pentru un namespace (ex: "/user-chat").
 * Nu se conectează până nu confirmă că serverul e UP (prin /health).
 */
export function getSocket(namespace = "") {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const ns = namespace ? (namespace.startsWith("/") ? namespace : `/${namespace}`) : "";
    const url = `${base}${ns}`;

    if (sockets.has(url)) return sockets.get(url);

    const socket = io(url, {
        transports: ["websocket"],
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    // Încearcă să vadă dacă serverul e online; dacă da, pornește conexiunea
    fetch(`${base}/health`, { cache: "no-store" })
        .then(() => socket.connect())
        .catch(() => {
            console.warn(`[socket] server offline, skip connect for ${url}`);
        });

    sockets.set(url, socket);
    return socket;
}
