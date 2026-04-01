import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import StatusBanner from "../components/StatusBanner";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import {
  fetchAdminNotifications,
  fetchAdminOrders,
  fetchReservations,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";
import { addDays, formatDateInput, getTodayDateInput } from "../lib/date";

const EMPTY_LIST = [];

function formatCurrency(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

function formatDateLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboard() {
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

  const today = getTodayDateInput();
  const tomorrow = formatDateInput(addDays(new Date(), 1) || new Date());

  const stats = useMemo(() => {
    const totalRevenue = comenzi.reduce(
      (sum, item) => sum + Number(item.totalFinal || item.total || 0),
      0
    );
    const byStatus = comenzi.reduce((acc, item) => {
      const key = item.status || "noua";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const unpaidOrders = comenzi.filter(
      (item) => item.paymentStatus !== "paid" && item.statusPlata !== "paid"
    ).length;
    const rezervariAzi = rezervari.filter((item) => item.date === today).length;

    return {
      totalRevenue,
      totalOrders: comenzi.length,
      inWork: byStatus.in_lucru || 0,
      finished: byStatus.gata || 0,
      newOrders: byStatus.plasata || 0,
      unpaidOrders,
      rezervariAzi,
    };
  }, [comenzi, rezervari, today]);

  const urgentOrders = useMemo(() => {
    return [...comenzi]
      .filter((item) => {
        const itemDate = item.dataLivrare || item.dataRezervare || "";
        const relevantDate = itemDate === today || itemDate === tomorrow;
        const needsAttention = !["livrata", "ridicata", "gata", "anulata"].includes(
          item.status || ""
        );
        return relevantDate || needsAttention;
      })
      .sort((a, b) =>
        String(a.dataLivrare || a.dataRezervare || "").localeCompare(
          String(b.dataLivrare || b.dataRezervare || "")
        )
      )
      .slice(0, 6);
  }, [comenzi, today, tomorrow]);

  const upcomingReservations = useMemo(() => {
    return [...rezervari]
      .filter((item) => item.date === today || item.date === tomorrow)
      .sort((a, b) => String(a.timeSlot || "").localeCompare(String(b.timeSlot || "")))
      .slice(0, 6);
  }, [rezervari, today, tomorrow]);

  const latestNotifications = useMemo(() => {
    return [...notificari]
      .sort((a, b) =>
        String(b.createdAt || b.data || "").localeCompare(String(a.createdAt || a.data || ""))
      )
      .slice(0, 5);
  }, [notificari]);

  const refreshDashboard = () => {
    ordersQuery.refetch();
    reservationsQuery.refetch();
    notificationsQuery.refetch();
  };

  return (
    <AdminShell
      title="Panou admin"
      description="Vezi rapid comenzile urgente, capacitatea din urmatoarele zile si notificari operationale fara sa navighezi intre module."
      actions={
        <>
          <Link
            to="/harta-site"
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-soft hover:bg-rose-50"
          >
            Arhitectura rute
          </Link>
          <button
            type="button"
            onClick={refreshDashboard}
            className="rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-pink-700"
          >
            Reincarca
          </button>
        </>
      }
    >
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
      <StatusBanner
        type="info"
        message={dashboardLoading ? "Se actualizeaza dashboard-ul operational..." : ""}
      />

      <AdminMetricGrid
        items={[
          {
            label: "Comenzi noi",
            value: stats.newOrders,
            hint: "Asteapta confirmare sau raspuns comercial.",
            tone: "rose",
          },
          {
            label: "In productie",
            value: stats.inWork,
            hint: "Comenzi aflate deja in executie.",
            tone: "sage",
          },
          {
            label: "Neplatite",
            value: stats.unpaidOrders,
            hint: "Necesita follow-up inainte de confirmare.",
            tone: "gold",
          },
          {
            label: "Venituri",
            value: formatCurrency(stats.totalRevenue),
            hint: `${stats.totalOrders} comenzi procesate in total.`,
            tone: "slate",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
        <AdminPanel
          title="Comenzi care cer atentie"
          description="Prioritate pe livrari apropiate, comenzi noi si statusuri in desfasurare."
          action={
            <Link
              to="/admin/comenzi"
              className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-soft hover:bg-rose-50"
            >
              Vezi toate comenzile
            </Link>
          }
        >
          {urgentOrders.length ? (
            <div className="space-y-3">
              {urgentOrders.map((item) => (
                <article
                  key={item._id}
                  className="rounded-[24px] border border-rose-100 bg-rose-50/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        #{item.numeroComanda || item._id?.slice(-6)}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {item.clientName || item.clientEmail || item.clientId || "Client"}
                      </div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pink-700 shadow-soft">
                      {item.status || "plasata"}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                    <div>Data: {formatDateLabel(item.dataLivrare || item.dataRezervare)}</div>
                    <div>Plata: {item.paymentStatus || item.statusPlata || "unpaid"}</div>
                    <div>Total: {formatCurrency(item.totalFinal || item.total || 0)}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-5 text-sm text-gray-600">
              Nu exista comenzi urgente in acest moment.
            </div>
          )}
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel
            title="Capacitate imediata"
            description="Rezervari programate pentru azi si maine."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-rose-100 bg-white p-4 shadow-soft">
                <div className="text-sm text-gray-500">Rezervari azi</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">
                  {stats.rezervariAzi}
                </div>
              </div>
              <div className="rounded-[24px] border border-rose-100 bg-white p-4 shadow-soft">
                <div className="text-sm text-gray-500">Rezervari maine</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">
                  {upcomingReservations.filter((item) => item.date === tomorrow).length}
                </div>
              </div>
            </div>
            {upcomingReservations.length ? (
              <div className="mt-4 space-y-2">
                {upcomingReservations.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/40 px-4 py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.clientName || "Client"}
                      </div>
                      <div className="text-gray-500">
                        {formatDateLabel(item.date)} {item.timeSlot || "-"}
                      </div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pink-700">
                      {item.status || "noua"}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel
            title="Notificari recente"
            description="Ultimele mesaje interne si alerte operationale."
            action={
              <Link
                to="/admin/notificari"
                className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-soft hover:bg-rose-50"
              >
                Deschide modulul
              </Link>
            }
          >
            {latestNotifications.length ? (
              <div className="space-y-3">
                {latestNotifications.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-[24px] border border-rose-100 bg-white p-4 shadow-soft"
                  >
                    <div className="font-medium text-gray-900">
                      {item.titlu || "Notificare"}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {item.mesaj || "Fara mesaj"}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {formatDateLabel(item.createdAt || item.data)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-5 text-sm text-gray-600">
                Nu exista notificari recente.
              </div>
            )}
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
  );
}
