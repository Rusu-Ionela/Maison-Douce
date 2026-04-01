import { useEffect, useMemo, useState } from "react";
import api from "/src/lib/api.js";
import AdminShell, { AdminMetricGrid, AdminPanel } from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import { buttons, inputs } from "../lib/tailwindComponents";

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

function formatHours(value) {
  return `${Number(value || 0).toFixed(1)} h`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatLabel(value) {
  const labels = {
    pickup: "Ridicare",
    ridicare: "Ridicare",
    delivery: "Livrare",
    livrare: "Livrare",
    courier: "Curier",
    paid: "Platite",
    unpaid: "Neplatite",
    pending: "In asteptare",
    noua: "Noua",
    in_discutie: "In discutie",
    aprobata: "Aprobata",
    comanda_generata: "Comanda generata",
    respinsa: "Respinsa",
    in_asteptare: "In asteptare",
    plasata: "Plasata",
    anulata: "Anulata",
    refuzata: "Refuzata",
  };

  if (labels[value]) return labels[value];
  return String(value || "-").replace(/_/g, " ");
}

const INITIAL_SALES_REPORT = {
  totalOrders: 0,
  totalRevenue: 0,
  averageOrder: 0,
  deliveryRevenue: 0,
  deliveryMethodBreakdown: {},
  methodRevenueBreakdown: {},
  paymentBreakdown: {},
  statusBreakdown: {},
  topProducts: [],
  unpaidOrders: 0,
  lostOrderCounts: {
    standardCancelled: 0,
    customRejected: 0,
    totalLost: 0,
  },
  topRejectionReasons: [],
  customFunnel: {
    totalRequests: 0,
    convertedOrders: 0,
    paidOrders: 0,
    rejectedRequests: 0,
    conversionRate: 0,
    paidRate: 0,
  },
  operationalTimings: {
    averageCustomResponseHours: 0,
    averageScheduledLeadHours: 0,
  },
};

const INITIAL_RESERVATION_REPORT = {
  totalReservations: 0,
  totalRevenue: 0,
  deliveryMethods: {},
  paymentStatuses: {},
  statusBreakdown: {},
  details: [],
};

function BreakdownChips({ items, emptyText = "Fara date in interval." }) {
  if (!items.length) {
    return <div className="text-sm text-gray-500">{emptyText}</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([key, value]) => (
        <span
          key={key}
          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-pink-700"
        >
          {formatLabel(key)}: {value}
        </span>
      ))}
    </div>
  );
}

