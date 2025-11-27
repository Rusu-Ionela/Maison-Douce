// frontend/src/components/CheckoutStripe.jsx
import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

const stripePromise = loadStripe(import.meta?.env?.VITE_STRIPE_PK || "");

export default function CheckoutStripe({ clientSecret }) {
    if (!clientSecret) return null;
    return (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
            <FormInner />
        </Elements>
    );
}

function FormInner() {
    const stripe = useStripe();
    const elements = useElements();
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        if (!stripe || !elements || submitting) return;
        setSubmitting(true);
        setErrorMsg("");

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.origin + "/checkout/success" },
        });

        if (error) setErrorMsg(error.message || "Payment failed");
        setSubmitting(false);
    }

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            {errorMsg ? <div style={{ color: "crimson", marginTop: 8 }}>{errorMsg}</div> : null}
            <button type="submit" disabled={!stripe || !elements || submitting} style={{ marginTop: 12 }}>
                {submitting ? "Se proceseazÄƒ..." : "PlÄƒteÈ™te"}
            </button>
        </form>
    );
}

