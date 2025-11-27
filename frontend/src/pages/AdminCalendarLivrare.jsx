// frontend/src/pages/AdminCalendarLivrare.jsx
import React, { useEffect, useState } from "react";
import api from "/src/lib/api.js";

export default function AdminCalendarLivrare() {
    const [calendar, setCalendar] = useState({});
    const [selectedDate, setSelectedDate] = useState("");

    async function fetchCalendar(dateParam = "") {
        try {
            const query = dateParam ? `?date=${dateParam}` : "";
            // 🔹 backend: /api/calendar-admin?date=YYYY-MM-DD
            const res = await api.get(`/calendar-admin${query}`);
            const data = res.data; // { date, agenda }

            const newCalendar = {};

            if (data?.date && Array.isArray(data.agenda)) {
                // Vom pune totul pe cheia data: [entry1, entry2...]
                newCalendar[data.date] = data.agenda.map((entry) => {
                    const src = entry.item || {};
                    if (entry.type === "order") {
                        // Comanda din modelul Comanda
                        return {
                            _id: src._id,
                            oraLivrare: src.oraLivrare || src.hour || "",
                            metodaLivrare: src.metodaLivrare || src.handoffMethod || "",
                            produse: src.produse || src.items || [],
                            adresaLivrare: src.adresaLivrare || src.deliveryAddress || "",
                            preferinte: src.preferinte || "",
                            status: src.statusComanda || src.status || "",
                        };
                    } else {
                        // Rezervare din modelul Rezervare
                        return {
                            _id: src._id,
                            timeSlot: src.timeSlot,
                            handoffMethod: src.handoffMethod,
                            produse: [],
                            adresaLivrare: src.deliveryAddress || "",
                            preferinte: "",
                            status: src.status || src.handoffStatus || "",
                        };
                    }
                });
            }

            setCalendar(newCalendar);
        } catch (e) {
            console.error("Eroare la preluarea calendarului:", e);
            setCalendar({});
        }
    }

    async function marcheazaCaLivrata(comandaId) {
        if (!comandaId) return;
        if (!window.confirm("Marchezi această comandă ca livrată?")) return;
        try {
            await api.patch(`/comenzi/${comandaId}/status`, { status: "livrata" });
            await fetchCalendar(selectedDate);
            alert("✅ Comanda marcată ca livrată!");
        } catch (e) {
            console.error("Eroare la marcarea comenzii:", e);
            alert("❌ Eroare la actualizare status.");
        }
    }

    useEffect(() => {
        fetchCalendar();
    }, []);

    const zile = Object.keys(calendar);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">📅 Calendar livrări - Admin</h2>

            <div className="mb-4">
                <label className="mr-2 font-semibold">Filtrează după dată:</label>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border px-2 py-1 rounded mr-2"
                />
                <button
                    onClick={() => fetchCalendar(selectedDate)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                    Filtrează
                </button>
                <button
                    onClick={() => {
                        setSelectedDate("");
                        fetchCalendar();
                    }}
                    className="bg-gray-500 text-white px-3 py-1 rounded ml-2"
                >
                    Reset
                </button>
            </div>

            {zile.length === 0 ? (
                <p>Nu există comenzi în calendar.</p>
            ) : (
                zile.map((data) => (
                    <div key={data} className="mb-6 border p-4 rounded shadow">
                        <h3 className="text-xl font-semibold mb-2">{data}</h3>
                        {(calendar[data] || []).map((c, idx) => (
                            <div key={c._id || idx} className="border-b py-2 text-left mb-4">
                                <p>
                                    ⏰ Ora livrare:{" "}
                                    <strong>{c.oraLivrare || c.timeSlot || "-"}</strong>
                                </p>
                                <p>
                                    🚚 Metodă livrare:{" "}
                                    <strong>{c.metodaLivrare || c.handoffMethod || "-"}</strong>
                                </p>

                                {!!c.produse?.length && (
                                    <>
                                        <p>🎂 <strong>Produse comandate:</strong></p>
                                        <ul className="list-disc list-inside ml-4 mb-2">
                                            {c.produse.map((p, i) => (
                                                <li key={i}>
                                                    {p.numeProdus || p.name || p.nume || "Produs"} —{" "}
                                                    {p.cantitate || p.qty || 1} buc.
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {(c.metodaLivrare === "livrare" ||
                                    c.handoffMethod === "delivery") && (
                                        <p>
                                            📍 Adresa livrare:{" "}
                                            <strong>{c.adresaLivrare || "-"}</strong>
                                        </p>
                                    )}

                                {c.preferinte && <p>📝 Preferințe: {c.preferinte}</p>}

                                <p>
                                    📦 Status: <strong>{c.status || "-"}</strong>
                                </p>

                                {c.status !== "livrata" && (
                                    <button
                                        onClick={() => marcheazaCaLivrata(c._id)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mt-2"
                                    >
                                        ✅ Marchează ca livrată
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}
