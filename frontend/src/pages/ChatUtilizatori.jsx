import { useEffect, useMemo, useRef, useState } from "react";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import api from "/src/lib/api.js";
import { getSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { buttons, inputs } from "../lib/tailwindComponents";

function messageTimestamp(message) {
  const value = message?.data || message?.at || message?.createdAt || Date.now();
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function messageKey(message) {
  if (message?._id) return String(message._id);
  return [
    message?.room || "",
    message?.authorId || message?.utilizator || "",
    message?.text || "",
    message?.fileUrl || "",
    messageTimestamp(message),
  ].join("::");
}

function mergeMessages(current, incoming) {
  const next = [...current];
  const seen = new Set(current.map((item) => messageKey(item)));

  incoming.forEach((item) => {
    const key = messageKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      next.push(item);
    }
  });

  return next.sort((left, right) => messageTimestamp(left) - messageTimestamp(right));
}

function formatRoomLabel(room) {
  if (!room) return "Conversatie";
  if (!room.startsWith("user-")) return room;
  const suffix = room.replace("user-", "");
  return `Client #${suffix.slice(-6) || suffix}`;
}

function summarizeRooms(messages) {
  const map = new Map();

  messages.forEach((message) => {
    if (!message?.room) return;

    const summary = {
      room: message.room,
      label: formatRoomLabel(message.room),
      last: message.text || (message.fileUrl ? "Fisier atasat" : "Mesaj"),
      at: messageTimestamp(message),
      author: message.utilizator || "Client",
    };

    const previous = map.get(summary.room);
    if (!previous || summary.at >= previous.at) {
      map.set(summary.room, summary);
    }
  });

  return Array.from(map.values()).sort((left, right) => right.at - left.at);
}

function upsertRoomSummary(current, message) {
  if (!message?.room) return current;

  const summary = {
    room: message.room,
    label: formatRoomLabel(message.room),
    last: message.text || (message.fileUrl ? "Fisier atasat" : "Mesaj"),
    at: messageTimestamp(message),
    author: message.utilizator || "Client",
  };

  const next = current.filter((item) => item.room !== summary.room);
  next.unshift(summary);
  return next.sort((left, right) => right.at - left.at);
}

function connectionClass(state) {
  if (state === "online") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "offline") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-rose-200 bg-rose-50 text-pink-700";
}

function connectionLabel(state) {
  if (state === "online") return "Conectat live";
  if (state === "offline") return "Fallback HTTP";
  return "Se conecteaza";
}

