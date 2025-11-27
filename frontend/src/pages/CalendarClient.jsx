// frontend/src/pages/CalendarClient.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAvailability, reserveSlot } from "../api/calendar";
import SlotPicker from "../components/SlotPicker";
import { useAuth } from "../context/AuthContext";
import { buttons, inputs, cards } from "../lib/tailwindComponents";

export default function CalendarClient() {
    const { user } = useAuth() || {};
    const navigate = useNavigate();

    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [metoda, setMetoda] = useState("ridicare"); // 'ridicare' | 'livrare'
    const [adresa, setAdresa] = useState("");
    const [slots, setSlots] = useState(null);
    const [subtotal, setSubtotal] = useState(0); // poți lega de coș mai târziu
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [success, setSuccess] = useState("");

    const prestatorId = import.meta.env.VITE_PRESTATOR_ID || "default";

    // încărcăm sloturi pentru următoarele 14 zile
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setErr("");

                // 👇 deocamdată nu trimitem from/to, luăm toate sloturile
                const data = await getAvailability(prestatorId, {});

                setSlots(data); // { slots: [...] }
            } catch (e) {
                console.error("getAvailability error", e);
                setErr(
                    e?.response?.data?.message || "Nu s-au putut încărca sloturile."
                );
            } finally {
                setLoading(false);
            }
        })();
    }, [prestatorId]);


    async function handleReserve(e) {
        e.preventDefault();
        setErr("");
        setSuccess("");

        if (!user?._id) {
            setErr("Trebuie să fii autentificat pentru a face o rezervare.");
            // poți și redirecta:
            // return navigate("/login");
            return;
        }

        if (!date || !time) {
            setErr("Selectează data și ora.");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                clientId: user._id,
                prestatorId,
                date,
                time,
                metoda,
                adresaLivrare: metoda === "livrare" ? adresa : "",
                subtotal: Number(subtotal || 0),
            };

            const data = await reserveSlot(payload);

            setSuccess("Rezervarea a fost creată cu succes!");
            console.log("Rezervare răspuns:", data);

            // aici poți face redirect mai târziu, de ex:
            // navigate("/profil/comenzi");
        } catch (e) {
            console.error("reserveSlot error", e);
            setErr(e?.response?.data?.message || "Rezervarea a eșuat.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                        Rezervă un interval
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Alege o dată și oră potrivite pentru comanda ta
                    </p>
                </div>

                {/* Alert Messages */}
                {err && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                        <p className="text-red-700 font-semibold">Eroare</p>
                        <p className="text-red-600 text-sm">{err}</p>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                        <p className="text-green-700 font-semibold">Succes!</p>
                        <p className="text-green-600 text-sm">{success}</p>
                    </div>
                )}

                {/* Form Card */}
                <div className={cards.elevated}>
                    <form onSubmit={handleReserve} className="space-y-6">
                        {/* Data */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                📅 Data
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    setTime("");
                                }}
                                className={inputs.default}
                            />
                        </div>

                        {/* Sloturi / ore */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                ⏰ Ora
                            </label>
                            {loading && !slots && (
                                <div className="text-center py-4 text-gray-500">
                                    <p>Se încarcă intervalele...</p>
                                </div>
                            )}
                            {slots && (
                                <SlotPicker
                                    slots={slots}
                                    date={date}
                                    value={time}
                                    onChange={setTime}
                                />
                            )}
                        </div>

                        {/* Metoda de preluare */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                🚗 Mod de preluare
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
                                    <span className="font-medium text-gray-700">
                                        Ridicare de la patiserie
                                    </span>
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
                                        <span className="font-medium text-gray-700">
                                            Livrare
                                        </span>
                                        <p className="text-sm text-gray-500">+100 MDL</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Adresa livrare (dacă e cazul) */}
                        {metoda === "livrare" && (
                            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    📍 Adresă livrare
                                </label>
                                <input
                                    type="text"
                                    value={adresa}
                                    onChange={(e) => setAdresa(e.target.value)}
                                    className={inputs.default}
                                    placeholder="Stradă, număr, bloc, apartament..."
                                />
                            </div>
                        )}

                        {/* Subtotal */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                💰 Subtotal (MDL)
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

                        {/* Total */}
                        <div className="p-4 bg-pink-50 rounded-lg border-2 border-pink-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-semibold">Total:</span>
                                <span className="text-2xl font-bold text-pink-600">
                                    {(Number(subtotal || 0) + (metoda === "livrare" ? 100 : 0)).toFixed(2)} MDL
                                </span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !date || !time}
                            className={`w-full ${buttons.primary} py-3 text-lg`}
                        >
                            {loading ? "⏳ Se procesează..." : "✓ Confirmă rezervarea"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
