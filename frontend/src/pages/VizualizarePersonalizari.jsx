import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "/src/lib/api.js";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
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

function buildDesignHighlights(design) {
  const options = design?.options && typeof design.options === "object" ? design.options : {};
  return [
    options.tiers ? `${options.tiers} etaje` : "",
    options.heightProfile ? `profil ${options.heightProfile}` : "",
    options.blat ? `blat ${options.blat}` : "",
    options.crema ? `crema ${options.crema}` : "",
    options.umplutura ? `umplutura ${options.umplutura}` : "",
  ].filter(Boolean);
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

export default function VizualizarePersonalizari() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
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
          return;
        }
        const { data } = await api.get(`/personalizare/client/${clientId}`);
        setList(Array.isArray(data) ? data : []);
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
                Designurile mele
              </h1>
              <p className="text-base leading-7 text-[#655c53]">
                Aici regasesti toate drafturile salvate din constructor, inclusiv imaginile
                de inspiratie si variantele AI generate pentru decor.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/constructor" className={buttons.secondary}>
                Creeaza un design nou
              </Link>
              <Link to="/chat" className={buttons.outline}>
                Scrie patiserului
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
            const highlights = buildDesignHighlights(design);
            const gallery = buildDesignGallery(design);
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-pink-700">
                      {design.status || "draft"}
                    </span>
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
                  <Link className={buttons.outline} to={buildDesignChatLink(design)}>
                    Discuta cu patiserul
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
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
