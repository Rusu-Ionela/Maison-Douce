import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StatusBanner from "../components/StatusBanner";
import {
  fetchAdminAuditLogs,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function renderMetadata(value) {
  if (!value || typeof value !== "object") {
    return "Fara metadata";
  }
  const text = JSON.stringify(value, null, 2);
  return text.length > 600 ? `${text.slice(0, 600)}...` : text;
}

export default function AdminAudit() {
  const [filters, setFilters] = useState({
    action: "",
    entityType: "",
    entityId: "",
    actorId: "",
    limit: "50",
  });

  const auditQuery = useQuery({
    queryKey: queryKeys.adminAudit(filters),
    queryFn: () => fetchAdminAuditLogs(filters),
  });

  const items = auditQuery.data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit trail</h1>
          <p className="text-gray-600">
            Vizualizare pentru actiunile sensibile din comenzi, cupoane, fidelizare si catalog.
          </p>
        </div>
        <button
          type="button"
          onClick={() => auditQuery.refetch()}
          className="rounded-xl border px-3 py-2"
        >
          Reincarca
        </button>
      </header>

      <StatusBanner
        type="error"
        message={
          auditQuery.error
            ? getApiErrorMessage(auditQuery.error, "Nu am putut incarca audit trail.")
            : ""
        }
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm text-gray-700">
            Actiune
            <input
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.action}
              onChange={(event) =>
                setFilters((current) => ({ ...current, action: event.target.value }))
              }
              placeholder="order.status.updated"
            />
          </label>
          <label className="text-sm text-gray-700">
            Tip entitate
            <input
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.entityType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, entityType: event.target.value }))
              }
              placeholder="comanda"
            />
          </label>
          <label className="text-sm text-gray-700">
            Entity ID
            <input
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.entityId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, entityId: event.target.value }))
              }
              placeholder="ObjectId"
            />
          </label>
          <label className="text-sm text-gray-700">
            Actor ID
            <input
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.actorId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, actorId: event.target.value }))
              }
              placeholder="ObjectId"
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

      {auditQuery.isLoading ? (
        <div className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
          Se incarca audit trail...
        </div>
      ) : null}

      <div className="space-y-4">
        {items.map((item) => (
          <article key={item._id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{item.action}</h2>
                <div className="text-sm text-gray-500">
                  {item.entityType} • {String(item.entityId || "-")}
                </div>
              </div>
              <div className="text-sm text-gray-500">{formatDateTime(item.createdAt)}</div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-gray-500">Actor</div>
                <div className="font-medium text-gray-900">
                  {item.actorEmail || item.actorId || "necunoscut"}
                </div>
                <div>{item.actorRole || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Request</div>
                <div className="font-medium text-gray-900">{item.requestId || "-"}</div>
                <div>{item.ip || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Rezumat</div>
                <div className="font-medium text-gray-900">{item.summary || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">User agent</div>
                <div className="break-all">{item.userAgent || "-"}</div>
              </div>
            </div>

            <details className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800">
                Metadata
              </summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-gray-700">
                {renderMetadata(item.metadata)}
              </pre>
            </details>
          </article>
        ))}

        {!auditQuery.isLoading && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
            Nu exista intrari pentru filtrul curent.
          </div>
        ) : null}
      </div>
    </div>
  );
}
