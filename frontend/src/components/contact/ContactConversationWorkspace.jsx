import StatusBanner from "../StatusBanner";
import { badges, buttons, cards, inputs } from "/src/lib/tailwindComponents.js";

const STATUS_META = {
  noua: {
    label: "Noua",
    className:
      "inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-pink-700",
  },
  in_progres: {
    label: "In progres",
    className:
      "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700",
  },
  finalizata: {
    label: "Finalizata",
    className:
      "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700",
  },
};

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

function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.noua;
}

function bubbleTone(message, currentUserId) {
  const isOwn = String(message?.authorId || "") === String(currentUserId || "");
  if (isOwn) {
    return {
      className:
        "ml-auto border-rose-200 bg-[linear-gradient(135deg,rgba(255,247,250,0.98),rgba(247,236,241,0.96))]",
      authorLabel: "Tu",
    };
  }

  if (message?.authorRole === "admin" || message?.authorRole === "patiser") {
    return {
      className:
        "border-sage-deep/15 bg-[linear-gradient(135deg,rgba(255,252,247,0.98),rgba(233,240,228,0.88))]",
      authorLabel: message?.authorName || "Maison-Douce",
    };
  }

  return {
    className: "border-stone-200 bg-white/95",
    authorLabel: message?.authorName || "Client",
  };
}

function ConversationListItem({ conversation, selected, onSelect, mode }) {
  const meta = statusMeta(conversation?.status);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[24px] border px-4 py-4 text-left transition duration-200 ${
        selected
          ? "border-sage-deep/25 bg-[linear-gradient(135deg,rgba(255,252,247,0.98),rgba(233,240,228,0.84))] shadow-soft"
          : "border-rose-100 bg-white/88 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-soft"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-serif text-xl text-ink">
            {mode === "admin"
              ? conversation?.clientName || "Client"
              : conversation?.subject || "Conversatia ta"}
          </div>
          <div className="mt-1 truncate text-sm text-[#6a6058]">
            {mode === "admin"
              ? conversation?.clientEmail || "fara email"
              : conversation?.subject || "Solicitare Maison-Douce"}
          </div>
        </div>
        <span className={meta.className}>{meta.label}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#8a8178]">
        <span>{formatDateTime(conversation?.lastMessageAt || conversation?.createdAt)}</span>
        <span>|</span>
        <span>{conversation?.messageCount || 0} mesaje</span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#655c53]">
        {conversation?.lastMessagePreview || "Conversatie noua fara istoric suplimentar."}
      </p>
    </button>
  );
}

