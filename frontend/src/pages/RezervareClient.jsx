// frontend/src/pages/RezervareClient.jsx
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import api from "../lib/api.js";
import { authStorage } from "../lib/authStorage.js";

const PRESTATOR_ID = "default"; // folosim același ID ca în CalendarPrestator
const DELIVERY_FEE = 100;       // MDL

export default function RezervareClient() {
    const { userId, userNume, userEmail } = authStorage.getUser();

    const [zi, setZi] = useState(null);
    const [ora, setOra] = useState("");
    const [sloturi, setSloturi] = useState([]);
    const [metodaLivrare, setMetodaLivrare] = useState("pickup");
    const [adresa, setAdresa] = useState("");
    const [telefon, setTelefon] = useState("");
    const [subtotal, setSubtotal] = useState(0); // poți lega ulterior de coș / tort
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [success, setSuccess] = useState(false);

    // când se schimbă ziua → luăm sloturile
    useEffect(() => {
        if (!zi) return;

        (async () => {
            try {
                const dateStr = zi.toISOString().split("T")[0];
                const res = await api.get(`/calendar/availability/${PRESTATOR_ID}`, {
                    params: { from: dateStr, to: dateStr, hideFull: true },
                });
                setSloturi(res.data?.slots || []);
            } catch (err) {
                console.error("Eroare disponibilitate:", err);
                setSloturi([]);
            }
        })();
    }, [zi]);

    const handleRezerva = async () => {
        setMsg("");
        setSuccess(false);

        if (!userId) {
            setMsg("❌ Trebuie să te autentifici!");
            return;
        }
        if (!zi) {
            setMsg("❌ Alege o dată!");
            return;
        }
        if (!ora) {
            setMsg("❌ Alege o oră!");
            return;
        }
        if (!telefon.trim()) {
            setMsg("❌ Introdu numărul de telefon!");
            return;
        }
        if (metodaLivrare === "delivery" && !adresa.trim()) {
            setMsg("❌ Introdu adresa pentru livrare!");
            return;
        }

        setLoading(true);
        try {
            const dateStr = zi.toISOString().split("T")[0];
            const totalMDL = subtotal + (metodaLivrare === "delivery" ? DELIVERY_FEE : 0);

            // mapăm pe API-ul tău /api/calendar/reserve
            const payload = {
                clientId: userId,
                prestatorId: PRESTATOR_ID,
                date: dateStr,
                time: ora, // "HH:mm"
                metoda: metodaLivrare === "delivery" ? "livrare" : "ridicare",
                adresaLivrare: metodaLivrare === "delivery" ? adresa : "",
                subtotal: Number(subtotal || 0),
                tortId: null,         // poți lega ulterior un tort concret
                customDetails: null,  // sau info din constructor tort
            };

            const res = await api.post("/calendar/reserve", payload);

            if (res.data?.ok) {
                setSuccess(true);
                const rezervareId = res.data?.rezervareId;
                setMsg("✅ Rezervare creată! Poți continua la plată / profil.");

                // dacă vrei să mergi la plată pe bază de rezervare:
                // window.location.href = `/plata?rezervareId=${rezervareId}`;
            } else {
                setMsg("❌ Rezervarea nu a fost creată.");
            }
        } catch (err) {
            console.error("Eroare rezervare:", err);
            setMsg(`❌ Eroare: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const totalMDL = subtotal + (metodaLivrare === "delivery" ? DELIVERY_FEE : 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-red-50 p-6">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold text-center mb-2">📅 Rezervă-ți Tortul</h1>
                <p className="text-center text-gray-600 mb-8">
                    Alege data, ora și metoda de livrare preferată
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* STÂNGA: CALENDAR */}
                    <div className="lg:col-span-1 bg-white rounded-2xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold mb-4">📆 Selectează Data</h2>
                        <Calendar
                            value={zi}
                            onChange={setZi}
                            minDate={new Date()}
                            maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
                            className="w-full"
                        />
                        {zi && (
                            <div className="mt-4 p-4 bg-green-100 rounded-lg border-2 border-green-400">
                                <p className="text-xs text-green-700">✅ Data selectată:</p>
                                <p className="font-bold text-green-800">
                                    {zi.toLocaleDateString("ro-RO", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* DREAPTA: DETALII */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* ORA */}
                        {zi && sloturi.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-2xl p-6">
                                <label className="block text-lg font-bold mb-3">⏰ Selectează Ora</label>
                                <select
                                    value={ora}
                                    onChange={(e) => setOra(e.target.value)}
                                    className="w-full border-2 border-pink-200 p-4 rounded-xl focus:border-pink-500 focus:outline-none text-lg"
                                >
                                    <option value="">-- Alege ora --</option>
                                    {sloturi.map((slot, idx) => (
                                        <option key={idx} value={slot.time}>
                                            {slot.time} ({slot.free ?? Math.max(0, slot.capacity - slot.used)} locuri libere)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* CONTACT */}
                        <div className="bg-white rounded-2xl shadow-2xl p-6">
                            <label className="block text-lg font-bold mb-3">📞 Date Contact</label>
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="text-sm font-semibold block mb-1">Nume</label>
                                    <input
                                        type="text"
                                        value={userNume || ""}
                                        disabled
                                        className="w-full border-2 border-gray-200 p-3 rounded-lg bg-gray-100 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold block mb-1">Telefon *</label>
                                    <input
                                        type="tel"
                                        placeholder="+373 XXXXXXX"
                                        value={telefon}
                                        onChange={(e) => setTelefon(e.target.value)}
                                        className="w-full border-2 border-pink-200 p-3 rounded-lg focus:border-pink-400 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* LIVRARE */}
                        <div className="bg-white rounded-2xl shadow-2xl p-6">
                            <label className="block text-lg font-bold mb-4">🚚 Metodă Livrare</label>
                            <div className="space-y-3">
                                {[
                                    { val: "pickup", label: "🏪 Ridicare din laborator (GRATIS)", fee: 0 },
                                    { val: "delivery", label: `🚗 Livrare la domiciliu (+${DELIVERY_FEE} MDL)`, fee: DELIVERY_FEE },
                                ].map((opt) => (
                                    <label
                                        key={opt.val}
                                        className={`flex items-center p-4 rounded-xl cursor-pointer border-2 transition ${metodaLivrare === opt.val
                                                ? "border-pink-500 bg-pink-50"
                                                : "border-gray-200 bg-white hover:border-pink-300"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="metoda"
                                            value={opt.val}
                                            checked={metodaLivrare === opt.val}
                                            onChange={(e) => setMetodaLivrare(e.target.value)}
                                            className="w-5 h-5 mr-4"
                                        />
                                        <span className="font-semibold flex-1">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* ADRESĂ (dacă delivery) */}
                        {metodaLivrare === "delivery" && (
                            <div className="bg-white rounded-2xl shadow-2xl p-6 border-2 border-orange-200">
                                <label className="block text-lg font-bold mb-3">📮 Adresă Livrare *</label>
                                <textarea
                                    value={adresa}
                                    onChange={(e) => setAdresa(e.target.value)}
                                    placeholder="str. Exemplu, nr. 123, apt. 456, Chișinău, MD 2012"
                                    className="w-full border-2 border-orange-200 p-4 rounded-lg h-24 focus:border-orange-400 focus:outline-none"
                                    required
                                />
                            </div>
                        )}

                        {/* PREȚ TOTAL */}
                        <div className="bg-gradient-to-r from-pink-100 to-orange-100 rounded-2xl shadow-xl p-6 border-2 border-pink-300">
                            <div className="space-y-2">
                                <div className="flex justify-between text-lg">
                                    <span>Subtotal:</span>
                                    <span className="font-bold">{subtotal} MDL</span>
                                </div>
                                {metodaLivrare === "delivery" && (
                                    <div className="flex justify-between text-lg text-orange-700">
                                        <span>Taxa Livrare:</span>
                                        <span className="font-bold">+{DELIVERY_FEE} MDL</span>
                                    </div>
                                )}
                                <div className="border-t border-pink-300 pt-2 flex justify-between text-2xl">
                                    <span className="font-bold">TOTAL:</span>
                                    <span className="font-bold text-pink-600">{totalMDL} MDL</span>
                                </div>
                            </div>
                        </div>

                        {/* MESAJ */}
                        {msg && (
                            <div
                                className={`p-4 rounded-lg font-bold text-center ${success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    }`}
                            >
                                {msg}
                            </div>
                        )}

                        {/* BUTON */}
                        <button
                            onClick={handleRezerva}
                            disabled={loading || !zi || !ora || !telefon.trim()}
                            className={`w-full py-4 px-6 rounded-xl font-bold text-white text-xl transition transform ${loading || !zi || !ora || !telefon.trim()
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 active:scale-95 shadow-lg"
                                }`}
                        >
                            {loading ? "⏳ Se procesează..." : "✅ Confirmă Rezervarea"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
