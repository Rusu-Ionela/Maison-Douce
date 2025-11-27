import api, { getJson, BASE_URL } from '/src/lib/api.js';

export const OrdersAPI = {
    create: (payload) => api.post("/comenzi", payload).then(r => r.data),
    get: (id) => api.get(`/comenzi/${id}`).then(r => r.data),
};

