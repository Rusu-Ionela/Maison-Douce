import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useLocation } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import api from "/src/lib/api.js";
import { buttons, cards, containers, inputs } from "/src/lib/tailwindComponents.js";
import {
  fetchOrderDetails,
  fetchStripeStatus,
  fetchWalletDetails,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";

const publicKey = import.meta.env.VITE_STRIPE_PK || "";
const stripePromise = publicKey ? loadStripe(publicKey) : null;
const EMPTY_WALLET = {
  puncteCurent: 0,
  reduceriDisponibile: [],
};

function money(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

function isPaidOrder(order) {
  return order?.paymentStatus === "paid" || order?.statusPlata === "paid";
}

function PaymentForm({ clientSecret, displayTotal, comandaId, onStatusChange }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!clientSecret) return null;

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setErrorMsg("");
    onStatusChange?.({
      type: "info",
      message: "Confirmam plata cu Stripe. Te rugam sa astepti.",
    });

    const returnUrl = comandaId
      ? `${window.location.origin}/plata/succes?comandaId=${encodeURIComponent(
          comandaId
        )}`
      : `${window.location.origin}/plata/succes`;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (error) {
      const message = error.message || "Plata a esuat.";
      setErrorMsg(message);
      onStatusChange?.({ type: "error", message });
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        if (paymentIntent.id && comandaId) {
          await api.post("/stripe/confirm-payment", {
            paymentIntentId: paymentIntent.id,
            comandaId,
          });
        }
      } catch (err) {
        console.warn("confirm-payment failed in UI:", err?.message || err);
      }

      window.location.assign(
        comandaId
          ? `/plata/succes?comandaId=${encodeURIComponent(comandaId)}`
          : "/plata/succes"
      );
      return;
    }

    const message =
      paymentIntent?.status === "processing"
        ? "Plata este in procesare. Verifica din nou in cateva secunde."
        : "Plata a fost trimisa, dar confirmarea nu este inca disponibila.";
    setErrorMsg(message);
    onStatusChange?.({ type: "warning", message });
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement />
      <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-gray-800">
        Total de plata: {money(displayTotal)}
      </div>
      <StatusBanner type="error" message={errorMsg} />
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className={buttons.primary}
      >
        {submitting ? "Se proceseaza..." : "Plateste acum"}
      </button>
    </form>
  );
}

