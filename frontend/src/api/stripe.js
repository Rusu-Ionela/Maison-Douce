import api, { getJson, BASE_URL } from '/src/lib/api.js';
export async function stripeStatus() {
    const { data } = await api.get("/stripe/status");
    return data;
}

export async function createCheckoutSession(comandaId) {
    const { data } = await api.post(`/stripe/create-checkout-session/${comandaId}`);
    return data; // { id, url }
}

// opÈ›ional, dacÄƒ foloseÈ™ti PI
export async function createPaymentIntent(payload) {
    const { data } = await api.post("/stripe/create-payment-intent", payload);
    return data; // { clientSecret }
}

