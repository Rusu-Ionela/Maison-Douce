import React, { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "../lib/socket";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function ChatUtilizatori() {
    const socketRef = useRef(null);

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [nume, setNume] = useState(localStorage.getItem("nume") || "");
    const [rol, setRol] = useState(localStorage.getItem("rol") || "client");
    const [status, setStatus] = useState("offline"); // "offline" | "connecting" | "online"

    // pÄƒstreazÄƒ nume/rol Ã®n localStorage
    useEffect(() => {
        localStorage.setItem("nume", nume);
    }, [nume]);
    useEffect(() => {
        localStorage.setItem("rol", rol);
    }, [rol]);

    // iniÈ›ializeazÄƒ socket + listener-e
    useEffect(() => {
        setStatus("connecting");
        const socket = getSocket("/user-chat");
        socketRef.current = socket;

        const handleConnect = () => setStatus("online");
        const handleDisconnect = () => setStatus("offline");
        const handleError = (err) => {
            console.warn("[socket] error", err?.message || err);
            setStatus("offline");
        };
        const handleReceive = (data) => {
            setMessages((prev) => [...prev, data]);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleError);
        socket.on("receiveMessage", handleReceive);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleError);
            socket.off("receiveMessage", handleReceive);
        };
    }, []);

    const sendMessage = useCallback(() => {
        const text = message.trim();
        const user = nume.trim();
        if (!user || !text) {
            alert("CompleteazÄƒ numele È™i mesajul!");
            return;
        }
        const socket = socketRef.current;
        if (!socket) return;

        if (!socket.connected) {
            // Ã®ncearcÄƒ o conectare rapidÄƒ (dacÄƒ backend-ul tocmai a pornit)
            try {
                socket.connect();
            } catch { }
            if (!socket.connected) {
                alert("Serverul de chat nu este disponibil momentan.");
                return;
            }
        }

        socket.emit("sendMessage", { text, utilizator: user, rol });
        setMessage("");
    }, [message, nume, rol]);

    return (
        <div className="p-6 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">ðŸ’¬ Chat Utilizatori</h2>
                <span
                    className={`text-xs px-2 py-0.5 rounded ${status === "online"
                            ? "bg-green-100 text-green-700"
                            : status === "connecting"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                        }`}
                >
                    {status}
                </span>
            </div>

            {!nume ? (
                <div className="mb-3">
                    <input
                        type="text"
                        placeholder="Nume"
                        onChange={(e) => setNume(e.target.value)}
                        className="border p-2 w-full"
                    />
                </div>
            ) : (
                <div className="mb-3 text-sm opacity-80">
                    Conectat ca <b>{nume}</b> ({rol})
                </div>
            )}

            <div className="mb-3">
                <label className="text-sm mr-2">Rol:</label>
                <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    className="border p-2"
                >
                    <option value="client">client</option>
                    <option value="admin">admin</option>
                    <option value="prestator">prestator</option>
                </select>
            </div>

            <div className="border p-2 h-64 overflow-y-auto mb-4 bg-white/60">
                {messages.length === 0 ? (
                    <div className="opacity-60 text-sm">Niciun mesaj Ã®ncÄƒ.</div>
                ) : (
                    messages.map((msg, i) => {
                        const mine = msg.utilizator === nume;
                        return (
                            <div
                                key={i}
                                className={`mb-2 ${mine ? "text-right" : "text-left"}`}
                            >
                                <span className="font-semibold">
                                    {msg.utilizator} ({msg.rol}):
                                </span>{" "}
                                {msg.text}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Scrie un mesaj..."
                    className="border p-2 flex-1"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") sendMessage();
                    }}
                />
                <button
                    onClick={sendMessage}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                    Trimite
                </button>
            </div>
        </div>
    );
}

