import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useNavigate } from "react-router-dom";
import { bookSlot, getAvailability } from "../api/calendar";
import ClientOrderFlowGuide from "../components/ClientOrderFlowGuide";
import SlotPicker from "../components/SlotPicker";
import StatusBanner from "../components/StatusBanner";
import ProviderSelector from "../components/ProviderSelector";
import { useAuth } from "../context/AuthContext";
import { formatDateInput, parseDateInput } from "../lib/date";
import { useProviderDirectory } from "../lib/providers";
import { getMinLeadHours } from "../lib/runtimeConfig";
import { getApiErrorMessage } from "../lib/serverState";
import { buttons, cards, containers, inputs } from "../lib/tailwindComponents";

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
  const date = value instanceof Date ? value : new Date(value);
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

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

function SummaryRow({ label, value, emphasized = false }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-[#6d645c]">{label}</span>
      <span
        className={[
          "max-w-[60%] text-right",
          emphasized ? "font-semibold text-ink" : "font-medium text-[#3f3731]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function StepChip({ index, label, active, completed }) {
  return (
    <div
      className={[
        "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
        completed
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : active
            ? "border-pink-300 bg-rose-50 text-pink-700"
            : "border-rose-100 bg-white/80 text-[#8b8178]",
      ].join(" ")}
    >
      {index}. {label}
    </div>
  );
}

function FlowStepCard({
  step,
  title,
  description,
  active = false,
  completed = false,
  locked = false,
  children,
}) {
  const badge = completed ? "Completat" : locked ? "Blocat" : active ? "Pas curent" : "Pregatit";

  return (
    <section
      className={[
        "rounded-[28px] border p-5 shadow-soft transition duration-200",
        completed
          ? "border-emerald-200 bg-[rgba(246,255,250,0.92)]"
          : active
            ? "border-pink-300 bg-[rgba(255,250,245,0.96)]"
            : locked
              ? "border-rose-100 bg-[rgba(250,246,239,0.72)] opacity-75"
              : "border-rose-100 bg-white/90",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-sm font-semibold text-white">
              {step}
            </span>
            <h3 className="font-serif text-xl font-semibold text-ink">{title}</h3>
          </div>
          {description ? (
            <p className="mt-3 text-sm leading-6 text-[#6e665d]">{description}</p>
          ) : null}
        </div>
        <span
          className={[
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
            completed
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : active
                ? "border-rose-200 bg-rose-50 text-pink-700"
                : "border-rose-100 bg-white/85 text-[#8b8178]",
          ].join(" ")}
        >
          {badge}
        </span>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function CalendarClient() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [calendarDate, setCalendarDate] = useState(null);
  const [activeMonthDate, setActiveMonthDate] = useState(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return toMonthStart(today);
  });
  const [time, setTime] = useState("");
  const [metoda, setMetoda] = useState("");
  const [adresa, setAdresa] = useState("");
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

  const minDateTime = useMemo(() => {
    const next = new Date();
    next.setHours(next.getHours() + leadHours);
    return next;
  }, [leadHours]);

  const clearFeedback = () => {
    setSuccess(null);
    setStatus({ type: "", message: "" });
  };

  useEffect(() => {
    if (metoda !== "livrare") return;
    if (!addressOptions.length || adresa.trim()) return;
    const fallbackIndex = selectedAddressIdx || defaultAddressIdx;
    if (fallbackIndex === "") return;
    const option = addressOptions[Number(fallbackIndex)];
    if (!option?.address) return;
    setSelectedAddressIdx(fallbackIndex);
    setAdresa(option.address);
  }, [adresa, addressOptions, defaultAddressIdx, metoda, selectedAddressIdx]);

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
      setSuccess({
        comandaId: data?.comandaId || "",
        rezervareId: data?.rezervareId || "",
        requiresPriceConfirmation: data?.requiresPriceConfirmation !== false,
        date: selectedDate,
        time,
        metoda: data?.deliveryMethod || metoda,
        adresaLivrare: data?.reservationSummary?.adresaLivrare || adresa.trim(),
        deliveryWindow:
          data?.reservationSummary?.deliveryWindow ||
          (metoda === "livrare" ? buildDeliveryWindow(windowStart, windowEnd) : ""),
      });
      setStatus({
        type: "success",
        message:
          data?.requiresPriceConfirmation !== false
            ? "Rezervarea a fost trimisa. Echipa va confirma pretul final dupa analiza detaliilor."
            : "Rezervarea a fost inregistrata si poti continua direct la plata.",
      });
      queryClient.invalidateQueries({
        queryKey: ["calendar-availability-month", prestatorId],
      });
    },
    onError: (error) => {
      setStatus({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut trimite rezervarea."),
      });
    },
  });

  const monthlyAvailability = useMemo(() => availabilityQuery.data || {}, [availabilityQuery.data]);
  const availableDates = useMemo(
    () =>
      new Set(
        Array.isArray(monthlyAvailability.availableDates) ? monthlyAvailability.availableDates : []
      ),
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
    () =>
      Array.isArray(monthlyAvailability.availableDates) ? monthlyAvailability.availableDates.length : 0,
    [monthlyAvailability]
  );
  const isCalendarLoading = availabilityQuery.isLoading || availabilityQuery.isFetching;
  const availabilityInfoMessage = !prestatorId
    ? providerState.hasMultipleProviders
      ? "Selecteaza atelierul pentru a vedea disponibilitatea."
      : ""
    : String(monthlyAvailability.message || "").trim();

  useEffect(() => {
    if (!time) return;
    if (!daySlots.some((slot) => String(slot.time || "") === String(time || ""))) {
      setTime("");
    }
  }, [daySlots, time]);

  const subtotalValue = useMemo(() => {
    const parsed = Number(subtotal || 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [subtotal]);

  const hasSelectedDate = Boolean(selectedDate);
  const hasSelectedTime = Boolean(time);
  const hasDeliveryMethod = Boolean(metoda);
  const requiresDeliveryAddress = metoda === "livrare";
  const hasDeliveryAddress = !requiresDeliveryAddress || Boolean(adresa.trim());
  const hasValidDeliveryWindow =
    !requiresDeliveryAddress || !windowStart || !windowEnd || windowEnd > windowStart;

  const reservationTotal = subtotalValue + (metoda === "livrare" ? DELIVERY_FEE : 0);
  const deliveryWindowLabel =
    metoda === "livrare"
      ? buildDeliveryWindow(windowStart, windowEnd) || "Se confirma telefonic"
      : "Nu se aplica";

  const stepState = {
    date: hasSelectedDate,
    time: hasSelectedDate && hasSelectedTime,
    method: hasSelectedDate && hasSelectedTime && hasDeliveryMethod,
    address:
      hasSelectedDate &&
      hasSelectedTime &&
      hasDeliveryMethod &&
      (!requiresDeliveryAddress || hasDeliveryAddress),
  };

  const currentStep = !hasSelectedDate
    ? 1
    : !hasSelectedTime
      ? 2
      : !hasDeliveryMethod
        ? 3
        : requiresDeliveryAddress && !hasDeliveryAddress
          ? 4
          : 5;

  const isSelectedSlotValid = () => {
    if (!selectedDate || !time) return false;
    const [hours, minutes] = String(time).split(":").map(Number);
    const next = parseDateInput(selectedDate, {
      hours: hours || 0,
      minutes: minutes || 0,
    });
    return next ? next >= minDateTime : false;
  };

  const canConfirmReservation =
    Boolean(user?._id) &&
    Boolean(prestatorId) &&
    hasSelectedDate &&
    hasSelectedTime &&
    hasDeliveryMethod &&
    hasDeliveryAddress &&
    hasValidDeliveryWindow &&
    isSelectedSlotValid();

  const selectCalendarDate = (value) => {
    const next = toSafeDate(value);
    if (!next) return;
    clearFeedback();
    setCalendarDate(next);
    setActiveMonthDate(toMonthStart(next));
    setTime("");
  };

  const tileDisabled = ({ date, view }) => {
    if (view !== "month") return false;
    if (!prestatorId) return true;

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

  const handleReserve = (event) => {
    event.preventDefault();
    setSuccess(null);
    setStatus({ type: "", message: "" });

    if (!user?._id) {
      setStatus({
        type: "warning",
        message: "Trebuie sa fii autentificat pentru a trimite rezervarea.",
      });
      return;
    }

    if (!prestatorId) {
      setStatus({
        type: "error",
        message:
          providerState.error ||
          "Alege un atelier valid inainte de a continua.",
      });
      return;
    }

    if (!selectedDate) {
      setStatus({ type: "warning", message: "Selecteaza mai intai data dorita." });
      return;
    }

    if (!time) {
      setStatus({ type: "warning", message: "Selecteaza intervalul orar." });
      return;
    }

    if (!isSelectedSlotValid()) {
      setStatus({
        type: "warning",
        message: `Alege un slot cu minim ${leadHours} ore inainte.`,
      });
      return;
    }

    if (!metoda) {
      setStatus({
        type: "warning",
        message: "Alege daca vrei livrare sau ridicare personala.",
      });
      return;
    }

    if (metoda === "livrare" && !adresa.trim()) {
      setStatus({
        type: "warning",
        message: "Introdu adresa de livrare pentru a continua.",
      });
      return;
    }

    if (!hasValidDeliveryWindow) {
      setStatus({
        type: "warning",
        message:
          "Intervalul de livrare este invalid. Ora de final trebuie sa fie dupa ora de inceput.",
      });
      return;
    }

    reserveMutation.mutate({
      clientId: user._id,
      providerId: prestatorId,
      date: selectedDate,
      time,
      metoda,
      deliveryMethod: metoda,
      adresaLivrare: metoda === "livrare" ? adresa.trim() : "",
      deliveryInstructions: metoda === "livrare" ? deliveryInstructions.trim() : "",
      deliveryWindow: metoda === "livrare" ? buildDeliveryWindow(windowStart, windowEnd) : "",
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
        <header className={cards.tinted}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
                Rezervare slot
              </p>
              <h1 className="font-serif text-3xl font-semibold text-gray-900 md:text-4xl">
                Rezervi data, ora si modul de predare
              </h1>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                Calendarul este pentru blocarea slotului de productie sau predare. Daca produsul
                tau este deja in cos si are pret fix, plata standard ramane in cos. Pentru un
                tort complet personalizat, fluxul principal este constructorul 2D. Pentru livrare,
                taxa fixa este de {DELIVERY_FEE} MDL.
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
                <div className="text-sm text-gray-600">in luna afisata</div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white/75 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Timp minim
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{leadHours}h</div>
                <div className="text-sm text-gray-600">inainte de preluare</div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white/75 px-4 py-3 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Livrare
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {DELIVERY_FEE} MDL
                </div>
                <div className="text-sm text-gray-600">taxa fixa la domiciliu</div>
              </div>
            </div>
          </div>
        </header>

        <ClientOrderFlowGuide activeFlow="booking" />

        <StatusBanner
          type="error"
          title="Atelier indisponibil"
          message={
            !providerState.loading && !prestatorId
              ? providerState.error || "Selecteaza atelierul pentru a vedea disponibilitatea."
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
        <StatusBanner type={status.type || "info"} message={status.message} />
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className={`${cards.elevated} space-y-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Disponibilitate</h2>
                <p className="text-sm text-gray-600">
                  {providerState.hasMultipleProviders
                    ? "Alege mai intai atelierul si apoi o zi evidentiata din calendar."
                    : "Atelierul activ este selectat automat. Alege o zi evidentiata din calendar."}
                </p>
              </div>
              <div className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-pink-700 shadow-soft">
                {activeMonth}
              </div>
            </div>

            <ProviderSelector
              providers={providerState.providers}
              value={prestatorId}
              onChange={(nextProviderId) => {
                providerState.setSelectedProviderId(nextProviderId);
                clearFeedback();
                setCalendarDate(null);
                setTime("");
                setMetoda("");
              }}
              loading={providerState.loading}
              disabled={!providerState.canChooseProvider}
              hideIfSingleOption
              label="Atelier"
              helpText={
                providerState.activeProvider
                  ? `Vezi acum calendarul pentru ${providerState.activeProvider.displayName}.`
                  : providerState.hasMultipleProviders
                    ? "Selecteaza atelierul pentru care vrei sa faci programarea."
                    : "Atelierul disponibil se selecteaza automat pentru rezervare."
              }
            />

            <div
              className={`rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,239,228,0.94))] p-4 shadow-soft transition-all duration-300 ${isCalendarLoading ? "opacity-75" : "opacity-100"}`}
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
                <div className="text-sm font-semibold text-gray-900">Zi selectata</div>
                <div className="mt-2 text-lg font-semibold text-pink-700">
                  {formatLongDate(calendarDate)}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedDate ? "Poti continua cu intervalul orar." : "Alege o data disponibila."}
                </div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-gray-900">Intervale in ziua selectata</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">
                  {availableSummary.total}
                </div>
                <div className="text-sm text-gray-600">
                  {availableSummary.available} intervale mai sunt libere
                </div>
              </div>
            </div>
          </section>

          <section className={`${cards.elevated} space-y-5`}>
            <div className="flex flex-wrap gap-2">
              <StepChip index="1" label="Data" active={currentStep === 1} completed={stepState.date} />
              <StepChip index="2" label="Ora" active={currentStep === 2} completed={stepState.time} />
              <StepChip
                index="3"
                label="Predare"
                active={currentStep === 3}
                completed={stepState.method}
              />
              <StepChip
                index="4"
                label="Adresa"
                active={currentStep === 4}
                completed={stepState.address}
              />
              <StepChip index="5" label="Confirmare" active={currentStep === 5} completed={Boolean(success)} />
            </div>

            <form onSubmit={handleReserve} className="space-y-5">
              <FlowStepCard
                step="1"
                title="Alege data dorita"
                description="Poti selecta direct din calendar sau din campul de mai jos. Sunt active doar zilele care au sloturi disponibile."
                active={currentStep === 1}
                completed={stepState.date}
              >
                <div className="grid gap-4 md:grid-cols-2">
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
                  <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3 text-sm text-[#6d645c]">
                    <div className="font-semibold text-ink">Ai ales</div>
                    <div className="mt-2 text-base font-semibold text-pink-700">
                      {formatLongDate(calendarDate)}
                    </div>
                    <div className="mt-2 leading-6">
                      {prestatorId
                        ? "Dupa alegerea datei poti trece direct la intervalul orar."
                        : providerState.hasMultipleProviders
                          ? "Selecteaza mai intai atelierul din coloana din stanga."
                          : "Atelierul se incarca. Dupa selectie poti continua cu intervalul orar."}
                    </div>
                  </div>
                </div>
              </FlowStepCard>

              <FlowStepCard
                step="2"
                title="Alege ora"
                description="Dupa selectarea zilei, sistemul iti arata doar intervalele care pot fi rezervate."
                active={currentStep === 2}
                completed={stepState.time}
                locked={!hasSelectedDate}
              >
                {!hasSelectedDate ? (
                  <div className="rounded-[22px] border border-dashed border-rose-200 bg-ivory/80 px-4 py-5 text-sm text-[#6e665d]">
                    Selecteaza mai intai data dorita pentru a vedea sloturile disponibile.
                  </div>
                ) : (
                  <>
                    <div key={`${prestatorId || "none"}_${selectedDate}_${activeMonth}`}>
                      <SlotPicker
                        slots={daySlots}
                        date={selectedDate}
                        value={time}
                        onChange={(nextTime) => {
                          clearFeedback();
                          setTime(nextTime);
                        }}
                      />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3 text-sm text-[#6d645c]">
                        <div className="font-semibold text-ink">Ora selectata</div>
                        <div className="mt-2 text-lg font-semibold text-pink-700">
                          {time || "--:--"}
                        </div>
                      </div>
                      <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3 text-sm text-[#6d645c]">
                        <div className="font-semibold text-ink">Disponibilitate</div>
                        <div className="mt-2 text-lg font-semibold text-pink-700">
                          {selectedSlot ? `${selectedSlot.free} locuri libere` : "Selecteaza un slot"}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {isCalendarLoading ? (
                  <div className="mt-3 text-sm text-gray-500">
                    Se sincronizeaza disponibilitatea pentru luna selectata...
                  </div>
                ) : null}
              </FlowStepCard>

              <FlowStepCard
                step="3"
                title="Alege metoda de primire"
                description="Stabilesti clar daca produsul este ridicat din atelier sau trebuie livrat la domiciliu."
                active={currentStep === 3}
                completed={stepState.method}
                locked={!hasSelectedTime}
              >
                {!hasSelectedTime ? (
                  <div className="rounded-[22px] border border-dashed border-rose-200 bg-ivory/80 px-4 py-5 text-sm text-[#6e665d]">
                    Pasul de predare se activeaza dupa ce alegi intervalul orar.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      className={[
                        "rounded-[24px] border px-4 py-4 text-left transition",
                        metoda === "ridicare"
                          ? "border-pink-400 bg-white text-pink-700 shadow-soft"
                          : "border-rose-200 bg-white/80 text-gray-700 hover:border-rose-300 hover:bg-white",
                      ].join(" ")}
                      onClick={() => {
                        clearFeedback();
                        setMetoda("ridicare");
                      }}
                    >
                      <div className="font-semibold">Ridicare personala</div>
                      <div className="mt-1 text-sm text-gray-600">
                        Clientul vine la atelier la ora selectata.
                      </div>
                    </button>
                    <button
                      type="button"
                      className={[
                        "rounded-[24px] border px-4 py-4 text-left transition",
                        metoda === "livrare"
                          ? "border-pink-400 bg-white text-pink-700 shadow-soft"
                          : "border-rose-200 bg-white/80 text-gray-700 hover:border-rose-300 hover:bg-white",
                      ].join(" ")}
                      onClick={() => {
                        clearFeedback();
                        setMetoda("livrare");
                      }}
                    >
                      <div className="font-semibold">Livrare la domiciliu</div>
                      <div className="mt-1 text-sm text-gray-600">
                        Cost fix: {DELIVERY_FEE} MDL. Adresa devine obligatorie.
                      </div>
                    </button>
                  </div>
                )}
              </FlowStepCard>

              <FlowStepCard
                step="4"
                title="Adresa si detalii de predare"
                description="Daca alegi livrare, introduci adresa exacta. Pentru ridicare, pasul este bifat automat."
                active={currentStep === 4}
                completed={stepState.address}
                locked={!hasDeliveryMethod}
              >
                {!hasDeliveryMethod ? (
                  <div className="rounded-[22px] border border-dashed border-rose-200 bg-ivory/80 px-4 py-5 text-sm text-[#6e665d]">
                    Alege mai intai daca vrei livrare sau ridicare personala.
                  </div>
                ) : metoda === "ridicare" ? (
                  <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-800">
                    Ai ales ridicare personala. Nu este nevoie de adresa. Comanda va fi pregatita
                    pentru preluare la data si ora selectate.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addressOptions.length ? (
                      <div>
                        <div className="text-sm font-semibold text-gray-700">Adrese salvate</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {addressOptions.map((item, index) => (
                            <button
                              key={`${item.label}_${index}`}
                              type="button"
                              onClick={() => {
                                clearFeedback();
                                setSelectedAddressIdx(String(index));
                                setAdresa(item.address);
                              }}
                              className={[
                                "rounded-full border px-3 py-2 text-sm font-medium transition",
                                selectedAddressIdx === String(index)
                                  ? "border-pink-300 bg-rose-50 text-pink-700"
                                  : "border-rose-200 bg-white text-[#5f564d] hover:border-rose-300",
                              ].join(" ")}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <label className="text-sm font-semibold text-gray-700">
                      Adresa completa
                      <input
                        type="text"
                        value={adresa}
                        onChange={(event) => {
                          clearFeedback();
                          setAdresa(event.target.value);
                          setSelectedAddressIdx("");
                        }}
                        className={`mt-2 ${inputs.default}`}
                        placeholder="Strada, numar, bloc, apartament"
                      />
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Livrare de la
                        <input
                          type="time"
                          value={windowStart}
                          onChange={(event) => {
                            clearFeedback();
                            setWindowStart(event.target.value);
                          }}
                          className={`mt-2 ${inputs.default}`}
                        />
                      </label>
                      <label className="text-sm font-semibold text-gray-700">
                        Livrare pana la
                        <input
                          type="time"
                          value={windowEnd}
                          onChange={(event) => {
                            clearFeedback();
                            setWindowEnd(event.target.value);
                          }}
                          className={`mt-2 ${inputs.default}`}
                        />
                      </label>
                    </div>

                    <label className="text-sm font-semibold text-gray-700">
                      Instructiuni pentru livrare
                      <textarea
                        value={deliveryInstructions}
                        onChange={(event) => {
                          clearFeedback();
                          setDeliveryInstructions(event.target.value);
                        }}
                        className={`mt-2 min-h-[96px] ${inputs.default}`}
                        placeholder="Interfon, etaj, reper, observatii utile pentru curier"
                      />
                    </label>
                  </div>
                )}
              </FlowStepCard>

              <FlowStepCard
                step="5"
                title="Verifica rezervarea si confirma"
                description="Vezi toate detaliile intr-un singur loc, apoi trimiti rezervarea slotului."
                active={currentStep === 5}
                completed={Boolean(success)}
                locked={!stepState.address}
              >
                {!stepState.address ? (
                  <div className="rounded-[22px] border border-dashed border-rose-200 bg-ivory/80 px-4 py-5 text-sm text-[#6e665d]">
                    Rezumatul final se activeaza dupa ce completezi pasii anteriori.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-[26px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,239,228,0.92))] p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                        Rezumat rezervare
                      </div>
                      <div className="mt-4 space-y-3">
                        <SummaryRow
                          label="Atelier"
                          value={providerState.activeProvider?.displayName || "Neselectat"}
                        />
                        <SummaryRow label="Data" value={formatLongDate(calendarDate)} />
                        <SummaryRow label="Ora" value={time || "Nealeasa"} />
                        <SummaryRow
                          label="Metoda de primire"
                          value={
                            metoda === "livrare"
                              ? "Livrare la domiciliu"
                              : metoda === "ridicare"
                                ? "Ridicare personala"
                                : "Neselectata"
                          }
                        />
                        {metoda === "livrare" ? (
                          <>
                            <SummaryRow label="Adresa" value={adresa.trim() || "Necompletata"} />
                            <SummaryRow label="Interval livrare" value={deliveryWindowLabel} />
                          </>
                        ) : null}
                        <div className="border-t border-rose-100 pt-3">
                          <SummaryRow label="Buget orientativ" value={formatMoney(subtotalValue)} />
                          <SummaryRow
                            label="Taxa livrare"
                            value={metoda === "livrare" ? formatMoney(DELIVERY_FEE) : "0.00 MDL"}
                          />
                          <SummaryRow
                            label="Total estimat"
                            value={formatMoney(reservationTotal)}
                            emphasized
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Buget orientativ (optional, MDL)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={subtotal}
                          onChange={(event) => {
                            clearFeedback();
                            setSubtotal(event.target.value);
                          }}
                          className={`mt-2 ${inputs.default}`}
                          placeholder="0"
                        />
                      </label>

                      <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3 text-sm text-[#6d645c]">
                        <div className="font-semibold text-ink">Confirmare finala</div>
                        <div className="mt-2 leading-6">
                          Trimiti data, ora, metoda de predare si adresa, iar rezervarea ajunge
                          direct in sistemul intern al atelierului.
                        </div>
                      </div>
                    </div>

                    <label className="text-sm font-semibold text-gray-700">
                      Descriere produs / cerinte
                      <textarea
                        value={descriere}
                        onChange={(event) => {
                          clearFeedback();
                          setDescriere(event.target.value);
                        }}
                        className={`mt-2 min-h-[112px] ${inputs.default}`}
                        placeholder="Ex: tort aniversar, aroma, mesaj, culori, restrictii"
                      />
                    </label>

                    <label className="text-sm font-semibold text-gray-700">
                      Note suplimentare
                      <textarea
                        value={notes}
                        onChange={(event) => {
                          clearFeedback();
                          setNotes(event.target.value);
                        }}
                        className={`mt-2 min-h-[88px] ${inputs.default}`}
                        placeholder="Detalii suplimentare pentru echipa"
                      />
                    </label>

                    {!user?._id ? (
                      <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Trebuie sa fii autentificat pentru a confirma rezervarea.
                      </div>
                    ) : null}

                    {success?.comandaId ? (
                      <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                        <div className="font-semibold">Rezervarea a fost inregistrata.</div>
                        <div className="mt-2 leading-6">
                          Data: {formatLongDate(success.date)} | Ora: {success.time} | Metoda:{" "}
                          {success.metoda === "livrare" ? "Livrare" : "Ridicare"}
                        </div>
                        {success.adresaLivrare ? (
                          <div className="mt-2 leading-6">Adresa: {success.adresaLivrare}</div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            className={buttons.success}
                            onClick={() =>
                              navigate(
                                success.requiresPriceConfirmation
                                  ? "/profil"
                                  : `/plata?comandaId=${success.comandaId}`
                              )
                            }
                          >
                            {success.requiresPriceConfirmation
                              ? "Vezi rezervarea in profil"
                              : "Continua la plata"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={reservationBusy || !canConfirmReservation}
                      className={`w-full ${buttons.primary}`}
                    >
                      {reservationBusy ? "Se trimite rezervarea..." : "Confirma rezervarea"}
                    </button>
                  </div>
                )}
              </FlowStepCard>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
