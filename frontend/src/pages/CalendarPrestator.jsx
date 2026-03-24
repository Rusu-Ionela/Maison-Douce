import { useEffect, useMemo, useState } from "react";
import api from "/src/lib/api.js";
import StatusBanner from "../components/StatusBanner";
import ProviderSelector from "../components/ProviderSelector";
import { useAuth } from "../context/AuthContext";
import { addDays, formatDateInput, getTodayDateInput } from "../lib/date";
import { useProviderDirectory } from "../lib/providers";

function toDateStr(d) {
  return formatDateInput(d);
}

async function fetchAvailability(prestatorId) {
  const from = toDateStr(new Date());
  const to = toDateStr(addDays(new Date(), 30) || new Date());
  const res = await api.get(`/calendar/availability/${prestatorId}`, {
    params: { from, to },
  });
  return res.data?.slots || [];
}

export default function CalendarPrestator() {
  const { user } = useAuth() || {};
  const [date, setDate] = useState(getTodayDateInput());
  const [time, setTime] = useState("");
  const [capacity, setCapacity] = useState(3);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const providerState = useProviderDirectory({ user });
  const prestatorId = providerState.activeProviderId;

  const visibleSlots = useMemo(
    () => slots.filter((s) => s.date === date),
    [slots, date]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!prestatorId) {
        if (!cancelled) setSlots([]);
        return;
      }
      try {
        const nextSlots = await fetchAvailability(prestatorId);
        if (!cancelled) {
          setSlots(nextSlots);
        }
      } catch (error) {
        console.error("fetch slots error:", error);
        if (!cancelled) {
          setSlots([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prestatorId]);

  const addSlot = async () => {
    setMsg("");
    if (!prestatorId) {
      setMsg(providerState.error || "Selecteaza un prestator valid.");
      return;
    }
    if (!date || !time) {
      setMsg("Completeaza data si ora.");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/calendar/availability/${prestatorId}`, {
        slots: [{ date, time, capacity: Number(capacity || 1) }],
      });
      setTime("");
      setSlots(await fetchAvailability(prestatorId));
    } catch (e) {
      console.error("add slot error:", e);
      setMsg(e?.response?.data?.message || "Nu am putut salva slotul.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Calendar prestator</h2>
        <p className="text-gray-600 text-sm">
          Gestioneaza intervalele disponibile pentru rezervari.
        </p>
      </div>
      <StatusBanner
        type="error"
        title="Prestator indisponibil"
        message={
          !providerState.loading && !prestatorId
            ? providerState.error || "Nu exista prestator activ pentru acest calendar."
            : ""
        }
      />

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <ProviderSelector
          providers={providerState.providers}
          value={prestatorId}
          onChange={providerState.setSelectedProviderId}
          loading={providerState.loading}
          disabled={!providerState.canChooseProvider}
          helpText={
            providerState.activeProvider
              ? `Configurezi sloturile pentru ${providerState.activeProvider.displayName}.`
              : "Selecteaza prestatorul pentru care vrei sa configurezi intervalele."
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm font-semibold text-gray-700">
            Data
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Ora
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Capacitate
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addSlot}
          disabled={loading}
          className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Se salveaza..." : "Adauga slot"}
        </button>
        {msg && <div className="text-sm text-rose-700 mt-2">{msg}</div>}
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">
          Sloturi pentru {date || "-"}
        </h3>
        {visibleSlots.length === 0 ? (
          <div className="text-gray-600 text-sm">Nu exista sloturi.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleSlots.map((s) => (
              <div key={`${s.date}-${s.time}`} className="border rounded p-3">
                <div className="font-semibold">{s.time}</div>
                <div className="text-sm text-gray-600">
                  {s.used || 0} / {s.capacity || 0} ocupate
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
