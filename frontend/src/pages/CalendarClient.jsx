// frontend/src/pages/CalendarClient.jsx
import React, { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useNavigate } from "react-router-dom";

import { getAvailability, reserveSlot } from "../api/calendar";
import SlotPicker from "../components/SlotPicker";
import { useAuth } from "../context/AuthContext";
import { buttons, inputs, cards } from "../lib/tailwindComponents";

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarClient() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [time, setTime] = useState("");
  const [metoda, setMetoda] = useState("ridicare");
  const [adresa, setAdresa] = useState("");
  const [addressMode, setAddressMode] = useState("saved");
  const [selectedAddressIdx, setSelectedAddressIdx] = useState("");
  const [slots, setSlots] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [descriere, setDescriere] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(null);

  const prestatorId = import.meta.env.VITE_PRESTATOR_ID || "default";
  const selectedDate = calendarDate ? toDateStr(calendarDate) : "";
  const leadHours = Number(import.meta.env.VITE_MIN_LEAD_HOURS || 24);

  const addressOptions = useMemo(() => {
    const options = [];
    if (user?.adresa) {
      const hasDefault = (user?.adreseSalvate || []).some((a) => a?.isDefault);
      options.push({
        label: "Adresa principala",
        address: user.adresa,
        isDefault: !hasDefault,
      });
    }
    (user?.adreseSalvate || []).forEach((a, idx) => {
      if (!a?.address) return;
      options.push({
        label: a.label || `Adresa ${idx + 1}`,
        address: a.address,
        isDefault: !!a.isDefault,
      });
    });
    return options;
  }, [user]);

  const defaultAddressIdx = useMemo(() => {
    const idx = addressOptions.findIndex((a) => a.isDefault);
    if (idx >= 0) return String(idx);
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
  }, [metoda, addressOptions, defaultAddressIdx, selectedAddressIdx]);

  useEffect(() => {
    if (addressMode !== "saved") return;
    const idx = Number(selectedAddressIdx);
    if (Number.isNaN(idx) || !addressOptions[idx]) return;
    setAdresa(addressOptions[idx].address);
  }, [addressMode, selectedAddressIdx, addressOptions]);

  const minDateTime = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + leadHours);
    return d;
  }, [leadHours]);

  useEffect(() => {
    const from = new Date();
    const to = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    (async () => {
      try {
        setLoading(true);
        const data = await getAvailability(prestatorId, {
          from: toDateStr(from),
          to: toDateStr(to),
          hideFull: false,
        });
        setSlots(Array.isArray(data?.slots) ? data.slots : []);
      } catch (e) {
        console.error("getAvailability error", e);
        setErr(e?.response?.data?.message || "Nu s-au putut incarca intervalele.");
      } finally {
        setLoading(false);
      }
    })();
  }, [prestatorId]);

  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    let filtered = (slots || []).filter((s) => s.date === selectedDate);
    const minDateStr = toDateStr(minDateTime);
    if (selectedDate === minDateStr) {
      const minTime = minDateTime.toTimeString().slice(0, 5);
      filtered = filtered.filter((s) => String(s.time || "") >= minTime);
    }
    return filtered.sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  }, [slots, selectedDate, minDateTime]);

  const availableDates = useMemo(() => {
    const map = new Map();
    (slots || []).forEach((s) => {
      const free = Number(s.free ?? 0);
      if (free > 0) map.set(s.date, true);
    });
    return map;
  }, [slots]);

  const tileDisabled = ({ date, view }) => {
    if (view !== "month") return false;
    const minDay = new Date(minDateTime);
    minDay.setHours(0, 0, 0, 0);
    if (date < minDay) return true;
    const dateStr = toDateStr(date);
    return !availableDates.has(dateStr);
  };

  const slotIsValid = () => {
    if (!selectedDate || !time) return false;
    const [h, m] = String(time).split(":").map(Number);
    const dt = new Date(selectedDate);
    dt.setHours(h || 0, m || 0, 0, 0);
    return dt >= minDateTime;
  };

  const buildDeliveryWindow = () => {
    if (!windowStart && !windowEnd) return "";
    if (windowStart && windowEnd) return `${windowStart}-${windowEnd}`;
    return windowStart || windowEnd || "";
  };

  async function handleReserve(e) {
    e.preventDefault();
    setErr("");
    setSuccess(null);

    if (!user?._id) {
      setErr("Trebuie sa fii autentificat pentru a face o rezervare.");
      return;
    }
    if (!selectedDate || !time) {
      setErr("Selecteaza data si ora.");
      return;
    }
    if (!slotIsValid()) {
      setErr(`Alege un slot cu minim ${leadHours}h inainte.`);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        clientId: user._id,
        prestatorId,
        date: selectedDate,
        time,
        metoda,
        adresaLivrare: metoda === "livrare" ? adresa : "",
        deliveryInstructions: metoda === "livrare" ? deliveryInstructions.trim() : "",
        deliveryWindow: metoda === "livrare" ? buildDeliveryWindow() : "",
        subtotal: Number(subtotal || 0),
        descriere: descriere || undefined,
        notes: notes || undefined,
      };

      const data = await reserveSlot(payload);
      setSuccess({ comandaId: data?.comandaId, rezervareId: data?.rezervareId });
    } catch (e) {
      console.error("reserveSlot error", e);
      setErr(e?.response?.data?.message || "Rezervarea a esuat.");
    } finally {
      setLoading(false);
    }
  }

  const total = Number(subtotal || 0) + (metoda === "livrare" ? 100 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Rezerva un interval
          </h1>
          <p className="text-gray-600 text-lg">
            Alege data, ora si modul de predare pentru desertul tau.
          </p>
        </div>

        {err && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 font-semibold">Eroare</p>
            <p className="text-red-600 text-sm">{err}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <p className="text-green-700 font-semibold">Rezervare creata</p>
            <p className="text-green-600 text-sm">Rezervarea a fost inregistrata.</p>
            {success.comandaId && (
              <button
                type="button"
                className="mt-2 underline text-green-700"
                onClick={() => navigate(`/plata?comandaId=${success.comandaId}`)}
              >
                Continua la plata
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={cards.elevated}>
            <h2 className="text-xl font-semibold mb-4">Calendar disponibilitate</h2>
            <Calendar
              value={calendarDate}
              onChange={(d) => {
                setCalendarDate(d);
                setTime("");
              }}
              minDate={new Date()}
              tileDisabled={tileDisabled}
              className="w-full"
            />
            <div className="mt-3 text-sm text-gray-600">
              Zilele cu sloturi disponibile sunt active in calendar.
            </div>
          </div>

          <div className={cards.elevated}>
            <form onSubmit={handleReserve} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data selectata
                </label>
                <input type="text" value={selectedDate || "-"} disabled className={inputs.default} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ora
                </label>
                {loading && !slots.length && (
                  <div className="text-center py-4 text-gray-500">
                    <p>Se incarca intervalele...</p>
                  </div>
                )}
                <SlotPicker slots={daySlots} date={selectedDate} value={time} onChange={setTime} />
                <p className="text-xs text-gray-500 mt-2">
                  Timp minim de pregatire: {leadHours}h.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Mod de preluare
                </label>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-pink-500 transition-colors">
                    <input
                      type="radio"
                      value="ridicare"
                      checked={metoda === "ridicare"}
                      onChange={(e) => setMetoda(e.target.value)}
                      className="mr-3 w-4 h-4"
                    />
                    <span className="font-medium text-gray-700">Ridicare de la patiserie</span>
                  </label>
                  <label className="flex items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-pink-500 transition-colors">
                    <input
                      type="radio"
                      value="livrare"
                      checked={metoda === "livrare"}
                      onChange={(e) => setMetoda(e.target.value)}
                      className="mr-3 w-4 h-4"
                    />
                    <div>
                      <span className="font-medium text-gray-700">Livrare</span>
                      <p className="text-sm text-gray-500">+100 MDL</p>
                    </div>
                  </label>
                </div>
              </div>

              {metoda === "livrare" && (
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500 space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Adresa livrare
                    </label>
                    {addressOptions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        <select
                          value={addressMode}
                          onChange={(e) => setAddressMode(e.target.value)}
                          className={`${inputs.default} flex-1`}
                        >
                          <option value="saved">Adrese salvate</option>
                          <option value="custom">Adresa noua</option>
                        </select>
                        {addressMode === "saved" && (
                          <select
                            value={selectedAddressIdx}
                            onChange={(e) => setSelectedAddressIdx(e.target.value)}
                            className={`${inputs.default} flex-1`}
                          >
                            {addressOptions.map((opt, idx) => (
                              <option key={`${opt.label}_${idx}`} value={String(idx)}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                    {addressMode === "saved" && selectedAddressIdx !== "" ? (
                      <div className="text-sm text-gray-600 border rounded-lg p-2 bg-white">
                        {adresa || "Selecteaza o adresa salvata."}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={adresa}
                        onChange={(e) => setAdresa(e.target.value)}
                        className={inputs.default}
                        placeholder="Strada, numar, bloc, apartament..."
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fereastra livrare (optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={windowStart}
                        onChange={(e) => setWindowStart(e.target.value)}
                        className={inputs.default}
                      />
                      <input
                        type="time"
                        value={windowEnd}
                        onChange={(e) => setWindowEnd(e.target.value)}
                        className={inputs.default}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Instructiuni curier
                    </label>
                    <textarea
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      className={`${inputs.default} min-h-[80px]`}
                      placeholder="Etaj, interfon, indicatii speciale..."
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subtotal (MDL)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                  className={inputs.default}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descriere desert / cerinte
                </label>
                <textarea
                  value={descriere}
                  onChange={(e) => setDescriere(e.target.value)}
                  className={`${inputs.default} min-h-[90px]`}
                  placeholder="Ex: Tort ciocolata 1kg, 8 persoane, mesaj: La multi ani!"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Note suplimentare
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputs.default} min-h-[80px]`}
                  placeholder="Detalii extra pentru patiser..."
                />
              </div>

              <div className="p-4 bg-pink-50 rounded-lg border-2 border-pink-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-pink-600">{total.toFixed(2)} MDL</span>
                </div>
                {metoda === "livrare" && (
                  <p className="text-sm text-gray-600 mt-2">Include taxa livrare 100 MDL</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !selectedDate || !time}
                className={`w-full ${buttons.primary} py-3 text-lg`}
              >
                {loading ? "Se proceseaza..." : "Confirma rezervarea"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
