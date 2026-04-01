import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminShell, { AdminMetricGrid, AdminPanel } from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import { listAdminContactConversations } from "../api/contactConversations";
import api from "/src/lib/api.js";
import { getApiErrorMessage } from "../lib/serverState";
import { buttons } from "../lib/tailwindComponents";

const TYPE_META = {
  contact: {
    label: "Contact",
    className: "border-rose-200 bg-rose-50 text-pink-700",
  },
  ai: {
    label: "AI fallback",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  notification: {
    label: "Notificare",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPriorityQueue(contactItems, aiItems, notifications) {
  const contactQueue = (Array.isArray(contactItems) ? contactItems : [])
    .filter((item) => String(item?.status || "").trim() !== "finalizata")
    .map((item) => ({
      id: `contact-${item._id}`,
      type: "contact",
      title: item.clientName || item.clientEmail || "Conversatie contact",
      subtitle: item.lastMessagePreview || "Conversatie noua din formularul de contact.",
      meta: `${item.messageCount || 0} mesaje`,
      when: item.lastMessageAt || item.createdAt,
      status: item.status || "noua",
      target: "/admin/contact",
    }));

  const aiQueue = (Array.isArray(aiItems) ? aiItems : [])
    .filter((item) => !["rezolvata", "ignorata"].includes(String(item?.status || "").trim()))
    .map((item) => ({
      id: `ai-${item.id || item._id}`,
      type: "ai",
      title: item.query || "Intrebare AI fara text",
      subtitle:
        (Array.isArray(item.pathnames) && item.pathnames.length
          ? item.pathnames.slice(0, 2).join(" | ")
          : "Fallback fara pagina sursa"),
      meta: `${Number(item.hitCount || 0)} aparitii`,
      when: item.lastAskedAt || item.createdAt,
      status: item.status || "noua",
      target: "/admin/asistent-ai/intrebari",
    }));

  const notificationQueue = (Array.isArray(notifications) ? notifications : []).map((item) => ({
    id: `notification-${item._id}`,
    type: "notification",
    title: item.titlu || "Notificare operationala",
    subtitle: item.mesaj || "Eveniment fara descriere suplimentara.",
    meta: item.tip || "info",
    when: item.data,
    status: item.citita ? "citita" : "necitita",
    target: "/admin/notificari",
  }));

  return [...contactQueue, ...aiQueue, ...notificationQueue].sort(
    (left, right) => new Date(right.when || 0) - new Date(left.when || 0)
  );
}

export default function AdminInbox() {
  const [contactItems, setContactItems] = useState([]);
  const [aiItems, setAiItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [contactData, aiResponse, notificationsResponse] = await Promise.all([
        listAdminContactConversations({ limit: 25 }),
        api.get("/assistant/admin/questions", {
          params: {
            limit: 25,
          },
        }),
        api.get("/notificari", {
          params: { limit: 25 },
        }),
      ]);

      setContactItems(Array.isArray(contactData) ? contactData : []);
      setAiItems(Array.isArray(aiResponse.data?.items) ? aiResponse.data.items : []);
      setNotifications(Array.isArray(notificationsResponse.data) ? notificationsResponse.data : []);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Nu am putut incarca inboxul unificat pentru staff."
        )
      );
      setContactItems([]);
      setAiItems([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const queue = useMemo(
    () => buildPriorityQueue(contactItems, aiItems, notifications),
    [contactItems, aiItems, notifications]
  );

  const metrics = useMemo(() => {
    const openContact = contactItems.filter(
      (item) => String(item?.status || "").trim() !== "finalizata"
    ).length;
    const aiNeedsReview = aiItems.filter(
      (item) => !["rezolvata", "ignorata"].includes(String(item?.status || "").trim())
    ).length;
    const unreadNotifications = notifications.filter((item) => item?.citita !== true).length;

    return [
      {
        label: "Coada unificata",
        value: queue.length,
        hint: "Contact, AI fallback si notificari intr-un singur overview.",
        tone: "rose",
      },
      {
        label: "Contact deschis",
        value: openContact,
        hint: "Conversatii care cer raspuns sau urmarire.",
        tone: "sage",
      },
      {
        label: "AI in review",
        value: aiNeedsReview,
        hint: "Intrebari care inca nu au raspuns clar in knowledge base.",
        tone: "gold",
      },
      {
        label: "Necitite",
        value: unreadNotifications,
        hint: "Notificari operationale inca neconfirmate.",
        tone: "slate",
      },
    ];
  }, [aiItems, contactItems, notifications, queue.length]);

  return (
    <AdminShell
      title="Inbox unificat"
      description="Overview unic pentru staff: vezi in acelasi loc ce cere raspuns rapid din contact, ce intrebari AI au ramas fara acoperire si ce notificari operationale au aparut."
      actions={
        <>
          <Link to="/admin/contact" className={buttons.outline}>
            Inbox contact
          </Link>
          <button type="button" onClick={load} className={buttons.outline}>
            Reincarca
          </button>
        </>
      }
    >
      <StatusBanner type="error" message={error} />
      <StatusBanner
        type="info"
        message={loading ? "Se incarca overview-ul unificat pentru staff..." : ""}
      />

      <AdminMetricGrid items={metrics} />

      <AdminPanel
        title="Prioritati acum"
        description="Elementele sunt adunate din cele trei fluxuri si ordonate dupa ultima activitate cunoscuta."
      >
        {queue.length > 0 ? (
          <div className="space-y-3">
            {queue.slice(0, 12).map((item) => {
              const typeMeta = TYPE_META[item.type] || TYPE_META.notification;
              return (
                <article
                  key={item.id}
                  className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.9)] p-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${typeMeta.className}`}
                        >
                          {typeMeta.label}
                        </span>
                        <span className="text-xs uppercase tracking-[0.14em] text-[#8a8178]">
                          {formatDateTime(item.when)}
                        </span>
                      </div>
                      <div className="mt-3 text-lg font-semibold text-gray-900">{item.title}</div>
                      <div className="mt-2 text-sm leading-6 text-gray-600">{item.subtitle}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.14em] text-[#8a8178]">
                        {item.meta}
                      </div>
                    </div>

                    <Link to={item.target} className={buttons.outline}>
                      Deschide
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-5 text-sm text-gray-600">
            Nu exista elemente active in inboxul unificat pentru moment.
          </div>
        )}
      </AdminPanel>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminPanel
          title="Contact"
          description="Ultimele conversatii deschise din formularul de contact."
          action={
            <Link to="/admin/contact" className={buttons.outline}>
              Vezi toate
            </Link>
          }
        >
          <div className="space-y-3">
            {contactItems.slice(0, 5).map((item) => (
              <article
                key={item._id}
                className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {item.clientName || item.clientEmail || "Conversatie contact"}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8a8178]">
                  {item.status || "noua"} | {formatDateTime(item.lastMessageAt || item.createdAt)}
                </div>
                <div className="mt-3 text-sm leading-6 text-gray-600">
                  {item.lastMessagePreview || "Conversatie noua fara istoric suplimentar."}
                </div>
              </article>
            ))}
            {contactItems.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-rose-200 bg-white p-4 text-sm text-gray-600">
                Nu exista conversatii de contact.
              </div>
            ) : null}
          </div>
        </AdminPanel>

        <AdminPanel
          title="AI fallback"
          description="Intrebari care au ajuns la fallback si cer completare in knowledge base."
          action={
            <Link to="/admin/asistent-ai/intrebari" className={buttons.outline}>
              Vezi review AI
            </Link>
          }
        >
          <div className="space-y-3">
            {aiItems.slice(0, 5).map((item) => (
              <article
                key={item.id || item._id}
                className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4"
              >
                <div className="text-sm font-semibold text-gray-900">{item.query}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8a8178]">
                  {item.status || "noua"} | {Number(item.hitCount || 0)} aparitii
                </div>
                <div className="mt-3 text-sm leading-6 text-gray-600">
                  {(item.pathnames || []).slice(0, 2).join(" | ") || "Fara pagina sursa"}
                </div>
              </article>
            ))}
            {aiItems.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-rose-200 bg-white p-4 text-sm text-gray-600">
                Nu exista intrebari AI in fallback.
              </div>
            ) : null}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Notificari"
          description="Semnale operationale recente pentru stafful logat."
          action={
            <Link to="/admin/notificari" className={buttons.outline}>
              Vezi notificari
            </Link>
          }
        >
          <div className="space-y-3">
            {notifications.slice(0, 5).map((item) => (
              <article
                key={item._id}
                className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {item.titlu || "Notificare"}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8a8178]">
                  {item.citita ? "citita" : "necitita"} | {formatDateTime(item.data)}
                </div>
                <div className="mt-3 text-sm leading-6 text-gray-600">
                  {item.mesaj || "Fara mesaj suplimentar."}
                </div>
              </article>
            ))}
            {notifications.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-rose-200 bg-white p-4 text-sm text-gray-600">
                Nu exista notificari recente.
              </div>
            ) : null}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
