import { useEffect, useState } from "react";
import api from "/src/lib/api.js";

const OCAZII = ["nunta", "zi de nastere", "botez", "aniversare", "corporate"];

function parseList(value) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function AdminTorturi() {
  const [torturi, setTorturi] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    nume: "",
    descriere: "",
    ingrediente: "",
    alergeniFolositi: "",
    pret: 0,
    costEstim: 0,
    pretVechi: 0,
    imagine: "",
    categorie: "torturi",
    ocazii: [],
    stil: "",
    marime: "",
    portii: 0,
    timpPreparareOre: 24,
    promo: false,
  });

  const load = async () => {
    const res = await api.get("/torturi", { params: { limit: 200 } });
    setTorturi(Array.isArray(res.data?.items) ? res.data.items : []);
  };

  useEffect(() => {
    load().catch(() => setTorturi([]));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      nume: "",
      descriere: "",
      ingrediente: "",
      alergeniFolositi: "",
      pret: 0,
      costEstim: 0,
      pretVechi: 0,
      imagine: "",
      categorie: "torturi",
      ocazii: [],
      stil: "",
      marime: "",
      portii: 0,
      timpPreparareOre: 24,
      promo: false,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const payload = {
      ...form,
      ingrediente: parseList(form.ingrediente),
      alergeniFolositi: parseList(form.alergeniFolositi),
      ocazii: form.ocazii,
    };
    try {
      if (editingId) {
        await api.put(`/torturi/${editingId}`, payload);
        setMsg("Tort actualizat.");
      } else {
        await api.post("/torturi", payload);
        setMsg("Tort adaugat.");
      }
      resetForm();
      load();
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la salvare.");
    }
  };

  const startEdit = (t) => {
    setEditingId(t._id);
    setForm({
      nume: t.nume || "",
      descriere: t.descriere || "",
      ingrediente: Array.isArray(t.ingrediente) ? t.ingrediente.join(", ") : "",
      alergeniFolositi: Array.isArray(t.alergeniFolositi) ? t.alergeniFolositi.join(", ") : "",
      pret: t.pret || 0,
      costEstim: t.costEstim || 0,
      pretVechi: t.pretVechi || 0,
      imagine: t.imagine || "",
      categorie: t.categorie || "torturi",
      ocazii: Array.isArray(t.ocazii) ? t.ocazii : [],
      stil: t.stil || "",
      marime: t.marime || "",
      portii: t.portii || 0,
      timpPreparareOre: t.timpPreparareOre || 24,
      promo: !!t.promo,
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Stergi tortul?")) return;
    await api.delete(`/torturi/${id}`);
    load();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Torturi</h1>
      {msg && <div className="text-sm text-rose-700">{msg}</div>}

      <form onSubmit={submit} className="bg-white border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={form.nume}
            onChange={(e) => setForm((f) => ({ ...f, nume: e.target.value }))}
            placeholder="Nume tort"
            className="border rounded p-2"
            required
          />
          <input
            value={form.imagine}
            onChange={(e) => setForm((f) => ({ ...f, imagine: e.target.value }))}
            placeholder="URL imagine"
            className="border rounded p-2"
          />
        <input
          type="number"
          value={form.pret}
          onChange={(e) => setForm((f) => ({ ...f, pret: e.target.value }))}
          placeholder="Pret (MDL)"
          className="border rounded p-2"
          required
        />
        <input
          type="number"
          value={form.costEstim}
          onChange={(e) => setForm((f) => ({ ...f, costEstim: e.target.value }))}
          placeholder="Cost estimat (MDL)"
          className="border rounded p-2"
        />
          <input
            type="number"
            value={form.pretVechi}
            onChange={(e) => setForm((f) => ({ ...f, pretVechi: e.target.value }))}
            placeholder="Pret vechi (MDL)"
            className="border rounded p-2"
          />
          <input
            value={form.stil}
            onChange={(e) => setForm((f) => ({ ...f, stil: e.target.value }))}
            placeholder="Stil (ex: lambeth)"
            className="border rounded p-2"
          />
          <input
            value={form.marime}
            onChange={(e) => setForm((f) => ({ ...f, marime: e.target.value }))}
            placeholder="Marime (S/M/L)"
            className="border rounded p-2"
          />
          <input
            type="number"
            value={form.portii}
            onChange={(e) => setForm((f) => ({ ...f, portii: e.target.value }))}
            placeholder="Portii"
            className="border rounded p-2"
          />
          <input
            type="number"
            value={form.timpPreparareOre}
            onChange={(e) => setForm((f) => ({ ...f, timpPreparareOre: e.target.value }))}
            placeholder="Timp preparare (ore)"
            className="border rounded p-2"
          />
        </div>

        <textarea
          value={form.descriere}
          onChange={(e) => setForm((f) => ({ ...f, descriere: e.target.value }))}
          placeholder="Descriere"
          className="border rounded p-2 w-full min-h-[90px]"
        />
        <input
          value={form.ingrediente}
          onChange={(e) => setForm((f) => ({ ...f, ingrediente: e.target.value }))}
          placeholder="Ingrediente (virgula)"
          className="border rounded p-2 w-full"
        />
        <input
          value={form.alergeniFolositi}
          onChange={(e) => setForm((f) => ({ ...f, alergeniFolositi: e.target.value }))}
          placeholder="Alergeni (virgula)"
          className="border rounded p-2 w-full"
        />

        <div className="flex flex-wrap gap-2">
          {OCAZII.map((o) => (
            <button
              type="button"
              key={o}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  ocazii: f.ocazii.includes(o) ? f.ocazii.filter((x) => x !== o) : [...f.ocazii, o],
                }))
              }
              className={`px-3 py-1 rounded-full text-xs border ${
                form.ocazii.includes(o) ? "bg-pink-500 text-white border-pink-500" : "border-gray-200"
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.promo}
            onChange={(e) => setForm((f) => ({ ...f, promo: e.target.checked }))}
          />
          Promotie activa
        </label>

        <div className="flex gap-2">
          <button className="bg-pink-500 text-white px-4 py-2 rounded" type="submit">
            {editingId ? "Salveaza" : "Adauga"}
          </button>
          {editingId && (
            <button type="button" className="border px-4 py-2 rounded" onClick={resetForm}>
              Renunta
            </button>
          )}
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {torturi.map((t) => (
          <div key={t._id} className="border rounded-lg p-3 bg-white">
            <div className="flex items-center gap-3">
              <img src={t.imagine || "/images/placeholder.png"} alt={t.nume} className="h-16 w-16 rounded object-cover" />
              <div className="flex-1">
                <div className="font-semibold">{t.nume}</div>
                <div className="text-sm text-gray-600">{t.pret} MDL</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Ocazii: {Array.isArray(t.ocazii) && t.ocazii.length ? t.ocazii.join(", ") : "-"}
            </div>
            <div className="flex gap-2 mt-2">
              <button className="border px-3 py-1 rounded" onClick={() => startEdit(t)}>
                Editeaza
              </button>
              <button className="border px-3 py-1 rounded" onClick={() => remove(t._id)}>
                Sterge
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
