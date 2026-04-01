import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "/src/lib/api.js";
import StatusBanner from "../components/StatusBanner";
import { buttons, cards, inputs } from "../lib/tailwindComponents";
import {
  buildCustomOrderPreviewImages,
  buildCustomOrderSections,
  formatCustomOrderDate,
  getCustomOrderStatusMeta,
} from "../lib/customOrderSummary";

const STATUS_OPTIONS = ["noua", "in_discutie", "aprobata", "comanda_generata", "respinsa"];

function resolveLinkedOrder(comanda) {
  return comanda?.comandaId && typeof comanda.comandaId === "object" ? comanda.comandaId : null;
}

function buildOrderDraft(comanda) {
  const linkedOrder = resolveLinkedOrder(comanda);
  return {
    dataLivrare: linkedOrder?.dataLivrare || "",
    oraLivrare: linkedOrder?.oraLivrare || "",
    metodaLivrare: linkedOrder?.metodaLivrare === "livrare" ? "livrare" : "ridicare",
    adresaLivrare: linkedOrder?.adresaLivrare || "",
    deliveryInstructions: linkedOrder?.deliveryInstructions || "",
    deliveryWindow: linkedOrder?.deliveryWindow || "",
  };
}

function buildReviewDraft(comanda) {
  return {
    pretEstimat: String(Number(comanda?.pretEstimat || 0)),
    status: comanda?.status || "noua",
    statusNote: "",
  };
}

