import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "/src/lib/api.js";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import {
  buildCustomOrderHighlights,
  getCustomOrderDecorationSummary,
  getCustomOrderFlowSummary,
} from "../lib/customOrderSummary";
import { buttons, cards, containers } from "../lib/tailwindComponents";

function buildDesignChatLink(design) {
  const params = new URLSearchParams();
  if (design?.prestatorId) {
    params.set("providerId", String(design.prestatorId));
  }
  params.set("context", `Design ${String(design?._id || "").slice(-6)}`);
  params.set(
    "message",
    "Salut! Revin cu intrebari despre designul meu salvat si as vrea sa confirmam decorul final."
  );
  return `/chat?${params.toString()}`;
}

function formatSavedAt(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDesignGallery(design) {
  const options = design?.options && typeof design.options === "object" ? design.options : {};
  return [
    { id: "design", label: "Preview 2D", url: String(design?.imageUrl || "").trim() },
    ...(Array.isArray(options.aiPreviewVariants)
      ? options.aiPreviewVariants.map((item, index) => ({
          id: `ai-${index}`,
          label: `AI ${index + 1}`,
          url: String(item?.imageUrl || item?.url || "").trim(),
        }))
      : []),
    ...(Array.isArray(options.inspirationImages)
      ? options.inspirationImages.map((item, index) => ({
          id: `ref-${index}`,
          label: `Inspiratie ${index + 1}`,
          url: String(item?.url || "").trim(),
        }))
      : []),
  ]
    .filter((item) => item.url)
    .slice(0, 5);
}

function buildCustomOrderIndex(list) {
  const map = new Map();
  for (const item of Array.isArray(list) ? list : []) {
    const designId = String(item?.designId || "").trim();
    if (!designId || map.has(designId)) continue;
    map.set(designId, item);
  }
  return map;
}

function customOrderLabel(status = "") {
  const normalized = String(status || "").trim().toLowerCase();
  const labels = {
    noua: "Cerere trimisa",
    in_discutie: "In clarificare",
    aprobata: "Oferta pregatita",
    comanda_generata: "Gata de plata",
    respinsa: "Cerere oprita",
  };
  return labels[normalized] || "Cerere personalizata";
}

export default function VizualizarePersonalizari() {
  const [list, setList] = useState([]);
  const [customOrdersByDesign, setCustomOrdersByDesign] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [pendingActionId, setPendingActionId] = useState("");
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth() || {};
  const clientId = user?._id || user?.id;

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      setLoading(true);
      try {
        if (!clientId) {
          setList([]);
          setCustomOrdersByDesign(new Map());
          return;
        }
        const [{ data }, customOrdersResponse] = await Promise.all([
          api.get(`/personalizare/client/${clientId}`),
          api.get("/comenzi-personalizate"),
        ]);
        setList(Array.isArray(data) ? data : []);
        setCustomOrdersByDesign(buildCustomOrderIndex(customOrdersResponse?.data || []));
      } catch (error) {
        setStatus({
          type: "error",
          message:
            error?.response?.data?.error || "Nu am putut incarca designurile salvate.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, clientId]);

  const stats = useMemo(() => {
    const aiCount = list.filter(
      (item) =>
        item?.options?.aiPreviewUrl ||
        (Array.isArray(item?.options?.aiPreviewVariants) &&
          item.options.aiPreviewVariants.length > 0)
    ).length;
    const inspirationCount = list.filter(
      (item) =>
        Array.isArray(item?.options?.inspirationImages) &&
        item.options.inspirationImages.length > 0
    ).length;

    return [
      {
        label: "Designuri salvate",
        value: list.length,
        hint: "Drafturi si cereri pe care le poti relua.",
      },
      {
        label: "Cu preview AI",
        value: aiCount,
        hint: "Designuri unde ai generat deja imagini mai realiste.",
      },
      {
        label: "Cu inspiratie incarcata",
        value: inspirationCount,
        hint: "Referinte vizuale salvate direct in cont.",
      },
    ];
  }, [list]);

  const sendDraftToPastry = async (design) => {
    const designId = String(design?._id || "").trim();
    if (!designId) return;

    setPendingActionId(`send-${designId}`);
    setStatus({ type: "", message: "" });

    try {
      await api.put(`/personalizare/${designId}`, { status: "trimis" });
      const response = await api.post("/comenzi-personalizate", {
        clientId,
        prestatorId: design?.prestatorId || undefined,
        numeClient: user?.nume || user?.name || "Client",
        preferinte: design?.mesaj || "Draft trimis din biblioteca clientului",
        imagine: design?.imageUrl || "",
        designId,
        options: design?.options || {},
        pretEstimat: Number(design?.pretEstimat || 0),
        timpPreparareOre: Number(design?.timpPreparareOre || 0),
      });

      setList((current) =>
        current.map((item) =>
          String(item?._id || "") === designId ? { ...item, status: "trimis" } : item
        )
      );
      setCustomOrdersByDesign((current) => {
        const next = new Map(current);
        next.set(designId, response?.data?.comanda);
        return next;
      });
      setStatus({
        type: "success",
        message: "Draftul a fost trimis catre patiser si apare acum in cererile personalizate.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.mesaj || "Nu am putut trimite draftul catre atelier.",
      });
    } finally {
      setPendingActionId("");
    }
  };

  const deleteDraft = async (design) => {
    const designId = String(design?._id || "").trim();
    if (!designId) return;
    if (!window.confirm("Stergi acest draft din cont?")) return;

    setPendingActionId(`delete-${designId}`);
    setStatus({ type: "", message: "" });

    try {
      await api.delete(`/personalizare/${designId}`);
      setList((current) => current.filter((item) => String(item?._id || "") !== designId));
      setCustomOrdersByDesign((current) => {
        const next = new Map(current);
        next.delete(designId);
        return next;
      });
      setStatus({
        type: "success",
        message: "Draftul a fost sters din biblioteca ta.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error?.response?.data?.error || "Nu am putut sterge draftul selectat.",
      });
    } finally {
      setPendingActionId("");
    }
  };

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-7xl space-y-6`}>
        <header className={`${cards.tinted} overflow-hidden`}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
                Biblioteca clientului
              </div>
              <h1 className="font-serif text-4xl font-semibold text-ink">
                Drafturile mele
              </h1>
              <p className="text-base leading-7 text-[#655c53]">
                Aici regasesti toate variantele salvate din fluxul ghidat, constructor si generatorul
                de idei. Le poti redeschide, continua, trimite catre atelier sau sterge daca nu mai
                ai nevoie de ele.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/comanda-online" className={buttons.secondary}>
                Porneste o comanda noua
              </Link>
              <Link to="/chat" className={buttons.outline}>
                Scrie atelierului
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <article
              key={item.label}
              className="rounded-[24px] border border-rose-100 bg-white/80 p-4 shadow-soft"
            >
              <div className="text-sm font-medium text-pink-700">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</div>
              <div className="mt-2 text-sm text-[#655c53]">{item.hint}</div>
            </article>
          ))}
        </div>

        <StatusBanner type={status.type || "info"} message={status.message} />
        <StatusBanner
          type="info"
          message={
            list.length
              ? "Drafturile salvate din constructor nu blocheaza data si nu pornesc plata. Ele devin cereri personalizate doar dupa trimiterea spre validare sau dupa discutia cu atelierul."
              : ""
          }
        />

        {loading ? (
          <div className="rounded-[24px] border border-rose-100 bg-white/90 px-4 py-6 text-sm text-gray-600 shadow-soft">
            Se incarca designurile salvate...
          </div>
        ) : null}

        {!loading && list.length === 0 ? (
          <div className={`${cards.elevated} text-center`}>
            <div className="text-xl font-semibold text-gray-900">Nu ai designuri salvate inca.</div>
            <div className="mt-2 text-sm leading-6 text-gray-600">
              Deschide constructorul, configureaza tortul si foloseste butonul de salvare in cont.
            </div>
            <div className="mt-5">
              <button className={buttons.primary} onClick={() => nav("/constructor")}>
                Deschide constructorul
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          {list.map((design) => {
            const options = design?.options && typeof design.options === "object" ? design.options : {};
            const highlights = buildCustomOrderHighlights(options);
            const decorationSummary = getCustomOrderDecorationSummary(options);
            const flowSummary = getCustomOrderFlowSummary(options);
            const gallery = buildDesignGallery(design);
            const linkedCustomOrder = customOrdersByDesign.get(String(design._id || ""));
            const aiVariantCount = Array.isArray(design?.options?.aiPreviewVariants)
              ? design.options.aiPreviewVariants.length
              : design?.options?.aiPreviewUrl
              ? 1
              : 0;
            const inspirationCount = Array.isArray(design?.options?.inspirationImages)
              ? design.options.inspirationImages.length
              : 0;

            return (
              <article key={design._id} className={`${cards.elevated} space-y-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Draft salvat
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                      {design.mesaj || "Tort personalizat"}
                    </h2>
                    <div className="mt-2 text-sm text-gray-500">
                      Actualizat: {formatSavedAt(design.updatedAt || design.createdAt)}
                    </div>
                    {flowSummary ? (
                      <div className="mt-3 rounded-full border border-sage-deep/15 bg-sage/20 px-3 py-1.5 text-xs font-semibold text-sage-deep">
                        {flowSummary}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-pink-700">
                      {design.status || "draft"}
                    </span>
                    {linkedCustomOrder ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {customOrderLabel(linkedCustomOrder.status)}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {aiVariantCount} variante AI
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      {inspirationCount} referinte
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.05fr,0.95fr]">
                  <div className="overflow-hidden rounded-[24px] border border-rose-100 bg-white shadow-soft">
                    {gallery[0]?.url ? (
                      <img
                        src={gallery[0].url}
                        alt={`Preview pentru designul ${String(design._id).slice(-6)}`}
                        className="h-72 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-72 items-center justify-center bg-[rgba(255,249,242,0.8)] text-sm text-gray-500">
                        Fara preview salvat
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[22px] border border-rose-100 bg-white/85 p-4 shadow-soft">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                        Structura si interior
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {highlights.map((item) => (
                          <span
                            key={`${design._id}-${item}`}
                            className="rounded-full border border-rose-100 bg-[rgba(255,249,242,0.88)] px-3 py-1 text-sm text-gray-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      {design?.options?.estimatedServings || design?.options?.estimatedWeightKg ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[18px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-3 py-3 text-sm">
                            <div className="text-gray-500">Portii</div>
                            <div className="font-semibold text-gray-900">
                              {design?.options?.estimatedServings || "-"}
                            </div>
                          </div>
                          <div className="rounded-[18px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-3 py-3 text-sm">
                            <div className="text-gray-500">Greutate</div>
                            <div className="font-semibold text-gray-900">
                              {design?.options?.estimatedWeightKg || "-"}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {decorationSummary ? (
                      <div className="rounded-[22px] border border-rose-100 bg-white/85 p-4 shadow-soft">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                          Decor liber
                        </div>
                        <div className="mt-2 text-sm leading-6 text-gray-700">
                          {decorationSummary}
                        </div>
                      </div>
                    ) : null}

                    {design?.options?.aiDecorRequest ? (
                      <div className="rounded-[22px] border border-rose-100 bg-white/85 p-4 shadow-soft">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                          Cerinta AI
                        </div>
                        <div className="mt-2 text-sm leading-6 text-gray-700">
                          {design.options.aiDecorRequest}
                        </div>
                      </div>
                    ) : null}

                    {gallery.length > 1 ? (
                      <div className="grid grid-cols-4 gap-3">
                        {gallery.slice(1).map((item) => (
                          <div
                            key={`${design._id}-${item.id}`}
                            className="overflow-hidden rounded-[18px] border border-rose-100 bg-white shadow-soft"
                            title={item.label}
                          >
                            <img
                              src={item.url}
                              alt={item.label}
                              className="h-20 w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className={buttons.primary}
                    onClick={() => nav(`/constructor?designId=${design._id}`)}
                  >
                    Continua editarea
                  </button>
                  {!linkedCustomOrder?._id ? (
                    <button
                      type="button"
                      className={buttons.secondary}
                      disabled={pendingActionId === `send-${design._id}`}
                      onClick={() => sendDraftToPastry(design)}
                    >
                      {pendingActionId === `send-${design._id}`
                        ? "Se trimite..."
                        : "Trimite atelierului"}
                    </button>
                  ) : null}
                  {linkedCustomOrder?._id ? (
                    <Link
                      className={buttons.secondary}
                      to={`/personalizari/oferta/${linkedCustomOrder._id}`}
                    >
                      Vezi oferta
                    </Link>
                  ) : null}
                  <Link className={buttons.outline} to={buildDesignChatLink(design)}>
                    Discuta cu atelierul
                  </Link>
                  {design.imageUrl ? (
                    <a
                      href={design.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttons.outline}
                    >
                      Deschide preview-ul
                    </a>
                  ) : null}
                  {!linkedCustomOrder?._id ? (
                    <button
                      type="button"
                      className={buttons.outline}
                      disabled={pendingActionId === `delete-${design._id}`}
                      onClick={() => deleteDraft(design)}
                    >
                      {pendingActionId === `delete-${design._id}` ? "Se sterge..." : "Sterge draftul"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