function MessageBubble({ message, currentUserId }) {
  const ownMessage = String(message?.authorId || "") === String(currentUserId || "");

  return (
    <article
      className={`max-w-[88%] rounded-[24px] border px-4 py-3 shadow-soft ${
        ownMessage
          ? "ml-auto border-rose-200 bg-rose-50 text-gray-800"
          : "border-stone-200 bg-white text-gray-800"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">
          {ownMessage ? "Tu" : message?.utilizator || "Client"}
        </div>
        <div className="text-xs text-gray-500">
          {formatDateTime(message?.data || message?.at || message?.createdAt)}
        </div>
      </div>
      {message?.text ? <p className="mt-2 whitespace-pre-wrap text-sm">{message.text}</p> : null}
      {message?.fileUrl ? (
        <a
          href={message.fileUrl}
          className="mt-3 inline-flex text-sm font-semibold text-pink-700 underline underline-offset-4"
          target="_blank"
          rel="noreferrer"
        >
          {message.fileName || "Fisier atasat"}
        </a>
      ) : null}
    </article>
  );
}

export default function ChatUtilizatori() {
  const { user } = useAuth() || {};
  const role = user?.rol || user?.role;
  const isAdmin = role === "admin" || role === "patiser";
  const currentUserId = String(user?._id || user?.id || "");
  const currentUserName = user?.nume || user?.name || "Admin";

  const socketRef = useRef(null);
  const activeRoomRef = useRef("");
  const previousRoomRef = useRef("");
  const scrollRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [socketState, setSocketState] = useState("connecting");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [unreadByRoom, setUnreadByRoom] = useState({});

  activeRoomRef.current = activeRoom;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let mounted = true;

    async function loadRooms() {
      setLoadingRooms(true);
      try {
        const res = await api.get("/mesaje-chat");
        if (!mounted) return;
        const list = summarizeRooms(Array.isArray(res.data) ? res.data : []);
        setRooms(list);
        setActiveRoom((current) => current || list[0]?.room || "");
      } catch (error) {
        if (!mounted) return;
        setRooms([]);
        setNotice({
          type: "error",
          message: error?.response?.data?.message || "Nu am putut incarca conversatiile.",
        });
      } finally {
        if (mounted) {
          setLoadingRooms(false);
        }
      }
    }

    loadRooms();

    const socket = getSocket("/");
    socketRef.current = socket;

    const handleConnect = () => {
      if (!mounted) return;
      setSocketState("online");
      if (activeRoomRef.current) {
        socket.emit("joinRoom", activeRoomRef.current);
      }
    };

    const handleDisconnect = () => {
      if (!mounted) return;
      setSocketState("offline");
    };

    const handleConnectError = () => {
      if (!mounted) return;
      setSocketState("offline");
    };

    const handleReceive = (message) => {
      if (!mounted || !message?.room) return;

      setRooms((current) => upsertRoomSummary(current, message));

      if (message.room === activeRoomRef.current) {
        setMessages((current) => mergeMessages(current, [message]));
        return;
      }

      if (String(message?.authorId || "") !== currentUserId) {
        setUnreadByRoom((current) => ({
          ...current,
          [message.room]: (current[message.room] || 0) + 1,
        }));
      }

      setActiveRoom((current) => current || message.room);
    };

    setSocketState(socket.connected ? "online" : "connecting");
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("receiveMessage", handleReceive);

    socket.connect();
    if (socket.connected && activeRoomRef.current) {
      socket.emit("joinRoom", activeRoomRef.current);
    }

    return () => {
      mounted = false;
      if (activeRoomRef.current) {
        socket.emit("leaveRoom", activeRoomRef.current);
      }
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("receiveMessage", handleReceive);
    };
  }, [currentUserId, isAdmin]);

  useEffect(() => {
    if (!isAdmin || !activeRoom) return undefined;
    let mounted = true;
    const socket = socketRef.current;

    if (previousRoomRef.current && previousRoomRef.current !== activeRoom) {
      socket?.emit("leaveRoom", previousRoomRef.current);
    }
    socket?.emit("joinRoom", activeRoom);
    previousRoomRef.current = activeRoom;

    setUnreadByRoom((current) => ({ ...current, [activeRoom]: 0 }));
    setLoadingMessages(true);

    api
      .get(`/mesaje-chat/room/${encodeURIComponent(activeRoom)}`)
      .then((res) => {
        if (!mounted) return;
        setMessages(mergeMessages([], Array.isArray(res.data) ? res.data : []));
      })
      .catch((error) => {
        if (!mounted) return;
        setMessages([]);
        setNotice({
          type: "error",
          message:
            error?.response?.data?.message ||
            "Nu am putut incarca istoricul pentru conversatia selectata.",
        });
      })
      .finally(() => {
        if (mounted) {
          setLoadingMessages(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [activeRoom, isAdmin]);

  const uploadFile = async () => {
    if (!file) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData);
      return res.data?.url || null;
    } finally {
      setUploading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    setNotice({ type: "", message: "" });

    try {
      const roomsResponse = await api.get("/mesaje-chat");
      const roomList = summarizeRooms(Array.isArray(roomsResponse.data) ? roomsResponse.data : []);
      setRooms(roomList);
      if (!activeRoom && roomList.length) {
        setActiveRoom(roomList[0].room);
      }

      if (activeRoom) {
        const messagesResponse = await api.get(
          `/mesaje-chat/room/${encodeURIComponent(activeRoom)}`
        );
        setMessages(
          mergeMessages([], Array.isArray(messagesResponse.data) ? messagesResponse.data : [])
        );
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: error?.response?.data?.message || "Nu am putut reincarca chat-ul.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const sendMessage = async () => {
    if (!activeRoom || (!text.trim() && !file) || sending) return;

    setSending(true);
    setNotice({ type: "", message: "" });

    try {
      const fileUrl = await uploadFile();
      const payload = {
        text: text.trim() || (fileUrl ? "Fisier atasat" : ""),
        room: activeRoom,
        utilizator: currentUserName,
        rol: role || "admin",
        authorId: currentUserId || undefined,
        fileUrl,
        fileName: file?.name || "",
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit("sendMessage", payload);
      } else {
        const res = await api.post("/mesaje-chat", payload);
        setMessages((current) => mergeMessages(current, [res.data || payload]));
        setRooms((current) => upsertRoomSummary(current, res.data || payload));
        setNotice({
          type: "warning",
          message: "Mesajul a fost trimis prin conexiunea de rezerva.",
        });
      }

      setUnreadByRoom((current) => ({ ...current, [activeRoom]: 0 }));
      setText("");
      setFile(null);
    } catch (error) {
      setNotice({
        type: "error",
        message: error?.response?.data?.message || "Nu am putut trimite mesajul.",
      });
    } finally {
      setSending(false);
    }
  };

  const metrics = useMemo(() => {
    const unreadRooms = Object.values(unreadByRoom).filter((count) => count > 0).length;
    return [
      {
        label: "Conversatii",
        value: rooms.length,
        hint: "Room-uri active salvate in istoric.",
        tone: "rose",
      },
      {
        label: "Room selectat",
        value: activeRoom ? formatRoomLabel(activeRoom) : "-",
        hint: activeRoom || "Selecteaza o conversatie din lista.",
        tone: "sage",
      },
      {
        label: "Mesaje vizibile",
        value: messages.length,
        hint: "Istoricul incarcat pentru conversatia activa.",
        tone: "gold",
      },
      {
        label: "Need review",
        value: unreadRooms,
        hint: "Conversatii cu mesaje noi neparcurse.",
        tone: "slate",
      },
    ];
  }, [activeRoom, messages.length, rooms.length, unreadByRoom]);

  const activeRoomMeta = useMemo(
    () => rooms.find((item) => item.room === activeRoom) || null,
    [activeRoom, rooms]
  );

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-[28px] border border-rose-100 bg-white p-6 shadow-card">
          <h1 className="font-serif text-3xl font-semibold text-gray-900">Chat admin</h1>
          <p className="mt-3 text-gray-600">
            Aceasta pagina este disponibila doar pentru utilizatorii cu rol admin sau
            patiser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      title="Conversatii clienti"
      description="Administreaza rapid conversatiile active, vezi cine asteapta raspuns si raspunde direct dintr-un workspace unic."
      actions={
        <>
          <span
            className={`inline-flex rounded-full border px-3 py-2 text-sm font-semibold ${connectionClass(socketState)}`}
          >
            {connectionLabel(socketState)}
          </span>
          <button
            type="button"
            onClick={refreshData}
            className={buttons.outline}
            disabled={refreshing}
          >
            {refreshing ? "Reincarc..." : "Reincarca"}
          </button>
        </>
      }
    >
      <AdminMetricGrid items={metrics} />

      {notice.message ? (
        <div
          className={`rounded-[20px] border px-4 py-3 text-sm ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : notice.type === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-rose-200 bg-rose-50 text-pink-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.45fr]">
        <AdminPanel
          title="Conversatii active"
          description="Lista este ordonata dupa ultimul mesaj. Room-urile cu trafic nou raman marcate pana cand sunt deschise."
        >
          {loadingRooms ? (
            <div className="rounded-[24px] border border-dashed border-rose-200 px-4 py-10 text-sm text-gray-500">
              Se incarca lista conversatiilor...
            </div>
          ) : rooms.length ? (
            <div className="space-y-3">
              {rooms.map((room) => {
                const unread = unreadByRoom[room.room] || 0;
                const isActive = room.room === activeRoom;

                return (
                  <button
                    key={room.room}
                    type="button"
                    onClick={() => setActiveRoom(room.room)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      isActive
                        ? "border-rose-200 bg-rose-50 shadow-soft"
                        : "border-rose-100 bg-white hover:border-rose-200 hover:bg-rose-50/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{room.label}</div>
                        <div className="mt-1 text-xs text-gray-500">{room.room}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {unread ? (
                          <span className="inline-flex rounded-full bg-pink-600 px-2.5 py-1 text-xs font-semibold text-white">
                            {unread}
                          </span>
                        ) : null}
                        <span className="text-xs text-gray-500">{formatDateTime(room.at)}</span>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-700">{room.last}</div>
                    <div className="mt-2 text-xs text-gray-500">
                      Ultimul autor: {room.author || "Client"}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-rose-200 bg-rose-50/40 px-4 py-10 text-sm text-gray-500">
              Nu exista inca nicio conversatie salvata.
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          title={activeRoom ? formatRoomLabel(activeRoom) : "Mesaje"}
          description={
            activeRoomMeta
              ? `Ultimul mesaj: ${formatDateTime(activeRoomMeta.at)}`
              : "Selecteaza o conversatie pentru a vedea istoricul complet."
          }
        >
          {activeRoom ? (
            <div className="space-y-4">
              <div
                ref={scrollRef}
                className="max-h-[32rem] min-h-[24rem] space-y-3 overflow-y-auto rounded-[24px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,250,242,0.92),_rgba(255,255,255,0.98))] p-4"
              >
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Se incarca istoricul conversatiei...
                  </div>
                ) : messages.length ? (
                  messages.map((message) => (
                    <MessageBubble
                      key={messageKey(message)}
                      message={message}
                      currentUserId={currentUserId}
                    />
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-rose-200 bg-white/80 px-6 text-center text-sm text-gray-500">
                    Conversatia selectata nu are inca mesaje.
                  </div>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr,0.32fr]">
                <div className="space-y-3">
                  <textarea
                    className={`${inputs.default} min-h-[140px] resize-y`}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Trimite clarificari, confirmari sau instructiuni operationale..."
                  />
                  <div className="text-xs text-gray-500">
                    `Enter` trimite mesajul, `Shift + Enter` adauga rand nou.
                  </div>
                </div>

                <div className="space-y-3 rounded-[24px] border border-rose-100 bg-rose-50/60 p-4">
                  <label className="block text-sm font-semibold text-gray-900">
                    Atasament
                    <input
                      className="mt-2 block w-full text-sm text-gray-600"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv"
                      onChange={(event) => setFile(event.target.files?.[0] || null)}
                    />
                  </label>
                  <div className="min-h-[3rem] rounded-2xl border border-dashed border-rose-200 bg-white/80 px-3 py-2 text-sm text-gray-600">
                    {file ? file.name : "Nu ai selectat niciun fisier."}
                  </div>
                  <button
                    type="button"
                    className={buttons.primary}
                    disabled={(!text.trim() && !file) || sending || uploading}
                    onClick={sendMessage}
                  >
                    {uploading
                      ? "Se incarca fisierul..."
                      : sending
                      ? "Se trimite..."
                      : "Trimite raspuns"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-rose-200 bg-rose-50/40 px-4 py-10 text-sm text-gray-500">
              Selecteaza o conversatie din coloana stanga pentru a vedea istoricul si
              pentru a raspunde.
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
