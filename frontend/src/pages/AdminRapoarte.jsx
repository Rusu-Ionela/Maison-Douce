import { useState } from "react";
import api from "/src/lib/api.js";

function extractFilename(contentDisposition, fallback) {
  const value = String(contentDisposition || "");
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  const plain = value.match(/filename="?([^";]+)"?/i);
  if (plain?.[1]) return plain[1];
  return fallback;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialRange() {
  const now = new Date();
  return {
    from: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: formatDateInput(now),
  };
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

const INITIAL_SALES_REPORT = {
  totalOrders: 0,
  totalRevenue: 0,
  deliveryRevenue: 0,
  deliveryMethodBreakdown: {},
  paymentBreakdown: {},
  topProducts: [],
};

const INITIAL_RESERVATION_REPORT = {
  totalReservations: 0,
  totalRevenue: 0,
  deliveryMethods: {},
  paymentStatuses: {},
  statusBreakdown: {},
  details: [],
};

export default function AdminRapoarte() {
  const initialRange = getInitialRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [dateRez, setDateRez] = useState("");
  const [salesReport, setSalesReport] = useState(INITIAL_SALES_REPORT);
  const [reservationReport, setReservationReport] = useState(
    INITIAL_RESERVATION_REPORT
  );
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const topProducts = Array.isArray(salesReport?.topProducts)
    ? salesReport.topProducts
    : [];
  const reservationDetails = Array.isArray(reservationReport?.details)
    ? reservationReport.details
    : [];
  const reservationMethods = Object.entries(
    reservationReport?.deliveryMethods || {}
  );
  const paymentBreakdown = Object.entries(salesReport?.paymentBreakdown || {});

  const downloadCsv = async (urlPath, fallbackName) => {
    try {
      const res = await api.get(urlPath, { responseType: "blob" });
      const blob = new Blob([res.data], {
        type: res.headers?.["content-type"] || "text/csv;charset=utf-8",
      });
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = extractFilename(
        res.headers?.["content-disposition"],
        fallbackName
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
    } catch (error) {
      setMsg(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Nu s-a putut face exportul CSV."
      );
    }
  };

  const load = async () => {
    if (!from || !to) {
      setMsg("Selecteaza un interval complet.");
      return;
    }

    setLoading(true);
    setMsg("");
    try {
      const [salesRes, reservationRes] = await Promise.all([
        api.get(`/rapoarte/sales/${from}/${to}`),
        api.get(`/rapoarte/reservari/${from}/${to}`),
      ]);

      setSalesReport({
        ...INITIAL_SALES_REPORT,
        ...(salesRes.data || {}),
      });
      setReservationReport({
        ...INITIAL_RESERVATION_REPORT,
        ...(reservationRes.data || {}),
      });
    } catch (error) {
      setMsg(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Eroare la incarcare raport."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReservationExport = () => {
    if (!from || !to) {
      setMsg("Selecteaza un interval complet pentru export.");
      return;
    }
    downloadCsv(
      `/rapoarte/export/csv/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
      `raport_rezervari_${from}_${to}.csv`
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Rapoarte</h1>
      {msg && <div className="text-rose-700">{msg}</div>}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border rounded p-2"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border rounded p-2"
        />
        <button
          className="border px-3 py-2 rounded"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Se incarca..." : "Genereaza raport"}
        </button>
        <button
          className="border px-3 py-2 rounded"
          onClick={() => {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            const suffix = params.toString() ? `?${params.toString()}` : "";
            downloadCsv(`/comenzi/export/csv${suffix}`, "comenzi.csv");
          }}
        >
          Export CSV comenzi
        </button>
        <button className="border px-3 py-2 rounded" onClick={handleReservationExport}>
          Export CSV rezervari interval
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="border rounded p-3 bg-white">
          <div className="text-sm text-gray-600">Total comenzi</div>
          <div className="text-2xl font-bold">{salesReport.totalOrders || 0}</div>
        </div>
        <div className="border rounded p-3 bg-white">
          <div className="text-sm text-gray-600">Venituri</div>
          <div className="text-2xl font-bold">
            {formatMoney(salesReport.totalRevenue)}
          </div>
        </div>
        <div className="border rounded p-3 bg-white">
          <div className="text-sm text-gray-600">Taxe livrare</div>
          <div className="text-2xl font-bold">
            {formatMoney(salesReport.deliveryRevenue)}
          </div>
        </div>
        <div className="border rounded p-3 bg-white">
          <div className="text-sm text-gray-600">Rezervari</div>
          <div className="text-2xl font-bold">
            {reservationReport.totalReservations || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded p-4 bg-white">
          <h2 className="text-lg font-semibold mb-2">Top produse</h2>
          <div className="space-y-2 text-sm">
            {topProducts.map((product) => (
              <div
                key={product.product}
                className="flex items-center justify-between border-b pb-2"
              >
                <span>{product.product}</span>
                <span className="text-gray-600">
                  {product.quantity} buc. / {formatMoney(product.revenue)}
                </span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="text-gray-500">Genereaza raportul pentru a vedea topul.</div>
            )}
          </div>
        </div>

        <div className="border rounded p-4 bg-white">
          <h2 className="text-lg font-semibold mb-2">Distribuitie livrare si plata</h2>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium mb-1">Metode rezervari</div>
              <div className="flex flex-wrap gap-2">
                {reservationMethods.map(([method, count]) => (
                  <span key={method} className="border rounded px-2 py-1">
                    {method}: {count}
                  </span>
                ))}
                {reservationMethods.length === 0 && (
                  <span className="text-gray-500">Fara date.</span>
                )}
              </div>
            </div>

            <div>
              <div className="font-medium mb-1">Status plata comenzi</div>
              <div className="flex flex-wrap gap-2">
                {paymentBreakdown.map(([status, count]) => (
                  <span key={status} className="border rounded px-2 py-1">
                    {status}: {count}
                  </span>
                ))}
                {paymentBreakdown.length === 0 && (
                  <span className="text-gray-500">Fara date.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded p-4 bg-white space-y-3">
        <h2 className="text-lg font-semibold">Export rezervari pe zi</h2>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateRez}
            onChange={(e) => setDateRez(e.target.value)}
            className="border rounded p-2"
          />
          <button
            className="border px-3 py-2 rounded"
            onClick={() =>
              dateRez &&
              downloadCsv(
                `/calendar/admin/${dateRez}/export`,
                `rezervari_${dateRez}.csv`
              )
            }
          >
            Export CSV rezervari
          </button>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <h2 className="text-lg font-semibold mb-2">Rezervari in interval</h2>
        <div className="space-y-2 max-h-[420px] overflow-auto">
          {reservationDetails.map((reservation) => (
            <div key={reservation.id} className="border-b pb-2 text-sm">
              {reservation.data} {reservation.ora} - {reservation.client} -{" "}
              {reservation.status} - {formatMoney(reservation.total)}
            </div>
          ))}
          {reservationDetails.length === 0 && (
            <div className="text-gray-500">
              Genereaza raportul pentru a vedea rezervarile din interval.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
