import { useEffect, useMemo, useState } from "react";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";

export default function Fidelizare() {
  const { user } = useAuth() || {};
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user?._id) return;
    api
      .get(`/fidelizare/client/${user._id}`)
      .then((res) => setWallet(res.data))
      .catch(() => setWallet(null));
    api
      .get(`/comenzi/client/${user._id}`)
      .then((res) => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOrders([]));
  }, [user?._id]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const favorites = {};
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const name = it.name || it.nume || "Produs";
        favorites[name] = (favorites[name] || 0) + (it.qty || it.cantitate || 1);
      });
    });
    const top = Object.entries(favorites)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
    return { totalOrders, top };
  }, [orders]);

  const economii = useMemo(() => {
    if (!wallet?.istoric) return 0;
    return wallet.istoric
      .filter((h) => h.tip === "redeem")
      .reduce((sum, h) => sum + (h.descriere?.match(/-([0-9]+)/)?.[1] ? Number(h.descriere.match(/-([0-9]+)/)[1]) : 0), 0);
  }, [wallet]);

  if (!user) return <div className="p-6">Autentifica-te pentru a vedea fidelizarea.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Fidelizare</h1>
      {msg && <div className="text-rose-700">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <div className="text-sm text-gray-600">Puncte curente</div>
          <div className="text-2xl font-bold">{wallet?.puncteCurent || 0}</div>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <div className="text-sm text-gray-600">Total comenzi</div>
          <div className="text-2xl font-bold">{stats.totalOrders}</div>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <div className="text-sm text-gray-600">Economii estimate</div>
          <div className="text-2xl font-bold">{economii} MDL</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="text-xl font-semibold">Vouchere disponibile</h2>
        {wallet?.reduceriDisponibile?.length ? (
          <ul className="space-y-2">
            {wallet.reduceriDisponibile.map((v) => (
              <li key={v.codigPromo} className="border rounded p-2">
                <div className="font-semibold">{v.codigPromo}</div>
                <div className="text-sm text-gray-600">
                  {v.valoareFixa ? `${v.valoareFixa} MDL` : `${v.procent}%`} - expira{" "}
                  {v.dataExpirare ? new Date(v.dataExpirare).toLocaleDateString() : "-"}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-600">Nu ai vouchere active.</div>
        )}
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="text-xl font-semibold">Istoric puncte</h2>
        {!wallet?.istoric?.length && <div className="text-gray-600">Nu exista tranzactii.</div>}
        {wallet?.istoric?.length > 0 && (
          <div className="space-y-2 text-sm">
            {wallet.istoric.map((h, idx) => (
              <div key={`${h.data || idx}`} className="border rounded p-2">
                <div className="font-semibold">{h.tip === "earn" ? "Castig" : "Consum"}</div>
                <div className="text-gray-600">
                  {h.puncte} puncte {h.sursa ? `· ${h.sursa}` : ""}
                </div>
                {h.descriere && <div className="text-gray-700">{h.descriere}</div>}
                <div className="text-xs text-gray-500">
                  {h.data ? new Date(h.data).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="text-xl font-semibold">Statistici personale</h2>
        <div className="text-sm text-gray-700">
          Produse preferate: {stats.top.length ? stats.top.join(", ") : "in curs de calcul"}
        </div>
      </div>
    </div>
  );
}
