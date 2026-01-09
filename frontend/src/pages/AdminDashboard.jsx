import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "/src/lib/api.js";

export default function AdminDashboard() {
  const [comenzi, setComenzi] = useState([]);
  const [rezervari, setRezervari] = useState([]);
  const [notificari, setNotificari] = useState([]);

  useEffect(() => {
    api.get("/comenzi").then((r) => setComenzi(Array.isArray(r.data) ? r.data : []));
    api.get("/rezervari").then((r) => setRezervari(Array.isArray(r.data) ? r.data : []));
    api.get("/notificari").then((r) => setNotificari(Array.isArray(r.data) ? r.data : []));
  }, []);

  const stats = useMemo(() => {
    const onlyOrders = comenzi.filter((c) => c._source !== "rezervare");
    const totalRevenue = onlyOrders.reduce((sum, c) => sum + Number(c.total || 0), 0);
    const byStatus = onlyOrders.reduce((acc, c) => {
      const key = c.status || "noua";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return {
      totalRevenue,
      totalOrders: onlyOrders.length,
      inWork: byStatus["in_lucru"] || 0,
      finished: byStatus["gata"] || 0,
      newOrders: byStatus["plasata"] || 0,
    };
  }, [comenzi]);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const rezervariAzi = rezervari.filter((r) => r.date === today).length;
  const rezervariMaine = rezervari.filter((r) => r.date === tomorrow).length;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Rezumat activitate si acces rapid</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/comenzi" className="px-3 py-2 rounded border">Comenzi</Link>
          <Link to="/admin/calendar" className="px-3 py-2 rounded border">Calendar</Link>
          <Link to="/admin/torturi" className="px-3 py-2 rounded border">Torturi</Link>
          <Link to="/admin/comenzi-personalizate" className="px-3 py-2 rounded border">Personalizate</Link>
          <Link to="/admin/fidelizare" className="px-3 py-2 rounded border">Fidelizare</Link>
          <Link to="/admin/albume" className="px-3 py-2 rounded border">Albume</Link>
          <Link to="/admin/production" className="px-3 py-2 rounded border">Productie</Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Comenzi noi</div>
          <div className="text-2xl font-bold">{stats.newOrders}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">In lucru</div>
          <div className="text-2xl font-bold">{stats.inWork}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Finalizate</div>
          <div className="text-2xl font-bold">{stats.finished}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Venituri</div>
          <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} MDL</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Rezervari</h2>
          <p>Azi: {rezervariAzi}</p>
          <p>Maine: {rezervariMaine}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Notificari rapide</h2>
          {notificari.slice(0, 5).map((n) => (
            <div key={n._id} className="text-sm text-gray-700 border-b py-1">
              {n.titlu || "Notificare"} - {n.mesaj}
            </div>
          ))}
          {notificari.length === 0 && <div className="text-sm text-gray-500">Nu exista notificari.</div>}
        </div>
      </div>
    </div>
  );
}
