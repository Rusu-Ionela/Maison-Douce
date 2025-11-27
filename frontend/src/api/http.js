import api, { getJson, BASE_URL } from '/src/lib/api.js';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  withCredentials: true,
});

export default http;

