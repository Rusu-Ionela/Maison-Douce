import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import { buttons, inputs } from "../lib/tailwindComponents";
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
const EMPTY_LIST = [];

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO");
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

  const items = monitoringQuery.data ?? EMPTY_LIST;

  const metrics = useMemo(() => {
    const latestEvent = items[0]?.createdAt || "";
    const releases = new Set(items.map((item) => item.release).filter(Boolean)).size;
    const kinds = new Set(items.map((item) => item.kind).filter(Boolean)).size;

    return [
      {
        label: "Evenimente vizibile",
        value: items.length,
        hint: "Rezultatele pentru filtrul curent.",
        tone: "rose",
      },
      {
        label: "Tipuri distincte",
        value: kinds,
        hint: "Categorii diferite de erori in lista.",
        tone: "sage",
      },
      {
        label: "Release-uri",
        value: releases,
        hint: "Versiuni diferite detectate in evenimente.",
        tone: "gold",
      },
      {
        label: "Ultimul eveniment",
        value: latestEvent ? formatDateTime(latestEvent) : "-",
        hint: "Timestamp-ul celui mai recent raport.",
        tone: "slate",
      },
    ];
  }, [items]);

  return (
    <AdminShell
      title="Monitoring client runtime"
      description="Verifica rapid erorile captate din browser, filtreaza dupa tip sau release si foloseste contextul tehnic pentru a reproduce problemele reale din productie."
      actions={
        <button
          type="button"
          onClick={() => monitoringQuery.refetch()}
          className={buttons.outline}
        >
          Reincarca
        </button>
      }
    >
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
      <StatusBanner
        type="info"
        message={monitoringQuery.isLoading ? "Se incarca datele de monitoring..." : ""}
      />

      <AdminMetricGrid items={metrics} />

      <AdminPanel
        title="Filtre si cautare"
        description="Combinatia de tip, termen de cautare si limita te ajuta sa restrangi rapid zona afectata."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm text-gray-700">
            Tip eroare
            <select
              className={`${inputs.default} mt-1`}
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
          <label className="text-sm text-gray-700">
            Cauta
            <input
              className={`${inputs.default} mt-1`}
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
              className={`${inputs.default} mt-1`}
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
      </AdminPanel>

      <AdminPanel
        title="Evenimente raportate"
        description="Fiecare card afiseaza suficient context pentru triere: utilizator, request IDs, release si stack."
      >
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item._id}
              className="rounded-[24px] border border-rose-100 bg-rose-50/40 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{item.kind}</h2>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-pink-700">
                      {item.release || "release necunoscut"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    {truncate(item.message, 320)}
                  </div>
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
                <details className="mt-4 rounded-xl border border-gray-100 bg-white/80 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                    Component stack
                  </summary>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-gray-700">
                    {item.componentStack}
                  </pre>
                </details>
              ) : null}

              {item.stack ? (
                <details className="mt-3 rounded-xl border border-gray-100 bg-white/80 p-3">
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
            <div className="rounded-[24px] border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              Nu exista evenimente pentru filtrul curent.
            </div>
          ) : null}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
