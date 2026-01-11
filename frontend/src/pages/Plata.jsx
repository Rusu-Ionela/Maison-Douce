// frontend/src/pages/Plata.jsx
import React, { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useLocation } from "react-router-dom";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";

const publicKey = import.meta.env.VITE_STRIPE_PK;
const missingStripeKey = !publicKey;
const isDev = import.meta.env.MODE !== "production";
const canUseStripe = !missingStripeKey;
const canUseDevPayments = missingStripeKey && isDev;

const stripePromise = canUseStripe ? loadStripe(publicKey) : null;

function money(n) {
    return (Number(n || 0)).toFixed(2);
}

function PaymentForm({ clientSecret, displayTotal, comandaId }) {
    const stripe = useStripe();
    const elements = useElements();
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    if (!clientSecret) return null;

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg("");

        const returnUrl = comandaId
            ? `${window.location.origin}/plata/succes?comandaId=${comandaId}`
            : `${window.location.origin}/plata/succes`;
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: returnUrl },
            redirect: "if_required",
        });

        if (error) setErrorMsg(error.message || "Payment failed");
        setSubmitting(false);
    };

    return (
        <form onSubmit={onSubmit} style={{ maxWidth: 480, margin: "0 auto" }}>
            <PaymentElement />
            {displayTotal != null && (
                <div style={{ marginTop: 10, fontWeight: 600 }}>
                    Total de plata: {money(displayTotal)}
                </div>
            )}
            {errorMsg && <div style={{ color: "crimson", marginTop: 8 }}>{errorMsg}</div>}
            <button
                type="submit"
                disabled={!stripe || !elements || submitting}
                style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8 }}
            >
                {submitting ? "Se proceseaza..." : "Plateste"}
            </button>
        </form>
    );
}

