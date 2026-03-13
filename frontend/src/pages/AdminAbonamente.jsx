import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import {
  fetchAdminSubscriptions,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";
import {
  SUBSCRIPTION_PLANS,
  formatSubscriptionMoney,
  getSubscriptionPlan,
} from "../lib/subscriptions";

const EMPTY_LIST = [];

function getClientLabel(item) {
  const client = item?.clientId;
  if (!client) return "Client necunoscut";
  return client.nume || client.email || client._id || String(client);
}

function getClientEmail(item) {
  const client = item?.clientId;
  return client?.email || "";
}

export default function AdminAbonamente() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState({ type: "info", message: "" });
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});

  const subscriptionsQuery = useQuery({
    queryKey: queryKeys.adminSubscriptions(),
    queryFn: fetchAdminSubscriptions,
  });

  const list = subscriptionsQuery.data || EMPTY_LIST;
  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return list;

    return list.filter((item) => {
      const clientName = getClientLabel(item).toLowerCase();
      const clientEmail = getClientEmail(item).toLowerCase();
      const planName = getSubscriptionPlan(item.plan || "basic").name.toLowerCase();
      return (
        clientName.includes(normalizedSearch) ||
        clientEmail.includes(normalizedSearch) ||
        planName.includes(normalizedSearch)
      );
    });
  }, [list, search]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminSubscriptions() });
  };

  const actionMutation = useMutation({
    mutationFn: async ({ type, id, payload = {} }) => {
      if (type === "update") {
        return api.patch(`/cutie-lunara/${id}`, payload);
      }
      return api.patch(`/cutie-lunara/${id}/${type}`);
    },
    onSuccess: async (_response, variables) => {
      await refresh();
      if (variables.type === "update") {
        setFeedback({ type: "success", message: "Abonamentul a fost actualizat." });
        return;
      }
      const messages = {
        pause: "Abonamentul a fost pus pe pauza.",
        resume: "Abonamentul a fost reactivat.",
        stop: "Abonamentul a fost oprit.",
      };
      setFeedback({
        type: variables.type === "stop" ? "warning" : "success",
        message: messages[variables.type] || "Actiunea a fost salvata.",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut salva modificarile."),
      });
    },
  });

  const updateDraft = (subscriptionId, field, value, fallbackPlan, fallbackPreferinte) => {
    setDrafts((current) => ({
      ...current,
      [subscriptionId]: {
        plan: current[subscriptionId]?.plan || fallbackPlan,
        preferinte:
          current[subscriptionId]?.preferinte ?? fallbackPreferinte ?? "",
        [field]: value,
      },
    }));
  };

  const getDraft = (item) =>
    drafts[item._id] || {
      plan: item.plan || "basic",
      preferinte: item.preferinte || "",
    };

  const pending = actionMutation.isPending;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abonamente</h1>
          <p className="text-gray-600">
            Management staff pentru planuri, preferinte si starea operationala a abonamentelor.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cauta client sau plan"
            className="rounded-xl border p-2"
          />
          <button type="button" onClick={() => subscriptionsQuery.refetch()} className="rounded-xl border px-3 py-2">
            Reincarca
          </button>
        </div>
      </header>

      <StatusBanner type={feedback.type} message={feedback.message} />
      <StatusBanner
        type="error"
        message={
          subscriptionsQuery.error
            ? getApiErrorMessage(
                subscriptionsQuery.error,
                "Nu am putut incarca lista de abonamente."
              )
            : ""
        }
      />
      <StatusBanner
        type="info"
        message={pending ? "Se salveaza modificarile..." : ""}
      />

      {subscriptionsQuery.isLoading ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
          Se incarca abonamentele...
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filtered.map((item) => {
          const draft = getDraft(item);
          const currentPlan = getSubscriptionPlan(item.plan || "basic");
          const pendingPlan = item.pendingPlan
            ? getSubscriptionPlan(item.pendingPlan)
            : null;

          return (
            <div key={item._id} className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{getClientLabel(item)}</h2>
                  <div className="text-sm text-gray-500">{getClientEmail(item) || "fara email"}</div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    item.activ
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {item.activ ? "Activ" : "Inactiv"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-gray-500">Plan curent</div>
                  <div className="font-semibold text-gray-900">{currentPlan.name}</div>
                  <div>{formatSubscriptionMoney(item.pretLunar)}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-gray-500">Stare plata</div>
                  <div className="font-semibold text-gray-900">{item.statusPlata || "-"}</div>
                  <div>Ultima plata: {item.ultimaPlataLa ? new Date(item.ultimaPlataLa).toLocaleDateString() : "-"}</div>
                </div>
              </div>

              {pendingPlan ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Checkout in asteptare pentru schimbare la <strong>{pendingPlan.name}</strong>.
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm text-gray-700">
                  Plan
                  <select
                    className="mt-1 w-full rounded-xl border p-2"
                    value={draft.plan}
                    onChange={(event) =>
                      updateDraft(
                        item._id,
                        "plan",
                        event.target.value,
                        item.plan || "basic",
                        item.preferinte || ""
                      )
                    }
                  >
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-gray-700 md:col-span-1">
                  Preferinte
                  <textarea
                    className="mt-1 min-h-[110px] w-full rounded-xl border p-2"
                    value={draft.preferinte}
                    onChange={(event) =>
                      updateDraft(
                        item._id,
                        "preferinte",
                        event.target.value,
                        item.plan || "basic",
                        item.preferinte || ""
                      )
                    }
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    actionMutation.mutate({
                      type: "update",
                      id: item._id,
                      payload: {
                        plan: draft.plan,
                        preferinte: draft.preferinte,
                      },
                    })
                  }
                  className="rounded-xl bg-rose-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Salveaza
                </button>
                <button
                  type="button"
                  disabled={pending || !item.activ}
                  onClick={() => actionMutation.mutate({ type: "pause", id: item._id })}
                  className="rounded-xl border px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Pauza
                </button>
                <button
                  type="button"
                  disabled={pending || item.activ}
                  onClick={() => actionMutation.mutate({ type: "resume", id: item._id })}
                  className="rounded-xl border px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reia
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => actionMutation.mutate({ type: "stop", id: item._id })}
                  className="rounded-xl border border-rose-300 px-4 py-2 text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Opreste
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!subscriptionsQuery.isLoading && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
          Nu exista abonamente care sa corespunda filtrului curent.
        </div>
      ) : null}
    </div>
  );
}
