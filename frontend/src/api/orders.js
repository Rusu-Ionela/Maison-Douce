import api, { getJson, BASE_URL } from '/src/lib/api.js';

export const OrdersAPI = {
    create: (payload) => {
        const useSlot = !!(payload?.dataLivrare && payload?.oraLivrare);
        const path = useSlot ? "/comenzi/creeaza-cu-slot" : "/comenzi";
        return api.post(path, payload).then(r => r.data);
    },
    get: (id) => api.get(`/comenzi/${id}`).then(r => r.data),
};