function formatApprovalMoment(value) {
  if (!value) return "";
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return "";
  return next.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [conversionDrafts, setConversionDrafts] = useState({});
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [convertingId, setConvertingId] = useState("");
  const [savingActionId, setSavingActionId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/comenzi-personalizate", {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setComenzi(Array.isArray(res.data) ? res.data : []);
      setReviewDrafts({});
    } catch (error) {
      console.error("Eroare la incarcare comenzi personalizate:", error);
      setComenzi([]);
      setFeedback({
        type: "error",
        message: error?.response?.data?.mesaj || "Nu am putut incarca comenzile personalizate.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateComanda = async (id, payload, successMessage = "Cererea personalizata a fost actualizata.") => {
    try {
      await api.patch(`/comenzi-personalizate/${id}/status`, payload);
      setFeedback({ type: "success", message: successMessage });
      await load();
      return true;
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.mesaj || "Nu am putut actualiza cererea personalizata.",
      });
      return false;
    }
  };

  const getOrderDraft = (comanda) => ({
    ...buildOrderDraft(comanda),
    ...(conversionDrafts[comanda._id] || {}),
  });

  const setOrderDraftField = (comanda, field, value) => {
    setConversionDrafts((current) => ({
      ...current,
      [comanda._id]: {
        ...buildOrderDraft(comanda),
        ...(current[comanda._id] || {}),
        [field]: value,
      },
    }));
  };

  const getReviewDraft = (comanda) => ({
    ...buildReviewDraft(comanda),
    ...(reviewDrafts[comanda._id] || {}),
  });

  const setReviewDraftField = (comanda, field, value) => {
    setReviewDrafts((current) => ({
      ...current,
      [comanda._id]: {
        ...buildReviewDraft(comanda),
        ...(current[comanda._id] || {}),
        [field]: value,
      },
    }));
  };

  const resetReviewDraft = (comanda) => {
    setReviewDrafts((current) => {
      if (!current[comanda._id]) return current;
      const next = { ...current };
      delete next[comanda._id];
      return next;
    });
  };

  const saveEstimatedPrice = async (comanda) => {
    const draft = getReviewDraft(comanda);
    const parsedPrice = Number(draft.pretEstimat);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFeedback({
        type: "warning",
        message: "Introdu un pret estimat valid, mai mare sau egal cu 0.",
      });
      return;
    }
    if (parsedPrice === Number(comanda.pretEstimat || 0)) {
      setFeedback({
        type: "info",
        message: "Pretul nu a fost modificat, deci nu exista nimic de salvat.",
      });
      return;
    }

    setSavingActionId(`price-${comanda._id}`);
    try {
      const ok = await updateComanda(
        comanda._id,
        { pretEstimat: parsedPrice },
        "Pretul estimat a fost actualizat dupa confirmare."
      );
      if (ok) resetReviewDraft(comanda);
    } finally {
      setSavingActionId("");
    }
  };

  const saveStatusChange = async (comanda) => {
    const draft = getReviewDraft(comanda);
    const nextStatus = String(draft.status || "").trim();
    const statusNote = String(draft.statusNote || "").trim();

    if (!STATUS_OPTIONS.includes(nextStatus)) {
      setFeedback({
        type: "warning",
        message: "Selecteaza un status valid inainte de confirmare.",
      });
      return;
    }
    if (nextStatus === String(comanda.status || "")) {
      setFeedback({
        type: "info",
        message: "Statusul selectat este deja activ. Alege alt status pentru a salva o schimbare.",
      });
      return;
    }
    if (nextStatus === "respinsa" && !statusNote) {
      setFeedback({
        type: "warning",
        message: "Pentru respingere este obligatoriu un motiv intern clar.",
      });
      return;
    }

    setSavingActionId(`status-${comanda._id}`);
    try {
      const ok = await updateComanda(
        comanda._id,
        { status: nextStatus, statusNote },
        "Statusul cererii personalizate a fost actualizat."
      );
      if (ok) resetReviewDraft(comanda);
    } finally {
      setSavingActionId("");
    }
  };

  const convertToOrder = async (comanda) => {
    const draft = getOrderDraft(comanda);
    if (!draft.dataLivrare || !draft.oraLivrare) {
      setFeedback({
        type: "warning",
        message: "Data si ora sunt obligatorii pentru generarea comenzii.",
      });
      return;
    }
    if (draft.metodaLivrare === "livrare" && !String(draft.adresaLivrare || "").trim()) {
      setFeedback({
        type: "warning",
        message: "Adresa este obligatorie pentru comenzile cu livrare.",
      });
      return;
    }

    setConvertingId(comanda._id);
    setFeedback({ type: "", message: "" });

    try {
      const response = await api.post(`/comenzi-personalizate/${comanda._id}/convert`, draft);
      const orderNumber =
        response?.data?.comanda?.numeroComanda ||
        response?.data?.comanda?._id ||
        response?.data?.customOrderId;

      setFeedback({
        type: "success",
        message: response?.data?.alreadyConverted
          ? "Cererea avea deja o comanda generata si a fost resincronizata in lista."
          : `Comanda platibila a fost generata (${orderNumber}). Clientul o vede acum in profil.`,
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.response?.data?.mesaj || "Nu am putut genera comanda din cererea personalizata.",
      });
    } finally {
      setConvertingId("");
    }
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

      <StatusBanner type={feedback.type || "info"} message={feedback.message} />

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
          const linkedOrder = resolveLinkedOrder(comanda);
          const orderDraft = getOrderDraft(comanda);
          const reviewDraft = getReviewDraft(comanda);
          const selectedStatusMeta = getCustomOrderStatusMeta(reviewDraft.status);
          const priceChanged =
            Number(reviewDraft.pretEstimat || 0) !== Number(comanda.pretEstimat || 0);
          const statusChanged = reviewDraft.status !== comanda.status;
          const statusNoteChanged = Boolean(String(reviewDraft.statusNote || "").trim());
          const savingPrice = savingActionId === `price-${comanda._id}`;
          const savingStatus = savingActionId === `status-${comanda._id}`;
          const canSaveStatus =
            statusChanged &&
            !(reviewDraft.status === "respinsa" && !String(reviewDraft.statusNote || "").trim());
          const clientApproved = Boolean(comanda.clientApprovedAt);
          const approvalMoment = formatApprovalMoment(comanda.clientApprovedAt);

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
                    Actualizarea cere acum selectie si confirmare explicita.
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
                    <div className="mt-2 text-sm leading-6 text-gray-600">
                      Pretul nu se mai salveaza automat la iesirea din camp. Operatorul confirma
                      explicit schimbarea.
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className={`${inputs.default} max-w-[180px]`}
                        value={reviewDraft.pretEstimat}
                        onChange={(event) =>
                          setReviewDraftField(comanda, "pretEstimat", event.target.value)
                        }
                      />
                      <span className="text-sm text-gray-500">MDL</span>
                    </div>
                    <div className="mt-3 text-sm text-gray-500">
                      Pret curent salvat: {Number(comanda.pretEstimat || 0)} MDL
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className={buttons.primary}
                        disabled={!priceChanged || savingPrice}
                        onClick={() => saveEstimatedPrice(comanda)}
                      >
                        {savingPrice ? "Se salveaza..." : "Salveaza pretul"}
                      </button>
                      <button
                        type="button"
                        className={buttons.outline}
                        disabled={!priceChanged || savingPrice}
                        onClick={() => resetReviewDraft(comanda)}
                      >
                        Renunta
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-rose-100 bg-white/85 px-4 py-4 shadow-soft">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Genereaza comanda platibila
                    </div>

                    {linkedOrder ? (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          Cererea este deja legata de comanda{" "}
                          <span className="font-semibold">
                            {linkedOrder.numeroComanda || `#${String(linkedOrder._id || "").slice(-6)}`}
                          </span>
                          .
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-[18px] border border-rose-100 bg-white px-4 py-3 text-sm text-gray-600">
                            <div className="font-semibold text-gray-900">Programare</div>
                            <div className="mt-2">
                              {linkedOrder.dataLivrare || "-"} {linkedOrder.oraLivrare || ""}
                            </div>
                          </div>
                          <div className="rounded-[18px] border border-rose-100 bg-white px-4 py-3 text-sm text-gray-600">
                            <div className="font-semibold text-gray-900">Total</div>
                            <div className="mt-2">
                              {Number(linkedOrder.totalFinal || linkedOrder.total || 0)} MDL
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Link to="/admin/comenzi" className={buttons.outline}>
                            Vezi comenzi
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-sm font-semibold text-[#4e453d]">
                            Data livrare
                            <input
                              type="date"
                              value={orderDraft.dataLivrare}
                              onChange={(event) =>
                                setOrderDraftField(comanda, "dataLivrare", event.target.value)
                              }
                              className={`mt-2 ${inputs.default}`}
                            />
                          </label>
                          <label className="text-sm font-semibold text-[#4e453d]">
                            Ora livrare
                            <input
                              type="time"
                              value={orderDraft.oraLivrare}
                              onChange={(event) =>
                                setOrderDraftField(comanda, "oraLivrare", event.target.value)
                              }
                              className={`mt-2 ${inputs.default}`}
                            />
                          </label>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-sm font-semibold text-[#4e453d]">
                            Metoda de predare
                            <select
                              value={orderDraft.metodaLivrare}
                              onChange={(event) =>
                                setOrderDraftField(comanda, "metodaLivrare", event.target.value)
                              }
                              className={`mt-2 ${inputs.default}`}
                            >
                              <option value="ridicare">Ridicare personala</option>
                              <option value="livrare">Livrare</option>
                            </select>
                          </label>
                          <label className="text-sm font-semibold text-[#4e453d]">
                            Interval livrare
                            <input
                              type="text"
                              value={orderDraft.deliveryWindow}
                              onChange={(event) =>
                                setOrderDraftField(comanda, "deliveryWindow", event.target.value)
                              }
                              className={`mt-2 ${inputs.default}`}
                              placeholder="Ex: 16:00-17:00"
                            />
                          </label>
                        </div>

                        {orderDraft.metodaLivrare === "livrare" ? (
                          <label className="text-sm font-semibold text-[#4e453d]">
                            Adresa livrare
                            <input
                              type="text"
                              value={orderDraft.adresaLivrare}
                              onChange={(event) =>
                                setOrderDraftField(comanda, "adresaLivrare", event.target.value)
                              }
                              className={`mt-2 ${inputs.default}`}
                              placeholder="Strada, numar, bloc, apartament"
                            />
                          </label>
                        ) : (
                          <div className="rounded-[18px] border border-rose-100 bg-[rgba(255,249,242,0.78)] px-4 py-3 text-sm text-gray-600">
                            Ridicarea personala nu necesita adresa. Clientul va vedea comanda in
                            profil si poate continua la plata.
                          </div>
                        )}

                        {clientApproved ? (
                          <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            Clientul a aprobat oferta{approvalMoment ? ` pe ${approvalMoment}` : ""}.
                            {comanda.clientApprovalNote ? (
                              <span className="block pt-2 text-emerald-900">
                                Mesaj client: {comanda.clientApprovalNote}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Asteapta confirmarea clientului din pagina ofertei inainte sa generezi
                            comanda pentru plata.
                          </div>
                        )}

                        <label className="text-sm font-semibold text-[#4e453d]">
                          Instructiuni suplimentare
                          <textarea
                            value={orderDraft.deliveryInstructions}
                            onChange={(event) =>
                              setOrderDraftField(comanda, "deliveryInstructions", event.target.value)
                            }
                            className={`mt-2 min-h-[88px] ${inputs.default}`}
                            placeholder="Observatii pentru livrare sau predare"
                          />
                        </label>

                        <button
                          type="button"
                          className={buttons.primary}
                          disabled={convertingId === comanda._id || !clientApproved}
                          onClick={() => convertToOrder(comanda)}
                        >
                          {convertingId === comanda._id
                            ? "Se genereaza comanda..."
                            : "Genereaza comanda"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[22px] border border-rose-100 bg-white/85 px-4 py-4 shadow-soft">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Status comanda
                    </div>
                    <div className="mt-2 text-sm leading-6 text-gray-600">
                      Status curent:{" "}
                      <span className="font-semibold text-gray-900">{statusMeta.label}</span>.
                      Selectia de mai jos ramane doar in draft pana la confirmare.
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((status) => {
                        const itemMeta = getCustomOrderStatusMeta(status);
                        const active = status === reviewDraft.status;
                        return (
                          <button
                            key={`${comanda._id}-${status}`}
                            type="button"
                            className={
                              active
                                ? `rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${itemMeta.className}`
                                : buttons.outline
                            }
                            onClick={() => setReviewDraftField(comanda, "status", status)}
                          >
                            {itemMeta.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-[18px] border border-rose-100 bg-[rgba(255,249,242,0.78)] px-4 py-3 text-sm text-gray-600">
                      Status selectat pentru salvare:{" "}
                      <span className="font-semibold text-gray-900">{selectedStatusMeta.label}</span>
                    </div>

                    <label className="mt-4 block text-sm font-semibold text-[#4e453d]">
                      Nota interna / motiv
                      <textarea
                        value={reviewDraft.statusNote}
                        onChange={(event) =>
                          setReviewDraftField(comanda, "statusNote", event.target.value)
                        }
                        className={`mt-2 min-h-[88px] ${inputs.default}`}
                        placeholder="Ex: clientul a aprobat oferta, asteptam plata / respingere din lipsa confirmarii"
                      />
                    </label>

                    {reviewDraft.status === "respinsa" ? (
                      <div className="mt-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Pentru statusul "respinsa" este obligatoriu sa salvezi si un motiv intern.
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className={buttons.primary}
                        disabled={!canSaveStatus || savingStatus}
                        onClick={() => saveStatusChange(comanda)}
                      >
                        {savingStatus ? "Se salveaza..." : "Confirma statusul"}
                      </button>
                      <button
                        type="button"
                        className={buttons.outline}
                        disabled={(!statusChanged && !statusNoteChanged) || savingStatus}
                        onClick={() => resetReviewDraft(comanda)}
                      >
                        Reseteaza draftul
                      </button>
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
