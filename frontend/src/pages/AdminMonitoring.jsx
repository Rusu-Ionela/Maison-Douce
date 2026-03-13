import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StatusBanner from "../components/StatusBanner";
import {
  fetchAdminClientErrors,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";

const KINDS = [
  { value: "", label: "Toate" },
  { value: "react_render_error", label: "React render" },
  { value: "window_error", label: "Window error" },
  { value: "unhandled_rejection", label: "Unhandled rejection" },
  { value: "manual_report", label: "Manual report" },
];

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function truncate(text, max = 240) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default function AdminMonitoring() {
  const [filters, setFilters] = useState({
    kind: "",
    search: "",
    limit: "50",
  });

  const monitoringQuery = useQuery({
    queryKey: queryKeys.adminClientErrors(filters),
    queryFn: () => fetchAdminClientErrors(filters),
  });

  const items = monitoringQuery.data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring client runtime</h1>
          <p className="text-gray-600">
            Evenimente persistate din `ErrorBoundary`, `window.error` si `unhandledrejection`.
          </p>
        </div>
        <button
          type="button"
          onClick={() => monitoringQuery.refetch()}
          className="rounded-xl border px-3 py-2"
        >
          Reincarca
        </button>
      </header>

      <StatusBanner
        type="error"
        message={
          monitoringQuery.error
            ? getApiErrorMessage(
                monitoringQuery.error,
                "Nu am putut incarca evenimentele de monitoring."
              )
            : ""
        }
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm text-gray-700">
            Tip eroare
            <select
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.kind}
              onChange={(event) =>
                setFilters((current) => ({ ...current, kind: event.target.value }))
              }
            >
              {KINDS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-700 md:col-span-1">
            Cauta
            <input
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="message, email, release, url"
            />
          </label>
          <label className="text-sm text-gray-700">
            Limita
            <select
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.limit}
              onChange={(event) =>
                setFilters((current) => ({ ...current, limit: event.target.value }))
              }
            >
              {[25, 50, 100, 200].map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {monitoringQuery.isLoading ? (
        <div className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
          Se incarca evenimentele de monitoring...
        </div>
      ) : null}

      <div className="space-y-4">
        {items.map((item) => (
          <article key={item._id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{item.kind}</h2>
                  <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                    {item.release || "release necunoscut"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-700">{truncate(item.message, 320)}</div>
              </div>
              <div className="text-sm text-gray-500">{formatDateTime(item.createdAt)}</div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-gray-500">Utilizator</div>
                <div className="font-medium text-gray-900">{item.userEmail || "anonim"}</div>
                <div>{item.userRole || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Pagina</div>
                <div className="break-all font-medium text-gray-900">{item.url || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Request IDs</div>
                <div className="font-medium text-gray-900">{item.requestId || "-"}</div>
                <div>{item.clientRequestId || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">IP / UA</div>
                <div>{item.ip || "-"}</div>
                <div className="break-all">{truncate(item.userAgent, 140)}</div>
              </div>
            </div>

            {item.componentStack ? (
              <details className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                  Component stack
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-gray-700">
                  {item.componentStack}
                </pre>
              </details>
            ) : null}

            {item.stack ? (
              <details className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                  Stack trace
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-gray-700">
                  {item.stack}
                </pre>
              </details>
            ) : null}
          </article>
        ))}

        {!monitoringQuery.isLoading && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
            Nu exista evenimente pentru filtrul curent.
          </div>
        ) : null}
      </div>
    </div>
  );
}
