import axios from "axios";

export const BASE_URL =
    import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 15000,
});

// helper simplu pt. GET cu .data
export const getJson = (path, config) => api.get(path, config).then(r => r.data);

// exporturi care acoperă stiluri diferite de import (compatibilitate)
export const API = api;
export { api };

// export default
export default api;