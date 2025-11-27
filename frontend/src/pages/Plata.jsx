// frontend/src/pages/Plata.jsx
import React, { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useLocation } from "react-router-dom";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

const publicKey = import.meta.env.VITE_STRIPE_PK;

if (!publicKey) {
    console.error("⚠️ Lipseste VITE_STRIPE_PK în frontend/.env.local");
}

const stripePromise = publicKey ? loadStripe(publicKey) : null;

function money(n) {
    return (Number(n || 0)).toFixed(2);
}

function PaymentForm({ clientSecret, displayTotal }) {
    const stripe = useStripe();
    const elements = useElements();
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    if (!clientSecret) return null;

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg("");

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.origin + "/plata/succes" },
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
                    Total de platÄƒ: {money(displayTotal)} (dupÄƒ reducere)
                </div>
            )}
            {errorMsg && <div style={{ color: "crimson", marginTop: 8 }}>{errorMsg}</div>}
            <button
                type="submit"
                disabled={!stripe || !elements || submitting}
                style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8 }}
            >
                {submitting ? "Se proceseazÄƒ..." : "PlÄƒteÈ™te"}
            </button>
        </form>
    );
}

export default function Plata() {
    const location = useLocation();
    const comandaId = new URLSearchParams(location.search).get("comandaId"); // ex: /plata?comandaId=...
    const [loadingComanda, setLoadingComanda] = useState(false);
    const [comanda, setComanda] = useState(null);

    const [codCupon, setCodCupon] = useState("");
    const [reducerePct, setReducerePct] = useState(0);
    const [cuponStatus, setCuponStatus] = useState(null); // "ok" | "invalid" | null

    const [creatingCheckout, setCreatingCheckout] = useState(false);
    const [clientSecret, setClientSecret] = useState("");
    const [loadingPI, setLoadingPI] = useState(false);

    // 1) Adu comanda (total, items, taxaLivrare), ca sÄƒ putem afiÈ™a suma È™i calcula reducerea
    useEffect(() => {
        (async () => {
            if (!comandaId) return;
            setLoadingComanda(true);
            try {
                const { data } = await api.get(`/comenzi/${comandaId}`);
                setComanda(data);
            } catch (e) {
                console.error("Nu pot Ã®ncÄƒrca comanda:", e);
            } finally {
                setLoadingComanda(false);
            }
        })();
    }, [comandaId]);

    // 2) CalculeazÄƒ totalul de bazÄƒ
    const totalDeBaza = useMemo(() => {
        if (!comanda) return 0;
        // preferÄƒ `total` dacÄƒ existÄƒ; altfel (fallback) items + taxaLivrare
        const itemsTotal = (comanda.items || []).reduce(
            (s, it) => s + Number(it.price || it.pret || 0) * Number(it.qty || it.cantitate || 1),
            0
        );
        const livrare = Number(comanda.taxaLivrare || 0);
        const fallback = itemsTotal + livrare;
        return Number(comanda.total ?? fallback) || 0;
    }, [comanda]);

    // 3) AplicÄƒ reducerea procentualÄƒ
    const totalRedus = useMemo(() => {
        if (!totalDeBaza) return 0;
        const factor = Math.max(0, Math.min(100, Number(reducerePct || 0)));
        return totalDeBaza * (1 - factor / 100);
    }, [totalDeBaza, reducerePct]);

    // 4) CreeazÄƒ PaymentIntent (varianta integratÄƒ) cu amount OVERRIDDEN (DEV)
    const createPIWithAmount = async () => {
        setLoadingPI(true);
        setClientSecret("");
        try {
            // Stripe aÈ™teaptÄƒ amount Ã®n "cents"
            const amountCents = Math.max(50, Math.round(totalRedus * 100));
            const { data } = await api.post("/stripe/create-payment-intent", {
                // Ã®n DEV permitem override prin `amount`
                amount: amountCents,
                currency: "usd",
                // opcÈ›ional: trimitem comandaId Ã®n metadata pe backend (deja e suport Ã®n codul tÄƒu)
                comandaId, // pentru metadata; backend ia totuÈ™i amount din parametru aici
            });
            setClientSecret(data?.clientSecret || "");
        } catch (e) {
            console.error("create-payment-intent (amount override) failed:", e);
        } finally {
            setLoadingPI(false);
        }
    };

    // 5) VerificÄƒ cupon
    const verificaCupon = async () => {
        setCuponStatus(null);
        setReducerePct(0);
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

    // 6) Stripe Checkout (redirect) â€” tot cu total redus
    const goCheckout = async () => {
        if (!comandaId) return alert("LipseÈ™te comandaId Ã®n URL.");
        setCreatingCheckout(true);
        try {
            // dacÄƒ vrei È™i checkout sÄƒ ia suma redusÄƒ, ideal e sÄƒ actualizezi comanda Ã®n DB
            // dar pentru acum, folosim Payment Element (de mai jos) pentru suma exactÄƒ
            const { data } = await api.post(`/stripe/create-checkout-session/${comandaId}`);
            if (data?.url) {
                window.location.href = data.url;
            } else {
                alert("Nu s-a putut crea sesiunea de platÄƒ.");
            }
        } catch (e) {
            console.error(e);
            alert("Eroare la crearea sesiunii de platÄƒ.");
        } finally {
            setCreatingCheckout(false);
        }
    };

    // 7) CÃ¢nd se schimbÄƒ reducerea sau comanda, reconstruim PaymentIntent (varianta integratÄƒ)
    useEffect(() => {
        if (!comandaId || !totalDeBaza) return;
        createPIWithAmount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comandaId, totalDeBaza, reducerePct]);

    return (
        <div className="container" style={{ padding: 24 }}>
            <h1>Plata comenzii</h1>

            {!comandaId && (
                <div style={{ color: "#a00", marginBottom: 12 }}>
                    AdaugÄƒ <code>?comandaId=...</code> Ã®n URL.
                </div>
            )}

            {loadingComanda && <div>Se Ã®ncarcÄƒ datele comenziiâ€¦</div>}

            {!!totalDeBaza && (
                <div style={{ margin: "8px 0 16px" }}>
                    <div>Total iniÈ›ial: <b>{money(totalDeBaza)}</b></div>
                    {reducerePct > 0 ? (
                        <div>
                            Reducere: <b>{reducerePct}%</b> â†’ Total dupÄƒ reducere:{" "}
                            <b>{money(totalRedus)}</b>
                        </div>
                    ) : (
                        <div>PoÈ›i aplica un cupon mai jos.</div>
                    )}
                </div>
            )}

            {/* Cupon */}
            <div style={{ maxWidth: 420, margin: "0 0 16px" }}>
                <label style={{ display: "block", marginBottom: 6 }}>Cod cupon</label>
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        value={codCupon}
                        onChange={(e) => setCodCupon(e.target.value)}
                        placeholder="ex: DULCE10"
                        style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                    />
                    <button onClick={verificaCupon} style={{ padding: "8px 14px", borderRadius: 8 }}>
                        VerificÄƒ
                    </button>
                </div>
                {cuponStatus === "ok" && (
                    <div style={{ color: "green", marginTop: 6 }}>Cupon valid: {reducerePct}% reducere.</div>
                )}
                {cuponStatus === "invalid" && (
                    <div style={{ color: "crimson", marginTop: 6 }}>Cupon invalid sau expirat.</div>
                )}
            </div>

            {/* Varianta Stripe Checkout (redirect) â€” utilÄƒ pentru test rapid, dar nu aplicÄƒ suma redusÄƒ fÄƒrÄƒ update la comandÄƒ */}
            <div style={{ margin: "16px 0" }}>
                <button onClick={goCheckout} disabled={creatingCheckout} style={{ padding: "10px 16px", borderRadius: 8 }}>
                    {creatingCheckout ? "Se creeazÄƒ sesiunea..." : "Stripe Checkout (redirect)"}
                </button>
            </div>

            <hr style={{ margin: "24px 0" }} />

            {/* Varianta integratÄƒ (Payment Element) â€” plÄƒteÈ™te EXACT totalul calculat cu reducere */}
            {loadingPI && <div>Se iniÈ›ializeazÄƒ plataâ€¦</div>}
            {clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <PaymentForm clientSecret={clientSecret} displayTotal={totalRedus} />
                </Elements>
            )}
        </div>
    );
}

