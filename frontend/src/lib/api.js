import axios from "axios";
import { getApiBaseUrl } from "./runtimeConfig";

export const BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// helper simplu pt. GET cu .data
export const getJson = (path, config) => api.get(path, config).then((r) => r.data);

// exporturi care acopera stiluri diferite de import (compatibilitate)
export const API = api;
export { api };

// export default
export default api;
