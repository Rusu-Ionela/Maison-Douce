import React, { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function RezervareClient({ prestatorId, items = [] }) {
    const [date, setDate] = useState(new Date());
    const [slots, setSlots] = useState([]);
    const [time, setTime] = useState("");
    const [deliveryMethod, setDeliveryMethod] = useState("pickup");
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    const yyyyMMdd = useMemo(() => {
        const d = new Date(date);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
    }, [date]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!prestatorId) return;
            setLoading(true);
            try {
                const { data } = await api.get(`/api/rezervari/availability`, {
                    params: { prestatorId, date: yyyyMMdd },
                });
                if (!cancelled) {
                    setSlots(data?.slots || []);
                    setTime("");
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) setSlots([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [prestatorId, yyyyMMdd]);

    async function createReservation() {
        try {
            if (!time) return alert("Alege o orÄƒ.");
            if (deliveryMethod === "delivery" && !address.trim()) return alert("Introdu adresa de livrare.");

            setCreating(true);
            const clientId = localStorage.getItem("userId") || "CLIENT_ID_AUTENTIFICAT";
            const payload = {
                clientId, prestatorId, items, date: yyyyMMdd, time,
                deliveryMethod, address: deliveryMethod === "delivery" ? address : undefined,
            };
            await api.post(`/api/rezervari`, payload);
            alert("Rezervare creatÄƒ!");
        } catch (e) {
            alert(e?.response?.data?.message || "Eroare la creare rezervare");
        } finally { setCreating(false); }
    }

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold">Rezervare</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm mb-2">Alege data</label>
                    <Calendar value={date} onChange={setDate} />
                </div>
                <div>
                    <label className="block text-sm mb-2">Alege ora</label>
                    <select className="w-full border rounded p-2" value={time} onChange={e => setTime(e.target.value)} disabled={loading}>
                        <option value="">{loading ? "Se Ã®ncarcÄƒâ€¦" : "â€” selecteazÄƒ â€”"}</option>
                        {!loading && slots.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <div className="mt-4 space-y-2">
                        <div className="font-medium">MetodÄƒ de preluare</div>
                        <div className="flex items-center gap-4">
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" name="deliveryMethod" value="pickup" checked={deliveryMethod === "pickup"} onChange={() => setDeliveryMethod("pickup")} />
                                Pick-up
                            </label>
                            <label className="inline-flex items-center gap-2">
                                <input type="radio" name="deliveryMethod" value="delivery" checked={deliveryMethod === "delivery"} onChange={() => setDeliveryMethod("delivery")} />
                                Livrare (+100 MDL)
                            </label>
                        </div>

                        {deliveryMethod === "delivery" && (
                            <div className="mt-2">
                                <label className="block text-sm mb-2">AdresÄƒ livrare</label>
                                <input className="w-full border rounded p-2" placeholder="StradÄƒ, nr., bloc, apartamentâ€¦" value={address} onChange={e => setAddress(e.target.value)} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {items?.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-2">Produse</h2>
                    <ul className="list-disc pl-6">
                        {items.map((it, idx) => <li key={`${it.nume}-${idx}`}>{it.nume} Ã— {it.cantitate}</li>)}
                    </ul>
                </div>
            )}

            <div className="flex items-center gap-3">
                <button type="button" onClick={createReservation} className="border px-4 py-2 rounded"
                    disabled={creating || !time || (deliveryMethod === "delivery" && !address.trim())}>
                    {creating ? "Se salveazÄƒâ€¦" : "ConfirmÄƒ rezervarea"}
                </button>
                <div className="text-sm text-gray-500">
                    Data: <span className="font-mono">{yyyyMMdd}</span>{time ? ` â€¢ Ora: ${time}` : ""}
                </div>
            </div>
        </div>
    );
}