function MessageBubble({ message, currentUserId }) {
  const tone = bubbleTone(message, currentUserId);

  return (
    <article
      className={`max-w-[88%] rounded-[24px] border px-4 py-3 shadow-soft ${tone.className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-ink">{tone.authorLabel}</div>
        <div className="text-xs uppercase tracking-[0.12em] text-[#8a8178]">
          {formatDateTime(message?.createdAt)}
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#4f463e]">
        {message?.text || ""}
      </p>
    </article>
  );
}

export default function ContactConversationWorkspace({
  mode = "client",
  title,
  subtitle,
  conversations = [],
  selectedConversationId = "",
  onSelectConversation,
  selectedConversation = null,
  messages = [],
  listLoading = false,
  threadLoading = false,
  composerValue = "",
  onComposerChange,
  onSend,
  sending = false,
  notice = null,
  currentUserId = "",
  onRefresh,
  refreshing = false,
  statusOptions = [],
  onStatusChange,
  statusUpdating = false,
  emptyListTitle = "Nu exista conversatii.",
  emptyListText = "Conversatiile vor aparea aici dupa primul mesaj.",
  emptyThreadTitle = "Selecteaza o conversatie.",
  emptyThreadText = "Istoricul complet al mesajelor va aparea in panoul din dreapta.",
  composerPlaceholder = "Scrie mesajul tau aici...",
}) {
  const activeStatusMeta = statusMeta(selectedConversation?.status);

  return (
    <section className={`${cards.elevated} space-y-5`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="eyebrow">{mode === "admin" ? "Inbox contact" : "Conversatiile tale"}</div>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">{title}</h2>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#655c53]">{subtitle}</p>
          ) : null}
        </div>
        {onRefresh ? (
          <button type="button" className={buttons.outline} onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Reincarc..." : "Reincarca"}
          </button>
        ) : null}
      </div>

      {notice?.text ? <StatusBanner type={notice.type || "info"} message={notice.text} /> : null}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8178]">
              Lista conversatii
            </div>
            <div className={badges.premium}>{conversations.length}</div>
          </div>

          <div className="max-h-[42rem] space-y-3 overflow-y-auto pr-1">
            {listLoading ? (
              <div className="rounded-[24px] border border-rose-100 bg-white/85 px-4 py-5 text-sm text-[#655c53]">
                Se incarca lista conversatiilor...
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-rose-200 bg-white/82 px-4 py-6 text-sm text-[#655c53]">
                <div className="font-semibold text-ink">{emptyListTitle}</div>
                <div className="mt-2">{emptyListText}</div>
              </div>
            ) : (
              conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation._id}
                  conversation={conversation}
                  mode={mode}
                  selected={conversation._id === selectedConversationId}
                  onSelect={() => onSelectConversation?.(conversation)}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-rose-100 bg-[rgba(255,252,247,0.92)] p-5 shadow-soft">
          {!selectedConversation ? (
            <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-[24px] border border-dashed border-rose-200 bg-white/70 px-6 text-center">
              <div className="font-serif text-2xl text-ink">{emptyThreadTitle}</div>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#655c53]">{emptyThreadText}</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 border-b border-rose-100 pb-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="font-serif text-3xl text-ink">
                      {mode === "admin"
                        ? selectedConversation.clientName || "Client"
                        : selectedConversation.subject || "Conversatia cu Maison-Douce"}
                    </div>
                    <span className={activeStatusMeta.className}>{activeStatusMeta.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-[#655c53]">
                    <span>{selectedConversation.clientEmail || "fara email"}</span>
                    {selectedConversation.clientPhone ? <span>| {selectedConversation.clientPhone}</span> : null}
                    <span>| {formatDateTime(selectedConversation.createdAt)}</span>
                  </div>
                  {selectedConversation.subject ? (
                    <div className="rounded-[18px] border border-sage-deep/15 bg-white/75 px-3 py-2 text-sm text-[#5b5249]">
                      <span className="font-semibold text-ink">Subiect:</span> {selectedConversation.subject}
                    </div>
                  ) : null}
                </div>

                {onStatusChange ? (
                  <div className="min-w-[220px]">
                    <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8178]">
                      Status conversatie
                    </label>
                    <select
                      className={`mt-2 ${inputs.default}`}
                      value={selectedConversation.status || "noua"}
                      onChange={(event) => onStatusChange(event.target.value)}
                      disabled={statusUpdating}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <div className="max-h-[25rem] min-h-[18rem] space-y-3 overflow-y-auto rounded-[24px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,251,246,0.98),_rgba(246,239,228,0.9))] p-4">
                {threadLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#655c53]">
                    Se incarca mesajele...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-rose-200 bg-white/80 px-6 text-center text-sm text-[#655c53]">
                    Conversatia nu are inca raspunsuri. Primul mesaj va aparea aici.
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message._id}
                      message={message}
                      currentUserId={currentUserId}
                    />
                  ))
                )}
              </div>

              <div className="space-y-3 rounded-[24px] border border-rose-100 bg-white/78 p-4">
                <label className="block text-sm font-semibold text-[#4f463e]">
                  {mode === "admin" ? "Raspuns catre client" : "Continua discutia"}
                  <textarea
                    className={`mt-2 min-h-[120px] ${inputs.default}`}
                    value={composerValue}
                    onChange={(event) => onComposerChange?.(event.target.value)}
                    placeholder={composerPlaceholder}
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs leading-6 text-[#8a8178]">
                    Conversatia se actualizeaza dupa trimitere sau dupa reincarcarea paginii.
                  </div>
                  <button
                    type="button"
                    className={buttons.primary}
                    disabled={!composerValue.trim() || sending}
                    onClick={onSend}
                  >
                    {sending ? "Se trimite..." : "Trimite"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
