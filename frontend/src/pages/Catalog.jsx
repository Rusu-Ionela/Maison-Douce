import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProductsAPI } from "../api/products";
import { useCart } from "../context/CartContext";

const OCAZII = ["nunta", "zi de nastere", "botez", "aniversare", "corporate"];
const STILURI = ["clasic", "modern", "minimal", "lambeth", "floral"];
const MARIMI = ["S", "M", "L", "XL"];
const ALERGENI = ["nuci", "alune", "lactoza", "gluten", "oua"];

function RatingBadge({ value = 0, count = 0 }) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-rose-50 text-pink-700 font-semibold">
      {rounded > 0 ? `Rating: ${rounded} (${count || 0})` : "Fara rating"}
    </span>
  );
}

export default function Catalog() {
  const { add } = useCart();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [ocazii, setOcazii] = useState([]);
  const [stil, setStil] = useState("");
  const [marime, setMarime] = useState("");
  const [pretMin, setPretMin] = useState("");
  const [pretMax, setPretMax] = useState("");
  const [portiiMin, setPortiiMin] = useState("");
  const [portiiMax, setPortiiMax] = useState("");
  const [excludeAlergeni, setExcludeAlergeni] = useState([]);
  const [sort, setSort] = useState("rating");

  useEffect(() => {
    document.title = "Catalog torturi - Maison-Douce";
    const desc = "Exploreaza torturi artizanale, filtreaza dupa ocazie, pret, ingrediente si rating.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
  }, []);

  const params = useMemo(() => {
    const p = {
      q: query || undefined,
      ocazie: ocazii.length ? ocazii.join(",") : undefined,
      stil: stil || undefined,
      marime: marime || undefined,
      pretMin: pretMin || undefined,
      pretMax: pretMax || undefined,
      portiiMin: portiiMin || undefined,
      portiiMax: portiiMax || undefined,
      excludeAlergeni: excludeAlergeni.length ? excludeAlergeni.join(",") : undefined,
      sort,
      activ: true,
      limit: 48,
    };
    return p;
  }, [query, ocazii, stil, marime, pretMin, pretMax, portiiMin, portiiMax, excludeAlergeni, sort]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    ProductsAPI.list(params)
      .then((data) => {
        if (!alive) return;
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [params]);

  const toggleList = (list, value, setter) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="flex flex-col gap-3 mb-8">
          <div className="uppercase tracking-[0.2em] text-xs text-pink-600">Catalog</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Torturi artizanale</h1>
          <p className="text-gray-600">
            Filtreaza dupa ocazie, marime sau ingrediente si gaseste tortul perfect.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm">
              <label className="text-sm font-semibold text-gray-800">Cauta</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cauta tort..."
                className="mt-2 w-full rounded-lg border border-rose-200 px-3 py-2 focus:outline-none focus:border-pink-400"
              />
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-800">Ocazie</label>
              <div className="flex flex-wrap gap-2">
                {OCAZII.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      ocazii.includes(o) ? "bg-pink-500 text-white border-pink-500" : "border-rose-200 text-gray-700"
                    }`}
                    onClick={() => toggleList(ocazii, o, setOcazii)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-800">Pret (MDL)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  value={pretMin}
                  onChange={(e) => setPretMin(e.target.value)}
                  placeholder="Min"
                  className="w-full rounded-lg border border-rose-200 px-3 py-2"
                />
                <input
                  type="number"
                  min="0"
                  value={pretMax}
                  onChange={(e) => setPretMax(e.target.value)}
                  placeholder="Max"
                  className="w-full rounded-lg border border-rose-200 px-3 py-2"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-800">Portii</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  value={portiiMin}
                  onChange={(e) => setPortiiMin(e.target.value)}
                  placeholder="Min"
                  className="w-full rounded-lg border border-rose-200 px-3 py-2"
                />
                <input
                  type="number"
                  min="0"
                  value={portiiMax}
                  onChange={(e) => setPortiiMax(e.target.value)}
                  placeholder="Max"
                  className="w-full rounded-lg border border-rose-200 px-3 py-2"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-800">Stil</label>
              <select
                value={stil}
                onChange={(e) => setStil(e.target.value)}
                className="w-full rounded-lg border border-rose-200 px-3 py-2"
              >
                <option value="">Toate</option>
                {STILURI.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-800">Marime</label>
              <select
                value={marime}
                onChange={(e) => setMarime(e.target.value)}
                className="w-full rounded-lg border border-rose-200 px-3 py-2"
              >
                <option value="">Toate</option>
                {MARIMI.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-800">Fara alergeni</label>
              <div className="flex flex-wrap gap-2">
                {ALERGENI.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      excludeAlergeni.includes(a) ? "bg-rose-600 text-white border-rose-600" : "border-rose-200 text-gray-700"
                    }`}
                    onClick={() => toggleList(excludeAlergeni, a, setExcludeAlergeni)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-800">Sortare</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-lg border border-rose-200 px-3 py-2"
              >
                <option value="rating">Cele mai apreciate</option>
                <option value="popular">Populare</option>
                <option value="price_asc">Pret crescator</option>
                <option value="price_desc">Pret descrescator</option>
              </select>
            </div>
          </aside>

          <section className="lg:col-span-3">
            {loading && <div className="text-gray-600">Se incarca...</div>}

            {!loading && items.length === 0 && (
              <div className="bg-white border border-rose-100 rounded-2xl p-6 text-gray-700">
                Nu am gasit produse pentru filtrele selectate.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((p) => (
                <article key={p._id} className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
                  <div className="h-44 bg-rose-50 overflow-hidden">
                    <img
                      src={p.imagine || "/images/placeholder.png"}
                      alt={p.nume}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{p.nume}</h3>
                      <RatingBadge value={p.ratingAvg} count={p.ratingCount} />
                    </div>
                    <div className="text-pink-600 font-bold">{p.pret ? `${p.pret} MDL` : "Pret la cerere"}</div>
                    <div className="text-xs text-gray-600">
                      {p.timpPreparareOre ? `Timp estimat: ${p.timpPreparareOre}h` : "Timp estimat: 24-48h"}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link
                        to={`/tort/${p._id}`}
                        className="px-3 py-2 rounded-lg border border-rose-200 text-pink-600 text-sm hover:bg-rose-50"
                      >
                        Detalii
                      </Link>
                      <button
                        className="px-3 py-2 rounded-lg bg-pink-500 text-white text-sm hover:bg-pink-600"
                        onClick={() =>
                          add({
                            id: p._id,
                            name: p.nume,
                            price: p.pret || 0,
                            image: p.imagine,
                            qty: 1,
                          })
                        }
                      >
                        Adauga in cos
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
