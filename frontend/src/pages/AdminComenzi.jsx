import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import {
  fetchAdminOrders,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";

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

export default function AdminComenzi() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState("");
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
      setMsg("Status actualizat.");
      await refreshOrders();
    },
    onError: (error) => {
      setMsg(getApiErrorMessage(error, "Eroare la actualizare status."));
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ id, dataLivrare, oraLivrare }) =>
      api.patch(`/comenzi/${id}/schedule`, { dataLivrare, oraLivrare }),
    onSuccess: async () => {
      setSchedule({ id: null, data: "", ora: "" });
      setMsg("Programarea a fost actualizata.");
      await refreshOrders();
    },
    onError: (error) => {
      setMsg(getApiErrorMessage(error, "Nu am putut salva reprogramarea."));
    },
  });

  const refuzMutation = useMutation({
    mutationFn: ({ id, motiv }) => api.patch(`/comenzi/${id}/refuza`, { motiv }),
    onSuccess: async () => {
      setRefuz({ id: null, motiv: "" });
      setMsg("Comanda a fost refuzata.");
      await refreshOrders();
    },
    onError: (error) => {
      setMsg(getApiErrorMessage(error, "Nu am putut refuza comanda."));
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
      setMsg("Pretul a fost actualizat.");
      await refreshOrders();
    },
    onError: (error) => {
      setMsg(getApiErrorMessage(error, "Eroare la actualizare pret."));
    },
  });

  const list = ordersQuery.data || EMPTY_LIST;
  const loading = ordersQuery.isLoading;
  const filtered = useMemo(() => {
    return list.filter((item) => {
      const okStatus = status ? (item.status || "") === status : true;
      const okDate = date
        ? item.dataLivrare === date || item.dataRezervare === date
        : true;
      return okStatus && okDate;
    });
  }, [date, list, status]);

  const pendingAction =
    statusMutation.isPending ||
    scheduleMutation.isPending ||
    refuzMutation.isPending ||
    priceMutation.isPending;

  const updateStatus = (id, nextStatus) => {
    setMsg("");
    statusMutation.mutate({ id, nextStatus });
  };

  const submitSchedule = () => {
    if (!schedule.id || !schedule.data || !schedule.ora) return;

    setMsg("");
    scheduleMutation.mutate({
      id: schedule.id,
      dataLivrare: schedule.data,
      oraLivrare: schedule.ora,
    });
  };

  const submitRefuz = () => {
    if (!refuz.id) return;

    setMsg("");
    refuzMutation.mutate({ id: refuz.id, motiv: refuz.motiv });
  };

  const submitPrice = (id) => {
    if (!id || priceEdit.id !== id) return;

    const totalVal = Number(priceEdit.total || 0);
    if (!Number.isFinite(totalVal) || totalVal <= 0) {
      setMsg("Introdu un pret valid.");
      return;
    }

    setMsg("");
    priceMutation.mutate({
      id,
      total: totalVal,
      note: priceEdit.note || "",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Comenzi</h1>

      <StatusBanner type="info" message={pendingAction ? "Se salveaza..." : ""} />
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
      <StatusBanner
        type={msg.includes("actualizat") || msg.includes("refuzata") ? "success" : "warning"}
        message={msg}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="border rounded p-2"
        >
          <option value="">Toate statusurile</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="border rounded p-2"
        />
        <button
          type="button"
          className="border px-3 py-2 rounded"
          onClick={() => ordersQuery.refetch()}
        >
          Reincarca
        </button>
      </div>

      {loading && <div>Se incarca...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div key={item._id} className="border rounded-lg p-4 bg-white space-y-2">
            <div className="flex justify-between">
              <div className="font-semibold">
                #{item.numeroComanda || item._id.slice(-6)}
              </div>
              <div className="text-sm text-gray-600">
                {item.status || "plasata"}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {item.dataLivrare || item.dataRezervare || "-"}{" "}
              {item.oraLivrare || item.oraRezervare || ""}
            </div>
            <div className="text-sm text-gray-700">
              Client: {item.clientName || item.clientId || "-"}
              {item.clientEmail ? ` - ${item.clientEmail}` : ""}
              {item.clientTelefon ? ` - ${item.clientTelefon}` : ""}
            </div>
            <div className="text-sm text-gray-600">
              {item.metodaLivrare === "livrare" ? "Livrare" : "Ridicare"}
              {item.adresaLivrare ? ` - ${item.adresaLivrare}` : ""}
            </div>
            {item.deliveryWindow && (
              <div className="text-xs text-gray-500">
                Fereastra: {item.deliveryWindow}
              </div>
            )}
            {item.deliveryInstructions && (
              <div className="text-xs text-gray-500">
                Instructiuni: {item.deliveryInstructions}
              </div>
            )}
            {item.notesClient && (
              <div className="text-xs text-gray-500">
                Note client: {item.notesClient}
              </div>
            )}
            {item.notesAdmin && (
              <div className="text-xs text-gray-500">
                Note admin: {item.notesAdmin}
              </div>
            )}
            <div className="text-sm">
              {(item.items || [])
                .map(
                  (entry) =>
                    `${entry.name || entry.nume} x${
                      entry.qty || entry.cantitate || 1
                    }`
                )
                .join(" | ")}
            </div>
            {Array.isArray(item.attachments) && item.attachments.length > 0 && (
              <div className="text-xs text-gray-600 space-y-1">
                {item.attachments.map((attachment, index) => (
                  <a
                    key={`${attachment.url || index}`}
                    href={attachment.url}
                    className="text-pink-600 underline block"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {attachment.name || `Fisier ${index + 1}`}
                  </a>
                ))}
              </div>
            )}
            <div className="text-sm font-semibold">
              Total: {item.totalFinal || item.total || 0} MDL
            </div>
            <div className="text-xs text-gray-500">
              Plata: {item.paymentStatus || item.statusPlata || "unpaid"}
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUSES.map((nextStatus) => {
                const paid =
                  item.paymentStatus === "paid" || item.statusPlata === "paid";
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
                    className="border px-2 py-1 rounded text-xs disabled:opacity-50"
                    disabled={disabled || pendingAction}
                    onClick={() => updateStatus(item._id, nextStatus)}
                    title={
                      disabled
                        ? "Confirmarea necesita plata"
                        : "Actualizeaza status"
                    }
                  >
                    {nextStatus}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t">
              <div className="text-sm font-semibold">Actualizare pret</div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={
                      priceEdit.id === item._id
                        ? priceEdit.total
                        : String(item.totalFinal || item.total || "")
                    }
                    onFocus={() =>
                      setPriceEdit({
                        id: item._id,
                        total: String(item.totalFinal || item.total || 0),
                        note: priceEdit.id === item._id ? priceEdit.note : "",
                      })
                    }
                    onChange={(event) =>
                      setPriceEdit((prev) => ({
                        id: item._id,
                        total: event.target.value,
                        note: prev.id === item._id ? prev.note : "",
                      }))
                    }
                    className="border rounded p-1 flex-1"
                  />
                  <button
                    type="button"
                    className="border px-2 py-1 rounded text-xs"
                    disabled={pendingAction}
                    onClick={() => submitPrice(item._id)}
                  >
                    Salveaza
                  </button>
                </div>
                <input
                  value={priceEdit.id === item._id ? priceEdit.note : ""}
                  onChange={(event) =>
                    setPriceEdit((prev) => ({
                      id: item._id,
                      total:
                        prev.id === item._id
                          ? prev.total
                          : String(item.totalFinal || item.total || 0),
                      note: event.target.value,
                    }))
                  }
                  placeholder="Nota (optional)"
                  className="border rounded p-1"
                />
              </div>

              <div className="text-sm font-semibold">Reprogramare</div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={schedule.id === item._id ? schedule.data : ""}
                  onChange={(event) =>
                    setSchedule({
                      id: item._id,
                      data: event.target.value,
                      ora: schedule.ora,
                    })
                  }
                  className="border rounded p-1"
                />
                <input
                  type="time"
                  value={schedule.id === item._id ? schedule.ora : ""}
                  onChange={(event) =>
                    setSchedule({
                      id: item._id,
                      data: schedule.data,
                      ora: event.target.value,
                    })
                  }
                  className="border rounded p-1"
                />
                <button
                  type="button"
                  className="border px-2 py-1 rounded text-xs"
                  disabled={pendingAction}
                  onClick={submitSchedule}
                >
                  Salveaza
                </button>
              </div>

              <div className="text-sm font-semibold">Refuza comanda</div>
              <div className="flex gap-2">
                <input
                  value={refuz.id === item._id ? refuz.motiv : ""}
                  onChange={(event) =>
                    setRefuz({ id: item._id, motiv: event.target.value })
                  }
                  placeholder="Motiv refuz"
                  className="border rounded p-1 flex-1"
                />
                <button
                  type="button"
                  className="border px-2 py-1 rounded text-xs"
                  disabled={pendingAction}
                  onClick={submitRefuz}
                >
                  Refuza
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
