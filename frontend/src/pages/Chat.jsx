import { useEffect, useRef, useState } from "react";
import api from "/src/lib/api.js";
import { getSocket } from "/src/lib/socket.js";
import { useAuth } from "../context/AuthContext";

export default function Chat() {
  const { user } = useAuth() || {};
  const [room, setRoom] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const userId = user?._id || user?.id || "anon";
      const roomId = `user-${userId}`;
      if (!mounted) return;
      setRoom(roomId);

      try {
        const res = await api.get(`/mesaje-chat/room/${encodeURIComponent(roomId)}`);
        if (mounted) setMsgs(res.data || []);
      } catch (e) {
        console.warn("Nu am putut incarca istoricul:", e?.message || e);
      }

      const socket = getSocket("/");
      socket.connect();
      socket.emit("joinRoom", roomId);
      socket.on("receiveMessage", (m) => {
        if (!mounted) return;
        setMsgs((prev) => [...prev, m]);
      });
      socketRef.current = socket;
    })();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect?.();
      }
    };
  }, [user?._id, user?.id]);

  const uploadFile = async () => {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/upload", fd);
    return res.data?.url || null;
  };

  const send = async () => {
    if (!text.trim() && !file) return;
    if (!room) return;

    let fileUrl = null;
    try {
      fileUrl = await uploadFile();
    } catch (e) {
      console.warn("Upload failed:", e?.message || e);
    }

    const payload = {
      text: text.trim() || (fileUrl ? "Fisier atasat" : ""),
      utilizator: user?.nume || user?.name || "Client",
      room,
      authorId: user?._id || user?.id || undefined,
      fileUrl,
      fileName: file?.name || "",
    };

    try {
      socketRef.current?.emit("sendMessage", payload);
    } catch (e) {
      console.warn("Socket emit failed, fallback HTTP:", e?.message || e);
      try {
        await api.post("/mesaje-chat", payload);
      } catch {}
    }

    setMsgs((prev) => [...prev, { ...payload, data: Date.now() }]);
    setText("");
    setFile(null);
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-lg mb-2">Chat cu patiserul</h1>
      <div className="border rounded h-72 overflow-auto p-2 mb-2 bg-white">
        {msgs.map((m, i) => (
          <div key={i} className="my-2 text-sm">
            <div className="font-semibold">{m.utilizator || m.author || "Client"}:</div>
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
        <input
          className="border p-2"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <div className="flex gap-2">
          <input
            className="border flex-1 p-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Scrie un mesaj..."
          />
          <button onClick={send} className="border px-3 py-2 rounded">
            Trimite
          </button>
        </div>
      </div>
    </div>
  );
}
