import api, { getJson, BASE_URL } from '/src/lib/api.js';

export const stripeStatus = async () => (await api.get("/stripe/status")).data;

export const createCheckoutSession = async (comandaId) =>
    (await api.post(`/stripe/create-checkout-session/${comandaId}`)).data; // { id, url }

export const createPaymentIntent = async (payload) =>
    (await api.post("/stripe/create-payment-intent", payload)).data; // { clientSecret }

