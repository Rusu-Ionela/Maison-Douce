import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { ProductsAPI } from "../api/products";
import api from "../lib/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { buttons, cards, inputs } from "../lib/tailwindComponents";
import {
  getStorefrontCake,
  getStorefrontFallbackCakeById,
} from "../lib/storefrontCatalog";

const badgeToneClasses = {
  rose: "border-rose-100 bg-rose-50 text-pink-700",
  amber: "border-amber-100 bg-amber-50 text-amber-800",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};

const TRUST_ITEMS = [
  {
    title: "Livrare sau pickup",
    text: "Programare clara pentru ridicare din atelier sau livrare in Chisinau si imprejurimi.",
  },
  {
    title: "Prospetime de laborator",
    text: "Productie in loturi mici, aproape de data evenimentului, pentru textura si gust mai bune.",
  },
  {
    title: "Asistenta dedicata",
    text: "Constructor, calendar, chat si confirmare finala pentru comenzile complexe.",
  },
];

function StorefrontBadge({ tort }) {
  const rounded = Math.round(Number(tort?.ratingAvg || 0) * 10) / 10;

  if (rounded > 0 || Number(tort?.ratingCount || 0) > 0) {
    return (
      <span className="rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-pink-700">
        {`${rounded || 5}/5 | ${Number(tort?.ratingCount || 0)} recenzii`}
      </span>
    );
  }

  if (!tort?.badge) return null;
  const tone = badgeToneClasses[tort.badge.tone] || badgeToneClasses.rose;
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      {tort.badge.label}
    </span>
  );
}

function SectionPanel({ title, children, defaultOpen = true }) {
  return (
    <details
      open={defaultOpen}
      className="rounded-[28px] border border-rose-100 bg-[rgba(255,252,247,0.92)] px-5 py-4 shadow-soft"
    >
      <summary className="cursor-pointer list-none text-lg font-semibold text-ink">
        {title}
      </summary>
      <div className="mt-4 text-sm leading-7 text-[#655c53]">{children}</div>
    </details>
  );
}

