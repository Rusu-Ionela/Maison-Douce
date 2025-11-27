import api, { getJson, BASE_URL } from '/src/lib/api.js';

export const ProductsAPI = {
    list: (params = {}) => api.get("/torturi", { params }).then(r => r.data), // {items,total,page,pages} sau [] â€“ Ã®n funcÈ›ie de backend
    list: (params = {}) =>
        api.get("/torturi", { params }).then(r => r.data),

    // admin (dacÄƒ ai upload imagine):
    create: (formData) =>
        api.post("/torturi", formData, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data),
};

