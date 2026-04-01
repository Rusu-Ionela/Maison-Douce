import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import { useProviderDirectory } from "../lib/providers";
import {
  fetchCustomOrderDetail,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";
import { badges, buttons, cards, containers } from "../lib/tailwindComponents";

function money(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

function formatDateTime(value, fallback = "-") {
  if (!value) return fallback;
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return fallback;
  return next.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function customOrderStatusMeta(status = "") {
  const normalized = String(status || "").trim().toLowerCase();
  const map = {
    noua: { label: "Cerere noua", badgeClass: badges.warning },
    in_discutie: { label: "In clarificare", badgeClass: badges.info },
    aprobata: { label: "Oferta aprobata", badgeClass: badges.success },
    comanda_generata: { label: "Gata de plata", badgeClass: badges.success },
    respinsa: { label: "Respinsa", badgeClass: badges.error },
  };

  return map[normalized] || { label: normalized || "Necunoscut", badgeClass: badges.info };
}

function timelineStepClass(state) {
  if (state === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (state === "current") return "border-rose-200 bg-rose-50 text-pink-700";
  if (state === "blocked") return "border-red-200 bg-red-50 text-red-700";
  return "border-stone-200 bg-stone-50 text-stone-500";
}

function buildOfferTimeline(customOrder) {
  const status = String(customOrder?.status || "").trim().toLowerCase();
  if (status === "respinsa") {
    const lastEntry = (customOrder?.statusHistory || []).slice(-1)[0];
    return [
      {
        id: "respinsa",
        label: "Respinsa",
        state: "blocked",
        note: String(lastEntry?.note || "").trim(),
      },
    ];
  }

  const steps = [
    { id: "noua", label: "Brief trimis" },
    { id: "in_discutie", label: "Clarificare" },
    { id: "aprobata", label: "Oferta validata" },
    { id: "comanda_generata", label: "Plata deschisa" },
  ];
  const order = ["noua", "in_discutie", "aprobata", "comanda_generata"];
  const activeIndex = Math.max(0, order.indexOf(status));
  const history = Array.isArray(customOrder?.statusHistory) ? customOrder.statusHistory : [];

  return steps.map((step, index) => {
    const matched = history
      .filter((entry) => String(entry?.status || "").trim().toLowerCase() === step.id)
      .slice(-1)[0];

    return {
      ...step,
      state: index < activeIndex ? "done" : index === activeIndex ? "current" : "todo",
      note: String(matched?.note || "").trim(),
      at: matched?.at || null,
    };
  });
}

function buildOfferHighlights(customOrder) {
  const options = customOrder?.options && typeof customOrder.options === "object"
    ? customOrder.options
    : {};

  return [
    options.tiers ? `${options.tiers} etaje` : "",
    options.heightProfile ? `profil ${options.heightProfile}` : "",
    options.blat ? `blat ${options.blat}` : "",
    options.crema ? `crema ${options.crema}` : "",
    options.umplutura ? `umplutura ${options.umplutura}` : "",
    options.decor ? `decor ${options.decor}` : "",
  ].filter(Boolean);
}

function buildOfferGallery(customOrder) {
  const options = customOrder?.options && typeof customOrder.options === "object"
    ? customOrder.options
    : {};

  return [
    { id: "hero", label: "Cerere", url: String(customOrder?.imagine || "").trim() },
    ...(Array.isArray(options.aiPreviewVariants)
      ? options.aiPreviewVariants.map((item, index) => ({
          id: `ai-${index}`,
          label: item?.label || `AI ${index + 1}`,
          url: String(item?.imageUrl || "").trim(),
        }))
      : []),
    ...(Array.isArray(options.inspirationImages)
      ? options.inspirationImages.map((item, index) => ({
          id: `ref-${index}`,
          label: item?.label || `Inspiratie ${index + 1}`,
          url: String(item?.url || "").trim(),
        }))
      : []),
  ].filter((item) => item.url);
}

function buildChatLink(customOrder) {
  const params = new URLSearchParams();
  if (customOrder?.prestatorId) {
    params.set("providerId", String(customOrder.prestatorId));
  }
  params.set("context", `Cerere personalizata #${String(customOrder?._id || "").slice(-6)}`);
  params.set(
    "message",
    "Salut! Revin pe cererea mea personalizata si vreau sa confirm oferta, plata sau ultimele detalii de executie."
  );
  return `/chat?${params.toString()}`;
}

export default function OfertaPersonalizata() {
  const { id } = useParams();
  const { user } = useAuth() || {};
  const providerState = useProviderDirectory({ user, enabled: Boolean(user?._id) });

  const customOrderQuery = useQuery({
    queryKey: queryKeys.customOrderDetail(id),
    queryFn: () => fetchCustomOrderDetail(id),
    enabled: Boolean(id),
  });

  const customOrder = customOrderQuery.data || null;
  const statusMeta = customOrderStatusMeta(customOrder?.status);
  const timeline = useMemo(() => buildOfferTimeline(customOrder), [customOrder]);
  const highlights = useMemo(() => buildOfferHighlights(customOrder), [customOrder]);
  const gallery = useMemo(() => buildOfferGallery(customOrder), [customOrder]);
  const linkedOrder = customOrder?.comandaId && typeof customOrder.comandaId === "object"
    ? customOrder.comandaId
    : null;
  const providerName = providerState.providers.find(
    (item) => String(item?.id || "") === String(customOrder?.prestatorId || "")
  )?.displayName;

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-7xl space-y-6`}>
        <header className={`${cards.tinted} overflow-hidden`}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
                Cerere personalizata
              </div>
              <h1 className="font-serif text-4xl font-semibold text-ink">
                Oferta si plata pentru tortul tau
              </h1>
              <p className="text-base leading-7 text-[#655c53]">
                Aici vezi stadiul cererii, pretul propus de atelier si momentul in care plata este
                disponibila. Pagina ramane punctul tau unic pentru aprobare si urmatorul pas.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/personalizari" className={buttons.outline}>
                Inapoi la designuri
              </Link>
              <Link to={buildChatLink(customOrder)} className={buttons.secondary}>
                Discuta cu atelierul
              </Link>
              {customOrder?.clientCanPay && linkedOrder?._id ? (
                <Link to={`/plata?comandaId=${encodeURIComponent(linkedOrder._id)}`} className={buttons.primary}>
                  Continua la plata
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <StatusBanner
          type="error"
          message={
            customOrderQuery.error
              ? getApiErrorMessage(customOrderQuery.error, "Nu am putut incarca oferta personalizata.")
              : ""
          }
        />

        {customOrderQuery.isLoading ? (
          <div className={`${cards.elevated} text-sm text-gray-600`}>Se incarca oferta...</div>
        ) : null}

        {customOrder ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[24px] border border-rose-100 bg-white/80 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Status
                </div>
                <div className="mt-3">
                  <span className={statusMeta.badgeClass}>{statusMeta.label}</span>
                </div>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white/80 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Oferta curenta
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {customOrder.pretEstimat > 0 ? money(customOrder.pretEstimat) : "In analiză"}
                </div>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white/80 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Predare
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {linkedOrder?.dataLivrare && linkedOrder?.oraLivrare
                    ? `${linkedOrder.dataLivrare} | ${linkedOrder.oraLivrare}`
                    : "Se confirma dupa oferta"}
                </div>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white/80 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Atelier
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {providerName || "Maison-Douce"}
                </div>
              </article>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
              <section className="space-y-6">
                <div className={`${cards.elevated} space-y-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                        Timeline
                      </div>
                      <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                        Evolutia cererii tale
                      </h2>
                    </div>
                    <div className="text-sm text-gray-500">
                      Ultima actualizare: {formatDateTime(customOrder.updatedAt)}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    {timeline.map((step) => (
                      <div
                        key={`${customOrder._id}-${step.id}`}
                        className={`rounded-[18px] border px-4 py-4 text-sm ${timelineStepClass(step.state)}`}
                      >
                        <div className="font-semibold">{step.label}</div>
                        {step.note ? <div className="mt-2 leading-6 opacity-90">{step.note}</div> : null}
                        {step.at ? <div className="mt-2 text-xs opacity-80">{formatDateTime(step.at)}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${cards.elevated} space-y-4`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                    Brief si design
                  </div>
                  <div className="grid gap-4 md:grid-cols-[1.05fr,0.95fr]">
                    <div className="overflow-hidden rounded-[24px] border border-rose-100 bg-white shadow-soft">
                      {gallery[0]?.url ? (
                        <img
                          src={gallery[0].url}
                          alt={`Preview pentru cererea ${String(customOrder._id).slice(-6)}`}
                          className="h-72 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-72 items-center justify-center text-sm text-gray-500">
                          Fara preview disponibil
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-[22px] border border-rose-100 bg-white/85 p-4 shadow-soft">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                          Cerinta client
                        </div>
                        <div className="mt-2 text-sm leading-7 text-gray-700">
                          {customOrder.preferinte || "Fara descriere suplimentara."}
                        </div>
                      </div>
                      {highlights.length ? (
                        <div className="rounded-[22px] border border-rose-100 bg-white/85 p-4 shadow-soft">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                            Structura si interior
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {highlights.map((item) => (
                              <span
                                key={`${customOrder._id}-${item}`}
                                className="rounded-full border border-rose-100 bg-[rgba(255,249,242,0.88)] px-3 py-1 text-sm text-gray-700"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {customOrder?.options?.aiDecorRequest ? (
                        <div className="rounded-[22px] border border-rose-100 bg-white/85 p-4 shadow-soft">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                            Cerinta decor
                          </div>
                          <div className="mt-2 text-sm leading-7 text-gray-700">
                            {customOrder.options.aiDecorRequest}
                          </div>
                        </div>
                      ) : null}
                      {gallery.length > 1 ? (
                        <div className="grid grid-cols-4 gap-3">
                          {gallery.slice(1).map((item) => (
                            <div
                              key={`${customOrder._id}-${item.id}`}
                              className="overflow-hidden rounded-[18px] border border-rose-100 bg-white shadow-soft"
                              title={item.label}
                            >
                              <img src={item.url} alt={item.label} className="h-20 w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <section className={`${cards.elevated} space-y-4`}>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Oferta curenta
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                      Ce a confirmat atelierul
                    </h2>
                  </div>
                  <div className="grid gap-3 rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4 text-sm text-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Pret produs</span>
                      <span className="text-right font-semibold text-gray-900">
                        {customOrder.pretEstimat > 0 ? money(customOrder.pretEstimat) : "In analiza"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Timp orientativ</span>
                      <span className="text-right font-semibold text-gray-900">
                        {customOrder.timpPreparareOre ? `${customOrder.timpPreparareOre}h` : "Se confirma"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Comanda generata</span>
                      <span className="text-right font-semibold text-gray-900">
                        {linkedOrder?._id ? "Da" : "Nu inca"}
                      </span>
                    </div>
                    {linkedOrder ? (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="text-right font-semibold text-gray-900">
                            {money(linkedOrder.subtotal)}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-gray-500">Taxa livrare</span>
                          <span className="text-right font-semibold text-gray-900">
                            {money(linkedOrder.taxaLivrare || linkedOrder.deliveryFee || 0)}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3 border-t border-rose-100 pt-3">
                          <span className="text-gray-500">Total de plata</span>
                          <span className="text-right font-semibold text-gray-900">
                            {money(linkedOrder.totalFinal || linkedOrder.total || 0)}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-gray-500">Metoda predare</span>
                          <span className="text-right font-semibold text-gray-900">
                            {linkedOrder.metodaLivrare === "livrare"
                              ? "Livrare la domiciliu"
                              : "Ridicare din atelier"}
                          </span>
                        </div>
                        {linkedOrder.adresaLivrare ? (
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-gray-500">Adresa</span>
                            <span className="text-right font-semibold text-gray-900">
                              {linkedOrder.adresaLivrare}
                            </span>
                          </div>
                        ) : null}
                        {linkedOrder.deliveryWindow ? (
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-gray-500">Interval</span>
                            <span className="text-right font-semibold text-gray-900">
                              {linkedOrder.deliveryWindow}
                            </span>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  {customOrder.clientCanPay && linkedOrder?._id ? (
                    <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-800">
                      Atelierul a generat comanda finala. Poti continua direct la plata pentru a
                      confirma executia si slotul rezervat.
                    </div>
                  ) : customOrder.status === "respinsa" ? (
                    <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                      Cererea a fost oprita. Verifica ultimul mesaj din timeline sau scrie atelierului
                      pentru o varianta noua.
                    </div>
                  ) : (
                    <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                      Oferta nu este inca pregatita pentru plata. Atelierul poate actualiza pretul,
                      data sau detaliile finale inainte sa continue fluxul.
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
