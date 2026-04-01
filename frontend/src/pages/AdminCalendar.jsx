// frontend/src/pages/AdminCalendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import StatusBanner from "../components/StatusBanner";
import ProviderSelector from "../components/ProviderSelector";
import api from "../lib/api.js";
import { formatDateInput, parseDateInput } from "../lib/date";
import { useAuth } from "../context/AuthContext";
import { useProviderDirectory } from "../lib/providers";
import { buttons, inputs, cards, badges } from "../lib/tailwindComponents";

function extractFilename(contentDisposition, fallback) {
  const value = String(contentDisposition || "");
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  const plain = value.match(/filename="?([^";]+)"?/i);
  if (plain?.[1]) return plain[1];
  return fallback;
}

function formatCurrency(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

function formatDayLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("ro-RO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatHandoffMethod(value) {
  return value === "delivery" ? "Livrare" : "Ridicare";
}

function getReservationAttentionFlags(item) {
  const unpaid = String(item?.paymentStatus || "").toLowerCase() !== "paid";
  const missingAddress =
    item?.handoffMethod === "delivery" && !String(item?.deliveryAddress || "").trim();
  const missingItems = !String(item?.itemsSummary || "").trim();
  const missingContact =
    !String(item?.clientPhone || "").trim() && !String(item?.clientEmail || "").trim();

  return {
    unpaid,
    missingAddress,
    missingItems,
    missingContact,
    needsAttention: unpaid || missingAddress || missingItems || missingContact,
  };
}

export default function AdminCalendar() {
  const { user } = useAuth() || {};
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotCapacity, setNewSlotCapacity] = useState(1);
  const [dayCapacity, setDayCapacity] = useState("");
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [viewFilter, setViewFilter] = useState("all");

  const providerState = useProviderDirectory({ user });
  const prestatorId = providerState.activeProviderId;
  const dateStr = formatDateInput(selectedDate);

  const sortedReservations = useMemo(
    () =>
      [...reservations].sort((left, right) =>
        String(left?.startTime || left?.timeSlot || "").localeCompare(
          String(right?.startTime || right?.timeSlot || "")
        )
      ),
    [reservations]
  );

  const visibleReservations = useMemo(() => {
    if (viewFilter === "delivery") {
      return sortedReservations.filter((item) => item?.handoffMethod === "delivery");
    }
    if (viewFilter === "pickup") {
      return sortedReservations.filter((item) => item?.handoffMethod !== "delivery");
    }
    if (viewFilter === "unpaid") {
      return sortedReservations.filter((item) => item?.paymentStatus !== "paid");
    }
    if (viewFilter === "attention") {
      return sortedReservations.filter((item) => getReservationAttentionFlags(item).needsAttention);
    }
    return sortedReservations;
  }, [sortedReservations, viewFilter]);

  const reservationMetrics = useMemo(() => {
    const totalEntries = reservations.length;
    const deliveryCount = reservations.filter((item) => item?.handoffMethod === "delivery").length;
    const pickupCount = totalEntries - deliveryCount;
    const unpaidCount = reservations.filter((item) => item?.paymentStatus !== "paid").length;
    const attentionCount = reservations.filter(
      (item) => getReservationAttentionFlags(item).needsAttention
    ).length;
    const totalValue = reservations.reduce((sum, item) => sum + Number(item?.total || 0), 0);
    const nextHandoff = sortedReservations[0]?.startTime || sortedReservations[0]?.timeSlot || "";

    return {
      totalEntries,
      deliveryCount,
      pickupCount,
      unpaidCount,
      attentionCount,
      totalValue,
      nextHandoff,
    };
  }, [reservations, sortedReservations]);

  const slotMetrics = useMemo(() => {
    const totalSlots = slots.length;
    const freeSlots = slots.filter((slot) => Number(slot?.free || 0) > 0).length;
    const blockedSlots = slots.filter(
      (slot) => Number(slot?.capacity || 0) <= 0 || Number(slot?.free || 0) <= 0
    ).length;

    return {
      totalSlots,
      freeSlots,
      blockedSlots,
    };
  }, [slots]);

  useEffect(() => {
    const fetchData = async () => {
      if (!prestatorId) {
        setSlots([]);
        setReservations([]);
        setDayCapacity("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [slotsRes, reservationsRes, dayCapRes] = await Promise.all([
          api.get(`/calendar/availability/${prestatorId}`, {
            params: { from: dateStr, to: dateStr },
          }),
          api.get(`/calendar/admin/${dateStr}`, {
            params: { prestatorId },
          }),
          api.get(`/calendar/day-capacity/${prestatorId}`, {
            params: { from: dateStr, to: dateStr },
          }),
        ]);

        setSlots(slotsRes.data.slots || []);
        const rez = reservationsRes.data?.rezervari || reservationsRes.data || [];
        setReservations(rez);
        const dayCap = Array.isArray(dayCapRes.data?.items) ? dayCapRes.data.items[0] : null;
        setDayCapacity(dayCap?.capacity != null ? String(dayCap.capacity) : "");
      } catch (err) {
        console.error(err);
        setError("Eroare la incarcare");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateStr, prestatorId]);

  const refreshSlots = async () => {
    if (!prestatorId) return;
    const { data } = await api.get(`/calendar/availability/${prestatorId}`, {
      params: { from: dateStr, to: dateStr },
    });
    setSlots(data.slots || []);
  };

  const addTimeSlot = async () => {
    try {
      if (!prestatorId) {
        setError(
          providerState.error || "Selecteaza un prestator pentru a configura calendarul."
        );
        return;
      }
      if (!newSlotTime) {
        setError("Introdu o ora pentru slot.");
        return;
      }

      await api.post(`/calendar/availability/${prestatorId}`, {
        slots: [{ date: dateStr, time: newSlotTime, capacity: Number(newSlotCapacity || 1) }],
      });

      await refreshSlots();
      setNewSlotTime("");
      setNewSlotCapacity(1);
    } catch (err) {
      console.error(err);
      setError("Eroare la adaugarea slotului");
    }
  };

  const blockSlot = async (time) => {
    try {
      if (!prestatorId) {
        setError(
          providerState.error || "Selecteaza un prestator pentru a configura calendarul."
        );
        return;
      }
      await api.post(`/calendar/availability/${prestatorId}`, {
        slots: [{ date: dateStr, time, capacity: 0 }],
      });
      await refreshSlots();
    } catch (err) {
      console.error(err);
      setError("Eroare la blocarea slotului");
    }
  };

  const saveDayCapacity = async () => {
    setError("");
    setSavingCapacity(true);
    try {
      if (!prestatorId) {
        setError(
          providerState.error || "Selecteaza un prestator pentru a configura calendarul."
        );
        return;
      }
      await api.post(`/calendar/day-capacity/${prestatorId}`, {
        date: dateStr,
        capacity: Number(dayCapacity || 0),
      });
    } catch (err) {
      console.error(err);
      setError("Eroare la salvarea capacitatii.");
    } finally {
      setSavingCapacity(false);
    }
  };

  const updateReservationStatus = async (id, status) => {
    try {
      await api.patch(`/rezervari/${id}/status`, { status });
      const res = await api.get(`/calendar/admin/${dateStr}`, {
        params: { prestatorId },
      });
      const rez = res.data?.rezervari || res.data || [];
      setReservations(rez);
    } catch (err) {
      console.error(err);
      setError("Eroare la actualizarea rezervarii.");
    }
  };

  const onExport = async () => {
    try {
      const res = await api.get(`/calendar/admin/${dateStr}/export`, {
        params: { prestatorId },
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: res.headers?.["content-type"] || "text/csv;charset=utf-8",
      });
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = extractFilename(
        res.headers?.["content-disposition"],
        `rezervari_${dateStr}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
    } catch (err) {
      console.error(err);
      setError("Eroare la export CSV.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className={cards.tinted}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
                Agenda zilnica
              </p>
              <h1 className="font-serif text-3xl font-semibold text-gray-900 md:text-4xl">
                Vezi clar ce trebuie pregatit si cum se preda in ziua selectata
              </h1>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                Agenda unifica rezervarile si comenzile pentru aceeasi zi, cu accent pe ora,
                produse, metoda de predare, adresa si statusul platii.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-rose-100 bg-white/75 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Intrari
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {reservationMetrics.totalEntries}
                </div>
                <div className="text-sm text-gray-600">rezervari si comenzi in zi</div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white/75 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Livrari
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {reservationMetrics.deliveryCount}
                </div>
                <div className="text-sm text-gray-600">pleaca la client sau curier</div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white/75 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Ridicari
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {reservationMetrics.pickupCount}
                </div>
                <div className="text-sm text-gray-600">vin direct in atelier</div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white/75 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Urmatoarea predare
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {reservationMetrics.nextHandoff || "--:--"}
                </div>
                <div className="text-sm text-gray-600">{formatDayLabel(selectedDate)}</div>
              </div>
            </div>
          </div>
        </header>

        <StatusBanner
          type="error"
          title="Prestator indisponibil"
          message={
            !providerState.loading && !prestatorId
              ? providerState.error || "Nu exista prestatori disponibili pentru administrare."
              : ""
          }
        />
        <StatusBanner type="error" message={error} />

        {loading ? (
          <div className={cards.elevated}>
            <div className="py-12 text-center text-lg text-gray-500">Se incarca agenda zilei...</div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className={`${cards.elevated} space-y-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Configurare zi</h2>
                  <p className="text-sm text-gray-600">
                    Selectezi prestatorul, data si capacitatea, apoi configurezi intervalele.
                  </p>
                </div>
                <span className={badges.info}>{dateStr}</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <ProviderSelector
                    providers={providerState.providers}
                    value={prestatorId}
                    onChange={providerState.setSelectedProviderId}
                    loading={providerState.loading}
                    disabled={!providerState.canChooseProvider}
                    helpText={
                      providerState.activeProvider
                        ? `Administrezi agenda pentru ${providerState.activeProvider.displayName}.`
                        : "Selecteaza prestatorul pentru care lucrezi."
                    }
                  />
                </div>

                <label className="block text-sm font-semibold text-gray-700">
                  Data selectata
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => {
                      const nextDate = parseDateInput(e.target.value);
                      if (nextDate) {
                        setSelectedDate(nextDate);
                      }
                    }}
                    className={`mt-2 ${inputs.default}`}
                  />
                </label>

                <label className="block text-sm font-semibold text-gray-700">
                  Capacitate zi
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      type="number"
                      min={0}
                      value={dayCapacity}
                      onChange={(e) => setDayCapacity(e.target.value)}
                      className={inputs.default}
                      style={{ maxWidth: 150 }}
                    />
                    <button
                      onClick={saveDayCapacity}
                      className={buttons.secondary}
                      disabled={savingCapacity}
                    >
                      {savingCapacity ? "Se salveaza..." : "Salveaza"}
                    </button>
                  </div>
                </label>
              </div>

              <div className="rounded-[26px] border border-rose-100 bg-white/85 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Adauga sau actualizeaza interval</h3>
                    <p className="text-sm text-gray-600">
                      Configurezi manual orele disponibile pentru ziua selectata.
                    </p>
                  </div>
                  <button onClick={onExport} className={buttons.success}>
                    Export CSV
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className={inputs.default}
                    style={{ maxWidth: 180 }}
                  />
                  <input
                    type="number"
                    min={0}
                    value={newSlotCapacity}
                    onChange={(e) => setNewSlotCapacity(e.target.value)}
                    className={inputs.default}
                    style={{ maxWidth: 140 }}
                  />
                  <button onClick={addTimeSlot} className={buttons.secondary}>
                    + Adauga/actualizeaza interval
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                    Sloturi totale
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">
                    {slotMetrics.totalSlots}
                  </div>
                </div>
                <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                    Cu locuri libere
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">
                    {slotMetrics.freeSlots}
                  </div>
                </div>
                <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                    Blocate / pline
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">
                    {slotMetrics.blockedSlots}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-gray-900">Intervalele zilei</h3>
                  <span className={badges.premium}>{slots.length ? `${slots.length} sloturi` : "Fara sloturi"}</span>
                </div>

                {slots.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-rose-200 bg-white/70 px-4 py-6 text-sm text-gray-500">
                    Nu exista sloturi pentru aceasta zi. Adauga cel putin un interval pentru a primi comenzi.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {slots.map((slot) => {
                      const slotAvailable = Number(slot?.free || 0) > 0;
                      return (
                        <div
                          key={`${slot.date}_${slot.time}`}
                          className={[
                            "rounded-[22px] border px-4 py-4",
                            slotAvailable
                              ? "border-emerald-200 bg-emerald-50/70"
                              : "border-rose-200 bg-rose-50/70",
                          ].join(" ")}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-lg font-semibold text-gray-900">{slot.time}</div>
                              <div className="mt-2 text-sm text-gray-600">
                                {slot.used}/{slot.capacity} ocupate
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-sm font-semibold ${
                                  slotAvailable ? "text-emerald-700" : "text-rose-700"
                                }`}
                              >
                                {slot.free} libere
                              </div>
                              <button
                                className="mt-2 text-xs font-semibold text-rose-700 underline"
                                onClick={() => blockSlot(slot.time)}
                              >
                                Blocheaza slot
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className={`${cards.elevated} space-y-5`}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Agenda zilei - {formatDayLabel(selectedDate)}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Staff-ul vede intr-un singur loc ce trebuie pregatit, cand se preda si daca
                    pleaca prin livrare sau ridicare personala.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Neplatite
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      {reservationMetrics.unpaidCount}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Valoare zi
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      {formatCurrency(reservationMetrics.totalValue)}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Vizibile acum
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      {visibleReservations.length}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-amber-200 bg-amber-50/80 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                      Cer atentie
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      {reservationMetrics.attentionCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "Toate"],
                  ["delivery", "Doar livrari"],
                  ["pickup", "Doar ridicari"],
                  ["unpaid", "Doar neplatite"],
                  ["attention", "Cer atentie"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setViewFilter(value)}
                    className={
                      viewFilter === value
                        ? buttons.primary
                        : "inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-[#5f564d] shadow-soft transition hover:border-rose-300 hover:bg-white"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {visibleReservations.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-rose-200 bg-white/70 px-4 py-8 text-center text-gray-500">
                  Nu exista intrari pentru filtrul selectat in aceasta zi.
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleReservations.map((res) => {
                    const isDelivery = res.handoffMethod === "delivery";
                    const handoffLabel = formatHandoffMethod(res.handoffMethod);
                    const statusLabel = res.status || res.handoffStatus || "-";

                    return (
                      <article
                        key={res._id}
                        className={[
                          "rounded-[28px] border p-5 shadow-soft",
                          isDelivery
                            ? "border-amber-200 bg-[rgba(255,249,240,0.92)]"
                            : "border-emerald-200 bg-[rgba(247,255,250,0.92)]",
                        ].join(" ")}
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-charcoal px-3 py-1 text-sm font-semibold text-white">
                                {res.timeSlot || res.startTime || "--:--"}
                              </span>
                              <span className={isDelivery ? badges.warning : badges.success}>
                                {handoffLabel}
                              </span>
                              <span className={badges.info}>
                                {res.type === "comanda" ? "Comanda" : "Rezervare"}
                              </span>
                              {res.paymentStatus === "paid" ? (
                                <span className={badges.success}>Platit</span>
                              ) : (
                                <span className={badges.warning}>Neplatit</span>
                              )}
                            </div>

                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                                Ce se pregateste
                              </div>
                              <div className="mt-2 text-lg font-semibold text-gray-900">
                                {res.itemsSummary || "Fara detalii produse inca"}
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="rounded-[22px] border border-white/70 bg-white/80 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                                  Client
                                </div>
                                <div className="mt-2 space-y-1 text-sm text-gray-700">
                                  <div className="font-semibold text-gray-900">
                                    {res.clientName || "Client"}
                                  </div>
                                  {res.clientPhone ? <div>Tel: {res.clientPhone}</div> : null}
                                  {res.clientEmail ? <div>Email: {res.clientEmail}</div> : null}
                                </div>
                              </div>

                              <div className="rounded-[22px] border border-white/70 bg-white/80 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                                  Predare
                                </div>
                                <div className="mt-2 space-y-1 text-sm text-gray-700">
                                  <div className="font-semibold text-gray-900">{handoffLabel}</div>
                                  <div>
                                    {isDelivery
                                      ? res.deliveryAddress || "Adresa lipsa"
                                      : "Clientul ridica direct din atelier"}
                                  </div>
                                  {res.deliveryWindow ? <div>Fereastra: {res.deliveryWindow}</div> : null}
                                  {res.deliveryInstructions ? (
                                    <div>Instructiuni: {res.deliveryInstructions}</div>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className={badges.info}>Status: {statusLabel}</span>
                              {res.handoffStatus ? (
                                <span className={badges.premium}>Predare: {res.handoffStatus}</span>
                              ) : null}
                            </div>

                            {res.type === "rezervare" ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className={buttons.secondary}
                                  onClick={() => updateReservationStatus(res._id, "confirmed")}
                                >
                                  Confirma rezervarea
                                </button>
                                <button
                                  className={buttons.outline}
                                  onClick={() => updateReservationStatus(res._id, "canceled")}
                                >
                                  Respinge
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="min-w-[180px] rounded-[22px] border border-white/70 bg-white/85 px-4 py-4 text-right">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                              Total
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-pink-700">
                              {formatCurrency(res.total)}
                            </div>
                            <div className="mt-3 text-sm text-gray-600">
                              {res.paymentStatus === "paid" ? "Plata confirmata" : "Necesita urmarire plata"}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
