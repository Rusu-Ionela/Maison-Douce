import api, { getJson, BASE_URL } from '/src/lib/api.js';

export const AuthAPI = {
    register: (payload) => api.post("/utilizatori/register", payload).then(r => r.data),
    login: (payload) => api.post("/utilizatori/login", payload).then(r => r.data),
    me: () => api.get("/utilizatori/me").then(r => r.data),
};

