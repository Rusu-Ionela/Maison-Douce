import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useNavigate } from "react-router-dom";
import { bookSlot, getAvailability } from "../api/calendar";
import SlotPicker from "../components/SlotPicker";
import StatusBanner from "../components/StatusBanner";
import ProviderSelector from "../components/ProviderSelector";
import { useAuth } from "../context/AuthContext";
import { getMinLeadHours } from "../lib/runtimeConfig";
import { formatDateInput, parseDateInput } from "../lib/date";
import { useProviderDirectory } from "../lib/providers";
import { buttons, cards, containers, inputs } from "../lib/tailwindComponents";
import { getApiErrorMessage } from "../lib/serverState";

const DELIVERY_FEE = 100;

function toDateStr(date) {
  return formatDateInput(date);
}

function toMonthStr(date) {
  return toDateStr(date).slice(0, 7);
}

function toMonthStart(date) {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(12, 0, 0, 0);
  return next;
}

function readCalendarValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function toSafeDate(value) {
  const next = readCalendarValue(value);
  if (!(next instanceof Date) || Number.isNaN(next.getTime())) {
    return null;
  }

  const normalized = new Date(next);
  normalized.setHours(12, 0, 0, 0);
  return normalized;
}

function formatLongDate(value) {
  if (!value) return "Neselectata";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Neselectata";

  return date.toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function buildDeliveryWindow(windowStart, windowEnd) {
  if (!windowStart && !windowEnd) return "";
  if (windowStart && windowEnd) return `${windowStart}-${windowEnd}`;
  return windowStart || windowEnd || "";
}

function getSlotSummary(slots) {
  const total = Array.isArray(slots) ? slots.length : 0;
  const available = (slots || []).filter((slot) => Number(slot?.free ?? 0) > 0).length;
  return { total, available };
}

export default function CalendarClient() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [calendarDate, setCalendarDate] = useState(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  });
  const [activeMonthDate, setActiveMonthDate] = useState(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return toMonthStart(today);
  });
  const [time, setTime] = useState("");
  const [metoda, setMetoda] = useState("ridicare");
  const [adresa, setAdresa] = useState("");
  const [addressMode, setAddressMode] = useState("saved");
  const [selectedAddressIdx, setSelectedAddressIdx] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [descriere, setDescriere] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [success, setSuccess] = useState(null);

  const providerState = useProviderDirectory({ user });
  const prestatorId = providerState.activeProviderId;
  const selectedDate = calendarDate ? toDateStr(calendarDate) : "";
  const activeMonth = useMemo(() => toMonthStr(activeMonthDate), [activeMonthDate]);
  const leadHours = getMinLeadHours();

  const addressOptions = useMemo(() => {
    const options = [];
    if (user?.adresa) {
      const hasDefault = (user?.adreseSalvate || []).some((item) => item?.isDefault);
      options.push({
        label: "Adresa principala",
        address: user.adresa,
        isDefault: !hasDefault,
      });
    }

    (user?.adreseSalvate || []).forEach((item, index) => {
      if (!item?.address) return;
      options.push({
        label: item.label || `Adresa ${index + 1}`,
        address: item.address,
        isDefault: Boolean(item.isDefault),
      });
    });

    return options;
  }, [user]);

  const defaultAddressIdx = useMemo(() => {
    const index = addressOptions.findIndex((item) => item.isDefault);
    if (index >= 0) return String(index);
    return addressOptions.length ? "0" : "";
  }, [addressOptions]);

  useEffect(() => {
    if (metoda !== "livrare") return;
    if (!addressOptions.length) {
      setAddressMode("custom");
      return;
    }
    if (!selectedAddressIdx) {
      setSelectedAddressIdx(defaultAddressIdx);
    }
  }, [addressOptions, defaultAddressIdx, metoda, selectedAddressIdx]);

  useEffect(() => {
    if (addressMode !== "saved") return;
    const index = Number(selectedAddressIdx);
    if (Number.isNaN(index) || !addressOptions[index]) return;
    setAdresa(addressOptions[index].address);
  }, [addressMode, addressOptions, selectedAddressIdx]);

  const minDateTime = useMemo(() => {
    const next = new Date();
    next.setHours(next.getHours() + leadHours);
    return next;
  }, [leadHours]);

  const availabilityQuery = useQuery({
    queryKey: ["calendar-availability-month", prestatorId, activeMonth],
    queryFn: () =>
      getAvailability(prestatorId, {
        month: activeMonth,
        hideFull: true,
      }),
    enabled: Boolean(prestatorId && activeMonth),
    placeholderData: (previous) => previous,
  });

  const reserveMutation = useMutation({
    mutationFn: bookSlot,
    onSuccess: (data) => {
      setTime("");
      setSuccess({
        comandaId: data?.comandaId || "",
        rezervareId: data?.rezervareId || "",
        requiresPriceConfirmation: data?.requiresPriceConfirmation !== false,
      });
      setStatus({
        type: "success",
        message:
          data?.requiresPriceConfirmation !== false
            ? "Rezervarea a fost trimisa. Pretul final va fi confirmat de echipa inainte de plata."
            : "Rezervare creata. Poti continua direct la plata.",
      });
      queryClient.invalidateQueries({
        queryKey: ["calendar-availability-month", prestatorId],
      });
    },
    onError: (error) => {
      setStatus({
        type: "error",
        message: getApiErrorMessage(error, "Rezervarea a esuat."),
      });
    },
  });

  const monthlyAvailability = useMemo(() => availabilityQuery.data || {}, [availabilityQuery.data]);
  const availableDates = useMemo(
    () => new Set(Array.isArray(monthlyAvailability.availableDates) ? monthlyAvailability.availableDates : []),
    [monthlyAvailability]
  );
  const slotDetailsByDate = useMemo(
    () =>
      monthlyAvailability.slotDetailsByDate &&
      typeof monthlyAvailability.slotDetailsByDate === "object"
        ? monthlyAvailability.slotDetailsByDate
        : {},
    [monthlyAvailability]
  );

  const daySlots = useMemo(() => {
    if (!selectedDate) return [];

    const mappedSlots = Array.isArray(slotDetailsByDate[selectedDate])
      ? slotDetailsByDate[selectedDate].map((slot) => ({
          date: selectedDate,
          time: slot.time,
          capacity: Number(slot.capacity ?? 0),
          used: Number(slot.used ?? 0),
          free: Number(slot.free ?? 0),
        }))
      : [];

    let filtered = mappedSlots;
    const minDateStr = toDateStr(minDateTime);

    if (selectedDate === minDateStr) {
      const minTime = minDateTime.toTimeString().slice(0, 5);
      filtered = filtered.filter((slot) => String(slot.time || "") >= minTime);
    }

    return filtered.sort((left, right) =>
      String(left.time || "").localeCompare(String(right.time || ""))
    );
  }, [minDateTime, selectedDate, slotDetailsByDate]);

  const availableSummary = useMemo(() => getSlotSummary(daySlots), [daySlots]);
  const selectedSlot = useMemo(
    () => daySlots.find((slot) => String(slot.time || "") === String(time || "")) || null,
    [daySlots, time]
  );
  const availableDaysCount = useMemo(
    () => (Array.isArray(monthlyAvailability.availableDates) ? monthlyAvailability.availableDates.length : 0),
    [monthlyAvailability]
  );
  const isCalendarLoading = availabilityQuery.isLoading || availabilityQuery.isFetching;
  const availabilityInfoMessage = !prestatorId
    ? "Selecteaza un patiser pentru a vedea disponibilitatea."
    : String(monthlyAvailability.message || "").trim();

  useEffect(() => {
    if (!time) return;
    if (!daySlots.some((slot) => String(slot.time || "") === String(time || ""))) {
      setTime("");
    }
  }, [daySlots, time]);

  const subtotalValue = Number(subtotal || 0);

  const selectCalendarDate = (value) => {
    const next = toSafeDate(value);
    if (!next) return;
    setCalendarDate(next);
    setActiveMonthDate(toMonthStart(next));
    setTime("");
    setSuccess(null);
  };

  const tileDisabled = ({ date, view }) => {
    if (view !== "month") return false;

    const minDay = new Date(minDateTime);
    minDay.setHours(0, 0, 0, 0);
    if (date < minDay) return true;

    return !availableDates.has(toDateStr(date));
  };

  const tileClassName = ({ date, view }) => {
    if (view !== "month") return null;

    const dateStr = toDateStr(date);
    if (dateStr === selectedDate) {
      return "rounded-2xl bg-pink-600 text-white";
    }
    if (availableDates.has(dateStr)) {
      return "rounded-2xl bg-rose-50 font-semibold text-pink-700";
    }
    return "rounded-2xl text-gray-400";
  };

  const isSelectedSlotValid = () => {
    if (!selectedDate || !time) return false;
    const [hours, minutes] = String(time).split(":").map(Number);
    const next = parseDateInput(selectedDate, {
      hours: hours || 0,
      minutes: minutes || 0,
    });
    return next ? next >= minDateTime : false;
  };

  const handleReserve = (event) => {
    event.preventDefault();
    setSuccess(null);
    setStatus({ type: "", message: "" });

    if (!user?._id) {
      setStatus({
        type: "warning",
        message: "Trebuie sa fii autentificat pentru a face o rezervare.",
      });
      return;
    }

    if (!prestatorId) {
      setStatus({
        type: "error",
        message:
          providerState.error ||
          "Alege un prestator valid inainte de a continua cu rezervarea.",
      });
      return;
    }

    if (!selectedDate || !time) {
      setStatus({ type: "warning", message: "Selecteaza data si ora rezervarii." });
      return;
    }

    if (!isSelectedSlotValid()) {
      setStatus({
        type: "warning",
        message: `Alege un slot cu minim ${leadHours} ore inainte.`,
      });
      return;
    }

    if (metoda === "livrare" && !adresa.trim()) {
      setStatus({
        type: "warning",
        message: "Completeaza adresa de livrare pentru a continua.",
      });
      return;
    }

    if (metoda === "livrare" && windowStart && windowEnd && windowEnd <= windowStart) {
      setStatus({
        type: "warning",
        message: "Intervalul de livrare este invalid. Ora de final trebuie sa fie dupa ora de inceput.",
      });
      return;
    }

    reserveMutation.mutate({
      clientId: user._id,
      providerId: prestatorId,
      date: selectedDate,
      time,
      metoda,
      adresaLivrare: metoda === "livrare" ? adresa.trim() : "",
      deliveryInstructions:
        metoda === "livrare" ? deliveryInstructions.trim() : "",
      deliveryWindow:
        metoda === "livrare" ? buildDeliveryWindow(windowStart, windowEnd) : "",
      clientBudget: subtotalValue || 0,
      subtotal: subtotalValue || 0,
      descriere: descriere.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const reservationBusy = reserveMutation.isPending;

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-7xl space-y-6`}>
        <header className={`${cards.tinted} p-6`}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
                Calendar rezervari
              </p>
              <h1 className="font-serif text-3xl font-semibold text-gray-900 md:text-4xl">
                Alege data, intervalul si modul de predare
              </h1>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                Rezerva un interval, transmite cerintele comenzii si asteapta
                confirmarea finala a pretului din partea echipei.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-rose-100 bg-white/75 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Zile disponibile
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {availableDaysCount}
                </div>
                <div className="text-sm text-gray-600">zile active in luna afisata</div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white/75 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Lead time
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{leadHours}h</div>
                <div className="text-sm text-gray-600">timp minim de pregatire</div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white/75 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Adrese salvate
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {addressOptions.length}
                </div>
                <div className="text-sm text-gray-600">
                  {providerState.activeProvider
                    ? providerState.activeProvider.displayName
                    : "alege prestatorul activ"}
                </div>
              </div>
            </div>
          </div>
        </header>

        <StatusBanner
          type="error"
          title="Prestator indisponibil"
          message={
            !providerState.loading && !prestatorId
              ? providerState.error || "Selecteaza un patiser pentru a vedea disponibilitatea."
              : ""
          }
        />
        <StatusBanner
          type="info"
          message={
            prestatorId && availabilityInfoMessage && !availabilityQuery.error
              ? availabilityInfoMessage
              : ""
          }
        />
        <StatusBanner
          type={status.type || "info"}
          message={status.message}
        />
        <StatusBanner
          type="error"
          message={
            availabilityQuery.error
              ? getApiErrorMessage(
                  availabilityQuery.error,
                  "Nu am putut incarca disponibilitatea calendarului."
                )
              : ""
          }
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className={`${cards.elevated} space-y-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Disponibilitate</h2>
                <p className="text-sm text-gray-600">
                  Selecteaza un patiser, apoi alege o zi evidentiata pentru a vedea intervalele libere.
                </p>
              </div>
              <div className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-pink-700 shadow-soft">
                {activeMonth}
              </div>
            </div>

            <div
              className={`rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,239,228,0.94))] p-4 shadow-soft transition-all duration-300 ${
                isCalendarLoading ? "opacity-75" : "opacity-100"
              }`}
            >
              <Calendar
                activeStartDate={activeMonthDate}
                value={calendarDate}
                onChange={selectCalendarDate}
                onActiveStartDateChange={({ activeStartDate, view }) => {
                  if (view === "month" && activeStartDate) {
                    setActiveMonthDate(toMonthStart(activeStartDate));
                  }
                }}
                minDate={minDateTime}
                tileDisabled={tileDisabled}
                tileClassName={tileClassName}
                tileContent={({ date, view }) =>
                  view === "month" && availableDates.has(toDateStr(date)) ? (
                    <div className="mt-1 flex justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                    </div>
                  ) : null
                }
                className="calendar-shell"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-rose-100 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-gray-900">Intervale in ziua selectata</div>
                <div className="mt-2 text-3xl font-semibold text-pink-600">
                  {availableSummary.total}
                </div>
                <div className="text-sm text-gray-600">
                  dintre care {availableSummary.available} sunt inca disponibile
                </div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-gray-900">Slot selectat</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {selectedSlot?.time || "--:--"}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedSlot
                    ? `${selectedSlot.free} locuri raman disponibile`
                    : "Alege un interval pentru a continua"}
                </div>
              </div>
            </div>
          </section>

          <section className={`${cards.elevated} space-y-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Rezervarea ta</h2>
                <p className="text-sm text-gray-600">
                  Completeaza detaliile utile pentru livrare si productie.
                </p>
              </div>
              {success?.comandaId ? (
                <button
                  type="button"
                  className={buttons.success}
                  onClick={() =>
                    navigate(
                      success?.requiresPriceConfirmation
                        ? "/profil"
                        : `/plata?comandaId=${success.comandaId}`
                    )
                  }
                >
                  {success?.requiresPriceConfirmation
                    ? "Vezi in profil"
                    : "Continua la plata"}
                </button>
              ) : null}
            </div>

            <form onSubmit={handleReserve} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <ProviderSelector
                providers={providerState.providers}
                value={prestatorId}
                onChange={(nextProviderId) => {
                  providerState.setSelectedProviderId(nextProviderId);
                  setTime("");
                  setSuccess(null);
                  setStatus({ type: "", message: "" });
                }}
                loading={providerState.loading}
                disabled={!providerState.canChooseProvider}
                label="Prestator"
                helpText={
                  providerState.activeProvider
                    ? `Calendarul afiseaza doar disponibilitatea pentru ${providerState.activeProvider.displayName}.`
                    : "Selecteaza un patiser pentru a incarca datele si intervalele disponibile."
                }
              />
              <label className="text-sm font-semibold text-gray-700">
                Data selectata
                <input
                    type="date"
                    value={selectedDate}
                    min={toDateStr(minDateTime)}
                    onChange={(event) => {
                      const nextDate = parseDateInput(event.target.value);
                      if (nextDate) {
                        selectCalendarDate(nextDate);
                      }
                    }}
                    className={`mt-2 ${inputs.default}`}
                  />
                </label>

                <div
                  key={`${prestatorId || "none"}_${selectedDate}_${activeMonth}`}
                  className="transition-all duration-300"
                >
                  <div className="text-sm font-semibold text-gray-700">Interval orar</div>
                  <div className="mt-2">
                    {!prestatorId ? (
                      <div className="rounded-2xl border border-dashed border-rose-200 bg-white/80 px-4 py-5 text-sm text-gray-500">
                        Selecteaza un patiser pentru a vedea disponibilitatea.
                      </div>
                    ) : (
                      <SlotPicker
                        slots={daySlots}
                        date={selectedDate}
                        value={time}
                        onChange={(nextTime) => {
                          setTime(nextTime);
                          setSuccess(null);
                        }}
                      />
                    )}
                  </div>
                  {isCalendarLoading ? (
                    <div className="mt-3 text-sm text-gray-500">
                      Se sincronizeaza disponibilitatea calendarului...
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="rounded-[26px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4">
                    <div className="text-sm font-semibold text-gray-900">Mod de predare</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        className={`rounded-[24px] border px-4 py-4 text-left ${
                          metoda === "ridicare"
                            ? "border-pink-400 bg-white text-pink-700 shadow-soft"
                            : "border-rose-200 bg-white/80 text-gray-700"
                        }`}
                        onClick={() => setMetoda("ridicare")}
                      >
                        <div className="font-semibold">Ridicare</div>
                        <div className="mt-1 text-sm text-gray-600">
                          Clientul vine direct la patiserie.
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`rounded-[24px] border px-4 py-4 text-left ${
                          metoda === "livrare"
                            ? "border-pink-400 bg-white text-pink-700 shadow-soft"
                            : "border-rose-200 bg-white/80 text-gray-700"
                        }`}
                        onClick={() => setMetoda("livrare")}
                      >
                        <div className="font-semibold">Livrare</div>
                        <div className="mt-1 text-sm text-gray-600">
                          Livrare prin curier pentru {DELIVERY_FEE} MDL.
                        </div>
                      </button>
                    </div>
                  </div>

                  {metoda === "livrare" ? (
                    <div className="rounded-[26px] border border-rose-100 bg-white p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            Detalii livrare
                          </h3>
                          <p className="text-sm text-gray-600">
                            Poti reutiliza rapid adresele salvate sau poti introduce una noua.
                          </p>
                        </div>
                      </div>

                      {addressOptions.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Sursa adresei
                            <select
                              value={addressMode}
                              onChange={(event) => setAddressMode(event.target.value)}
                              className={`mt-2 ${inputs.default}`}
                            >
                              <option value="saved">Adrese salvate</option>
                              <option value="custom">Adresa noua</option>
                            </select>
                          </label>
                          {addressMode === "saved" ? (
                            <label className="text-sm font-semibold text-gray-700">
                              Alege adresa
                              <select
                                value={selectedAddressIdx}
                                onChange={(event) => setSelectedAddressIdx(event.target.value)}
                                className={`mt-2 ${inputs.default}`}
                              >
                                {addressOptions.map((item, index) => (
                                  <option key={`${item.label}_${index}`} value={String(index)}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>
                      ) : null}

                      {addressMode === "saved" && selectedAddressIdx !== "" ? (
                        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-gray-700">
                          {adresa || "Selecteaza o adresa salvata."}
                        </div>
                      ) : (
                        <label className="text-sm font-semibold text-gray-700">
                          Adresa completa
                          <input
                            type="text"
                            value={adresa}
                            onChange={(event) => setAdresa(event.target.value)}
                            className={`mt-2 ${inputs.default}`}
                            placeholder="Strada, numar, bloc, apartament"
                          />
                        </label>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Livrare de la
                          <input
                            type="time"
                            value={windowStart}
                            onChange={(event) => setWindowStart(event.target.value)}
                            className={`mt-2 ${inputs.default}`}
                          />
                        </label>
                        <label className="text-sm font-semibold text-gray-700">
                          Livrare pana la
                          <input
                            type="time"
                            value={windowEnd}
                            onChange={(event) => setWindowEnd(event.target.value)}
                            className={`mt-2 ${inputs.default}`}
                          />
                        </label>
                      </div>

                      <label className="text-sm font-semibold text-gray-700">
                        Instructiuni pentru curier
                        <textarea
                          value={deliveryInstructions}
                          onChange={(event) => setDeliveryInstructions(event.target.value)}
                          className={`mt-2 min-h-[96px] ${inputs.default}`}
                          placeholder="Interfon, etaj, punct de reper, observatii utile"
                        />
                      </label>
                    </div>
                  ) : null}

                  <label className="text-sm font-semibold text-gray-700">
                    Buget orientativ (optional, MDL)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={subtotal}
                      onChange={(event) => setSubtotal(event.target.value)}
                      className={`mt-2 ${inputs.default}`}
                      placeholder="0"
                    />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    Descriere produs / cerinte
                    <textarea
                      value={descriere}
                      onChange={(event) => setDescriere(event.target.value)}
                      className={`mt-2 min-h-[112px] ${inputs.default}`}
                      placeholder="Ex: tort aniversar, 8-10 portii, mesaj, aroma, restrictii"
                    />
                  </label>

                  <label className="text-sm font-semibold text-gray-700">
                    Note suplimentare
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className={`mt-2 min-h-[88px] ${inputs.default}`}
                      placeholder="Detalii extra pentru echipa de productie"
                    />
                  </label>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-[26px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,239,228,0.92))] p-5 shadow-soft">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                      Rezumat
                    </div>
                    <div className="mt-3 space-y-3 text-sm text-gray-700">
                      <div className="flex items-start justify-between gap-3">
                        <span>Data</span>
                        <span className="text-right font-semibold text-gray-900">
                          {formatLongDate(calendarDate)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span>Ora</span>
                        <span className="font-semibold text-gray-900">
                          {time || "Nealeasa"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span>Predare</span>
                        <span className="font-semibold text-gray-900">
                          {metoda === "livrare" ? "Livrare" : "Ridicare"}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span>Disponibilitate slot</span>
                        <span className="font-semibold text-gray-900">
                          {selectedSlot ? `${selectedSlot.free} libere` : "Selecteaza un slot"}
                        </span>
                      </div>
                      <div className="border-t border-rose-100 pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Buget orientativ</span>
                          <span className="font-semibold text-gray-900">
                            {subtotalValue.toFixed(2)} MDL
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Taxa livrare</span>
                          <span className="font-semibold text-gray-900">
                            {metoda === "livrare"
                              ? `${DELIVERY_FEE.toFixed(2)} MDL`
                              : "0.00 MDL"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Total estimat rezervare</span>
                          <span className="font-semibold text-gray-900">
                            {(subtotalValue + (metoda === "livrare" ? DELIVERY_FEE : 0)).toFixed(2)} MDL
                          </span>
                        </div>
                        <div className="rounded-2xl bg-[rgba(255,249,242,0.88)] px-3 py-3 text-sm text-gray-700">
                          Pretul final poate fi ajustat dupa analiza, dar taxa de
                          predare este salvata imediat in rezervare.
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={reservationBusy || !selectedDate || !time || !prestatorId}
                    className={`w-full ${buttons.primary}`}
                  >
                    {reservationBusy ? "Se confirma rezervarea..." : "Confirma rezervarea"}
                  </button>
                </aside>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
