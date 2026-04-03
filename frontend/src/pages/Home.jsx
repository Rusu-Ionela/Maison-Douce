import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProductsAPI } from "/src/api/products.js";
import api from "/src/lib/api.js";
import OrderOnlineCta from "../components/order-flow/OrderOnlineCta";
import { useAuth } from "/src/context/AuthContext.jsx";
import { buttons, cards, containers } from "../lib/tailwindComponents";
import { getStorefrontCatalogItems } from "../lib/storefrontCatalog";

const SIGNATURES = [
  {
    image: "/images/royalcake.jpg",
    title: "Colectia de ceremonie",
    description: "Etaje elegante, detalii florale si finisaje discrete pentru receptii si nunti.",
  },
  {
    image: "/images/lambeth.jpg",
    title: "Linii vintage",
    description: "Piping generos, tonuri de ivoire si volum decorativ pentru aniversari memorabile.",
  },
  {
    image: "/images/capusuni in ciocolata.jpg",
    title: "Cadouri Maison",
    description: "Mini deserturi, cutii rafinate si accente fructate pentru gesturi atent gandite.",
  },
];

const ATELIER_NOTES = [
  "Retete lucrate in loturi mici, cu texturi echilibrate si ingrediente premium.",
  "Consultanta pentru evenimente, personalizare completa si timp clar de productie.",
  "Flux integrat: catalog, constructor, calendar, chat si urmarirea comenzilor.",
];

const priceFormatter = new Intl.NumberFormat("ro-MD");

