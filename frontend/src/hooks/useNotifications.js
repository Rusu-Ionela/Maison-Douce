import { useEffect } from "react";
import { io } from "socket.io-client";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export function useNotifications() {
    useEffect(() => {
        const s = io(BASE_URL.replace(/\/api$/, ""), {
            withCredentials: true,
            auth: { token: localStorage.getItem("token") },
        });
        s.on("notify", (payload) => alert(payload.message));
        return () => s.disconnect();
    }, []);
}

