import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import api from "/src/lib/api.js";
import {
  fetchMySubscription,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";
import {
  SUBSCRIPTION_PLANS,
  formatSubscriptionMoney,
  getSubscriptionPlan,
} from "../lib/subscriptions";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function initialPlanFromSearch(searchParams) {
  const fromQuery = String(searchParams.get("plan") || "").trim().toLowerCase();
  return SUBSCRIPTION_PLANS.some((plan) => plan.id === fromQuery)
    ? fromQuery
    : SUBSCRIPTION_PLANS[0].id;
}

export default function Abonament() {
  const { user, loading: authLoading } = useAuth() || {};
  const [searchParams] = useSearchParams();
  const searchPlan = searchParams.get("plan");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = user?._id || user?.id;

  const [selectedPlanId, setSelectedPlanId] = useState(() =>
    initialPlanFromSearch(searchParams)
  );
  const [preferinte, setPreferinte] = useState("");
  const [feedback, setFeedback] = useState({ type: "info", message: "" });

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.mySubscription(),
    queryFn: fetchMySubscription,
    enabled: Boolean(userId),
  });

  const subscription = subscriptionQuery.data || null;
  const subscriptionId = subscription?._id || "";
  const selectedPlan = useMemo(
    () => getSubscriptionPlan(selectedPlanId),
    [selectedPlanId]
  );
  const currentPlan = subscription?.plan
    ? getSubscriptionPlan(subscription.plan)
    : null;

  useEffect(() => {
    const nextPlan = String(searchPlan || "").trim().toLowerCase();
    if (SUBSCRIPTION_PLANS.some((plan) => plan.id === nextPlan)) {
      setSelectedPlanId(nextPlan);
    }
  }, [searchPlan]);

  useEffect(() => {
    if (!subscription) {
      setPreferinte("");
      return;
    }

    if (
      subscription.pendingPlan &&
      subscription.pendingPlan === selectedPlanId &&
      subscription.pendingPreferinte
    ) {
      setPreferinte(subscription.pendingPreferinte);
      return;
    }

    if (subscription.plan === selectedPlanId) {
      setPreferinte(subscription.preferinte || "");
      return;
    }

    if (!subscription.activ) {
      setPreferinte(subscription.preferinte || "");
      return;
    }

    setPreferinte("");
  }, [
    selectedPlanId,
    subscription,
  ]);

  const refreshSubscription = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.mySubscription() });
  };

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api.post("/cutie-lunara/checkout", {
        plan: selectedPlanId,
        preferinte,
      }),
    onSuccess: async ({ data }) => {
      await refreshSubscription();
      const comandaId = data?.comandaId;
      if (!comandaId) {
        setFeedback({
          type: "warning",
          message: "Checkout-ul a fost creat, dar lipseste comanda de plata.",
        });
        return;
      }
      navigate(`/plata?comandaId=${encodeURIComponent(comandaId)}`);
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Nu am putut porni checkout-ul abonamentului."
        ),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/cutie-lunara/${subscriptionId}`, {
        preferinte,
      }),
    onSuccess: async ({ data }) => {
      await refreshSubscription();
      setPreferinte(data?.abonament?.preferinte || preferinte);
      setFeedback({
        type: "success",
        message: "Preferintele abonamentului au fost actualizate.",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut salva preferintele."),
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.patch(`/cutie-lunara/${subscriptionId}/pause`),
    onSuccess: async () => {
      await refreshSubscription();
      setFeedback({
        type: "success",
        message: "Abonamentul a fost pus pe pauza.",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut pune abonamentul pe pauza."),
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.patch(`/cutie-lunara/${subscriptionId}/resume`),
    onSuccess: async () => {
      await refreshSubscription();
      setFeedback({
        type: "success",
        message: "Abonamentul a fost reactivat.",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut reactiva abonamentul."),
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => api.patch(`/cutie-lunara/${subscriptionId}/stop`),
    onSuccess: async () => {
      await refreshSubscription();
      setFeedback({
        type: "warning",
        message: "Abonamentul a fost oprit. Poti reveni oricand cu un checkout nou.",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut opri abonamentul."),
      });
    },
  });

  const anyMutationPending =
    checkoutMutation.isPending ||
    updateMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    stopMutation.isPending;

  const hasPendingCheckout = Boolean(subscription?.pendingOrderId);
  const activePlanMatches = Boolean(
    subscription?.activ && subscription?.plan === selectedPlanId
  );
  const selectedMatchesPending = Boolean(
    subscription?.pendingOrderId && subscription?.pendingPlan === selectedPlanId
  );
  const canManageCurrentPlan = Boolean(
    subscriptionId &&
      (activePlanMatches ||
        (!hasPendingCheckout && !subscription?.activ && subscription?.plan === selectedPlanId))
  );

  const handleProtectedAction = (callback) => {
    if (authLoading) {
      return;
    }
    if (!userId) {
      setFeedback({
        type: "warning",
        message: "Autentifica-te pentru a administra abonamentul.",
      });
      navigate("/login");
      return;
    }
    setFeedback({ type: "info", message: "" });
    callback();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-500">
          Subscription studio
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Abonamentul Maison Douce</h1>
        <p className="max-w-3xl text-gray-600">
          Alege planul, gestioneaza preferintele si controleaza starea abonamentului din
          acelasi loc. Pentru schimbarea planului activ se creeaza automat un checkout nou,
          fara sa iti dezactiveze imediat abonamentul curent.
        </p>
      </header>

      <StatusBanner type={feedback.type} message={feedback.message} />
      <StatusBanner
        type="error"
        message={
          subscriptionQuery.error
            ? getApiErrorMessage(
                subscriptionQuery.error,
                "Nu am putut incarca starea abonamentului."
              )
            : ""
        }
      />
      <StatusBanner
        type="info"
        message={anyMutationPending ? "Se salveaza modificarile..." : ""}
      />
      <StatusBanner
        type="warning"
        message={
          !userId && !authLoading
            ? "Te poti uita la planuri, dar ai nevoie de autentificare pentru checkout si administrare."
            : ""
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Planuri disponibile</h2>
              <p className="text-sm text-gray-600">
                Selectia ramane vizibila si pentru clienti neautentificati.
              </p>
            </div>
            {subscriptionQuery.isLoading && userId ? (
              <span className="text-sm text-gray-500">Se incarca starea curenta...</span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const selected = selectedPlanId === plan.id;
              const isCurrent = subscription?.plan === plan.id;
              const isPending = subscription?.pendingPlan === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-rose-400 bg-rose-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    {isCurrent ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        Curent
                      </span>
                    ) : null}
                    {!isCurrent && isPending ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        In asteptare
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                  <p className="mt-4 text-2xl font-bold text-rose-600">
                    {formatSubscriptionMoney(plan.price)}
                    <span className="text-sm font-medium text-gray-500"> / luna</span>
                  </p>
                  <ul className="mt-4 space-y-1 text-sm text-gray-600">
                    {plan.perks.map((perk) => (
                      <li key={perk}>- {perk}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Stare curenta</h2>
            <p className="text-sm text-gray-600">
              Rezumatul contului de abonament si actiunile rapide.
            </p>
          </div>

          {!subscription && !subscriptionQuery.isLoading && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
              Nu exista inca un abonament creat pe contul tau.
            </div>
          )}

          {subscription && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-900">
                    {currentPlan?.name || "Plan curent"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      subscription.activ
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {subscription.activ ? "Activ" : "Inactiv"}
                  </span>
                </div>
                <div>Pret lunar: {formatSubscriptionMoney(subscription.pretLunar)}</div>
                <div>Activat la: {formatDate(subscription.dataActivare)}</div>
                <div>Ultima plata: {formatDate(subscription.ultimaPlataLa)}</div>
                <div>Status plata: {subscription.statusPlata || "-"}</div>
              </div>

              {hasPendingCheckout ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
                  <div className="font-semibold">Checkout in asteptare</div>
                  <div>
                    {subscription.pendingPlan
                      ? `Ai o schimbare de plan in asteptare catre ${getSubscriptionPlan(subscription.pendingPlan).name}.`
                      : "Ai un checkout de activare in asteptare pentru acest abonament."}
                  </div>
                  <Link
                    to={`/plata?comandaId=${encodeURIComponent(subscription.pendingOrderId)}`}
                    className="inline-flex rounded-lg border border-amber-300 px-3 py-2 font-medium text-amber-900"
                  >
                    Continua plata
                  </Link>
                </div>
              ) : null}
            </div>
          )}

          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 space-y-3">
            <div>
              <div className="text-sm text-gray-500">Plan selectat</div>
              <div className="text-lg font-semibold text-gray-900">{selectedPlan.name}</div>
              <div className="text-sm text-gray-600">
                {formatSubscriptionMoney(selectedPlan.price)} / luna
              </div>
            </div>

            <label className="block text-sm text-gray-700">
              Preferinte / alergii
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-xl border border-rose-200 bg-white p-3"
                value={preferinte}
                onChange={(event) => setPreferinte(event.target.value)}
                placeholder="Ex: fara nuci, fara gluten, prefer deserturi cu citrice"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {canManageCurrentPlan ? (
                <button
                  type="button"
                  disabled={updateMutation.isPending || !subscriptionId}
                  onClick={() => handleProtectedAction(() => updateMutation.mutate())}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Salveaza preferintele
                </button>
              ) : (
                <button
                  type="button"
                  disabled={checkoutMutation.isPending}
                  onClick={() => handleProtectedAction(() => checkoutMutation.mutate())}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedMatchesPending
                    ? "Actualizeaza checkout-ul existent"
                    : subscription?.activ
                      ? "Schimba planul prin checkout"
                      : "Continua la plata"}
                </button>
              )}

              {subscriptionId ? (
                <>
                  {subscription?.activ ? (
                    <button
                      type="button"
                      disabled={pauseMutation.isPending}
                      onClick={() => handleProtectedAction(() => pauseMutation.mutate())}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Pune pe pauza
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={resumeMutation.isPending}
                      onClick={() => handleProtectedAction(() => resumeMutation.mutate())}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reia abonamentul
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={stopMutation.isPending}
                    onClick={() => handleProtectedAction(() => stopMutation.mutate())}
                    className="rounded-xl border border-rose-300 px-4 py-2 text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Opreste complet
                  </button>
                </>
              ) : null}
            </div>

            {!userId ? (
              <div className="text-sm text-gray-600">
                Pentru checkout si administrare mergi in{" "}
                <Link to="/login" className="font-semibold text-rose-700 underline">
                  autentificare
                </Link>
                .
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
