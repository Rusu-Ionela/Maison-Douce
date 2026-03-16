import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import {
  fetchAdminOrders,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";
import { badges, buttons, inputs } from "../lib/tailwindComponents";

const STATUSES = [
  "plasata",
  "in_asteptare",
  "acceptata",
  "in_lucru",
  "gata",
  "livrata",
  "ridicata",
  "anulata",
  "refuzata",
];
const EMPTY_LIST = [];

function formatStatusLabel(value) {
  return String(value || "plasata").replaceAll("_", " ");
}

function formatCurrency(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

function getOrderDateValue(item) {
  return item.dataLivrare || item.dataRezervare || "";
}

function getOrderTimeValue(item) {
  return item.oraLivrare || item.oraRezervare || "";
}

function formatDateTime(item) {
  const date = getOrderDateValue(item);
  const time = getOrderTimeValue(item);
  return [date || "-", time || ""].filter(Boolean).join(" ");
}

function buildSearchText(item) {
  return [
    item.numeroComanda,
    item._id,
    item.clientName,
    item.clientEmail,
    item.clientTelefon,
    item.adresaLivrare,
    item.deliveryInstructions,
    item.notesClient,
    item.notesAdmin,
    ...(Array.isArray(item.items)
      ? item.items.map((entry) => entry.name || entry.nume || "")
      : []),
  ]
    .join(" ")
    .toLowerCase();
}

function statusBadgeClass(status) {
  const value = String(status || "");
  if (["livrata", "ridicata", "gata"].includes(value)) return badges.success;
  if (["anulata", "refuzata"].includes(value)) return badges.error;
  if (["in_lucru", "acceptata"].includes(value)) return badges.info;
  return badges.warning;
}

function actionButtonClass(nextStatus, currentStatus) {
  if (nextStatus === currentStatus) {
    return "rounded-full bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white shadow-soft";
  }

  return "rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-rose-300 hover:bg-rose-50";
}

export default function AdminComenzi() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState({ type: "info", message: "" });
  const [schedule, setSchedule] = useState({ id: null, data: "", ora: "" });
  const [refuz, setRefuz] = useState({ id: null, motiv: "" });
  const [priceEdit, setPriceEdit] = useState({ id: null, total: "", note: "" });

  const ordersQuery = useQuery({
    queryKey: queryKeys.adminOrders(),
    queryFn: fetchAdminOrders,
  });

  const refreshOrders = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders() });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }) =>
      api.patch(`/comenzi/${id}/status`, { status: nextStatus }),
    onSuccess: async () => {
      setFeedback({ type: "success", message: "Status actualizat." });
      await refreshOrders();
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Eroare la actualizare status."),
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ id, dataLivrare, oraLivrare }) =>
      api.patch(`/comenzi/${id}/schedule`, { dataLivrare, oraLivrare }),
    onSuccess: async () => {
      setSchedule({ id: null, data: "", ora: "" });
      setFeedback({ type: "success", message: "Programarea a fost actualizata." });
      await refreshOrders();
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut salva reprogramarea."),
      });
    },
  });

  const refuzMutation = useMutation({
    mutationFn: ({ id, motiv }) => api.patch(`/comenzi/${id}/refuza`, { motiv }),
    onSuccess: async () => {
      setRefuz({ id: null, motiv: "" });
      setFeedback({ type: "warning", message: "Comanda a fost refuzata." });
      await refreshOrders();
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut refuza comanda."),
      });
    },
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, total, note }) =>
      api.patch(`/comenzi/${id}/price`, {
        total,
        notesAdmin: note || "",
        note: note || "",
      }),
    onSuccess: async () => {
      setPriceEdit({ id: null, total: "", note: "" });
      setFeedback({ type: "success", message: "Pretul a fost actualizat." });
      await refreshOrders();
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Eroare la actualizare pret."),
      });
    },
  });

  const list = ordersQuery.data || EMPTY_LIST;
  const loading = ordersQuery.isLoading;
  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return list
      .filter((item) => {
        const okStatus = status ? (item.status || "") === status : true;
        const okDate = date
          ? getOrderDateValue(item) === date
          : true;
        const okSearch = normalizedSearch
          ? buildSearchText(item).includes(normalizedSearch)
          : true;
        return okStatus && okDate && okSearch;
      })
      .sort((a, b) => {
        const dateCompare = String(getOrderDateValue(a)).localeCompare(
          String(getOrderDateValue(b))
        );
        if (dateCompare !== 0) return dateCompare;
        return String(getOrderTimeValue(a)).localeCompare(String(getOrderTimeValue(b)));
      });
  }, [date, list, search, status]);

  const pendingAction =
    statusMutation.isPending ||
    scheduleMutation.isPending ||
    refuzMutation.isPending ||
    priceMutation.isPending;

  const metrics = useMemo(() => {
    const unpaidOrders = filtered.filter(
      (item) => item.paymentStatus !== "paid" && item.statusPlata !== "paid"
    ).length;
    const todayOrders = filtered.filter(
      (item) => getOrderDateValue(item) === new Date().toISOString().slice(0, 10)
    ).length;
    const inWorkOrders = filtered.filter((item) => item.status === "in_lucru").length;

    return [
      {
        label: "Rezultate vizibile",
        value: filtered.length,
        hint: "Comenzi care corespund filtrelor curente.",
        tone: "rose",
      },
      {
        label: "In productie",
        value: inWorkOrders,
        hint: "Necesita urmarire operationala.",
        tone: "sage",
      },
      {
        label: "Cu livrare azi",
        value: todayOrders,
        hint: "Pregatire si comunicare pentru ziua curenta.",
        tone: "gold",
      },
      {
        label: "Neplatite",
        value: unpaidOrders,
        hint: "Nu pot avansa in flux pana la confirmarea platii.",
        tone: "slate",
      },
    ];
  }, [filtered]);

  const hasFilters = Boolean(status || date || search.trim());

  const clearFilters = () => {
    setStatus("");
    setDate("");
    setSearch("");
  };

  const updateStatus = (id, nextStatus) => {
    setFeedback({ type: "info", message: "" });
    statusMutation.mutate({ id, nextStatus });
  };

  const submitSchedule = (id) => {
    if (schedule.id !== id || !schedule.data || !schedule.ora) return;

    setFeedback({ type: "info", message: "" });
    scheduleMutation.mutate({
      id,
      dataLivrare: schedule.data,
      oraLivrare: schedule.ora,
    });
  };

  const submitRefuz = (id) => {
    if (refuz.id !== id || !refuz.motiv.trim()) {
      setFeedback({ type: "warning", message: "Completeaza motivul refuzului." });
      return;
    }

    setFeedback({ type: "info", message: "" });
    refuzMutation.mutate({ id, motiv: refuz.motiv.trim() });
  };

  const submitPrice = (id) => {
    if (!id || priceEdit.id !== id) return;

    const totalVal = Number(priceEdit.total || 0);
    if (!Number.isFinite(totalVal) || totalVal <= 0) {
      setFeedback({ type: "warning", message: "Introdu un pret valid." });
      return;
    }

    setFeedback({ type: "info", message: "" });
    priceMutation.mutate({
      id,
      total: totalVal,
      note: priceEdit.note || "",
    });
  };

  return (
    <AdminShell
      title="Comenzi"
      description="Administreaza statusurile, platile, reprogramarile si interventiile comerciale dintr-un singur loc."
      actions={
        <>
          {hasFilters ? (
            <button type="button" className={buttons.outline} onClick={clearFilters}>
              Reseteaza filtrele
            </button>
          ) : null}
          <button
            type="button"
            className={buttons.primary}
            onClick={() => ordersQuery.refetch()}
          >
            Reincarca
          </button>
        </>
      }
    >
      <StatusBanner type="info" message={pendingAction ? "Se salveaza modificarile..." : ""} />
      <StatusBanner
        type="error"
        message={
          ordersQuery.error
            ? getApiErrorMessage(
                ordersQuery.error,
                "Nu am putut incarca lista de comenzi."
              )
            : ""
        }
      />
      <StatusBanner type={feedback.type} message={feedback.message} />

      <AdminMetricGrid items={metrics} />

      <div className="grid gap-6 xl:grid-cols-[0.72fr,1.28fr]">
        <AdminPanel
          title="Filtre si cautare"
          description="Restrange rapid lista dupa status, data de livrare sau datele clientului."
        >
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Cautare
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`mt-2 ${inputs.default}`}
                placeholder="Numar comanda, client, email, telefon, produse"
              />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={`mt-2 ${inputs.default}`}
              >
                <option value="">Toate statusurile</option>
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {formatStatusLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Data livrare / rezervare
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={`mt-2 ${inputs.default}`}
              />
            </label>
            <div className="rounded-[24px] border border-rose-100 bg-rose-50/40 p-4 text-sm text-gray-600">
              {hasFilters
                ? "Filtrele sunt active. Lista si indicatorii sunt recalculati doar pe setul vizibil."
                : "Fara filtre active. Vezi toate comenzile disponibile in sistem."}
            </div>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Lista de comenzi"
          description="Fiecare card include actiunile esentiale pentru status, pret si reprogramare."
        >
          {loading ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[360px] animate-pulse rounded-[28px] border border-rose-100 bg-white/80"
                />
              ))}
            </div>
          ) : null}

          {!loading && filtered.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-5 text-sm text-gray-600">
              Nu am gasit comenzi pentru filtrele selectate.
            </div>
          ) : null}

          {!loading ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filtered.map((item) => {
                const paid =
                  item.paymentStatus === "paid" || item.statusPlata === "paid";
                const currentPrice =
                  priceEdit.id === item._id
                    ? priceEdit.total
                    : String(item.totalFinal || item.total || "");
                const currentNote =
                  priceEdit.id === item._id ? priceEdit.note : item.notesAdmin || "";
                const currentScheduleDate =
                  schedule.id === item._id ? schedule.data : "";
                const currentScheduleTime =
                  schedule.id === item._id ? schedule.ora : "";
                const currentRefuz =
                  refuz.id === item._id ? refuz.motiv : "";

                return (
                  <article
                    key={item._id}
                    className="rounded-[28px] border border-rose-100 bg-white p-5 shadow-soft"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          #{item.numeroComanda || item._id.slice(-6)}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {item.clientName || item.clientEmail || item.clientId || "Client"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={statusBadgeClass(item.status)}>
                          {formatStatusLabel(item.status)}
                        </span>
                        <span className={paid ? badges.success : badges.warning}>
                          {paid ? "Platita" : "Neplatita"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                      <div className="rounded-2xl bg-rose-50/50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Livrare / rezervare
                        </div>
                        <div className="mt-1 font-medium text-gray-900">
                          {formatDateTime(item)}
                        </div>
                        <div className="mt-1">
                          {item.metodaLivrare === "livrare" ? "Livrare" : "Ridicare"}
                          {item.adresaLivrare ? `, ${item.adresaLivrare}` : ""}
                        </div>
                        {item.deliveryWindow ? (
                          <div className="mt-1 text-xs text-gray-500">
                            Fereastra: {item.deliveryWindow}
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-2xl bg-rose-50/50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Contact client
                        </div>
                        <div className="mt-1 font-medium text-gray-900">
                          {item.clientName || "-"}
                        </div>
                        <div className="mt-1">{item.clientEmail || "-"}</div>
                        <div className="mt-1">{item.clientTelefon || "-"}</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-rose-100 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-gray-400">
                        Produse si note
                      </div>
                      <div className="mt-2 text-sm text-gray-700">
                        {(item.items || [])
                          .map(
                            (entry) =>
                              `${entry.name || entry.nume} x${
                                entry.qty || entry.cantitate || 1
                              }`
                          )
                          .join(" | ") || "Fara produse listate"}
                      </div>
                      {item.deliveryInstructions ? (
                        <div className="mt-2 text-xs text-gray-500">
                          Instructiuni: {item.deliveryInstructions}
                        </div>
                      ) : null}
                      {item.notesClient ? (
                        <div className="mt-2 text-xs text-gray-500">
                          Note client: {item.notesClient}
                        </div>
                      ) : null}
                      {item.notesAdmin ? (
                        <div className="mt-2 text-xs text-gray-500">
                          Note admin: {item.notesAdmin}
                        </div>
                      ) : null}
                    </div>

                    {Array.isArray(item.attachments) && item.attachments.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.attachments.map((attachment, index) => (
                          <a
                            key={`${attachment.url || index}`}
                            href={attachment.url}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-pink-700 hover:bg-rose-100"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {attachment.name || `Fisier ${index + 1}`}
                          </a>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-50/40 p-4">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Total
                        </div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {formatCurrency(item.totalFinal || item.total || 0)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Plata: {item.paymentStatus || item.statusPlata || "unpaid"}
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Actualizare status
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {STATUSES.map((nextStatus) => {
                            const requiresPaid = [
                              "acceptata",
                              "in_lucru",
                              "gata",
                              "livrata",
                              "ridicata",
                              "confirmata",
                            ];
                            const disabled = !paid && requiresPaid.includes(nextStatus);

                            return (
                              <button
                                key={nextStatus}
                                type="button"
                                className={`${actionButtonClass(nextStatus, item.status)} disabled:cursor-not-allowed disabled:opacity-50`}
                                disabled={disabled || pendingAction}
                                onClick={() => updateStatus(item._id, nextStatus)}
                                title={
                                  disabled
                                    ? "Confirmarea necesita plata"
                                    : "Actualizeaza status"
                                }
                              >
                                {formatStatusLabel(nextStatus)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border border-rose-100 p-4">
                          <div className="text-sm font-semibold text-gray-900">
                            Actualizare pret
                          </div>
                          <div className="mt-3 space-y-2">
                            <input
                              type="number"
                              value={currentPrice}
                              onFocus={() =>
                                setPriceEdit({
                                  id: item._id,
                                  total: String(item.totalFinal || item.total || 0),
                                  note: currentNote,
                                })
                              }
                              onChange={(event) =>
                                setPriceEdit((prev) => ({
                                  id: item._id,
                                  total: event.target.value,
                                  note: prev.id === item._id ? prev.note : currentNote,
                                }))
                              }
                              className={inputs.default}
                            />
                            <input
                              value={currentNote}
                              onFocus={() =>
                                setPriceEdit({
                                  id: item._id,
                                  total: currentPrice,
                                  note: currentNote,
                                })
                              }
                              onChange={(event) =>
                                setPriceEdit((prev) => ({
                                  id: item._id,
                                  total: prev.id === item._id ? prev.total : currentPrice,
                                  note: event.target.value,
                                }))
                              }
                              placeholder="Nota admin"
                              className={inputs.default}
                            />
                            <button
                              type="button"
                              className={buttons.secondary}
                              disabled={pendingAction}
                              onClick={() => submitPrice(item._id)}
                            >
                              Salveaza pretul
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-rose-100 p-4">
                          <div className="text-sm font-semibold text-gray-900">
                            Reprogramare
                          </div>
                          <div className="mt-3 space-y-2">
                            <input
                              type="date"
                              value={currentScheduleDate}
                              onFocus={() =>
                                setSchedule({
                                  id: item._id,
                                  data: currentScheduleDate,
                                  ora: currentScheduleTime,
                                })
                              }
                              onChange={(event) =>
                                setSchedule((prev) => ({
                                  id: item._id,
                                  data: event.target.value,
                                  ora: prev.id === item._id ? prev.ora : currentScheduleTime,
                                }))
                              }
                              className={inputs.default}
                            />
                            <input
                              type="time"
                              value={currentScheduleTime}
                              onFocus={() =>
                                setSchedule({
                                  id: item._id,
                                  data: currentScheduleDate,
                                  ora: currentScheduleTime,
                                })
                              }
                              onChange={(event) =>
                                setSchedule((prev) => ({
                                  id: item._id,
                                  data: prev.id === item._id ? prev.data : currentScheduleDate,
                                  ora: event.target.value,
                                }))
                              }
                              className={inputs.default}
                            />
                            <button
                              type="button"
                              className={buttons.secondary}
                              disabled={pendingAction}
                              onClick={() => submitSchedule(item._id)}
                            >
                              Salveaza data
                            </button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-rose-100 p-4">
                          <div className="text-sm font-semibold text-gray-900">
                            Refuza comanda
                          </div>
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={currentRefuz}
                              onFocus={() =>
                                setRefuz({ id: item._id, motiv: currentRefuz })
                              }
                              onChange={(event) =>
                                setRefuz({ id: item._id, motiv: event.target.value })
                              }
                              placeholder="Motiv refuz"
                              className={`${inputs.default} min-h-[108px]`}
                            />
                            <button
                              type="button"
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-soft hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={pendingAction}
                              onClick={() => submitRefuz(item._id)}
                            >
                              Refuza
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