export default function TortDetails() {
  const { id } = useParams();
  const { add } = useCart();
  const { user } = useAuth() || {};
  const [tort, setTort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [aroma, setAroma] = useState("");
  const [marime, setMarime] = useState("");
  const [portii, setPortii] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ stele: 5, comentariu: "" });
  const [reviewFile, setReviewFile] = useState(null);
  const [sendingReview, setSendingReview] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState("");
  const [reviewStatus, setReviewStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    ProductsAPI.get(id)
      .then((data) => {
        if (!alive) return;
        setTort(data);
        setAroma((data?.arome && data.arome[0]) || "");
        setMarime(data?.marime || "");
        setPortii(data?.portii ? String(data.portii) : "");
      })
      .catch(() => {
        if (!alive) return;
        const fallbackCake = getStorefrontFallbackCakeById(id);
        setTort(fallbackCake);
        setAroma((fallbackCake?.arome && fallbackCake.arome[0]) || "");
        setMarime(fallbackCake?.marime || "");
        setPortii(fallbackCake?.portii ? String(fallbackCake.portii) : "");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    api
      .get(`/recenzii/produs/${id}`)
      .then((response) => {
        if (!alive) return;
        setReviews(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (!alive) return;
        setReviews([]);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const storefrontTort = useMemo(() => {
    if (!tort) return null;
    return getStorefrontCake(tort, 0);
  }, [tort]);

  const isVirtualProduct = useMemo(
    () => Boolean(storefrontTort && String(storefrontTort._id || "").startsWith("curated-")),
    [storefrontTort]
  );

  const gallery = useMemo(() => {
    const list = [];
    if (storefrontTort?.imagine) list.push(storefrontTort.imagine);
    if (Array.isArray(storefrontTort?.galerie)) list.push(...storefrontTort.galerie);
    return Array.from(new Set(list));
  }, [storefrontTort]);

  useEffect(() => {
    if (gallery[0]) {
      setSelectedImage(gallery[0]);
    }
  }, [gallery]);

  useEffect(() => {
    if (!storefrontTort?.nume) return;
    document.title = `${storefrontTort.nume} | Maison-Douce`;
  }, [storefrontTort?.nume]);

  const addToCart = () => {
    if (!storefrontTort || Number(storefrontTort.pret || 0) <= 0) return;
    const options = { aroma, marime, portii };
    const variantKey = JSON.stringify(options || {});
    add({
      id: storefrontTort._id,
      name: storefrontTort.nume,
      price: storefrontTort.pret || 0,
      image: storefrontTort.imagine,
      qty,
      options,
      variantKey,
      prepHours: storefrontTort.timpPreparareOre || 24,
    });
  };

  const sendReview = async (event) => {
    event.preventDefault();

    if (isVirtualProduct) {
      setReviewStatus({
        type: "error",
        text: "Recenziile se activeaza dupa publicarea produsului in catalogul live.",
      });
      return;
    }
    if (!user?._id) {
      setReviewStatus({ type: "error", text: "Autentifica-te pentru a lasa o recenzie." });
      return;
    }
    if (!reviewForm.comentariu.trim()) {
      setReviewStatus({ type: "error", text: "Completeaza comentariul." });
      return;
    }

    setSendingReview(true);
    setReviewStatus({ type: "", text: "" });

    try {
      let fotoUrl = "";
      if (reviewFile) {
        const formData = new FormData();
        formData.append("file", reviewFile);
        const upload = await api.post("/upload", formData);
        fotoUrl = upload.data?.url || "";
      }

      const response = await api.post("/recenzii/produs", {
        tortId: id,
        stele: Number(reviewForm.stele || 5),
        comentariu: reviewForm.comentariu,
        foto: fotoUrl,
      });

      setReviewForm({ stele: 5, comentariu: "" });
      setReviewFile(null);
      setReviewStatus({
        type: "success",
        text:
          response?.data?.message ||
          "Recenzia a fost trimisa spre moderare si va deveni publica dupa aprobare.",
      });
    } catch (error) {
      setReviewStatus({
        type: "error",
        text: error?.response?.data?.message || "Nu am putut trimite recenzia.",
      });
    } finally {
      setSendingReview(false);
    }
  };

  const handleReportReview = async (reviewId) => {
    if (isVirtualProduct) {
      setReviewStatus({
        type: "error",
        text: "Raportarea recenziilor este disponibila doar pentru produsele publicate live.",
      });
      return;
    }
    if (!user?._id) {
      setReviewStatus({
        type: "error",
        text: "Autentifica-te pentru a raporta o recenzie.",
      });
      return;
    }

    setReportingReviewId(reviewId);
    setReviewStatus({ type: "", text: "" });

    try {
      const response = await api.post(`/recenzii/produs/${reviewId}/report`, {
        reason: "Raportata din pagina produsului",
      });
      setReviewStatus({
        type: "success",
        text: response?.data?.message || "Raportarea a fost inregistrata.",
      });
    } catch (error) {
      setReviewStatus({
        type: "error",
        text: error?.response?.data?.message || "Nu am putut raporta recenzia.",
      });
    } finally {
      setReportingReviewId("");
    }
  };

  if (loading) return <div className="mx-auto max-w-5xl p-6 text-[#625a52]">Se incarca...</div>;
  if (!storefrontTort) return <div className="mx-auto max-w-5xl p-6 text-[#625a52]">Nu s-a gasit tortul.</div>;

  return (
    <div className="min-h-screen px-4 py-8 md:px-6">
      <div className="mx-auto max-w-editorial space-y-8">
        <section className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[34px] border border-rose-100 bg-brand-wash shadow-card">
              {selectedImage ? (
                <img src={selectedImage} alt={storefrontTort.nume} className="h-[32rem] w-full object-cover" />
              ) : (
                <div className="flex h-[32rem] items-center justify-center text-[#7c736a]">Fara imagine</div>
              )}
            </div>

            {gallery.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {gallery.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`overflow-hidden rounded-[20px] border transition ${
                      selectedImage === image
                        ? "border-pink-400 shadow-soft"
                        : "border-rose-100 opacity-90 hover:opacity-100"
                    }`}
                  >
                    <img src={image} alt="Galerie produs" className="h-24 w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className={`${cards.elevated} space-y-5`}>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-pink-700">
                  {storefrontTort.categoryLabel}
                </span>
                <StorefrontBadge tort={storefrontTort} />
              </div>

              <div>
                <div className="font-script text-3xl text-pink-500">Maison-Douce</div>
                <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
                  {storefrontTort.nume}
                </h1>
                <div className="mt-3 text-xs uppercase tracking-[0.24em] text-pink-600">
                  {storefrontTort.collectionNote}
                </div>
              </div>

              <p className="text-base leading-8 text-[#625a52]">
                {storefrontTort.descriere || "Tort artizanal cu finisaj premium si compozitie echilibrata."}
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.9)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-600">Pret</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">
                    {storefrontTort.pret ? `${storefrontTort.pret} MDL` : "La cerere"}
                  </div>
                </div>
                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.9)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-600">Preparare</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">
                    {storefrontTort.timpPreparareOre ? `${storefrontTort.timpPreparareOre}h` : "24-48h"}
                  </div>
                </div>
                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.9)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-600">Portii</div>
                  <div className="mt-2 text-2xl font-semibold text-ink">{portii || storefrontTort.portii || "-"}</div>
                </div>
              </div>

              <div className="rounded-[26px] border border-rose-100 bg-white/90 p-5 shadow-soft">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Umplutura si arome
                </div>
                <p className="mt-3 text-sm leading-7 text-[#5c534b]">{storefrontTort.fillingSummary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {storefrontTort.displayTags?.slice(0, 5).map((tag) => (
                    <span
                      key={`${storefrontTort._id}-${tag}`}
                      className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-medium text-[#796f66]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/catalog?selectedTort=${encodeURIComponent(
                      storefrontTort.slug || storefrontTort._id
                    )}#umpluturile-mele`}
                    className="inline-flex items-center justify-center rounded-full border border-[#d8c3a7]/60 bg-[#fbf3e8] px-4 py-2.5 text-sm font-semibold text-[#7a6045] transition hover:-translate-y-0.5 hover:border-[#c5ab8b] hover:bg-[#f8eee1]"
                  >
                    Vezi umpluturi compatibile
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[#4f463e]">
                  Aroma
                  <select
                    value={aroma}
                    onChange={(event) => setAroma(event.target.value)}
                    className={`mt-2 ${inputs.default}`}
                  >
                    {Array.isArray(storefrontTort.arome) && storefrontTort.arome.length > 0 ? (
                      storefrontTort.arome.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))
                    ) : (
                      <option value="">Standard</option>
                    )}
                  </select>
                </label>

                <label className="text-sm font-semibold text-[#4f463e]">
                  Marime
                  <input
                    value={marime}
                    onChange={(event) => setMarime(event.target.value)}
                    placeholder="ex: 18 cm / 1.8 kg"
                    className={`mt-2 ${inputs.default}`}
                  />
                </label>

                <label className="text-sm font-semibold text-[#4f463e]">
                  Portii
                  <input
                    type="number"
                    min="1"
                    value={portii}
                    onChange={(event) => setPortii(event.target.value)}
                    placeholder="ex: 12"
                    className={`mt-2 ${inputs.default}`}
                  />
                </label>

                <label className="text-sm font-semibold text-[#4f463e]">
                  Cantitate
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(event) => setQty(Number(event.target.value || 1))}
                    className={`mt-2 ${inputs.default}`}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                {Number(storefrontTort.pret || 0) > 0 ? (
                  <button type="button" className={buttons.primary} onClick={addToCart}>
                    Adauga in cos
                  </button>
                ) : (
                  <Link to="/calendar" className={buttons.secondary}>
                    Cere oferta
                  </Link>
                )}
                <Link to={`/constructor?from=${storefrontTort._id}`} className={buttons.outline}>
                  Personalizeaza
                </Link>
                <Link
                  to={`/catalog?selectedTort=${encodeURIComponent(
                    storefrontTort.slug || storefrontTort._id
                  )}#umpluturile-mele`}
                  className="inline-flex items-center justify-center rounded-full border border-[#d8c3a7]/60 bg-[#fbf3e8] px-4 py-2.5 text-sm font-semibold text-[#7a6045] transition hover:-translate-y-0.5 hover:border-[#c5ab8b] hover:bg-[#f8eee1]"
                >
                  Vezi umpluturi compatibile
                </Link>
                <Link
                  to="/catalog"
                  className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#675d55] hover:bg-rose-50"
                >
                  Inapoi la catalog
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {TRUST_ITEMS.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[24px] border border-rose-100 bg-[rgba(255,252,247,0.92)] p-4 shadow-soft"
                >
                  <div className="text-sm font-semibold text-ink">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-[#655c53]">{item.text}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <SectionPanel title="Descriere">
              {storefrontTort.descriere || "Desert artizanal gandit pentru un look premium si o compozitie echilibrata."}
            </SectionPanel>
            <SectionPanel title="Ingrediente" defaultOpen={false}>
              {Array.isArray(storefrontTort.ingrediente) && storefrontTort.ingrediente.length > 0
                ? storefrontTort.ingrediente.join(", ")
                : "Ingrediente disponibile la cerere, in functie de varianta selectata si personalizare."}
            </SectionPanel>
            <SectionPanel title="Pastrare si servire" defaultOpen={false}>
              Recomandam pastrarea la rece si scoaterea tortului cu 20-30 de minute inainte de servire, pentru o textura optima a cremei si a inserturilor.
            </SectionPanel>
            <SectionPanel title="Livrare si ridicare" defaultOpen={false}>
              Programarea se face din calendar, iar echipa confirma slotul final, metoda de predare si orice detalii suplimentare legate de transport.
            </SectionPanel>
          </div>

          <div className={`${cards.elevated} space-y-4`}>
            <h2 className="text-2xl font-semibold text-ink">Recenzii</h2>
            {isVirtualProduct ? (
              <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Acesta este un produs prezentat din colectia locala Maison-Douce. Recenziile devin disponibile dupa publicarea lui in catalogul live.
              </div>
            ) : null}

            {reviews.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-rose-200 px-4 py-5 text-sm text-[#6c635b]">
                Nu exista recenzii inca.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <article key={review._id} className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-ink">Rating: {review.stele} / 5</div>
                      <div className="text-xs text-[#8a8178]">
                        {review.data ? new Date(review.data).toLocaleString("ro-RO") : ""}
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-[#655c53]">{review.comentariu}</div>
                    {review.foto ? (
                      <div className="mt-3">
                        <img src={review.foto} alt="Recenzie" className="h-32 rounded-[18px] object-cover" />
                      </div>
                    ) : null}
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => handleReportReview(review._id)}
                        disabled={reportingReviewId === review._id}
                        className={buttons.outline}
                      >
                        {reportingReviewId === review._id ? "Se raporteaza..." : "Raporteaza abuz"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <StatusBanner type={reviewStatus.type || "info"} message={reviewStatus.text} />

            {!isVirtualProduct ? (
              <form onSubmit={sendReview} className="space-y-3 border-t border-rose-100 pt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="text-sm font-semibold text-[#4f463e]">
                    Rating
                    <select
                      value={reviewForm.stele}
                      onChange={(event) =>
                        setReviewForm((state) => ({ ...state, stele: event.target.value }))
                      }
                      className={`mt-2 ${inputs.default}`}
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-[#4f463e] sm:col-span-2">
                    Foto optionala
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setReviewFile(event.target.files?.[0] || null)}
                      className={`mt-2 ${inputs.default}`}
                    />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-[#4f463e]">
                  Comentariu
                  <textarea
                    value={reviewForm.comentariu}
                    onChange={(event) =>
                      setReviewForm((state) => ({ ...state, comentariu: event.target.value }))
                    }
                    className={`mt-2 min-h-[110px] ${inputs.default}`}
                    placeholder="Spune-ne cum a fost experienta cu acest tort."
                    required
                  />
                </label>
                <button type="submit" disabled={sendingReview} className={buttons.primary}>
                  {sendingReview ? "Se trimite..." : "Trimite recenzie"}
                </button>
              </form>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
