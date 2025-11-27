import React, { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AbonamentCutieForm() {
    const stripe = useStripe();
    const elements = useElements();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        if (!stripe || !elements) return;

        setSaving(true);
        setError("");

        const { error: err } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + "/abonament-cutie/succes", // pagina ta de succes
            },
        });

        if (err) setError(err.message || "Eroare la confirmarea plÄƒÈ›ii.");
        setSaving(false);
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 space-y-4 border rounded">
            <h1 className="text-xl font-semibold">PlatÄƒ â€žCutia luniiâ€</h1>

            {/* UI all-in-one de la Stripe */}
            <PaymentElement />

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
                type="submit"
                disabled={!stripe || !elements || saving}
                className="border px-4 py-2 rounded"
            >
                {saving ? "Se proceseazÄƒâ€¦" : "PlÄƒteÈ™te"}
            </button>
        </form>
    );
}

