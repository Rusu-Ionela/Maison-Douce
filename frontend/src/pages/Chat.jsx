import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "/src/lib/api.js";
import { getSocket } from "/src/lib/socket.js";
import ProviderSelector from "../components/ProviderSelector";
import { useAuth } from "../context/AuthContext";
import { buildConversationRoom, useProviderDirectory } from "../lib/providers";
import { buttons, cards, inputs } from "../lib/tailwindComponents";

function messageTimestamp(message) {
  const value = message?.data || message?.at || message?.createdAt || Date.now();
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
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

function formatDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "acum";
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatConnectionState(state) {
  if (state === "online") return "Conectat live";
  if (state === "offline") return "Fallback HTTP";
  return "Se conecteaza";
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
          {ownMessage ? "Tu" : message?.utilizator || "Atelier"}
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

export default function Chat() {
  const { user } = useAuth() || {};
  const location = useLocation();
  const currentUserId = String(user?._id || user?.id || "");
  const currentUserName = user?.nume || user?.name || "Client";
  const providerState = useProviderDirectory({ user });
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const chatContext = useMemo(() => String(query.get("context") || "").trim(), [query]);
  const suggestedMessage = useMemo(() => String(query.get("message") || "").trim(), [query]);
  const requestedProviderId = useMemo(
    () => String(query.get("providerId") || "").trim(),
    [query]
  );
  const roomId = useMemo(
    () => buildConversationRoom(currentUserId, providerState.activeProviderId),
    [currentUserId, providerState.activeProviderId]
  );

  const socketRef = useRef(null);
  const scrollRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socketState, setSocketState] = useState("connecting");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  useEffect(() => {
    if (requestedProviderId && requestedProviderId !== providerState.activeProviderId) {
      providerState.setSelectedProviderId(requestedProviderId);
    }
  }, [providerState, requestedProviderId]);

  useEffect(() => {
    if (suggestedMessage && !text.trim()) {
      setText(suggestedMessage);
    }
  }, [suggestedMessage, text]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    let mounted = true;

    async function loadHistory({ silent = false } = {}) {
      if (!roomId) {
        setMessages([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await api.get(`/mesaje-chat/room/${encodeURIComponent(roomId)}`);
        if (!mounted) return;
        setMessages((current) =>
          silent ? mergeMessages(current, res.data || []) : mergeMessages([], res.data || [])
        );
        setNotice((current) =>
          current.type === "error" ? { type: "", message: "" } : current
        );
      } catch (error) {
        if (!mounted) return;
        setNotice({
          type: "error",
          message:
            error?.response?.data?.message || "Nu am putut incarca istoricul conversatiei.",
        });
      } finally {
        if (mounted) {
          if (silent) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
        }
      }
    }

    loadHistory();

    const socket = getSocket("/");
    socketRef.current = socket;

    const joinRoom = () => {
      if (roomId) {
        socket.emit("joinRoom", roomId);
      }
    };

    const handleConnect = () => {
      if (!mounted) return;
      setSocketState("online");
      joinRoom();
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
      if (!mounted || message?.room !== roomId) return;
      setMessages((current) => mergeMessages(current, [message]));
    };

    setSocketState(socket.connected ? "online" : "connecting");
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("receiveMessage", handleReceive);

    socket.connect();
    if (socket.connected) {
      joinRoom();
    }

    return () => {
      mounted = false;
      socket.emit("leaveRoom", roomId);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("receiveMessage", handleReceive);
    };
  }, [roomId]);

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

  const sendMessage = async () => {
    if ((!text.trim() && !file) || !roomId || sending) return;

    setSending(true);
    setNotice({ type: "", message: "" });

    try {
      const fileUrl = await uploadFile();
      const payload = {
        text: text.trim() || (fileUrl ? "Fisier atasat" : ""),
        utilizator: currentUserName,
        room: roomId,
        authorId: currentUserId || undefined,
        fileUrl,
        fileName: file?.name || "",
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit("sendMessage", payload);
      } else {
        const res = await api.post("/mesaje-chat", payload);
        setMessages((current) => mergeMessages(current, [res.data || payload]));
        setNotice({
          type: "warning",
          message: "Mesajul a fost trimis prin conexiunea de rezerva.",
        });
      }

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

  const stats = useMemo(
    () => [
      {
        label: "Mesaje",
        value: messages.length,
        hint: "Istoricul conversatiei tale cu laboratorul.",
      },
      {
        label: "Ultimul raspuns",
        value:
          messages.length > 0
            ? formatDateTime(messages[messages.length - 1]?.data || messages[messages.length - 1]?.at)
            : "-",
        hint: "Actualizat automat cand exista conexiune live.",
      },
    ],
    [messages]
  );

  const canSend = Boolean(text.trim() || file) && !sending && !uploading;

  return (
    <div className="mx-auto max-w-editorial space-y-6 px-4 py-8 sm:px-6">
      <section className={`${cards.tinted} space-y-5`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
              Conversatie client
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold text-gray-900">
              Chat cu atelierul
            </h1>
            <p className="mt-3 text-base leading-7 text-gray-600">
              Foloseste acest canal pentru clarificari rapide despre comanda, fisiere
              de inspiratie sau confirmari de livrare.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[260px]">
              <ProviderSelector
                providers={providerState.providers}
                value={providerState.activeProviderId}
                onChange={providerState.setSelectedProviderId}
                loading={providerState.loading}
                disabled={!providerState.canChooseProvider}
                label="Conversatie cu"
                helpText={
                  providerState.activeProvider
                    ? `Mesajele sunt trimise catre ${providerState.activeProvider.displayName}.`
                    : "Selecteaza atelierul cu care vrei sa discuti."
                }
              />
            </div>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${connectionClass(socketState)}`}
            >
              {formatConnectionState(socketState)}
            </span>
            <button
              type="button"
              onClick={() => {
                setNotice({ type: "", message: "" });
                setRefreshing(true);
                api
                  .get(`/mesaje-chat/room/${encodeURIComponent(roomId)}`)
                  .then((res) => {
                    setMessages((current) => mergeMessages(current, res.data || []));
                  })
                  .catch((error) => {
                    setNotice({
                      type: "error",
                      message:
                        error?.response?.data?.message ||
                        "Nu am putut reincarca istoricul conversatiei.",
                    });
                  })
                  .finally(() => setRefreshing(false));
              }}
              className={buttons.outline}
              disabled={refreshing}
            >
              {refreshing ? "Reincarc..." : "Reincarca"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {stats.map((item) => (
            <article
              key={item.label}
              className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft"
            >
              <div className="text-sm font-medium text-pink-700">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</div>
              <div className="mt-2 text-sm text-[#655c53]">{item.hint}</div>
            </article>
          ))}
        </div>

        {notice.message ? (
          <div
            className={`rounded-[24px] border px-4 py-3 text-sm shadow-soft ${
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
        {!providerState.loading && !providerState.activeProviderId ? (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {providerState.error ||
              "Nu exista un atelier selectat pentru aceasta conversatie."}
          </div>
        ) : null}
      </section>

      <section className={`${cards.elevated} space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Istoric conversatie</h2>
            <p className="mt-1 text-sm text-gray-600">
              Vezi toate mesajele si fisierele schimbate cu echipa.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {providerState.activeProvider
              ? providerState.activeProvider.displayName
              : roomId || "Fara room activ"}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="max-h-[28rem] min-h-[22rem] space-y-3 overflow-y-auto rounded-[24px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,252,247,0.94),_rgba(246,239,228,0.92))] p-4"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Se incarca istoricul...
            </div>
          ) : !roomId ? (
            <div className="flex h-full flex-col items-center justify-center rounded-[20px] border border-dashed border-rose-200 bg-white/80 px-6 text-center text-sm text-gray-500">
              <div className="font-semibold text-gray-900">Alege atelierul.</div>
              <div className="mt-2">
                Dupa selectare, istoricul conversatiei va fi incarcat automat.
              </div>
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
            <div className="flex h-full flex-col items-center justify-center rounded-[20px] border border-dashed border-rose-200 bg-white/80 px-6 text-center text-sm text-gray-500">
              <div className="font-semibold text-gray-900">Conversatia este goala.</div>
              <div className="mt-2">
                Trimite primul mesaj sau incarca o imagine cu modelul dorit.
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={`${cards.elevated} space-y-4`}>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Compune mesajul</h2>
          <p className="mt-1 text-sm text-gray-600">
            Descrie exact ce ai nevoie. Poti adauga si un fisier de referinta.
          </p>
        </div>

        {chatContext ? (
          <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
              Context activ
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900">{chatContext}</div>
            <div className="mt-1 text-sm text-gray-600">
              Mesajele trimise acum sunt pentru acest design sau aceasta comanda.
            </div>
          </div>
        ) : null}

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
              placeholder="Scrie cerinta, intrebarile sau confirmarile importante..."
            />
            <div className="text-xs text-gray-500">
              `Enter` trimite mesajul, `Shift + Enter` adauga rand nou.
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4">
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
              disabled={!canSend}
              onClick={sendMessage}
            >
              {uploading ? "Se incarca fisierul..." : sending ? "Se trimite..." : "Trimite"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
