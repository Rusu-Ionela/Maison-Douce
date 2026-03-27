import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { buildAssistantReply, STARTER_QUESTIONS } from "../lib/clientAssistant";

function createMessage(role, payload) {
  return {
    id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    text: payload.text,
    actions: payload.actions || [],
  };
}

function ActionLink({ action, onNavigate }) {
  if (action.type === "href") {
    return (
      <a
        href={action.href}
        onClick={onNavigate}
        className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-pink-700 transition hover:border-rose-300 hover:bg-rose-50"
      >
        {action.label}
      </a>
    );
  }

  return (
    <Link
      to={action.to}
      onClick={onNavigate}
      className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-pink-700 transition hover:border-rose-300 hover:bg-rose-50"
    >
      {action.label}
    </Link>
  );
}

export default function ClientAssistantWidget() {
  const { pathname } = useLocation();
  const { user } = useAuth() || {};
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState(() => [
    createMessage("assistant", {
      text:
        "Sunt asistentul Maison-Douce. Iti raspund rapid la intrebari despre constructor, livrare, plata, voucher, calendar sau contact.",
      actions: [
        { type: "route", label: "Constructor 2D", to: "/constructor" },
        { type: "route", label: "Calendar", to: "/calendar" },
        { type: "route", label: "Contact", to: "/contact" },
      ],
    }),
  ]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/prestator")) {
    return null;
  }

  const sendQuestion = (nextQuery) => {
    const trimmedQuery = String(nextQuery || "").trim();
    if (!trimmedQuery) return;

    const reply = buildAssistantReply({
      query: trimmedQuery,
      pathname,
      user,
    });

    setMessages((prev) => [
      ...prev,
      createMessage("user", { text: trimmedQuery }),
      createMessage("assistant", reply),
    ]);
    setQuery("");
    setOpen(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="w-[380px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[32px] border border-rose-100 bg-[rgba(255,251,245,0.97)] shadow-floating backdrop-blur-xl">
          <div className="border-b border-rose-100 bg-[linear-gradient(180deg,_rgba(255,252,247,0.98),_rgba(242,236,226,0.98))] px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-600">
              Asistent AI
            </div>
            <div className="mt-2 font-serif text-2xl text-ink">Maison-Douce</div>
            <div className="mt-1 text-sm leading-6 text-[#766d64]">
              Pune o intrebare scurta si iti trimit direct pagina potrivita.
            </div>
          </div>

          <div className="max-h-[52vh] space-y-3 overflow-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={[
                    "max-w-[88%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-soft",
                    message.role === "user"
                      ? "bg-charcoal text-white"
                      : "border border-rose-100 bg-white text-[#5f564d]",
                  ].join(" ")}
                >
                  <div>{message.text}</div>
                  {message.actions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action) => (
                        <ActionLink
                          key={`${message.id}_${action.label}`}
                          action={action}
                          onNavigate={() => setOpen(false)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-rose-100 bg-white/70 px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {STARTER_QUESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => sendQuestion(item)}
                  className="rounded-full border border-rose-200 bg-[rgba(255,249,242,0.92)] px-3 py-2 text-xs font-semibold text-[#6c6259] transition hover:border-rose-300 hover:bg-white hover:text-pink-700"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendQuestion(query);
                  }
                }}
                className="min-h-[52px] flex-1 rounded-[22px] border border-rose-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-pink-400 focus:ring-4 focus:ring-sage/30"
                placeholder="Ex: nu gasesc constructorul 2D"
              />
              <button
                type="button"
                onClick={() => sendQuestion(query)}
                className="inline-flex h-[52px] items-center rounded-full bg-charcoal px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-pink-700"
              >
                Trimite
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center rounded-full border border-white/70 bg-charcoal px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-pink-700"
        aria-expanded={open}
      >
        {open ? "Inchide asistentul" : "Asistent AI"}
      </button>
    </div>
  );
}
