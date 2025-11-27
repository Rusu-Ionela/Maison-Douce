// frontend/src/lib/authStorage.js
const KEY = "md_user";

function safeParse(json) {
    try {
        return json ? JSON.parse(json) : null;
    } catch {
        return null;
    }
}

export const authStorage = {
    getUser() {
        const raw = safeParse(localStorage.getItem(KEY));
        if (!raw) return { userId: null, userNume: "", userEmail: "", userRol: "client" };
        return {
            userId: raw.id || raw.userId || null,
            userNume: raw.nume || raw.name || "",
            userEmail: raw.email || "",
            userRol: raw.rol || raw.role || "client",
        };
    },

    setUser({ id, nume, email, rol }) {
        const data = { id, nume, email, rol };
        localStorage.setItem(KEY, JSON.stringify(data));
    },

    clear() {
        localStorage.removeItem(KEY);
    },
};
