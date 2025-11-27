
export const ENV = {
    API_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "/api",
    STRIPE_PK: (typeof import.meta !== "undefined" && import.meta.env?.VITE_STRIPE_PK) || "",
    SOCKET_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_SOCKET_URL) || "",
    MODE: (typeof import.meta !== "undefined" && import.meta.env?.MODE) || "development",
    DEV: (typeof import.meta !== "undefined" && import.meta.env?.DEV) || false,
    PROD: (typeof import.meta !== "undefined" && import.meta.env?.PROD) || false,
};
