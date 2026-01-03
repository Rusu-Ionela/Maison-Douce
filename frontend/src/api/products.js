import api from "/src/lib/api.js";

export const ProductsAPI = {
  list: (params = {}) => api.get("/torturi", { params }).then((r) => r.data),

  // admin (daca ai upload imagine):
  create: (formData) =>
    api
      .post("/torturi", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),

  recommendAi: (body = {}) =>
    api.post("/recommendations/ai", body).then((r) => r.data),
};
