import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProductsAPI } from "/src/api/products.js";
import { useAuth } from "/src/context/AuthContext.jsx";

const iconics = [
  { img: "/images/image.png", title: "Tort personalizat pentru bebeluET", price: "57 EUR" },
  { img: "/images/easther cake.jpg", title: "Tort personalizat de PaETte", price: "60 EUR" },
  { img: "/images/lambeth.jpg", title: "Tort Arn stil Lambeth", price: "26 EUR" },
  { img: "/images/royalcake.jpg", title: "Tort Royal", price: "170 EUR" },
];

const tailor = [
  { img: "/images/umplutura bicuiti.jpg", title: "Pistachio" },
  { img: "/images/umplutura bounty.jpg", title: "Rose" },
  { img: "/images/umplutura lemon.jpg", title: "Lemon" },
  { img: "/images/umplutura ferero rochen.jpg", title: "Vanilla" },
];

export default function Home() {
  const { user } = useAuth();
  const [loadingRec, setLoadingRec] = useState(true);
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    async function loadRecs() {
      try {
        setLoadingRec(true);
        const data = await ProductsAPI.recommendAi({
          userId: user?._id,
          preferCategorie: "torturi",
          excludePurchased: true,
        });
        setRecs(data?.recomandate || []);
      } catch (e) {
        console.warn("AI recommendations failed", e?.message);
        setRecs([]);
      } finally {
        setLoadingRec(false);
      }
    }

    loadRecs();
  }, [user?._id]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("show")),
      { threshold: 0.15 }
    );
    document.querySelectorAll(".reveal").forEach((el) => {
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <div className="bg-cream min-h-screen">
      {/* HERO */}
      <header className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-10 reveal">
          <div className="flex-1 space-y-4">
            <p className="uppercase tracking-[0.2em] text-sm text-pink-600">Arta delicateselor</p>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              DESERTURI<br />PERSONALIZATE
            </h1>
            <p className="text-gray-600 text-lg">Rafinament pastel si eleganta clasica, create pe gustul tau.</p>
            <div className="flex gap-3">
              <Link to="/catalog" className="px-4 py-3 rounded-lg bg-pink-500 text-white hover:bg-pink-600 shadow">
                Comanda online
              </Link>
              <Link to="/constructor" className="px-4 py-3 rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50">
                Creeaza tortul tau
              </Link>
            </div>
          </div>
          <div className="flex-1">
            <div className="rounded-3xl overflow-hidden shadow-xl border border-pink-100">
              <img src="/images/royalcake.jpg" alt="Tort pastel" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      {/* RECOMANDATE AI */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="mb-8 reveal flex items-center justify-between gap-3">
          <div>
            <p className="text-pink-500 font-semibold uppercase tracking-wide">AI picks</p>
            <h2 className="text-3xl font-bold text-gray-900">Recomandate pentru tine</h2>
            <p className="text-gray-600">Combinatie hibrida: trenduri + istoricul tau + preferinte.</p>
          </div>
          <Link to="/catalog" className="px-4 py-2 rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50">
            Vezi catalogul
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingRec &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="reveal bg-white rounded-2xl shadow-md p-4 border border-rose-100 animate-pulse h-44" />
            ))}

          {!loadingRec && recs.length === 0 && (
            <div className="reveal col-span-full bg-white border border-rose-100 rounded-2xl p-6 text-gray-700">
              Nu avem suficiente date pentru recomandari. Exploreaza catalogul si revin mai multe sugestii dupa primele comenzi.
            </div>
          )}

          {!loadingRec &&
            recs.map((r) => (
              <article
                key={r._id}
                data-cy="rec-card"
                className="reveal bg-white rounded-2xl shadow-md overflow-hidden border border-rose-100 hover:shadow-lg transition"
              >
                <div className="h-44 w-full bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
                  <span className="text-pink-500 font-semibold text-lg">{r.nume}</span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{r.nume}</h3>
                    {r.pret ? <span className="text-pink-600 font-bold">{r.pret} MDL</span> : null}
                  </div>
                  <p className="text-gray-600 text-sm overflow-hidden text-ellipsis">
                    {r.descriere || "Deliciu maison personalizat"}
                  </p>
                  {r.reasons?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {r.reasons.slice(0, 3).map((reason, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full bg-rose-50 text-pink-700 text-xs font-semibold">
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="pt-2 flex gap-2">
                    <Link to={`/tort/${r._id}`} className="px-3 py-2 rounded-lg bg-pink-500 text-white text-sm hover:bg-pink-600">
                      Detalii
                    </Link>
                    <Link to="/constructor" className="px-3 py-2 rounded-lg border border-pink-200 text-pink-600 text-sm hover:bg-pink-50">
                      Personalizeaza
                    </Link>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </section>

      {/* DESPRE */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="reveal space-y-3">
            <p className="text-pink-500 font-semibold uppercase tracking-wide">La Maison</p>
            <h2 className="text-3xl font-bold text-gray-900">Despre mine</h2>
            <p className="text-gray-700 leading-relaxed">
              Maison Douce se inspira din rafinamentul secolului XVIII: cutii pastel, panglici aurii si deserturi fine.
              Fiecare tort este creat manual, cu atentie la detalii si ingrediente de top.
            </p>
            <Link to="/despre" className="inline-block px-4 py-2 rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50">
              Afla povestea
            </Link>
          </div>
          <div className="reveal">
            <div className="rounded-[32px] overflow-hidden shadow-lg border border-rose-100">
              <img src="/images/despre mine.jpg" alt="Ionela Rusu" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ICONICS */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="mb-8 reveal">
          <h2 className="text-3xl font-bold text-gray-900">Iconics</h2>
          <p className="text-gray-600">Selectia noastra de deserturi preferate</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {iconics.map((p, i) => (
            <article key={i} className="reveal bg-white rounded-2xl shadow-md overflow-hidden border border-rose-100">
              <div className="h-48 w-full overflow-hidden">
                <img src={p.img} alt={p.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{p.title}</h3>
                <div className="text-pink-600 font-bold mt-1">{p.price}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* GIFT / BACK TO SCHOOL */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="reveal">
            <div className="rounded-[28px] overflow-hidden shadow-lg border border-rose-100">
              <img src="/images/capusuni in ciocolata.jpg" alt="capsuni in ciocolata" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="reveal space-y-3">
            <p className="text-pink-500 font-semibold uppercase tracking-wide">Art of gifting</p>
            <h2 className="text-3xl font-bold text-gray-900">Idei de cadou personalizate</h2>
            <p className="text-gray-700 leading-relaxed">
              O colectie jucausa si poetica: cutii gourmet, deserturi fine si personalizare completa. Perfecte pentru multumiri,
              aniversari sau evenimente speciale.
            </p>
            <div className="flex gap-3">
              <Link to="/constructor" className="px-4 py-3 rounded-lg bg-pink-500 text-white hover:bg-pink-600 shadow">
                Personalizeaza
              </Link>
              <Link to="/catalog" className="px-4 py-3 rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50">
                Descopera colectia
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tailor-made */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="mb-8 reveal">
          <p className="text-pink-500 font-semibold uppercase tracking-wide">Tailor-made box</p>
          <h2 className="text-3xl font-bold text-gray-900">Creeaza desertul tau</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tailor.map((p, i) => (
            <article key={i} className="reveal bg-white rounded-2xl shadow-md overflow-hidden border border-rose-100">
              <div className="h-40 w-full overflow-hidden">
                <img src={p.img} alt={p.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{p.title}</h3>
                <Link to="/constructor" className="text-pink-600 hover:text-pink-700 font-semibold text-sm">
                  Add to box
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-rose-100">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-gray-700">
          <div>
            <h4 className="font-semibold mb-2">IONELA CAKE</h4>
            <Link to="/catalog" className="block hover:text-pink-600">Cakes</Link>
            <Link to="/catalog" className="block hover:text-pink-600">Macarons</Link>
            <Link to="/catalog" className="block hover:text-pink-600">Chocolates</Link>
            <Link to="/catalog" className="block hover:text-pink-600">EugAcnies</Link>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Informatii</h4>
            <Link to="/catalog" className="block hover:text-pink-600">Colectii</Link>
            <Link to="/despre" className="block hover:text-pink-600">Poveste</Link>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Corporate</h4>
            <Link to="/contact" className="block hover:text-pink-600">Cadouri corporate</Link>
            <Link to="/contact" className="block hover:text-pink-600">Evenimente</Link>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Help</h4>
            <Link to="/contact" className="block hover:text-pink-600">Contact</Link>
            <Link to="/faq" className="block hover:text-pink-600">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
