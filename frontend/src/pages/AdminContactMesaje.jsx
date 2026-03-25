import { useEffect, useMemo, useState } from "react";
import ContactConversationWorkspace from "../components/contact/ContactConversationWorkspace";
import { useAuth } from "../context/AuthContext";
import {
  getContactConversation,
  getContactConversationMessages,
  listAdminContactConversations,
  sendContactConversationMessage,
  updateContactConversationStatus,
} from "../api/contactConversations";

const STATUS_OPTIONS = [
  { value: "noua", label: "Noua" },
  { value: "in_progres", label: "In progres" },
  { value: "finalizata", label: "Finalizata" },
];

export default function AdminContactMesaje() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const selectedConversationFromList = useMemo(
    () => items.find((item) => item._id === selectedConversationId) || null,
    [items, selectedConversationId]
  );

  const load = async (status = statusFilter, { silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    }
    setLoading(true);
    setMsg("");

    try {
      const data = await listAdminContactConversations({
        limit: 200,
        ...(status ? { status } : {}),
      });
      const nextItems = Array.isArray(data) ? data : [];
      setItems(nextItems);

      setSelectedConversationId((current) => {
        if (current && nextItems.some((item) => item._id === current)) return current;
        return nextItems[0]?._id || "";
      });
    } catch (error) {
      setItems([]);
      setMsg(error?.response?.data?.message || "Nu am putut incarca mesajele de contact.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;

    async function loadThread() {
      if (!selectedConversationId) {
        setSelectedConversation(null);
        setMessages([]);
        return;
      }

      setThreadLoading(true);
      setMsg("");

      try {
        const [conversation, thread] = await Promise.all([
          getContactConversation(selectedConversationId),
          getContactConversationMessages(selectedConversationId),
        ]);

        if (!active) return;
        setSelectedConversation(conversation || null);
        setMessages(Array.isArray(thread) ? thread : []);
      } catch (error) {
        if (!active) return;
        setSelectedConversation(null);
        setMessages([]);
        setMsg(error?.response?.data?.message || "Nu am putut incarca conversatia selectata.");
      } finally {
        if (active) {
          setThreadLoading(false);
        }
      }
    }

    loadThread();
    return () => {
      active = false;
    };
  }, [selectedConversationId]);

  const sendReply = async () => {
    if (!selectedConversationId || !replyText.trim()) return;

    try {
      setSending(true);
      await sendContactConversationMessage(selectedConversationId, replyText.trim());
      setReplyText("");
      await load(statusFilter, { silent: true });

      const [conversation, thread] = await Promise.all([
        getContactConversation(selectedConversationId),
        getContactConversationMessages(selectedConversationId),
      ]);
      setSelectedConversation(conversation || null);
      setMessages(Array.isArray(thread) ? thread : []);
    } catch (error) {
      setMsg(error?.response?.data?.message || "Nu am putut trimite raspunsul.");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status) => {
    if (!selectedConversationId) return;

    try {
      setStatusUpdating(true);
      const updated = await updateContactConversationStatus(selectedConversationId, status);
      setSelectedConversation(updated || null);
      await load(statusFilter, { silent: true });
    } catch (error) {
      setMsg(error?.response?.data?.message || "Nu am putut actualiza statusul.");
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-editorial space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Mesaje contact</div>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-ink">
            Conversatii client - patiser
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => {
              const next = event.target.value;
              setStatusFilter(next);
              load(next, { silent: true });
            }}
            className="w-[220px] rounded-[22px] border border-rose-200 bg-[rgba(255,253,249,0.96)] px-4 py-3 text-ink shadow-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-sage/30"
          >
            <option value="">Toate statusurile</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ContactConversationWorkspace
        mode="admin"
        title="Inbox premium pentru solicitarile din contact"
        subtitle="Selecteaza conversatia din stanga, vezi istoricul complet si raspunde direct clientului fara sa parasesti pagina."
        conversations={items}
        selectedConversationId={selectedConversationId}
        onSelectConversation={(conversation) => {
          setSelectedConversationId(conversation?._id || "");
          setReplyText("");
        }}
        selectedConversation={selectedConversation || selectedConversationFromList}
        messages={messages}
        listLoading={loading}
        threadLoading={threadLoading}
        composerValue={replyText}
        onComposerChange={setReplyText}
        onSend={sendReply}
        sending={sending}
        notice={msg ? { type: "error", text: msg } : null}
        currentUserId={user?._id || user?.id || ""}
        onRefresh={() => load(statusFilter, { silent: true })}
        refreshing={refreshing}
        statusOptions={STATUS_OPTIONS}
        onStatusChange={changeStatus}
        statusUpdating={statusUpdating}
        emptyListTitle="Nu exista conversatii pentru filtrul curent."
        emptyListText="Mesajele noi din formularul de contact si raspunsurile clientilor vor aparea aici."
        emptyThreadTitle="Alege o conversatie din inbox."
        emptyThreadText="Istoricul complet, raspunsurile si schimbarea de status se gestioneaza in partea dreapta."
        composerPlaceholder="Scrie raspunsul catre client..."
      />
    </div>
  );
}
