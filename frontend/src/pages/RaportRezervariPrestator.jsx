import React, { useEffect, useState } from "react";
import api, { BASE_URL } from "/src/lib/api.js";

export default function RaportRezervariPrestator() {
  const [rezervari, setRezervari] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const userId =
    localStorage.getItem("userId") ||
    localStorage.getItem("utilizatorId");

  useEffect(() => {
    const fetchRezervari = async () => {
      const params = userId ? { clientId: userId } : undefined;
      const res = await api.get("/rezervari", { params });
      setRezervari(Array.isArray(res.data) ? res.data : []);
    };
    fetchRezervari();
  }, [userId]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    window.open(`${BASE_URL}/rapoarte-rezervari/csv${suffix}`, "_blank");
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Raport rezervari</h2>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-sm">
          De la
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="block border p-2 rounded mt-1"
          />
        </label>
        <label className="text-sm">
          Pana la
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="block border p-2 rounded mt-1"
          />
        </label>
        <button
          onClick={handleExportCSV}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Export CSV
        </button>
      </div>
      <table className="w-full border">
        <thead>
          <tr>
            <th>ID</th>
            <th>Data</th>
            <th>Interval</th>
            <th>Metoda</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rezervari.map((r) => (
            <tr key={r._id}>
              <td>{r._id}</td>
              <td>{r.date || "-"}</td>
              <td>{r.timeSlot || "-"}</td>
              <td>{r.handoffMethod || "-"}</td>
              <td>{r.total || 0}</td>
              <td>{r.status || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