export default function Plata() {
    const location = useLocation();
    const { user } = useAuth() || {};
    const userId = user?._id || user?.id;
    const comandaId = new URLSearchParams(location.search).get("comandaId");

    const [loadingComanda, setLoadingComanda] = useState(false);
    const [comanda, setComanda] = useState(null);

    const [codCupon, setCodCupon] = useState("");
    const [reducerePct, setReducerePct] = useState(0);
    const [cuponStatus, setCuponStatus] = useState(null); // "ok" | "invalid" | null

    const [codVoucher, setCodVoucher] = useState("");
    const [puncte, setPuncte] = useState(0);
    const [discountFidelizare, setDiscountFidelizare] = useState(0);
    const [fidelizareMsg, setFidelizareMsg] = useState("");
    const [busyFidelizare, setBusyFidelizare] = useState(false);
    const [fidelizareSource, setFidelizareSource] = useState("");

    const [creatingCheckout, setCreatingCheckout] = useState(false);
    const [clientSecret, setClientSecret] = useState("");
    const [loadingPI, setLoadingPI] = useState(false);

    const [wallet, setWallet] = useState({ puncteCurent: 0, reduceriDisponibile: [] });
    const [loadingWallet, setLoadingWallet] = useState(false);

    // 1) Adu comanda
    useEffect(() => {
        (async () => {
            if (!comandaId) return;
            setLoadingComanda(true);
            try {
                const { data } = await api.get(`/comenzi/${comandaId}`);
                setComanda(data);
            } catch (e) {
                console.error("Nu pot incarca comanda:", e);
            } finally {
                setLoadingComanda(false);
            }
        })();
    }, [comandaId]);

    // 2) Total baza
    const totalDeBaza = useMemo(() => {
        if (!comanda) return 0;
        const itemsTotal = (comanda.items || []).reduce(
            (s, it) => s + Number(it.price || it.pret || 0) * Number(it.qty || it.cantitate || 1),
            0
        );
        const livrare = Number(comanda.taxaLivrare || 0);
        const fallback = itemsTotal + livrare;
        return Number(comanda.total ?? fallback) || 0;
    }, [comanda]);

    // 3) Reducere procentuala (cupon)
    const totalRedus = useMemo(() => {
        if (!totalDeBaza) return 0;
        const factor = Math.max(0, Math.min(100, Number(reducerePct || 0)));
        return totalDeBaza * (1 - factor / 100);
    }, [totalDeBaza, reducerePct]);

    const totalFinal = useMemo(() => {
        const t = totalRedus - Number(discountFidelizare || 0);
        return t > 0 ? t : 0;
    }, [totalRedus, discountFidelizare]);

    const hasFidelizare = discountFidelizare > 0;
    const fidelizareDisabled = busyFidelizare || reducerePct > 0 || hasFidelizare;

    // 4b) Adu portofel fidelizare
    useEffect(() => {
        if (!userId) return;
        setLoadingWallet(true);
        (async () => {
            try {
                const { data } = await api.get(`/fidelizare/client/${userId}`);
                setWallet({
                    puncteCurent: data.puncteCurent || 0,
                    reduceriDisponibile: data.reduceriDisponibile || [],
                });
            } catch (e) {
                console.warn("Nu am putut incarca portofelul:", e?.message || e);
            } finally {
                setLoadingWallet(false);
            }
        })();
    }, [userId]);

    // 5) PaymentIntent cu total final
    const createPIWithAmount = async () => {
        if (!canUseStripe) return;
        setLoadingPI(true);
        setClientSecret("");
        try {
            const amountCents = Math.max(50, Math.round(totalFinal * 100));
            const { data } = await api.post("/stripe/create-payment-intent", {
                amount: amountCents,
                currency: "mdl",
                comandaId,
            });
            setClientSecret(data?.clientSecret || "");
        } catch (e) {
            console.error("create-payment-intent (amount override) failed:", e);
        } finally {
            setLoadingPI(false);
        }
    };

    // 6) Verifica cupon
    const verificaCupon = async () => {
        setCuponStatus(null);
        setReducerePct(0);
        if (hasFidelizare) {
            setCuponStatus("invalid");
            setFidelizareMsg("Nu poti combina cuponul cu voucher/puncte.");
            return;
        }
        if (!codCupon) return;
        try {
            const { data } = await api.get(`/coupon/verify/${encodeURIComponent(codCupon)}`);
            const pct = Number(data?.procentReducere || data?.discount || 0);
            if (pct > 0) {
                setReducerePct(pct);
                setCuponStatus("ok");
            } else {
                setCuponStatus("invalid");
            }
        } catch (e) {
            console.error(e);
            setCuponStatus("invalid");
        }
    };

    // 7) Stripe Checkout (redirect)
    const goCheckout = async () => {
        if (!canUseStripe) return;
        if (!comandaId) return alert("Adauga comandaId in URL.");
        setCreatingCheckout(true);
        try {
            const { data } = await api.post(`/stripe/create-checkout-session/${comandaId}`);
            if (data?.url) {
                window.location.href = data.url;
            } else {
                alert("Nu s-a putut crea sesiunea de plata.");
            }
        } catch (e) {
            console.error(e);
            alert("Eroare la crearea sesiunii de plata.");
        } finally {
            setCreatingCheckout(false);
        }
    };

    const simulatePayment = async () => {
        if (!canUseDevPayments) return;
        if (!comandaId) return alert("Adauga comandaId in URL.");
        setCreatingCheckout(true);
        try {
            await api.post("/dev-payments/simulate-stripe", { comandaId });
            window.location.href = `/plata/succes?comandaId=${comandaId}`;
        } catch (e) {
            console.error(e);
            alert("Eroare la finalizarea platii.");
        } finally {
            setCreatingCheckout(false);
        }
    };

    // 8) Aplica voucher
    const applyVoucher = async () => {
        if (!userId) {
            return setFidelizareMsg("Trebuie sa fii autentificat pentru a aplica voucherul.");
        }
        if (!comandaId) {
            return setFidelizareMsg("Adauga comandaId pentru aplicarea voucherului.");
        }
        if (reducerePct > 0) {
            return setFidelizareMsg("Nu poti combina cuponul cu voucher/puncte.");
        }
        if (hasFidelizare) {
            return setFidelizareMsg("Discount fidelizare deja aplicat.");
        }
        if (!codVoucher) {
            return setFidelizareMsg("Introdu un cod de voucher.");
        }
        setBusyFidelizare(true);
        setFidelizareMsg("");
        try {
            const { data } = await api.post("/fidelizare/apply-voucher", {
                utilizatorId: userId,
                cod: codVoucher,
                comandaId,
            });
            const d = Number(data.discount || 0);
            setDiscountFidelizare(d);
            setFidelizareSource(`voucher ${data.cod || codVoucher}`);
            setFidelizareMsg(`Voucher aplicat: -${d} MDL`);
        } catch (e) {
            console.error(e);
            setFidelizareMsg(e?.response?.data?.message || "Voucher invalid sau expirat.");
            setDiscountFidelizare(0);
            setFidelizareSource("");
        } finally {
            setBusyFidelizare(false);
        }
    };

    // 9) Aplica puncte
    const applyPoints = async () => {
        if (!userId) {
            return setFidelizareMsg("Trebuie sa fii autentificat pentru a folosi puncte.");
        }
        if (!comandaId) {
            return setFidelizareMsg("Adauga comandaId pentru aplicarea punctelor.");
        }
        if (reducerePct > 0) {
            return setFidelizareMsg("Nu poti combina cuponul cu voucher/puncte.");
        }
        if (hasFidelizare) {
            return setFidelizareMsg("Discount fidelizare deja aplicat.");
        }
        const p = Number(puncte || 0);
        if (p <= 0) {
            return setFidelizareMsg("Introdu numarul de puncte.");
        }
        setBusyFidelizare(true);
        setFidelizareMsg("");
        try {
            const { data } = await api.post("/fidelizare/apply-points", {
                utilizatorId: userId,
                puncte: p,
                comandaId,
            });
            const d = Number(data.discount || 0);
            setDiscountFidelizare(d);
            setFidelizareSource(`puncte (${p}p)`);
            setFidelizareMsg(`Discount din puncte: -${d} MDL. Puncte ramase: ${data.puncteRamase}`);
        } catch (e) {
            console.error(e);
            setFidelizareMsg(e?.response?.data?.message || "Nu s-au putut aplica punctele.");
            setDiscountFidelizare(0);
            setFidelizareSource("");
        } finally {
            setBusyFidelizare(false);
        }
    };

    // 10) Refa PaymentIntent cand se schimba totalul
    useEffect(() => {
        if (!comandaId || !totalDeBaza || !canUseStripe) return;
        createPIWithAmount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comandaId, totalDeBaza, reducerePct, discountFidelizare, canUseStripe]);

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Plata comenzii</h1>

            {!userId && (
                <div className="mb-3 text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-2">
                    Trebuie sa fii autentificat pentru a plati. Autentifica-te si reincearca.
                </div>
            )}

            {!comandaId && (
                <div className="mb-3 text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-2">
                    Adauga <code>?comandaId=...</code> in URL.
                </div>
            )}

            {loadingComanda && <div>Se incarca datele comenzii...</div>}

            {!!totalDeBaza && (
                <div className="mb-4 space-y-1">
                    <div className="text-gray-800">Total initial: <b>{money(totalDeBaza)}</b></div>
                    {reducerePct > 0 ? (
                        <div className="text-gray-800">
                            Reducere: <b>{reducerePct}%</b> - Total dupa reducere: <b>{money(totalRedus)}</b>
                        </div>
                    ) : (
                        <div className="text-gray-600 text-sm">Poti aplica un cupon mai jos.</div>
                    )}
                    {discountFidelizare > 0 && (
                        <div className="text-green-700">
                            Discount fidelizare ({fidelizareSource || "-"}) : -{money(discountFidelizare)} - Total final: <b>{money(totalFinal)}</b>
                        </div>
                    )}
                    {discountFidelizare === 0 && (
                        <div className="text-gray-700">
                            Total final: <b>{money(totalFinal)}</b>
                        </div>
                    )}
                </div>
            )}

            {/* Cupon procentual */}
            <div className="max-w-xl mb-4">
                <label className="block mb-2 font-semibold text-gray-800">Cod cupon</label>
                <div className="flex gap-2">
                    <input
                        value={codCupon}
                        onChange={(e) => setCodCupon(e.target.value)}
                        placeholder="ex: DULCE10"
                        disabled={hasFidelizare}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-pink-500 outline-none disabled:bg-gray-100"
                    />
                    <button
                        onClick={verificaCupon}
                        disabled={hasFidelizare}
                        className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600"
                    >
                        Verifica
                    </button>
                </div>
                {cuponStatus === "ok" && (
                    <div className="text-green-700 mt-2">Cupon valid: {reducerePct}% reducere.</div>
                )}
                {cuponStatus === "invalid" && (
                    <div className="text-red-700 mt-2">Cupon invalid sau expirat.</div>
                )}
            </div>

            {/* Fidelizare: voucher / puncte */}
            <div className="max-w-xl mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Fidelizare</h3>
                <div className="mb-4">
                    <label className="block mb-2 font-semibold text-gray-800">Cod voucher</label>
                    <div className="flex gap-2">
                        <input
                            value={codVoucher}
                            onChange={(e) => setCodVoucher(e.target.value)}
                            placeholder="ex: PROMO-123"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-pink-500 outline-none"
                        />
                        <button
                            onClick={applyVoucher}
                            disabled={fidelizareDisabled}
                            className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50"
                        >
                            Aplica voucher
                        </button>
                    </div>
                </div>
                <div className="mb-2">
                    <label className="block mb-2 font-semibold text-gray-800">Foloseste puncte</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min="0"
                            value={puncte}
                            onChange={(e) => setPuncte(e.target.value)}
                            placeholder="ex: 100"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:border-pink-500 outline-none"
                        />
                        <button
                            onClick={applyPoints}
                            disabled={fidelizareDisabled}
                            className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                            Aplica puncte
                        </button>
                    </div>
                </div>
                {fidelizareMsg && (
                    <div className={`mt-2 ${fidelizareMsg.toLowerCase().includes("nu") ? "text-red-700" : "text-green-700"}`}>
                        {fidelizareMsg}
                    </div>
                )}
                {loadingWallet ? (
                    <div className="mt-2 text-gray-600">Se incarca portofelul...</div>
                ) : (
                    <div className="mt-2 text-sm text-gray-600">
                        Puncte disponibile: {wallet.puncteCurent || 0}
                        {wallet.reduceriDisponibile?.length > 0 && (
                            <div className="mt-1">
                                Vouchere disponibile:
                                <ul className="pl-4 list-disc">
                                    {wallet.reduceriDisponibile.map((v) => (
                                        <li
                                            key={v.codigPromo}
                                            className="cursor-pointer hover:text-pink-600"
                                            onClick={() => setCodVoucher(v.codigPromo)}
                                        >
                                            {v.codigPromo} {v.valoareFixa ? `- ${v.valoareFixa} MDL` : ""} {v.procent ? `- ${v.procent}%` : ""}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {canUseStripe && (
                <div className="my-4">
                    <button
                        onClick={goCheckout}
                        disabled={creatingCheckout}
                        className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
                    >
                        {creatingCheckout ? "Se creeaza sesiunea..." : "Stripe Checkout (redirect)"}
                    </button>
                </div>
            )}

            {canUseDevPayments && (
                <div className="my-4">
                    <button
                        onClick={simulatePayment}
                        disabled={creatingCheckout}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {creatingCheckout ? "Se finalizeaza..." : "Finalizeaza plata"}
                    </button>
                </div>
            )}

            <hr style={{ margin: "24px 0" }} />

            {/* Varianta integrata (Payment Element) pentru totalul final */}
            {loadingPI && canUseStripe && <div>Se initializeaza plata...</div>}
            {clientSecret && canUseStripe && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <PaymentForm clientSecret={clientSecret} displayTotal={totalFinal} comandaId={comandaId} />
                </Elements>
            )}
        </div>
    );
}
