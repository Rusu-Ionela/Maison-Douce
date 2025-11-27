import React, { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import AbonamentCutieForm from "./AbonamentCutieForm";
import { ENV } from "../lib/env";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

const STRIPE_PK = ENV.STRIPE_PK;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;
const API = ENV.API_URL || "/api";

export default function AbonamentCutiePage() {
    const [clientSecret, setClientSecret] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function createIntent() {
            if (!stripePromise) return; // fÄƒrÄƒ cheie publicÄƒ, nu iniÈ›ializa
            try {
                setLoading(true);
                const { data } = await api.post(`${API}/payments/create-intent`, {
                    product: "cutie-lunara",
                });
                if (!cancelled) setClientSecret(data.clientSecret);
            } catch (e) {
                console.error(e);
                if (!cancelled) alert("Nu am putut iniÈ›ializa plata.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        createIntent();
        return () => { cancelled = true; };
    }, []);

    // dacÄƒ nu avem cheie Stripe, afiÈ™Äƒm mesaj È™i nu crÄƒpÄƒm aplicaÈ›ia
    if (!STRIPE_PK) {
        return <div className="p-6">Plata Stripe este dezactivatÄƒ (lipseÈ™te VITE_STRIPE_PK).</div>;
    }

    if (loading || !clientSecret) {
        return <div className="p-6">Se Ã®ncarcÄƒ plataâ€¦</div>;
    }

    return (
        <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "stripe" } }}
        >
            <AbonamentCutieForm />
        </Elements>
    );
}

