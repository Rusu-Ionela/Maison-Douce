// ðŸ“ src/pages/AdminRapoarte.jsx â€” versiune completÄƒ, cu export CSV via backend & grafice robuste

import React, { useEffect, useMemo, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function AdminRapoarte() {
    const [comenzi, setComenzi] = useState([]);
    const [comenziPeLuna, setComenziPeLuna] = useState([]);
    const [topProduse, setTopProduse] = useState([]);
    const [topClienti, setTopClienti] = useState([]);

    // filtre export
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [status, setStatus] = useState("");

    // pentru export rezervÄƒri (opÈ›ional)
    const [prestator, setPrestator] = useState(localStorage.getItem("userId") || "");

    useEffect(() => {
        (async () => {
            try {
                // 1) Comenzi (admin sau general, dupÄƒ cum ai protejat ruta)
                const resComenzi = await api.get("/comenzi");
                setComenzi(resComenzi.data || []);

                // 2) Comenzi lunare
                try {
                    const resCL = await api.get("/rapoarte/comenzi-lunare");
                    setComenziPeLuna(resCL.data || []);
                } catch (e) {
                    console.warn("Comenzi-lunare indisponibil:", e?.response?.data || e.message);
                }

                // 3) Top produse
                try {
                    const resTopP = await api.get("/rapoarte/top-produse");
                    setTopProduse(resTopP.data || []);
                } catch (e) {
                    console.warn("Top produse indisponibil:", e?.response?.data || e.message);
                }

                // 4) Top clienÈ›i
                try {
                    const resTopC = await api.get("/rapoarte/top-clienti");
                    setTopClienti(resTopC.data || []);
                } catch (e) {
                    console.warn("Top clienÈ›i indisponibil:", e?.response?.data || e.message);
                }
            } catch (err) {
                console.error("Eroare la Ã®ncÄƒrcare rapoarte:", err);
            }
        })();
    }, []);

    // ====== Helpers sigure pe cÃ¢mpuri ======
    const safeDate = (x) => {
        const d = x ? new Date(x) : null;
        return d && !Number.isNaN(d.valueOf()) ? d : null;
    };

    const comenziForRevenue = useMemo(() => {
        // folosim dataLivrare (dacÄƒ existÄƒ) sau createdAt, iar valoarea total/subtotal
        return (comenzi || []).map((c) => ({
            date:
                safeDate(c.dataLivrare)?.toLocaleDateString("ro-RO") ||
                safeDate(c.createdAt)?.toLocaleDateString("ro-RO") ||
                "",
            value: Number(c.total ?? c.subtotal ?? 0),
        }));
    }, [comenzi]);

    // ====== Grafic venituri (bar) ======
    const dataVenituri = useMemo(() => {
        const labels = comenziForRevenue.map((x) => x.date);
        const data = comenziForRevenue.map((x) => x.value);
        return {
            labels,
            datasets: [
                {
                    label: "Venituri (MDL)",
                    data,
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                },
            ],
        };
    }, [comenziForRevenue]);

    const optionsVenituri = {
        responsive: true,
        plugins: {
            legend: { position: "top" },
            title: { display: true, text: "Grafic Venituri Comenzi" },
        },
    };

    // ====== Grafic comenzi pe lunÄƒ (bar) ======
    const dataComenziLuna = useMemo(() => {
        const labels = (comenziPeLuna || []).map((c) => c._id || c.month || "?");
        return {
            labels,
            datasets: [
                {
                    label: "NumÄƒr comenzi",
                    data: (comenziPeLuna || []).map((c) => Number(c.nrComenzi ?? c.count ?? 0)),
                    backgroundColor: "rgba(153, 102, 255, 0.6)",
                },
                {
                    label: "VÃ¢nzÄƒri totale (MDL)",
                    data: (comenziPeLuna || []).map((c) => Number(c.totalVanzari ?? c.total ?? 0)),
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                },
            ],
        };
    }, [comenziPeLuna]);

    const optionsComenziLuna = {
        responsive: true,
        plugins: {
            legend: { position: "top" },
            title: { display: true, text: "Comenzi pe lunÄƒ" },
        },
    };

    // ====== Pie chart top produse ======
    const dataPie = useMemo(() => {
        const labels = (topProduse || []).map((item) => item.nume || item.name || `Produs ${item._id}`);
        const values = (topProduse || []).map((item) => Number(item.count || item.qty || 0));
        return {
            labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: [
                        "rgba(255, 99, 132, 0.6)",
                        "rgba(54, 162, 235, 0.6)",
                        "rgba(255, 206, 86, 0.6)",
                        "rgba(75, 192, 192, 0.6)",
                        "rgba(153, 102, 255, 0.6)",
                        "rgba(255, 159, 64, 0.6)",
                    ],
                },
            ],
        };
    }, [topProduse]);

    // ====== Export CSV Comenzi ======
    const exportComenziHref = useMemo(() => {
        const qs = new URLSearchParams();
        if (from) qs.set("from", from);
        if (to) qs.set("to", to);
        if (status) qs.set("status", status);
        const base = (api.defaults.baseURL || BASE_URL || "").replace(/\/$/, "");
        return `${base}/comenzi/export/csv${qs.toString() ? "?" + qs.toString() : ""}`;
    }, [from, to, status]);

    // ====== Export CSV RezervÄƒri (bonus din /rapoarte/rezervari/export) ======
    const exportRezervariHref = useMemo(() => {
        const qs = new URLSearchParams();
        if (from) qs.set("from", from);
        if (to) qs.set("to", to);
        if (prestator) qs.set("prestator", prestator);
        const base = (api.defaults.baseURL || BASE_URL || "").replace(/\/$/, "");
        return `${base}/rapoarte/rezervari/export${qs.toString() ? "?" + qs.toString() : ""}`;
    }, [from, to, prestator]);

    return (
        <div className="p-6 container">
            <h2 className="text-2xl font-bold mb-6">ðŸ“Š Rapoarte Admin</h2>

            {/* Filtre export CSV */}
            <div className="card mb-6" style={{ display: "grid", gap: 12 }}>
                <div
                    className="grid"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}
                >
                    <label className="flex flex-col">
                        <span>De la</span>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </label>

                    <label className="flex flex-col">
                        <span>PÃ¢nÄƒ la</span>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </label>

                    <label className="flex flex-col">
                        <span>Status (comenzi)</span>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">(toate)</option>
                            <option value="in_asteptare">Ã®n aÈ™teptare</option>
                            <option value="platita">plÄƒtitÄƒ</option>
                            <option value="predat_curierului">predat curierului</option>
                            <option value="ridicat_client">ridicat de client</option>
                            <option value="livrata">livratÄƒ</option>
                            <option value="anulata">anulatÄƒ</option>
                        </select>
                    </label>

                    <label className="flex flex-col">
                        <span>Prestator (rezervÄƒri)</span>
                        <input
                            type="text"
                            placeholder="prestatorId"
                            value={prestator}
                            onChange={(e) => setPrestator(e.target.value)}
                        />
                    </label>
                </div>

                <div className="flex gap-3 flex-wrap">
                    <a
                        href={exportComenziHref}
                        className="inline-flex items-center px-4 py-2 rounded-full bg-[#d8e5cf] hover:bg-[#b7d2b3] border border-[#c7b07a] no-underline text-[#2c3a2f]"
                    >
                        Export CSV Comenzi
                    </a>

                    <a
                        href={exportRezervariHref}
                        className="inline-flex items-center px-4 py-2 rounded-full bg-[#cfe1ff] hover:bg-[#b9d0ff] border border-[#9cb7ff] no-underline text-[#102a56]"
                    >
                        Export CSV RezervÄƒri
                    </a>
                </div>
            </div>

            {/* Comenzi pe lunÄƒ */}
            {comenziPeLuna?.length > 0 && (
                <div className="mb-8 card">
                    <h3 className="text-xl font-semibold mb-2">ðŸ“… Comenzi pe lunÄƒ</h3>
                    <Bar data={dataComenziLuna} options={optionsComenziLuna} />
                </div>
            )}

            {/* Top produse */}
            {topProduse?.length > 0 && (
                <div className="mb-8 card">
                    <h3 className="text-xl font-semibold mb-2">ðŸŽ‚ Top produse vÃ¢ndute</h3>
                    <Pie data={dataPie} />
                </div>
            )}

            {/* Venituri */}
            <div className="mb-8 card">
                <h3 className="text-xl font-semibold mb-2">ðŸ“ˆ Grafic venituri comenzi</h3>
                <Bar data={dataVenituri} options={optionsVenituri} />
            </div>

            {/* Top clienÈ›i */}
            {topClienti?.length > 0 && (
                <div className="card">
                    <h3 className="text-xl font-semibold mb-2">ðŸ† Top clienÈ›i</h3>
                    <ul className="list-disc ml-6">
                        {topClienti.map((client) => (
                            <li key={client.clientId || client._id}>
                                {client.nume || `Client ID: ${client.clientId || client._id}`}
                                {" â€” Total: "}
                                {Number(client.total ?? client.totalCheltuit ?? 0)} MDL
                                {" â€” Comenzi: "}
                                {Number(client.count ?? client.nrComenzi ?? 0)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

