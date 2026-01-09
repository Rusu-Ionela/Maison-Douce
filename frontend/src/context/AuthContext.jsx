// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import api from "/src/lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // la refresh de pagină încercăm să refacem sesiunea din token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            return;
        }

        // 👇 foarte important: punem token-ul pe toate request-urile
        api.defaults.headers.common.Authorization = `Bearer ${token}`;

        (async () => {
            try {
                const r = await api.get("/utilizatori/me");
                const u = r.data || null;
                if (u && u.id && !u._id) u._id = u.id;
                setUser(u);
            } catch (e) {
                console.warn("/utilizatori/me a eșuat", e?.response?.status);
                localStorage.removeItem("token");
                delete api.defaults.headers.common.Authorization;
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);


    // ⬇⬇ AICI E IMPORTANT
    const login = async ({ email, parola }) => {
        // trimitem exact ce are backend-ul nevoie
        const payload = { email, parola };

        const r = await api.post("/utilizatori/login", payload);
        const data = r.data || {};

        if (data.token) {
            localStorage.setItem("token", data.token);
            api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        }

        const loggedUser = data.user || data;
        if (loggedUser && loggedUser.id && !loggedUser._id) loggedUser._id = loggedUser.id;
        setUser(loggedUser);

        return loggedUser;
    };

    const register = async ({ name, prenume, email, password, role, inviteCode, telefon, adresa }) => {
        const payload = {
            nume: name,
            prenume: prenume || "",
            email,
            parola: password,
            rol: role || "client",
            inviteCode,
            telefon,
            adresa,
        };
        const r = await api.post("/utilizatori/register", payload);
        const data = r.data || {};

        if (data.token) {
            localStorage.setItem("token", data.token);
            api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        }

        const registeredUser = data.user || null;
        if (registeredUser && registeredUser.id && !registeredUser._id) {
            registeredUser._id = registeredUser.id;
        }
        setUser(registeredUser);
        return registeredUser;
    };


    const logout = () => {
        localStorage.removeItem("token");
        delete api.defaults.headers.common.Authorization;
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ user, isAuthenticated: !!user, loading, login, register, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