export default function AdminRapoarte() {
  const initialRange = getInitialRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [dateRez, setDateRez] = useState("");
  const [salesReport, setSalesReport] = useState(INITIAL_SALES_REPORT);
  const [reservationReport, setReservationReport] = useState(INITIAL_RESERVATION_REPORT);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const topProducts = Array.isArray(salesReport?.topProducts) ? salesReport.topProducts : [];
  const topRejectionReasons = Array.isArray(salesReport?.topRejectionReasons)
    ? salesReport.topRejectionReasons
    : [];
  const reservationDetails = Array.isArray(reservationReport?.details)
    ? reservationReport.details
    : [];
  const reservationMethods = Object.entries(reservationReport?.deliveryMethods || {});
  const reservationPaymentStatuses = Object.entries(reservationReport?.paymentStatuses || {});
  const paymentBreakdown = Object.entries(salesReport?.paymentBreakdown || {});
  const orderMethodBreakdown = Object.entries(salesReport?.deliveryMethodBreakdown || {});
  const orderRevenueByMethod = Object.entries(salesReport?.methodRevenueBreakdown || {});
  const orderStatusBreakdown = Object.entries(salesReport?.statusBreakdown || {});

  const metrics = useMemo(
    () => [
      {
        label: "Comenzi in interval",
        value: salesReport.totalOrders || 0,
        hint: "Volumul total de comenzi plasate in perioada selectata.",
        tone: "rose",
      },
      {
        label: "Venit total",
        value: formatMoney(salesReport.totalRevenue),
        hint: "Include comenzile standard si pe cele personalizate convertite.",
        tone: "gold",
      },
      {
        label: "Comenzi neplatite",
        value: salesReport.unpaidOrders || 0,
        hint: "Comenzi care cer follow-up comercial sau verificare plata.",
        tone: "slate",
      },
      {
        label: "Cazuri pierdute",
        value: salesReport.lostOrderCounts?.totalLost || 0,
        hint: "Anulari standard plus cereri custom respinse.",
        tone: "sage",
      },
      {
        label: "Rata custom -> platit",
        value: formatPercent(salesReport.customFunnel?.paidRate || 0),
        hint: "Cat din cererile personalizate ajung pana la plata.",
        tone: "rose",
      },
      {
        label: "Raspuns custom mediu",
        value: formatHours(salesReport.operationalTimings?.averageCustomResponseHours || 0),
        hint: "Timp pana la prima actiune pe o cerere personalizata.",
        tone: "slate",
      },
      {
        label: "Lead time mediu",
        value: formatHours(salesReport.operationalTimings?.averageScheduledLeadHours || 0),
        hint: "Intervalul mediu dintre plasare si predarea programata.",
        tone: "gold",
      },
      {
        label: "Rezervari in interval",
        value: reservationReport.totalReservations || 0,
        hint: "Toate reservarile sincronizate cu calendarul in aceeasi perioada.",
        tone: "sage",
      },
    ],
    [reservationReport.totalReservations, salesReport]
  );

  const downloadCsv = async (urlPath, fallbackName) => {
    try {
      const res = await api.get(urlPath, { responseType: "blob" });
      const blob = new Blob([res.data], {
        type: res.headers?.["content-type"] || "text/csv;charset=utf-8",
      });
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = extractFilename(res.headers?.["content-disposition"], fallbackName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Nu s-a putut face exportul CSV.",
      });
    }
  };

  const load = async () => {
    if (!from || !to) {
      setMessage({ type: "warning", text: "Selecteaza un interval complet." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const [salesRes, reservationRes] = await Promise.all([
        api.get(`/rapoarte/sales/${from}/${to}`),
        api.get(`/rapoarte/reservari/${from}/${to}`),
      ]);

      setSalesReport({
        ...INITIAL_SALES_REPORT,
        ...(salesRes.data || {}),
        lostOrderCounts: {
          ...INITIAL_SALES_REPORT.lostOrderCounts,
          ...(salesRes.data?.lostOrderCounts || {}),
        },
        customFunnel: {
          ...INITIAL_SALES_REPORT.customFunnel,
          ...(salesRes.data?.customFunnel || {}),
        },
        operationalTimings: {
          ...INITIAL_SALES_REPORT.operationalTimings,
          ...(salesRes.data?.operationalTimings || {}),
        },
      });
      setReservationReport({
        ...INITIAL_RESERVATION_REPORT,
        ...(reservationRes.data || {}),
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Eroare la incarcare raport.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminShell
      title="Rapoarte comerciale si operationale"
      description="Citeste rapid cum se misca comenzile, cat convertesc cererile personalizate, unde pierzi clienti si ce impact au livrarea versus ridicarea."
      actions={
        <>
          <button type="button" className={buttons.outline} onClick={load} disabled={loading}>
            {loading ? "Se actualizeaza..." : "Regenereaza raportul"}
          </button>
          <button
            type="button"
            className={buttons.outline}
            onClick={() => {
              const params = new URLSearchParams();
              if (from) params.set("from", from);
              if (to) params.set("to", to);
              const suffix = params.toString() ? `?${params.toString()}` : "";
              downloadCsv(`/comenzi/export/csv${suffix}`, `comenzi_${from}_${to}.csv`);
            }}
          >
            Export comenzi CSV
          </button>
        </>
      }
    >
      <StatusBanner type={message.type || "info"} message={message.text} />
      <StatusBanner
        type="info"
        message={loading ? "Se incarca raportul complet pentru intervalul selectat..." : ""}
      />

      <AdminPanel
        title="Filtre si exporturi"
        description="Foloseste acelasi interval pentru vanzari si rezervari, apoi exporta punctual doar ce ai nevoie."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-semibold text-[#4e453d]">
              De la
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className={`mt-2 ${inputs.default}`}
              />
            </label>
            <label className="text-sm font-semibold text-[#4e453d]">
              Pana la
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className={`mt-2 ${inputs.default}`}
              />
            </label>
            <div className="flex items-end">
              <button type="button" className={buttons.primary} onClick={load} disabled={loading}>
                {loading ? "Se incarca..." : "Genereaza raport"}
              </button>
            </div>
            <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.78)] px-4 py-3 text-sm text-gray-600">
              Interval activ: <span className="font-semibold text-gray-900">{from}</span> -
              <span className="font-semibold text-gray-900"> {to}</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
              Export rezervari pe zi
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr,auto]">
              <input
                type="date"
                value={dateRez}
                onChange={(event) => setDateRez(event.target.value)}
                className={inputs.default}
              />
              <button
                type="button"
                className={buttons.outline}
                disabled={!dateRez}
                onClick={() =>
                  dateRez &&
                  downloadCsv(`/calendar/admin/${dateRez}/export`, `rezervari_${dateRez}.csv`)
                }
              >
                Export ziua selectata
              </button>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Export separat pentru lista zilnica de productie si predare.
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminMetricGrid items={metrics} />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel
          title="Funnel cereri personalizate"
          description="Vezi cate cereri ajung pana la oferta convertita si cate se inchid efectiv prin plata."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
              <div className="text-sm font-medium text-pink-700">Cereri totale</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">
                {salesReport.customFunnel?.totalRequests || 0}
              </div>
            </article>
            <article className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
              <div className="text-sm font-medium text-pink-700">Convertite in comenzi</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">
                {salesReport.customFunnel?.convertedOrders || 0}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Rata: {formatPercent(salesReport.customFunnel?.conversionRate || 0)}
              </div>
            </article>
            <article className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
              <div className="text-sm font-medium text-pink-700">Ajunse la plata</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">
                {salesReport.customFunnel?.paidOrders || 0}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Rata: {formatPercent(salesReport.customFunnel?.paidRate || 0)}
              </div>
            </article>
            <article className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
              <div className="text-sm font-medium text-pink-700">Respinse</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">
                {salesReport.customFunnel?.rejectedRequests || 0}
              </div>
            </article>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Mix livrare vs ridicare"
          description="Citeste separat volumul si valoarea pe fiecare metoda de predare."
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-semibold text-gray-900">Volum comenzi</div>
              <BreakdownChips items={orderMethodBreakdown} />
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-gray-900">Venit pe metoda</div>
              {orderRevenueByMethod.length ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {orderRevenueByMethod.map(([method, value]) => (
                    <article
                      key={method}
                      className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4"
                    >
                      <div className="text-sm font-medium text-pink-700">{formatLabel(method)}</div>
                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {formatMoney(value)}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Fara venituri pe metode in interval.</div>
              )}
            </div>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminPanel
          title="Top produse"
          description="Produsele care trag cele mai multe bucati si venit in perioada selectata."
          className="xl:col-span-1"
        >
          <div className="space-y-3">
            {topProducts.length ? (
              topProducts.map((product) => (
                <article
                  key={product.product}
                  className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4"
                >
                  <div className="text-sm font-semibold text-gray-900">{product.product}</div>
                  <div className="mt-2 text-sm text-gray-600">
                    {product.quantity} buc. | {formatMoney(product.revenue)}
                  </div>
                </article>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                Nu exista produse in top pentru intervalul selectat.
              </div>
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Motive de pierdere"
          description="Cele mai frecvente motive de respingere sau anulare pe care merita sa le reduci."
          className="xl:col-span-1"
        >
          <div className="space-y-3">
            {topRejectionReasons.length ? (
              topRejectionReasons.map((item) => (
                <article
                  key={item.reason}
                  className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4"
                >
                  <div className="text-sm font-semibold text-gray-900">{item.reason}</div>
                  <div className="mt-2 text-sm text-gray-600">{item.count} cazuri</div>
                </article>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                Nu exista motive de pierdere in intervalul selectat.
              </div>
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Sanatate operationala"
          description="Indicatori rapizi pentru follow-up, confirmare si capacitate."
          className="xl:col-span-1"
        >
          <div className="space-y-4">
            <article className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
              <div className="text-sm font-medium text-pink-700">Valoare medie comanda</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {formatMoney(salesReport.averageOrder)}
              </div>
            </article>
            <article className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
              <div className="text-sm font-medium text-pink-700">Taxe livrare colectate</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {formatMoney(salesReport.deliveryRevenue)}
              </div>
            </article>
            <article className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
              <div className="text-sm font-medium text-pink-700">Statusuri comenzi</div>
              <div className="mt-3">
                <BreakdownChips
                  items={orderStatusBreakdown}
                  emptyText="Nu exista distributie de status pentru acest interval."
                />
              </div>
            </article>
            <article className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
              <div className="text-sm font-medium text-pink-700">Status plata comenzi</div>
              <div className="mt-3">
                <BreakdownChips
                  items={paymentBreakdown}
                  emptyText="Nu exista distributie de plata pentru acest interval."
                />
              </div>
            </article>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <AdminPanel
          title="Rezervari in interval"
          description="Rezumatul calendarului pentru aceeasi perioada selectata."
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-semibold text-gray-900">Metode de predare</div>
              <BreakdownChips items={reservationMethods} />
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-gray-900">Status plata</div>
              <BreakdownChips items={reservationPaymentStatuses} />
            </div>
            <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4">
              <div className="text-sm font-medium text-pink-700">Venit rezervari</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {formatMoney(reservationReport.totalRevenue)}
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Lista rezervari"
          description="Ordinea din calendar pe care o poti folosi pentru verificari si exporturi."
        >
          <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
            {reservationDetails.length ? (
              reservationDetails.map((reservation) => (
                <article
                  key={reservation.id}
                  className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.86)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {reservation.client} | {reservation.tort}
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {reservation.data} | {reservation.ora} | {formatLabel(reservation.livrare)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatMoney(reservation.total)}
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-gray-600">
                    Plata: {formatLabel(reservation.paymentStatus)} | Status:{" "}
                    {formatLabel(reservation.status)}
                  </div>
                  {reservation.adresa ? (
                    <div className="mt-2 text-sm text-gray-600">Adresa: {reservation.adresa}</div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="text-sm text-gray-500">
                Nu exista rezervari in intervalul selectat.
              </div>
            )}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
