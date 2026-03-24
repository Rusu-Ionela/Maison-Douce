import React, { useEffect, useState } from "react";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";
import { isStaffRole } from "../lib/roles";

function extractFilename(contentDisposition, fallback) {
  const value = String(contentDisposition || "");
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  const plain = value.match(/filename="?([^";]+)"?/i);
  if (plain?.[1]) return plain[1];
  return fallback;
}

export default function RaportRezervariPrestator() {
  const { user } = useAuth() || {};
  const [rezervari, setRezervari] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const userId = user?._id || user?.id || null;
  const isStaff = isStaffRole(user?.rol || user?.role);

  useEffect(() => {
    const fetchRezervari = async () => {
      const params = !isStaff && userId ? { clientId: userId } : undefined;
      const res = await api.get("/rezervari", { params });
      setRezervari(Array.isArray(res.data) ? res.data : []);
    };
    fetchRezervari();
  }, [userId, isStaff]);

  const handleExportCSV = async () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    setMsg("");
    try {
      const res = await api.get("/rapoarte-rezervari/csv", {
        params,
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: res.headers?.["content-type"] || "text/csv;charset=utf-8",
      });
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = extractFilename(
        res.headers?.["content-disposition"],
        "raport-rezervari.csv"
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
    } catch (e) {
      setMsg(e?.response?.data?.message || "Nu s-a putut exporta CSV.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Raport rezervari</h2>
      {msg && <div className="text-rose-700 mb-3">{msg}</div>}
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
