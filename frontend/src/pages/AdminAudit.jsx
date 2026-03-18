import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import { buttons, inputs } from "../lib/tailwindComponents";
import {
  fetchAdminAuditLogs,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";
const EMPTY_LIST = [];

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO");
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

  const items = auditQuery.data ?? EMPTY_LIST;

  const metrics = useMemo(() => {
    const uniqueActions = new Set(items.map((item) => item.action).filter(Boolean)).size;
    const uniqueActors = new Set(
      items.map((item) => item.actorEmail || item.actorId).filter(Boolean)
    ).size;
    const latestEntry = items[0]?.createdAt || "";

    return [
      {
        label: "Intrari vizibile",
        value: items.length,
        hint: "Rezultatele pentru filtrul activ.",
        tone: "rose",
      },
      {
        label: "Actiuni distincte",
        value: uniqueActions,
        hint: "Tipuri diferite de evenimente auditate.",
        tone: "sage",
      },
      {
        label: "Actori unici",
        value: uniqueActors,
        hint: "Utilizatori sau procese care au produs evenimente.",
        tone: "gold",
      },
      {
        label: "Ultima intrare",
        value: latestEntry ? formatDateTime(latestEntry) : "-",
        hint: "Cel mai recent eveniment din lista.",
        tone: "slate",
      },
    ];
  }, [items]);

  return (
    <AdminShell
      title="Audit trail"
      description="Verifica actiunile sensibile din comenzi, fidelizare si catalog cu filtre utile pentru investigatie rapida si verificare de conformitate."
      actions={
        <button
          type="button"
          onClick={() => auditQuery.refetch()}
          className={buttons.outline}
        >
          Reincarca
        </button>
      }
    >
      <StatusBanner
        type="error"
        message={
          auditQuery.error
            ? getApiErrorMessage(auditQuery.error, "Nu am putut incarca audit trail.")
            : ""
        }
      />
      <StatusBanner
        type="info"
        message={auditQuery.isLoading ? "Se incarca audit trail..." : ""}
      />

      <AdminMetricGrid items={metrics} />

      <AdminPanel
        title="Filtre investigatie"
        description="Cauta rapid dupa actiune, entitate sau actor pentru a izola exact evenimentul relevant."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm text-gray-700">
            Actiune
            <input
              className={`${inputs.default} mt-1`}
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
              className={`${inputs.default} mt-1`}
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
              className={`${inputs.default} mt-1`}
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
              className={`${inputs.default} mt-1`}
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
        title="Evenimente auditate"
        description="Cardurile pastreaza contextul actorului, request-ului si metadata relevante pentru reconstructia unei operatiuni."
      >
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item._id}
              className="rounded-[24px] border border-rose-100 bg-rose-50/40 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{item.action}</h2>
                  <div className="text-sm text-gray-500">
                    {item.entityType} - {String(item.entityId || "-")}
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

              <details className="mt-4 rounded-xl border border-gray-100 bg-white/80 p-3">
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
            <div className="rounded-[24px] border border-dashed border-gray-300 p-5 text-sm text-gray-600">
              Nu exista intrari pentru filtrul curent.
            </div>
          ) : null}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
