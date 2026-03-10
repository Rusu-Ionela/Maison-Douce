import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import {
  fetchAdminNotifications,
  fetchAdminOrders,
  fetchReservations,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";
import { SITE_SECTIONS, canAccessLink } from "../lib/siteMap";

const EMPTY_LIST = [];

export default function AdminDashboard() {
  const { user } = useAuth() || {};

  const ordersQuery = useQuery({
    queryKey: queryKeys.adminOrders(),
    queryFn: fetchAdminOrders,
  });
  const reservationsQuery = useQuery({
    queryKey: queryKeys.reservations(),
    queryFn: fetchReservations,
  });
  const notificationsQuery = useQuery({
    queryKey: queryKeys.adminNotifications(),
    queryFn: fetchAdminNotifications,
  });

  const comenzi = ordersQuery.data || EMPTY_LIST;
  const rezervari = reservationsQuery.data || EMPTY_LIST;
  const notificari = notificationsQuery.data || EMPTY_LIST;
  const dashboardLoading =
    ordersQuery.isLoading ||
    reservationsQuery.isLoading ||
    notificationsQuery.isLoading;
  const dashboardError =
    ordersQuery.error || reservationsQuery.error || notificationsQuery.error;

  const stats = useMemo(() => {
    const totalRevenue = comenzi.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );
    const byStatus = comenzi.reduce((acc, item) => {
      const key = item.status || "noua";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      totalRevenue,
      totalOrders: comenzi.length,
      inWork: byStatus.in_lucru || 0,
      finished: byStatus.gata || 0,
      newOrders: byStatus.plasata || 0,
    };
  }, [comenzi]);

  const adminLinks = useMemo(() => {
    const section = SITE_SECTIONS.find((item) => item.id === "admin");
    if (!section) return [];

    const seen = new Set();
    return section.items
      .filter((item) => canAccessLink(item, user))
      .filter((item) => !item.hidden)
      .filter((item) => {
        if (seen.has(item.to)) return false;
        seen.add(item.to);
        return true;
      });
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const rezervariAzi = rezervari.filter((item) => item.date === today).length;
  const rezervariMaine = rezervari.filter(
    (item) => item.date === tomorrow
  ).length;

  const refreshDashboard = () => {
    ordersQuery.refetch();
    reservationsQuery.refetch();
    notificationsQuery.refetch();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Rezumat activitate si acces rapid</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {adminLinks.map((item) => (
            <Link key={item.to} to={item.to} className="px-3 py-2 rounded border">
              {item.label}
            </Link>
          ))}
          <Link to="/harta-site" className="px-3 py-2 rounded border">
            Harta site
          </Link>
          <button
            type="button"
            onClick={refreshDashboard}
            className="px-3 py-2 rounded border"
          >
            Reincarca
          </button>
        </div>
      </header>

      <StatusBanner
        type="error"
        message={
          dashboardError
            ? getApiErrorMessage(
                dashboardError,
                "Nu am putut incarca datele din dashboard."
              )
            : ""
        }
      />

      {dashboardLoading && (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-600">
          Se incarca datele dashboard-ului...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Comenzi noi</div>
          <div className="text-2xl font-bold">{stats.newOrders}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">In productie</div>
          <div className="text-2xl font-bold">{stats.inWork}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Finalizate</div>
          <div className="text-2xl font-bold">{stats.finished}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Venituri</div>
          <div className="text-2xl font-bold">
            {stats.totalRevenue.toFixed(2)} MDL
          </div>
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
          {notificari.slice(0, 5).map((item) => (
            <div key={item._id} className="text-sm text-gray-700 border-b py-1">
              {item.titlu || "Notificare"} - {item.mesaj}
            </div>
          ))}
          {notificari.length === 0 && (
            <div className="text-sm text-gray-500">Nu exista notificari.</div>
          )}
        </div>
      </div>
    </div>
  );
}
