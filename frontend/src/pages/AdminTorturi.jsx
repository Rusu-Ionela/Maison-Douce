import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { badges, buttons, inputs } from "../lib/tailwindComponents";

const OCAZII = ["nunta", "zi de nastere", "botez", "aniversare", "corporate"];

function parseList(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyForm() {
  return {
    nume: "",
    descriere: "",
    ingrediente: "",
    alergeniFolositi: "",
    pret: "0",
    costEstim: "0",
    pretVechi: "0",
    imagine: "",
    categorie: "torturi",
    ocazii: [],
    stil: "",
    marime: "",
    portii: "0",
    timpPreparareOre: "24",
    promo: false,
  };
}

export default function AdminTorturi() {
  const [torturi, setTorturi] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "info", message: "" });
  const [search, setSearch] = useState("");
  const [promoOnly, setPromoOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/torturi", { params: { limit: 200 } });
      setTorturi(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (error) {
      setTorturi([]);
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || "Nu am putut incarca torturile.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredTorturi = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...torturi]
      .filter((item) => {
        const okSearch = normalizedSearch
          ? `${item.nume || ""} ${item.stil || ""} ${item.marime || ""}`
              .toLowerCase()
              .includes(normalizedSearch)
          : true;
        const okPromo = promoOnly ? Boolean(item.promo) : true;
        return okSearch && okPromo;
      })
      .sort((a, b) => String(a.nume || "").localeCompare(String(b.nume || "")));
  }, [promoOnly, search, torturi]);

  const metrics = useMemo(() => {
    const promoCount = torturi.filter((item) => item.promo).length;
    const withImage = torturi.filter((item) => item.imagine).length;
    const averagePrep =
      torturi.length > 0
        ? (
            torturi.reduce(
              (sum, item) => sum + toNumber(item.timpPreparareOre),
              0
            ) / torturi.length
          ).toFixed(1)
        : "0.0";

    return [
      {
        label: "Torturi active",
        value: torturi.length,
        hint: "Produse disponibile in catalogul operational.",
        tone: "rose",
      },
      {
        label: "In promotie",
        value: promoCount,
        hint: "Apar cu pret promotional in frontend.",
        tone: "gold",
      },
      {
        label: "Cu imagine",
        value: withImage,
        hint: "Ajuta mult la calitatea listarii in catalog.",
        tone: "sage",
      },
      {
        label: "Prep mediu",
        value: `${averagePrep} h`,
        hint: "Media estimata de productie pentru portofoliu.",
        tone: "slate",
      },
    ];
  }, [torturi]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const submit = async (event) => {
    event.preventDefault();
    setFeedback({ type: "info", message: "" });

    const payload = {
      ...form,
      nume: form.nume.trim(),
      descriere: form.descriere.trim(),
      ingrediente: parseList(form.ingrediente),
      alergeniFolositi: parseList(form.alergeniFolositi),
      pret: toNumber(form.pret),
      costEstim: toNumber(form.costEstim),
      pretVechi: toNumber(form.pretVechi),
      portii: toNumber(form.portii),
      timpPreparareOre: toNumber(form.timpPreparareOre),
      ocazii: form.ocazii,
    };

    try {
      if (editingId) {
        await api.put(`/torturi/${editingId}`, payload);
        setFeedback({ type: "success", message: "Tort actualizat." });
      } else {
        await api.post("/torturi", payload);
        setFeedback({ type: "success", message: "Tort adaugat." });
      }
      resetForm();
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || "Eroare la salvare.",
      });
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      nume: item.nume || "",
      descriere: item.descriere || "",
      ingrediente: Array.isArray(item.ingrediente) ? item.ingrediente.join(", ") : "",
      alergeniFolositi: Array.isArray(item.alergeniFolositi)
        ? item.alergeniFolositi.join(", ")
        : "",
      pret: String(item.pret || 0),
      costEstim: String(item.costEstim || 0),
      pretVechi: String(item.pretVechi || 0),
      imagine: item.imagine || "",
      categorie: item.categorie || "torturi",
      ocazii: Array.isArray(item.ocazii) ? item.ocazii : [],
      stil: item.stil || "",
      marime: item.marime || "",
      portii: String(item.portii || 0),
      timpPreparareOre: String(item.timpPreparareOre || 24),
      promo: Boolean(item.promo),
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Stergi tortul?")) return;

    try {
      await api.delete(`/torturi/${id}`);
      setFeedback({ type: "success", message: "Tort sters." });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.message || "Nu am putut sterge tortul.",
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setPromoOnly(false);
  };

  return (
    <AdminShell
      title="Torturi"
      description="Controleaza catalogul principal, preturile, informatiile de productie si calitatea prezentarii in site."
      actions={
        <>
          {(search.trim() || promoOnly) ? (
            <button type="button" className={buttons.outline} onClick={clearFilters}>
              Reseteaza filtrele
            </button>
          ) : null}
          <button type="button" className={buttons.primary} onClick={load}>
            Reincarca
          </button>
        </>
      }
    >
      <StatusBanner type={feedback.type} message={feedback.message} />
      <AdminMetricGrid items={metrics} />

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <AdminPanel
          title={editingId ? "Editeaza tortul" : "Adauga tort nou"}
          description="Campurile numerice sunt trimise normalizat, iar listele de ingrediente si alergeni sunt curate inainte de salvare."
        >
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Nume
                <input
                  value={form.nume}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nume: event.target.value }))
                  }
                  placeholder="Nume tort"
                  className={`mt-2 ${inputs.default}`}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                URL imagine
                <input
                  value={form.imagine}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, imagine: event.target.value }))
                  }
                  placeholder="https://..."
                  className={`mt-2 ${inputs.default}`}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm font-semibold text-gray-700">
                Pret
                <input
                  type="number"
                  value={form.pret}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, pret: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Cost estimat
                <input
                  type="number"
                  value={form.costEstim}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, costEstim: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Pret vechi
                <input
                  type="number"
                  value={form.pretVechi}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, pretVechi: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <label className="block text-sm font-semibold text-gray-700">
                Stil
                <input
                  value={form.stil}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stil: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                  placeholder="lambeth"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Marime
                <input
                  value={form.marime}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, marime: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                  placeholder="S / M / L"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Portii
                <input
                  type="number"
                  value={form.portii}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, portii: event.target.value }))
                  }
                  className={`mt-2 ${inputs.default}`}
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Timp preparare
                <input
                  type="number"
                  value={form.timpPreparareOre}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      timpPreparareOre: event.target.value,
                    }))
                  }
                  className={`mt-2 ${inputs.default}`}
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              Descriere
              <textarea
                value={form.descriere}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descriere: event.target.value }))
                }
                placeholder="Descriere"
                className={`mt-2 ${inputs.default} min-h-[110px]`}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Ingrediente
                <input
                  value={form.ingrediente}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, ingrediente: event.target.value }))
                  }
                  placeholder="vanilie, capsuni, crema"
                  className={`mt-2 ${inputs.default}`}
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Alergeni
                <input
                  value={form.alergeniFolositi}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      alergeniFolositi: event.target.value,
                    }))
                  }
                  placeholder="gluten, oua"
                  className={`mt-2 ${inputs.default}`}
                />
              </label>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-700">Ocazii</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {OCAZII.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        ocazii: current.ocazii.includes(item)
                          ? current.ocazii.filter((entry) => entry !== item)
                          : [...current.ocazii, item],
                      }))
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      form.ocazii.includes(item)
                        ? "border-pink-600 bg-pink-600 text-white"
                        : "border-rose-200 bg-white text-gray-700 hover:bg-rose-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 px-4 py-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={form.promo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, promo: event.target.checked }))
                }
              />
              Promotie activa
            </label>

            <div className="flex flex-wrap gap-3">
              <button className={buttons.primary} type="submit">
                {editingId ? "Salveaza modificarile" : "Adauga tortul"}
              </button>
              {editingId ? (
                <button type="button" className={buttons.outline} onClick={resetForm}>
                  Renunta
                </button>
              ) : null}
            </div>
          </form>
        </AdminPanel>

        <AdminPanel
          title="Portofoliu de torturi"
          description="Filtreaza dupa nume sau vezi doar produsele aflate in promotie."
        >
          <div className="mb-4 grid gap-4 md:grid-cols-[1fr,auto]">
            <label className="block text-sm font-semibold text-gray-700">
              Cautare
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="nume, stil, marime"
                className={`mt-2 ${inputs.default}`}
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 px-4 py-3 text-sm font-semibold text-gray-700 md:self-end">
              <input
                type="checkbox"
                checked={promoOnly}
                onChange={(event) => setPromoOnly(event.target.checked)}
              />
              Doar promotii
            </label>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[220px] animate-pulse rounded-[24px] border border-rose-100 bg-white/80"
                />
              ))}
            </div>
          ) : null}

          {!loading && filteredTorturi.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-5 text-sm text-gray-600">
              Nu exista torturi pentru filtrul curent.
            </div>
          ) : null}

          {!loading ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredTorturi.map((item) => (
                <article
                  key={item._id}
                  className="overflow-hidden rounded-[24px] border border-rose-100 bg-white shadow-soft"
                >
                  <div className="h-44 bg-rose-50">
                    <img
                      src={item.imagine || "/images/placeholder.svg"}
                      alt={item.nume}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {item.nume}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {item.stil || "Fara stil"} {item.marime ? `• ${item.marime}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.promo ? <span className={badges.warning}>Promotie</span> : null}
                        <span className={badges.info}>
                          {toNumber(item.timpPreparareOre)}h
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="rounded-2xl bg-rose-50/50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Pret
                        </div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {toNumber(item.pret).toFixed(2)} MDL
                        </div>
                      </div>
                      <div className="rounded-2xl bg-rose-50/50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Portii
                        </div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {toNumber(item.portii)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600">
                      Ocazii:{" "}
                      {Array.isArray(item.ocazii) && item.ocazii.length
                        ? item.ocazii.join(", ")
                        : "-"}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button className={buttons.secondary} onClick={() => startEdit(item)}>
                        Editeaza
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-soft hover:bg-rose-50"
                        onClick={() => remove(item._id)}
                      >
                        Sterge
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
