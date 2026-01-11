import { useEffect, useMemo, useState } from "react";
import api from "/src/lib/api.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function toDateStr(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function AdminStats() {
  const [orders, setOrders] = useState([]);
  const [torturi, setTorturi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [ordersRes, tortRes] = await Promise.all([
          api.get("/comenzi/admin"),
          api.get("/torturi", { params: { limit: 200 } }),
        ]);
        if (!alive) return;
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
        setTorturi(Array.isArray(tortRes.data?.items) ? tortRes.data.items : []);
      } catch (e) {
        if (!alive) return;
        setMsg("Nu am putut incarca statisticile.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, c) => sum + Number(c.totalFinal || c.total || 0), 0);
    const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

    const costMap = new Map();
    torturi.forEach((t) => costMap.set(String(t._id), Number(t.costEstim || 0)));
    const profit = orders.reduce((sum, c) => {
      const items = c.items || [];
      const cost = items.reduce((acc, it) => {
        const id = it.productId || it.tortId || it._id;
        const costUnit = costMap.get(String(id)) || 0;
        const qty = Number(it.qty || it.cantitate || 1);
        return acc + costUnit * qty;
      }, 0);
      return sum + (Number(c.totalFinal || c.total || 0) - cost);
    }, 0);

    const byDay = new Map();
    orders.forEach((c) => {
      const d = toDateStr(c.dataLivrare || c.dataRezervare || c.createdAt);
      if (!d) return;
      byDay.set(d, (byDay.get(d) || 0) + Number(c.totalFinal || c.total || 0));
    });
    const revenueLabels = Array.from(byDay.keys()).sort();
    const revenueValues = revenueLabels.map((d) => byDay.get(d));

    const productMap = new Map();
    orders.forEach((c) => {
      (c.items || []).forEach((it) => {
        const name = it.name || it.nume || "Produs";
        const qty = Number(it.qty || it.cantitate || 1);
        productMap.set(name, (productMap.get(name) || 0) + qty);
      });
    });
    const topProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalOrders,
      totalRevenue,
      avgOrder,
      profit,
      revenueLabels,
      revenueValues,
      topProducts,
    };
  }, [orders, torturi]);

  const revenueData = {
    labels: stats.revenueLabels,
    datasets: [
      {
        label: "Venituri (MDL)",
        data: stats.revenueValues,
        borderColor: "#ec4899",
        backgroundColor: "rgba(236, 72, 153, 0.2)",
        tension: 0.3,
      },
    ],
  };

  const topProductsData = {
    labels: stats.topProducts.map(([name]) => name),
    datasets: [
      {
        label: "Cantitate",
        data: stats.topProducts.map(([, qty]) => qty),
        backgroundColor: "#f97316",
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Statistici platforma</h2>
      {msg && <div className="text-rose-700">{msg}</div>}
      {loading && <div>Se incarca...</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border p-4 rounded bg-white">
          <div className="text-sm text-gray-600">Total comenzi</div>
          <div className="text-2xl font-bold">{stats.totalOrders}</div>
        </div>
        <div className="border p-4 rounded bg-white">
          <div className="text-sm text-gray-600">Venituri</div>
          <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} MDL</div>
        </div>
        <div className="border p-4 rounded bg-white">
          <div className="text-sm text-gray-600">Comanda medie</div>
          <div className="text-2xl font-bold">{stats.avgOrder.toFixed(2)} MDL</div>
        </div>
        <div className="border p-4 rounded bg-white">
          <div className="text-sm text-gray-600">Profit estimat</div>
          <div className="text-2xl font-bold">{stats.profit.toFixed(2)} MDL</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded bg-white p-4">
          <h3 className="font-semibold mb-2">Venituri pe zile</h3>
          {stats.revenueLabels.length === 0 ? (
            <div className="text-gray-500">Nu exista date.</div>
          ) : (
            <Line data={revenueData} />
          )}
        </div>
        <div className="border rounded bg-white p-4">
          <h3 className="font-semibold mb-2">Top produse</h3>
          {stats.topProducts.length === 0 ? (
            <div className="text-gray-500">Nu exista date.</div>
          ) : (
            <Bar data={topProductsData} />
          )}
        </div>
      </div>
    </div>
  );
}