export default function Plata() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth() || {};
  const userId = user?._id || user?.id;
  const comandaId = new URLSearchParams(location.search).get("comandaId");

  const [codCupon, setCodCupon] = useState("");
  const [codVoucher, setCodVoucher] = useState("");
  const [puncte, setPuncte] = useState("");
  const [pageStatus, setPageStatus] = useState({ type: "", message: "" });

  const stripeStatusQuery = useQuery({
    queryKey: queryKeys.stripeStatus(),
    queryFn: fetchStripeStatus,
  });
  const orderQuery = useQuery({
    queryKey: queryKeys.orderDetail(comandaId),
    queryFn: () => fetchOrderDetails(comandaId),
    enabled: !authLoading && Boolean(userId && comandaId),
  });
  const walletQuery = useQuery({
    queryKey: queryKeys.wallet(userId),
    queryFn: () => fetchWalletDetails(userId),
    enabled: !authLoading && Boolean(userId),
  });

  const comanda = orderQuery.data || null;
  const wallet = walletQuery.data || EMPTY_WALLET;
  const stripeStatus = stripeStatusQuery.data || {
    enabled: false,
    fallbackAvailable: false,
    mode: "unknown",
  };

  const orderPaid = isPaidOrder(comanda);
  const orderDiscount = Number(
    comanda?.discountTotal || comanda?.discountFidelizare || 0
  );
  const orderBaseTotal = Number(comanda?.total || 0);
  const orderTotalFinal = Number(comanda?.totalFinal ?? comanda?.total ?? 0);
  const orderHasDiscount =
    orderDiscount > 0 ||
    Number(comanda?.pointsUsed || 0) > 0 ||
    Boolean(comanda?.voucherCode);

  const discountLabel = useMemo(() => {
    if (!comanda) return "";
    if (Number(comanda.pointsUsed || 0) > 0) {
      return `${comanda.pointsUsed} puncte`;
    }
    if (comanda.voucherCode) {
      return `cod ${comanda.voucherCode}`;
    }
    return "";
  }, [comanda]);

  const canUseStripeCheckout = stripeStatus.enabled;
  const canUseEmbeddedStripe = canUseStripeCheckout && Boolean(publicKey);
  const canUseFallbackPayment =
    !canUseStripeCheckout && stripeStatus.fallbackAvailable;

  const paymentIntentQuery = useQuery({
    queryKey: queryKeys.paymentIntent(comandaId, orderTotalFinal),
    queryFn: async () => {
      const { data } = await api.post("/stripe/create-payment-intent", {
        currency: "mdl",
        comandaId,
      });
      return data?.clientSecret || "";
    },
    enabled:
      canUseEmbeddedStripe &&
      Boolean(comandaId && comanda) &&
      !orderPaid &&
      orderTotalFinal > 0,
    retry: false,
    refetchOnMount: false,
  });

  const paymentDisabled =
    authLoading ||
    !userId ||
    !comandaId ||
    !comanda ||
    orderQuery.isLoading ||
    orderPaid;

  const refreshAfterDiscount = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.orderDetail(comandaId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.wallet(userId),
      }),
    ]);

    setCodCupon("");
    setCodVoucher("");
    setPuncte("");
  };

  const couponMutation = useMutation({
    mutationFn: () =>
      api.post("/coupon/apply", {
        cod: codCupon.trim(),
        comandaId,
      }),
    onSuccess: async (response) => {
      await refreshAfterDiscount();
      setPageStatus({
        type: "success",
        message: `Cupon aplicat cu succes: -${money(
          response?.data?.discount || 0
        )}.`,
      });
    },
    onError: (error) => {
      setPageStatus({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Nu am putut aplica acest cupon."
        ),
      });
    },
  });

  const voucherMutation = useMutation({
    mutationFn: () =>
      api.post("/fidelizare/apply-voucher", {
        utilizatorId: userId,
        cod: codVoucher.trim(),
        comandaId,
      }),
    onSuccess: async (response) => {
      await refreshAfterDiscount();
      setPageStatus({
        type: "success",
        message: `Voucher aplicat: -${money(
          response?.data?.discount || 0
        )}.`,
      });
    },
    onError: (error) => {
      setPageStatus({
        type: "error",
        message: getApiErrorMessage(error, "Voucher invalid sau expirat."),
      });
    },
  });

  const pointsMutation = useMutation({
    mutationFn: (pointsValue) =>
      api.post("/fidelizare/apply-points", {
        utilizatorId: userId,
        puncte: pointsValue,
        comandaId,
      }),
    onSuccess: async (response) => {
      await refreshAfterDiscount();
      setPageStatus({
        type: "success",
        message: `Puncte aplicate: -${money(
          response?.data?.discount || 0
        )}.`,
      });
    },
    onError: (error) => {
      setPageStatus({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut aplica punctele."),
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api.post(`/stripe/create-checkout-session/${comandaId}`, {
        currency: "mdl",
      }),
    onSuccess: (response) => {
      if (response?.data?.url) {
        window.location.assign(response.data.url);
        return;
      }

      setPageStatus({
        type: "error",
        message: "Nu s-a putut crea sesiunea de plata.",
      });
    },
    onError: (error) => {
      setPageStatus({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Eroare la crearea sesiunii de plata."
        ),
      });
    },
  });

  const fallbackMutation = useMutation({
    mutationFn: () => api.post("/stripe/fallback-confirm", { comandaId }),
    onSuccess: () => {
      window.location.assign(
        `/plata/succes?comandaId=${encodeURIComponent(comandaId)}`
      );
    },
    onError: (error) => {
      setPageStatus({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut confirma plata."),
      });
    },
  });

  const discountDisabled =
    paymentDisabled ||
    couponMutation.isPending ||
    voucherMutation.isPending ||
    pointsMutation.isPending ||
    orderHasDiscount;

  const applyCoupon = () => {
    if (!codCupon.trim()) {
      setPageStatus({ type: "warning", message: "Introdu un cod de cupon." });
      return;
    }

    setPageStatus({ type: "", message: "" });
    couponMutation.mutate();
  };

  const applyVoucher = () => {
    if (!codVoucher.trim()) {
      setPageStatus({ type: "warning", message: "Introdu un cod de voucher." });
      return;
    }

    setPageStatus({ type: "", message: "" });
    voucherMutation.mutate();
  };

  const applyPoints = () => {
    const pointsValue = Number(puncte || 0);
    if (!pointsValue || pointsValue <= 0) {
      setPageStatus({
        type: "warning",
        message: "Introdu un numar valid de puncte.",
      });
      return;
    }

    setPageStatus({ type: "", message: "" });
    pointsMutation.mutate(pointsValue);
  };

  const goCheckout = () => {
    if (paymentDisabled) return;

    setPageStatus({
      type: "info",
      message: "Se creeaza sesiunea Stripe Checkout...",
    });
    checkoutMutation.mutate();
  };

  const fallbackPayment = () => {
    if (paymentDisabled) return;

    setPageStatus({
      type: "warning",
      message: "Confirmam plata prin fallback pentru mediul curent.",
    });
    fallbackMutation.mutate();
  };

  const paymentActionBusy =
    checkoutMutation.isPending || fallbackMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      <div className={`${containers.pageMax} space-y-6`}>
        <header className="space-y-2">
          <p className="font-semibold uppercase tracking-[0.2em] text-pink-500">
            Payment
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Plata comenzii</h1>
          <p className="max-w-2xl text-sm text-gray-600">
            Reducerile se aplica direct pe comanda, iar plata foloseste
            intotdeauna totalul real salvat in backend.
          </p>
        </header>

        <StatusBanner
          type={pageStatus.type || "info"}
          message={pageStatus.message}
        />
        <StatusBanner
          type="warning"
          title="Autentificare necesara"
          message={
            !authLoading && !userId
              ? "Trebuie sa fii autentificat pentru a plati aceasta comanda."
              : ""
          }
        />
        <StatusBanner
          type="error"
          title="Comanda lipsa"
          message={
            !comandaId ? "Adauga ?comandaId=... in URL pentru a continua." : ""
          }
        />
        <StatusBanner
          type="error"
          message={
            orderQuery.error
              ? getApiErrorMessage(
                  orderQuery.error,
                  "Nu am putut incarca aceasta comanda."
                )
              : ""
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr,0.9fr]">
          <section className={`${cards.default} space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Rezumat comanda
                </h2>
                <p className="text-sm text-gray-500">
                  {comanda?.numeroComanda || comanda?._id || "Comanda in curs"}
                </p>
              </div>
              {orderPaid ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Platita
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  In asteptare
                </span>
              )}
            </div>

            {orderQuery.isLoading && (
              <div className="rounded-2xl bg-gray-50 px-4 py-6 text-sm text-gray-600">
                Se incarca datele comenzii...
              </div>
            )}

            {!orderQuery.isLoading && comanda && (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-gray-700 md:grid-cols-2">
                  <div>
                    <div className="text-gray-500">Livrare</div>
                    <div className="font-semibold">
                      {comanda.dataLivrare || "-"} {comanda.oraLivrare || ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Metoda</div>
                    <div className="font-semibold">
                      {comanda.metodaLivrare || "ridicare"}
                    </div>
                  </div>
                  {comanda.adresaLivrare && (
                    <div className="md:col-span-2">
                      <div className="text-gray-500">Adresa</div>
                      <div className="font-semibold">{comanda.adresaLivrare}</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {(comanda.items || []).length === 0 ? (
                    <div className="text-sm text-gray-600">
                      Nu exista produse pe aceasta comanda.
                    </div>
                  ) : (
                    (comanda.items || []).map((item, index) => (
                      <div
                        key={`${item.productId || item._id || index}`}
                        className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3"
                      >
                        <div>
                          <div className="font-semibold text-gray-900">
                            {item.name || item.nume || "Produs"}
                          </div>
                          <div className="text-sm text-gray-500">
                            Cantitate: {item.qty || item.cantitate || 1}
                          </div>
                        </div>
                        <div className="font-semibold text-pink-600">
                          {money(item.price || item.pret || 0)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Total initial</span>
                    <span className="font-semibold">{money(orderBaseTotal)}</span>
                  </div>
                  {orderDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>
                        Discount aplicat{" "}
                        {discountLabel ? `(${discountLabel})` : ""}
                      </span>
                      <span className="font-semibold">
                        -{money(orderDiscount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base text-gray-900">
                    <span>Total final</span>
                    <span className="font-bold">{money(orderTotalFinal)}</span>
                  </div>
                </div>

                {orderPaid && (
                  <StatusBanner
                    type="success"
                    message="Comanda este deja platita. Poti reveni in pagina de confirmare sau in profil."
                  />
                )}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className={cards.elevated}>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">
                Discounturi si fidelizare
              </h2>

              <StatusBanner
                type="error"
                message={
                  walletQuery.error
                    ? getApiErrorMessage(
                        walletQuery.error,
                        "Nu am putut incarca portofelul de fidelizare."
                      )
                    : ""
                }
              />
              {orderHasDiscount && !orderPaid && (
                <StatusBanner
                  type="info"
                  message="Comanda are deja un discount aplicat. Nu se pot combina mai multe reduceri."
                />
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Cod cupon
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={codCupon}
                      onChange={(event) => setCodCupon(event.target.value)}
                      placeholder="ex: DULCE10"
                      disabled={discountDisabled}
                      className={`${inputs.default} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={discountDisabled}
                      className={buttons.outline}
                    >
                      {couponMutation.isPending ? "Se aplica..." : "Aplica"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Cod voucher
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={codVoucher}
                      onChange={(event) => setCodVoucher(event.target.value)}
                      placeholder="ex: PROMO-123"
                      disabled={discountDisabled}
                      className={`${inputs.default} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={applyVoucher}
                      disabled={discountDisabled}
                      className={buttons.outline}
                    >
                      {voucherMutation.isPending ? "Se aplica..." : "Aplica"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Foloseste puncte
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={puncte}
                      onChange={(event) => setPuncte(event.target.value)}
                      placeholder="ex: 100"
                      disabled={discountDisabled}
                      className={`${inputs.default} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={applyPoints}
                      disabled={discountDisabled}
                      className={buttons.outline}
                    >
                      {pointsMutation.isPending ? "Se aplica..." : "Aplica"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  {walletQuery.isLoading ? (
                    "Se incarca portofelul..."
                  ) : (
                    <>
                      <div>Puncte disponibile: {wallet.puncteCurent || 0}</div>
                      {(wallet.reduceriDisponibile || []).length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="font-semibold text-gray-700">
                            Vouchere disponibile
                          </div>
                          {(wallet.reduceriDisponibile || []).map((voucher) => (
                            <button
                              key={voucher.codigPromo}
                              type="button"
                              className="block text-left text-pink-600 underline"
                              onClick={() => setCodVoucher(voucher.codigPromo)}
                              disabled={discountDisabled}
                            >
                              {voucher.codigPromo}
                              {voucher.valoareFixa
                                ? ` - ${voucher.valoareFixa} MDL`
                                : ""}
                              {voucher.procent ? ` - ${voucher.procent}%` : ""}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={cards.elevated}>
              <h2 className="mb-3 text-xl font-semibold text-gray-900">
                Metode de plata
              </h2>

              <StatusBanner
                type="info"
                message={
                  !stripeStatusQuery.isLoading
                    ? `Stripe este ${
                        stripeStatus.enabled ? "activ" : "indisponibil"
                      } (${stripeStatus.mode}).`
                    : ""
                }
              />
              <StatusBanner
                type="error"
                message={
                  paymentIntentQuery.error
                    ? getApiErrorMessage(
                        paymentIntentQuery.error,
                        "Nu am putut initializa plata cu cardul."
                      )
                    : ""
                }
              />

              {orderTotalFinal <= 0 && comanda && !orderPaid && (
                <StatusBanner
                  type="warning"
                  message="Totalul comenzii este 0. Verifica reducerile sau confirma manual cu administratorul."
                />
              )}

              <div className="space-y-3">
                {!stripeStatusQuery.isLoading && canUseStripeCheckout && (
                  <button
                    type="button"
                    onClick={goCheckout}
                    disabled={paymentDisabled || paymentActionBusy}
                    className={buttons.secondary}
                  >
                    {checkoutMutation.isPending
                      ? "Se creeaza sesiunea..."
                      : `Stripe Checkout (${stripeStatus.mode})`}
                  </button>
                )}

                {!stripeStatusQuery.isLoading && canUseFallbackPayment && (
                  <button
                    type="button"
                    onClick={fallbackPayment}
                    disabled={paymentDisabled || paymentActionBusy}
                    className={buttons.success}
                  >
                    {fallbackMutation.isPending
                      ? "Se confirma plata..."
                      : "Confirma plata (fallback)"}
                  </button>
                )}

                {!stripeStatusQuery.isLoading &&
                  !canUseStripeCheckout &&
                  !canUseFallbackPayment && (
                    <StatusBanner
                      type="error"
                      message="Plata este indisponibila momentan. Contacteaza administratorul."
                    />
                  )}

                {canUseStripeCheckout && !publicKey && (
                  <StatusBanner
                    type="warning"
                    message="Checkout redirect este disponibil. Payment Element este indisponibil pana configurezi VITE_STRIPE_PK."
                  />
                )}
              </div>

              {paymentIntentQuery.isFetching && canUseEmbeddedStripe && !orderPaid && (
                <div className="mt-4 text-sm text-gray-600">
                  Se initializeaza plata cu cardul...
                </div>
              )}

              {paymentIntentQuery.data &&
                canUseEmbeddedStripe &&
                stripePromise &&
                !orderPaid && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <Elements
                      stripe={stripePromise}
                      options={{ clientSecret: paymentIntentQuery.data }}
                    >
                      <PaymentForm
                        clientSecret={paymentIntentQuery.data}
                        displayTotal={orderTotalFinal}
                        comandaId={comandaId}
                        onStatusChange={setPageStatus}
                      />
                    </Elements>
                  </div>
                )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
