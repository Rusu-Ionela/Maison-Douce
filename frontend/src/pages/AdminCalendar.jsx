// frontend/src/pages/AdminCalendar.jsx
import React, { useState, useEffect } from "react";
import api from "../lib/api.js";
import { buttons, inputs, cards, badges } from "../lib/tailwindComponents";

export default function AdminCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");

  const dateStr = selectedDate.toISOString().split("T")[0];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [slotsRes, reservationsRes] = await Promise.all([
          api.get(`/calendar/availability/default`, {
            params: { from: dateStr, to: dateStr },
          }),
          api.get(`/calendar/admin/${dateStr}`),
        ]);

        setSlots(slotsRes.data.slots || []);
        const rez =
          reservationsRes.data?.rezervari ||
          reservationsRes.data ||
          [];
        setReservations(rez);
      } catch (err) {
        console.error(err);
        setError("Eroare la incarcarea datelor");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateStr]);

  const addTimeSlot = async () => {
    try {
      const time = prompt("Introdu ora (HH:mm):");
      if (!time) return;

      await api.post("/calendar/availability/default", {
        slots: [{ date: dateStr, time, capacity: 1 }],
      });

      const { data } = await api.get("/calendar/availability/default", {
        params: { from: dateStr, to: dateStr },
      });
      setSlots(data.slots || []);
    } catch (err) {
      console.error(err);
      setError("Eroare la adaugarea slotului");
    }
  };

  const onExport = () => {
    window.open(`/api/calendar/admin/${dateStr}/export`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Calendar Admin
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Selecteaza data
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className={inputs.default}
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={addTimeSlot}
                className={`${buttons.secondary} flex items-center gap-2`}
              >
                + Adauga interval
              </button>
              <button
                onClick={onExport}
                className={`${buttons.success} flex items-center gap-2`}
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 font-semibold">Eroare</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Se incarca...</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* SLOTURI */}
            <div className={`lg:col-span-1 ${cards.elevated}`}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Intervale</h2>
              {slots.length === 0 ? (
                <p className="text-gray-500 text-center py-6">
                  Nu exista sloturi pentru aceasta zi.
                </p>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={`${slot.date}_${slot.time}`}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        slot.free > 0
                          ? "border-green-300 bg-green-50"
                          : "border-red-300 bg-red-50"
                      }`}
                    >
                      <div className="font-semibold text-gray-900 text-lg">
                        {slot.time}
                      </div>
                      <div className="flex justify-between mt-2 text-sm">
                        <span className="text-gray-700">
                          <span className="font-semibold">{slot.used}</span>/
                          {slot.capacity} ocupate
                        </span>
                        <span
                          className={`font-semibold ${
                            slot.free > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {slot.free} libere
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* REZERVARI + COMENZI */}
            <div className="lg:col-span-2">
              <div className={cards.elevated}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Rezervari / Comenzi -{" "}
                  {selectedDate.toLocaleDateString("ro-RO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h2>

                {reservations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg">
                      Nu exista intrari pentru aceasta data
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reservations.map((res) => (
                      <div
                        key={res._id}
                        className="border-l-4 border-pink-500 bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg font-semibold text-gray-900">
                                {res.timeSlot || res.startTime || "-"}
                              </span>
                              <span className="text-sm font-medium text-gray-600">
                                -
                              </span>
                              <span className="text-gray-700 font-medium">
                                {res.clientName || "Client"}
                              </span>
                              <span className={badges.info}>
                                {res.type === "comanda" ? "Comanda" : "Rezervare"}
                              </span>
                            </div>

                            {res.itemsSummary && (
                              <p className="text-sm text-gray-700 mb-2">
                                {res.itemsSummary}
                              </p>
                            )}

                            <div className="text-sm text-gray-600 mb-2">
                              {res.handoffMethod === "delivery" ? (
                                <div className="flex items-start gap-2">
                                  <span>🚚</span>
                                  <div>
                                    <p className="font-medium">Livrare</p>
                                    <p className="text-gray-500">
                                      {res.deliveryAddress || "-"}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>🏬</span>
                                  <p>Ridicare din laborator</p>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 flex-wrap">
                              {res.paymentStatus === "paid" ? (
                                <span className={badges.success}>Platit</span>
                              ) : (
                                <span className={badges.warning}>Neplatit</span>
                              )}
                              <span className={badges.info}>
                                {res.status || res.handoffStatus || "-"}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-bold text-pink-600">
                              {res.total} MDL
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {res.handoffStatus}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