function formatPrice(value) {
  return `${priceFormatter.format(Number(value || 0))} MDL`;
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("show")),
      { threshold: 0.15 }
    );

    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function SectionHeader({ eyebrow, title, description, ctaTo = "", ctaLabel = "" }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-3">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <div>
          <h2 className="section-title">{title}</h2>
          {description ? <p className="section-subtitle mt-3">{description}</p> : null}
        </div>
      </div>
      {ctaTo && ctaLabel ? (
        <Link to={ctaTo} className={buttons.outline}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

function CatalogCard({ item, actionLabel = "Vezi detalii", actionTo }) {
  if (!item) return null;

  return (
    <article className="group overflow-hidden rounded-[30px] border border-rose-100 bg-[rgba(255,252,247,0.94)] shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-wash">
        <img
          src={item.imagine}
          alt={item.nume}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2c2521]/75 via-[#2c2521]/20 to-transparent px-4 pb-4 pt-10 text-white">
          <div className="text-xs uppercase tracking-[0.22em] text-white/72">
            {item.categoryLabel || "Maison-Douce"}
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="font-serif text-2xl">{item.nume}</div>
            <div className="text-sm font-semibold">{formatPrice(item.pret)}</div>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm leading-6 text-[#655c53]">
          {item.descriere || item.fillingSummary || "Desert artizanal pentru comenzi premium."}
        </p>
        {item.displayTags?.length ? (
          <div className="flex flex-wrap gap-2 text-xs text-[#786f66]">
            {item.displayTags.slice(0, 3).map((tag) => (
              <span
                key={`${item._id}_${tag}`}
                className="rounded-full border border-rose-100 bg-white px-3 py-1.5"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <Link to={actionTo || `/tort/${item._id}`} className={buttons.outline}>
          {actionLabel}
        </Link>
      </div>
    </article>
  );
}

function ReviewCard({ review }) {
  return (
    <article className={`${cards.default} reveal`}>
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-600">
        {`Rating ${Number(review?.stele || 5)}/5`}
      </div>
      <p className="mt-4 text-base leading-7 text-[#5e554d]">
        {review?.comentariu || "Experienta dulce, echilibrata si atent lucrata."}
      </p>
      <div className="mt-5 text-sm text-[#8a8178]">
        {review?.data ? new Date(review.data).toLocaleDateString("ro-RO") : "Client Maison-Douce"}
      </div>
    </article>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [loadingRec, setLoadingRec] = useState(true);
  const [recs, setRecs] = useState([]);
  const [popular, setPopular] = useState([]);
  const [noutati, setNoutati] = useState([]);
  const [promotii, setPromotii] = useState([]);
  const [recenzii, setRecenzii] = useState([]);

  useReveal();

  useEffect(() => {
    document.title = "Maison-Douce | Torturi artizanale";
    const desc =
      "Maison-Douce este o patiserie artizanala cu torturi premium, constructor 2D, calendar de rezervari si experiente personalizate pentru evenimente.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
  }, []);

  useEffect(() => {
    async function loadRecs() {
      try {
        setLoadingRec(true);
        const data = await ProductsAPI.recommendAi({
          userId: user?._id,
          preferCategorie: "torturi",
          excludePurchased: true,
        });
        setRecs(getStorefrontCatalogItems(data?.recomandate || []).slice(0, 3));
      } catch (error) {
        console.warn("AI recommendations failed", error?.message);
        setRecs([]);
      } finally {
        setLoadingRec(false);
      }
    }

    loadRecs();
  }, [user?._id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pop, nou, promo, rev] = await Promise.all([
          ProductsAPI.list({ sort: "popular", limit: 4, activ: true }),
          ProductsAPI.list({ limit: 4, activ: true }),
          ProductsAPI.list({ promo: true, limit: 4, activ: true }),
          api.get("/recenzii/recent", { params: { limit: 4 } }),
        ]);
        if (!alive) return;
        setPopular(getStorefrontCatalogItems(pop?.items || []).slice(0, 4));
        setNoutati(getStorefrontCatalogItems(nou?.items || []).slice(0, 4));
        setPromotii(getStorefrontCatalogItems(promo?.items || []).slice(0, 4));
        setRecenzii(Array.isArray(rev?.data) ? rev.data : []);
      } catch {
        if (!alive) return;
        setPopular([]);
        setNoutati([]);
        setPromotii([]);
        setRecenzii([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const metrics = useMemo(
    () => [
      { label: "Comenzi la cerere", value: "48h+", note: "timp de productie pentru majoritatea colectiilor" },
      { label: "Designer personal", value: "2 moduri", note: "Exterior si Sectiune pentru validare rapida" },
      { label: "Livrare si pickup", value: "MDL 100", note: "programare direct din calendarul activ" },
    ],
    []
  );

  return (
    <div className="min-h-screen pb-16">
      <section className="px-4 pt-6 md:px-6 md:pt-10">
        <div className="mx-auto grid max-w-editorial gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={`${cards.elevated} reveal overflow-hidden p-8 md:p-10`}>
            <div className="eyebrow">Parisian luxury patisserie</div>
            <div className="mt-5 max-w-3xl space-y-5">
              <div className="font-script text-4xl text-pink-500 md:text-5xl">
                Collection Maison
              </div>
              <h1 className="editorial-title text-balance">
                Torturi artizanale, compuse cu rafinament si prezentate ca intr-un salon de patiserie.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#625a52] md:text-lg">
                Maison-Douce reuneste catalogul premium, constructorul 2D cu preview AI integrat si calendarul de rezervari intr-o experienta coerenta pentru comenzi reale in Moldova.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <OrderOnlineCta
                label="Comanda online"
                description="Estimare, alegere si draft ghidat"
              />
              <Link to="/catalog" className={buttons.outline}>
                Descopera catalogul
              </Link>
            </div>
            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {metrics.map((metric) => (
                <article
                  key={metric.label}
                  className="rounded-[24px] border border-rose-100 bg-white/70 p-4 shadow-soft"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
                    {metric.label}
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-ink">{metric.value}</div>
                  <div className="mt-2 text-sm leading-6 text-[#7b736a]">{metric.note}</div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-6 reveal">
            <div className="overflow-hidden rounded-[34px] border border-rose-100 bg-white/80 shadow-card">
              <img
                src="/images/royalcake.jpg"
                alt="Tort Maison-Douce"
                loading="eager"
                decoding="async"
                fetchpriority="high"
                className="h-full min-h-[24rem] w-full object-cover"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {ATELIER_NOTES.map((note) => (
                <article
                  key={note}
                  className="rounded-[24px] border border-rose-100 bg-[rgba(255,252,247,0.9)] p-4 shadow-soft"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                    Atelier
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#60574f]">{note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`${containers.pageMax} space-y-12`}>
        <div className="reveal">
          <div className={`${cards.tinted} overflow-hidden`}>
            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <div className="eyebrow">Flux nou pentru clienti</div>
                <h2 className="section-title">
                  Nu stii exact de unde sa incepi? Comanda online te ghideaza pas cu pas.
                </h2>
                <p className="section-subtitle">
                  Pornesti cu numarul de persoane, primesti o estimare de kg si alegi apoi cea mai
                  potrivita directie: catalog, tort personalizat sau generare de idei.
                </p>
                <div className="flex flex-wrap gap-3">
                  <OrderOnlineCta label="Porneste comanda online" />
                  {user ? (
                    <Link to="/personalizari" className={buttons.outline}>
                      Drafturile mele
                    </Link>
                  ) : (
                    <Link to="/login" className={buttons.outline}>
                      Intra pentru a-ti salva drafturile
                    </Link>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    title: "1. Estimare",
                    text: "Afli rapid cate kg sunt potrivite pentru evenimentul tau.",
                  },
                  {
                    title: "2. Alegere",
                    text: "Decizi clar intre tort existent, constructor sau generator de idei.",
                  },
                  {
                    title: "3. Draft",
                    text: "Salvezi si trimiti spre validare fara sa te simti blocat de decizia finala.",
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[24px] border border-rose-100 bg-white/78 p-4 shadow-soft"
                  >
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-[#655c53]">{item.text}</div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="reveal">
          <SectionHeader
            eyebrow="Selectie asistata"
            title="Recomandari construite pentru profilul tau"
            description="Daca avem deja context despre preferinte si comenzi, selectia devine mai precisa. Daca nu, pastram aceeasi prezentare premium, fara stari seci."
            ctaTo="/catalog"
            ctaLabel="Vezi toata colectia"
          />
          {loadingRec ? (
            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[26rem] animate-pulse rounded-[30px] border border-rose-100 bg-white/70 shadow-soft"
                />
              ))}
            </div>
          ) : recs.length ? (
            <div className="grid gap-6 md:grid-cols-3">
              {recs.map((item) => (
                <CatalogCard key={item._id} item={item} />
              ))}
            </div>
          ) : (
            <div className={`${cards.default} text-sm leading-7 text-[#615850]`}>
              Inca nu exista suficiente semnale pentru recomandari AI personalizate. Catalogul complet ramane disponibil, iar dupa primele interactiuni selectia va deveni mai relevanta.
            </div>
          )}
        </div>

        <div className="reveal">
          <SectionHeader
            eyebrow="Campanie Maison"
            title="Trei directii de stil pentru deserturi de ocazie"
            description="O estetica editoriala, cu imagini mari, texte scurte si o ritmare mai apropiata de un lookbook decat de un simplu listing."
          />
          <div className="grid gap-6 xl:grid-cols-3">
            {SIGNATURES.map((item) => (
              <article
                key={item.title}
                className="overflow-hidden rounded-[32px] border border-rose-100 bg-[rgba(255,252,247,0.94)] shadow-soft"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-700 hover:scale-105"
                  />
                </div>
                <div className="space-y-3 p-6">
                  <h3 className="font-serif text-3xl text-ink">{item.title}</h3>
                  <p className="text-sm leading-7 text-[#625a52]">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-10 xl:grid-cols-2">
          <div className="reveal">
            <SectionHeader
              eyebrow="Cele mai dorite"
              title="Semnaturile care revin cel mai des in comenzi"
              description="Produse cu prezentare coerenta, preturi in MDL si imagini pregatite pentru un storefront real."
              ctaTo="/catalog"
              ctaLabel="Explora catalogul"
            />
            <div className="grid gap-6">
              {popular.slice(0, 2).map((item) => (
                <CatalogCard key={item._id} item={item} />
              ))}
            </div>
          </div>

          <div className="reveal">
            <SectionHeader
              eyebrow="Noutati si oferte"
              title="Selectii noi si propuneri de sezon"
              description="Amestecam noutati, promotii si piese cu potential mare de personalizare."
            />
            <div className="grid gap-6">
              {(promotii.length ? promotii : noutati).slice(0, 2).map((item) => (
                <CatalogCard
                  key={item._id}
                  item={item}
                  actionLabel="Vezi compozitia"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className={`${cards.tinted} reveal`}>
            <div className="eyebrow">Atelier si servicii</div>
            <h2 className="mt-4 section-title">Tot fluxul de comanda este gandit ca o experienta premium.</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[#625a52]">
              <p>
                Catalogul este curatat pentru denumiri reale, constructorul 2D comunica interiorul si finisajul, iar calendarul arata disponibilitate per patiser.
              </p>
              <p>
                Pentru proiectele speciale poti salva drafturi, exporta PNG, discuta in chat cu laboratorul si folosi preview-ul AI integrat direct in constructor.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/calendar" className={buttons.primary}>
                Rezerva un slot
              </Link>
              <Link to="/constructor" className={buttons.outline}>
                Deschide constructorul
              </Link>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            {recenzii.length ? (
              recenzii.slice(0, 4).map((review) => <ReviewCard key={review._id} review={review} />)
            ) : (
              <>
                <div className={`${cards.default} reveal`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-600">
                    Recenzii client
                  </div>
                  <p className="mt-4 text-base leading-7 text-[#5e554d]">
                    Inca nu avem recenzii recente publicate, dar sectiunea este pregatita pentru testimonialele clientilor si update-urile de dupa comanda.
                  </p>
                </div>
                <div className={`${cards.default} reveal`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-600">
                    Maison club
                  </div>
                  <p className="mt-4 text-base leading-7 text-[#5e554d]">
                    Fidelizarea, profilul si istoricul comenzilor sunt deja integrate si pot sustine o experienta de brand consistenta.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
