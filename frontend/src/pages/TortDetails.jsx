import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProductsAPI } from "../api/products";
import api from "../lib/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

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
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ stele: 5, comentariu: "" });
  const [reviewFile, setReviewFile] = useState(null);
  const [sendingReview, setSendingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");

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
        setTort(null);
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
      .then((r) => {
        if (!alive) return;
        setReviews(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        if (!alive) return;
        setReviews([]);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const gallery = useMemo(() => {
    const list = [];
    if (tort?.imagine) list.push(tort.imagine);
    if (Array.isArray(tort?.galerie)) list.push(...tort.galerie);
    return Array.from(new Set(list));
  }, [tort]);

  const addToCart = () => {
    if (!tort) return;
    const options = { aroma, marime, portii };
    const variantKey = JSON.stringify(options || {});
    add({
      id: tort._id,
      name: tort.nume,
      price: tort.pret || 0,
      image: tort.imagine,
      qty,
      options,
      variantKey,
      prepHours: tort.timpPreparareOre || 24,
    });
  };

  const sendReview = async (e) => {
    e.preventDefault();
    if (!user?._id) {
      setReviewMsg("Autentifica-te pentru a lasa o recenzie.");
      return;
    }
    if (!reviewForm.comentariu.trim()) {
      setReviewMsg("Completeaza comentariul.");
      return;
    }
    setSendingReview(true);
    setReviewMsg("");
    try {
      let fotoUrl = "";
      if (reviewFile) {
        const fd = new FormData();
        fd.append("file", reviewFile);
        const upload = await api.post("/upload", fd);
        fotoUrl = upload.data?.url || "";
      }
      await api.post("/recenzii/produs", {
        tortId: id,
        stele: Number(reviewForm.stele || 5),
        comentariu: reviewForm.comentariu,
        foto: fotoUrl,
      });
      const res = await api.get(`/recenzii/produs/${id}`);
      setReviews(Array.isArray(res.data) ? res.data : []);
      setReviewForm({ stele: 5, comentariu: "" });
      setReviewFile(null);
    } catch (e) {
      console.error("Review error:", e);
      setReviewMsg(e?.response?.data?.message || "Nu am putut trimite recenzia.");
    } finally {
      setSendingReview(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto p-6">Se incarca...</div>;
  if (!tort) return <div className="max-w-4xl mx-auto p-6">Nu s-a gasit tortul.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden border border-rose-100 bg-rose-50">
            {gallery[0] ? (
              <img src={gallery[0]} alt={tort.nume} className="w-full h-72 object-cover" />
            ) : (
              <div className="h-72 flex items-center justify-center text-gray-500">Fara imagine</div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {gallery.slice(1).map((img) => (
                <div key={img} className="h-20 rounded-xl overflow-hidden border border-rose-100">
                  <img src={img} alt="Galerie" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">{tort.nume}</h1>
            <div className="text-pink-600 font-semibold">
              {tort.pret ? `${tort.pret} MDL` : "Pret la cerere"}
            </div>
            <div className="text-sm text-gray-600">
              {tort.timpPreparareOre ? `Timp estimat: ${tort.timpPreparareOre}h` : "Timp estimat: 24-48h"}
            </div>
          </div>

          <p className="text-gray-700">{tort.descriere || "Tort artizanal personalizat."}</p>

          {Array.isArray(tort.ingrediente) && tort.ingrediente.length > 0 && (
            <div className="text-sm text-gray-700">
              <strong>Ingrediente:</strong> {tort.ingrediente.join(", ")}
            </div>
          )}
          {Array.isArray(tort.alergeniFolositi) && tort.alergeniFolositi.length > 0 && (
            <div className="text-sm text-rose-700">
              <strong>Alergeni:</strong> {tort.alergeniFolositi.join(", ")}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-gray-700">
              Aroma
              <select
                value={aroma}
                onChange={(e) => setAroma(e.target.value)}
                className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2"
              >
                {Array.isArray(tort.arome) && tort.arome.length > 0 ? (
                  tort.arome.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))
                ) : (
                  <option value="">Standard</option>
                )}
              </select>
            </label>

            <label className="text-sm font-semibold text-gray-700">
              Marime
              <input
                value={marime}
                onChange={(e) => setMarime(e.target.value)}
                placeholder="ex: M / 1.5kg"
                className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700">
              Portii
              <input
                type="number"
                min="1"
                value={portii}
                onChange={(e) => setPortii(e.target.value)}
                placeholder="ex: 12"
                className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2"
              />
            </label>

            <label className="text-sm font-semibold text-gray-700">
              Cantitate
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value || 1))}
                className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600"
              onClick={addToCart}
            >
              Adauga in cos
            </button>
            <Link
              to={`/constructor?from=${tort._id}`}
              className="px-4 py-2 rounded-lg border border-rose-200 text-pink-600 hover:bg-rose-50"
            >
              Personalizeaza
            </Link>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Recenzii</h2>
        {reviews.length === 0 && <div className="text-gray-600">Nu exista recenzii inca.</div>}
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r._id} className="border border-rose-100 rounded-lg p-3">
              <div className="text-sm font-semibold text-gray-800">Rating: {r.stele} / 5</div>
              <div className="text-gray-700">{r.comentariu}</div>
              {r.foto && (
                <div className="mt-2">
                  <img src={r.foto} alt="recenzie" className="h-32 rounded-lg object-cover" />
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {r.data ? new Date(r.data).toLocaleString() : ""}
              </div>
            </div>
          ))}
        </div>

        {reviewMsg && <div className="text-rose-700 text-sm">{reviewMsg}</div>}
        <form onSubmit={sendReview} className="border-t border-rose-100 pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-sm font-semibold text-gray-700">
              Rating
              <select
                value={reviewForm.stele}
                onChange={(e) => setReviewForm((s) => ({ ...s, stele: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2"
              >
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-700 sm:col-span-2">
              Foto (optional)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setReviewFile(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2"
              />
            </label>
          </div>
          <label className="text-sm font-semibold text-gray-700 block">
            Comentariu
            <textarea
              value={reviewForm.comentariu}
              onChange={(e) => setReviewForm((s) => ({ ...s, comentariu: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-rose-200 px-3 py-2 min-h-[90px]"
              placeholder="Spune-ne cum a fost tortul."
              required
            />
          </label>
          <button
            type="submit"
            disabled={sendingReview}
            className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-60"
          >
            {sendingReview ? "Se trimite..." : "Trimite recenzie"}
          </button>
        </form>
      </section>
    </div>
  );
}
