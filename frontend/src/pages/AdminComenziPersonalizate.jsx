import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "/src/lib/api.js";
import { buttons, cards, inputs } from "../lib/tailwindComponents";
import {
  buildCustomOrderPreviewImages,
  buildCustomOrderSections,
  formatCustomOrderDate,
  getCustomOrderStatusMeta,
} from "../lib/customOrderSummary";

const STATUS_OPTIONS = ["noua", "in_discutie", "aprobata", "respinsa"];

function DetailSection({ section }) {
  return (
    <div className="rounded-[22px] border border-rose-100 bg-white/85 px-4 py-4 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
        {section.title}
      </div>
      <div className="mt-3 space-y-2">
        {section.items.map((item) => (
          <div key={`${section.id}-${item.label}`} className="flex items-start justify-between gap-3">
            <div className="text-sm text-gray-500">{item.label}</div>
            <div className="max-w-[70%] text-right text-sm font-semibold text-gray-900">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminComenziPersonalizate() {
  const [comenzi, setComenzi] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/comenzi-personalizate", {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setComenzi(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Eroare la incarcare comenzi personalizate:", error);
      setComenzi([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateComanda = async (id, payload) => {
    await api.patch(`/comenzi-personalizate/${id}/status`, payload);
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <section className={`${cards.tinted} space-y-5`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
              Atelier workflow
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-gray-900">
              Comenzi personalizate
            </h1>
            <p className="mt-3 text-base leading-7 text-gray-600">
              Patiserul vede acum structura tortului, interiorul, exteriorul, cerinta
              libera pentru AI si ambele preview-uri fara sa mai decodeze manual obiectul
              de optiuni.
            </p>
          </div>

          <label className="min-w-[220px] text-sm font-semibold text-[#4e453d]">
            Filtreaza dupa status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`mt-2 ${inputs.default}`}
            >
              <option value="">Toate statusurile</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getCustomOrderStatusMeta(status).label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-rose-100 bg-white/80 p-4 shadow-soft">
            <div className="text-sm font-medium text-pink-700">Total comenzi</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{comenzi.length}</div>
            <div className="mt-2 text-sm text-[#655c53]">
              Toate solicitarile de tort personalizat pentru filtrul activ.
            </div>
          </article>
          <article className="rounded-[24px] border border-rose-100 bg-white/80 p-4 shadow-soft">
            <div className="text-sm font-medium text-pink-700">Cu preview AI</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {comenzi.filter((item) => item?.options?.aiPreviewUrl).length}
            </div>
            <div className="mt-2 text-sm text-[#655c53]">
              Comenzi unde clientul a cerut deja o simulare mai realista.
            </div>
          </article>
          <article className="rounded-[24px] border border-rose-100 bg-white/80 p-4 shadow-soft">
            <div className="text-sm font-medium text-pink-700">In discutie</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {comenzi.filter((item) => item?.status === "in_discutie").length}
            </div>
            <div className="mt-2 text-sm text-[#655c53]">
              Cereri care au nevoie inca de clarificare sau confirmare de pret.
            </div>
          </article>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[24px] border border-rose-100 bg-white/90 px-4 py-6 text-sm text-gray-600 shadow-soft">
          Se incarca comenzile personalizate...
        </div>
      ) : null}

      {!loading && comenzi.length === 0 ? (
        <div className="rounded-[24px] border border-rose-100 bg-white/90 px-4 py-6 text-sm text-gray-600 shadow-soft">
          Nu exista comenzi personalizate pentru filtrul selectat.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {comenzi.map((comanda) => {
          const statusMeta = getCustomOrderStatusMeta(comanda.status);
          const sections = buildCustomOrderSections(comanda);
          const previewImages = buildCustomOrderPreviewImages(comanda);

          return (
            <article
              key={comanda._id}
              className={`${cards.elevated} overflow-hidden border-rose-100 bg-[rgba(255,251,245,0.95)]`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                    Comanda personalizata
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900">
                    {comanda.numeClient || "Client"}
                  </h2>
                  <div className="mt-2 text-sm text-gray-500">
                    {formatCustomOrderDate(comanda.data || comanda.createdAt)}
                  </div>
                </div>

                <div
                  className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-[22px] border border-rose-100 bg-white/80 px-4 py-3 shadow-soft">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                    Pret estimat
                  </div>
                  <div className="mt-2 text-xl font-semibold text-gray-900">
                    {Number(comanda.pretEstimat || 0)} MDL
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Ajustabil direct din card.
                  </div>
                </div>
                <div className="rounded-[22px] border border-rose-100 bg-white/80 px-4 py-3 shadow-soft">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                    Timp estimat
                  </div>
                  <div className="mt-2 text-xl font-semibold text-gray-900">
                    {Number(comanda.timpPreparareOre || 0)} ore
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Include structura si optiunile salvate din constructor.
                  </div>
                </div>
                <div className="rounded-[22px] border border-rose-100 bg-white/80 px-4 py-3 shadow-soft">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                    Design salvat
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    {comanda.designId ? `#${String(comanda.designId).slice(-6)}` : "fara draft"}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    Poti redeschide designul pentru verificare.
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
                <div className="space-y-4">
                  {previewImages.length > 0 ? (
                    previewImages.map((image) => (
                      <div
                        key={`${comanda._id}-${image.id}`}
                        className="overflow-hidden rounded-[24px] border border-rose-100 bg-white shadow-soft"
                      >
                        <div className="border-b border-rose-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                          {image.label}
                        </div>
                        <img
                          src={image.url}
                          alt={`${image.label} pentru ${comanda.numeClient || "client"}`}
                          className="h-60 w-full object-contain bg-[rgba(255,249,242,0.7)]"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-rose-200 bg-white/80 px-4 py-8 text-sm text-gray-500">
                      Comanda nu are inca nici preview 2D, nici imagine AI atasata.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {sections.map((section) => (
                      <DetailSection key={`${comanda._id}-${section.id}`} section={section} />
                    ))}
                  </div>

                  <div className="rounded-[22px] border border-rose-100 bg-white/85 px-4 py-4 shadow-soft">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Actiuni rapide
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {comanda.designId ? (
                        <Link
                          to={`/constructor?designId=${comanda.designId}`}
                          className={buttons.outline}
                        >
                          Deschide designul
                        </Link>
                      ) : null}
                      {previewImages[0]?.url ? (
                        <a
                          href={previewImages[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className={buttons.outline}
                        >
                          Deschide preview-ul
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-rose-100 bg-white/85 px-4 py-4 shadow-soft">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Ajusteaza pretul
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="number"
                        className={`${inputs.default} max-w-[180px]`}
                        defaultValue={comanda.pretEstimat || 0}
                        onBlur={(event) =>
                          updateComanda(comanda._id, {
                            pretEstimat: Number(event.target.value || 0),
                          })
                        }
                      />
                      <span className="text-sm text-gray-500">MDL</span>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-rose-100 bg-white/85 px-4 py-4 shadow-soft">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Status comanda
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((status) => {
                        const itemMeta = getCustomOrderStatusMeta(status);
                        const active = status === comanda.status;
                        return (
                          <button
                            key={`${comanda._id}-${status}`}
                            type="button"
                            className={
                              active
                                ? `rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${itemMeta.className}`
                                : buttons.outline
                            }
                            onClick={() => updateComanda(comanda._id, { status })}
                          >
                            {itemMeta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
