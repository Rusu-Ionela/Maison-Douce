import { useEffect, useRef, useState } from "react";
import api from "/src/lib/api.js";
import { getSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";

export default function ChatUtilizatori() {
  const { user } = useAuth() || {};
  const role = user?.rol || user?.role;
  const isAdmin = role === "admin" || role === "patiser";
  const socketRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("offline");

  const loadRooms = async () => {
    try {
      const res = await api.get("/mesaje-chat");
      const list = Array.isArray(res.data) ? res.data : [];
      const map = new Map();
      list.forEach((m) => {
        if (!m.room) return;
        const prev = map.get(m.room);
        const at = new Date(m.data || m.at || Date.now());
        if (!prev || at > prev.at) {
          map.set(m.room, { room: m.room, last: m.text, at });
        }
      });
      const sorted = Array.from(map.values()).sort((a, b) => b.at - a.at);
      setRooms(sorted);
      if (!activeRoom && sorted.length) setActiveRoom(sorted[0].room);
    } catch {
      setRooms([]);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadRooms();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !activeRoom) return;
    let mounted = true;

    (async () => {
      try {
        const res = await api.get(`/mesaje-chat/room/${encodeURIComponent(activeRoom)}`);
        if (mounted) setMessages(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (mounted) setMessages([]);
      }
    })();

    const socket = getSocket("/");
    socketRef.current = socket;
    socket.connect();
    socket.emit("joinRoom", activeRoom);

    const handleConnect = () => setStatus("online");
    const handleDisconnect = () => setStatus("offline");
    const handleReceive = (msg) => {
      if (msg?.room && msg.room !== activeRoom) {
        setRooms((prev) => {
          const next = prev.filter((r) => r.room !== msg.room);
          next.unshift({
            room: msg.room,
            last: msg.text || "Mesaj",
            at: new Date(msg.data || msg.at || Date.now()),
          });
          return next;
        });
        return;
      }
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("receiveMessage", handleReceive);

    return () => {
      mounted = false;
      socket.emit("leaveRoom", activeRoom);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("receiveMessage", handleReceive);
    };
  }, [activeRoom, isAdmin]);

  const uploadFile = async () => {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/upload", fd);
    return res.data?.url || null;
  };

  const sendMessage = async () => {
    if (!activeRoom || (!text.trim() && !file)) return;

    let fileUrl = null;
    try {
      fileUrl = await uploadFile();
    } catch {
      fileUrl = null;
    }

    const payload = {
      text: text.trim() || (fileUrl ? "Fisier atasat" : ""),
      room: activeRoom,
      utilizator: user?.nume || user?.name || "Admin",
      rol: role || "admin",
      authorId: user?._id || user?.id || undefined,
      fileUrl,
      fileName: file?.name || "",
    };

    try {
      socketRef.current?.emit("sendMessage", payload);
    } catch {
      try {
        await api.post("/mesaje-chat", payload);
      } catch {}
    }

    setMessages((prev) => [...prev, { ...payload, data: Date.now() }]);
    setText("");
    setFile(null);
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Chat admin</h2>
        <p className="text-gray-600">Aceasta zona este disponibila doar pentru admin.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
      <aside className="border rounded bg-white p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversatii</h2>
          <span className="text-xs text-gray-500">{status}</span>
        </div>
        {rooms.length === 0 && <div className="text-sm text-gray-600">Nu exista conversatii.</div>}
        <div className="space-y-2">
          {rooms.map((r) => (
            <button
              key={r.room}
              className={`w-full text-left border rounded p-2 ${activeRoom === r.room ? "bg-rose-50" : ""}`}
              onClick={() => setActiveRoom(r.room)}
            >
              <div className="font-semibold">{r.room}</div>
              <div className="text-xs text-gray-600 truncate">{r.last}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="lg:col-span-2 border rounded bg-white p-4">
        <h3 className="font-semibold mb-2">Mesaje</h3>
        <div className="border rounded h-72 overflow-auto p-2 mb-3 bg-gray-50">
          {messages.length === 0 && <div className="text-sm text-gray-500">Nu exista mesaje.</div>}
          {messages.map((m, i) => (
            <div key={i} className="my-2 text-sm">
              <div className="font-semibold">{m.utilizator || "Client"}:</div>
              <div>{m.text}</div>
              {m.fileUrl && (
                <a href={m.fileUrl} className="text-pink-600 underline" target="_blank" rel="noreferrer">
                  {m.fileName || "Fisier atasat"}
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <div className="flex gap-2">
            <input
              className="border flex-1 p-2 rounded"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Scrie un mesaj..."
            />
            <button onClick={sendMessage} className="border px-3 py-2 rounded">
              Trimite
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
