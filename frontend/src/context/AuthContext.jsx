import { createContext, useContext, useEffect, useState } from "react";
import api from "/src/lib/api.js";
import { authStorage } from "/src/lib/authStorage.js";

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  const normalized = { ...user };
  if (normalized.id && !normalized._id) normalized._id = normalized.id;
  return normalized;
}

function persistSession(token, user) {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  const normalizedUser = normalizeUser(user);
  if (normalizedUser) {
    authStorage.setUser({
      id: normalizedUser._id || normalizedUser.id,
      nume: normalizedUser.nume,
      email: normalizedUser.email,
      rol: normalizedUser.rol,
    });
  }

  return normalizedUser;
}

function clearSession() {
  localStorage.removeItem("token");
  delete api.defaults.headers.common.Authorization;
  authStorage.clear();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      authStorage.clear();
      setLoading(false);
      return;
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    (async () => {
      try {
        const response = await api.get("/utilizatori/me");
        const normalizedUser = persistSession(token, response.data || null);
        setUser(normalizedUser);
      } catch (error) {
        console.warn("/utilizatori/me a esuat", error?.response?.status);
        clearSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async ({ email, parola }) => {
    const response = await api.post("/utilizatori/login", { email, parola });
    const data = response.data || {};
    const loggedUser = persistSession(data.token, data.user || data);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async ({
    name,
    prenume,
    email,
    password,
    role,
    inviteCode,
    telefon,
    adresa,
  }) => {
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

    const response = await api.post("/utilizatori/register", payload);
    const data = response.data || {};
    const registeredUser = persistSession(data.token, data.user || null);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = () => {
    clearSession();
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
