import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api.js";

export default function Login() {
    const { login, isAuthenticated, user } = useAuth();
    const nav = useNavigate();

    // folosim "parola" ca să fie clar ce trimitem la backend
    const [form, setForm] = useState({ email: "", parola: "" });
    const [err, setErr] = useState("");

    // dacă ești deja logată, redirecționăm
    if (isAuthenticated) {
        if (user?.rol === "admin" || user?.rol === "prestator") {
            return <Navigate to="/admin/calendar" replace />;
        }
        return <Navigate to="/calendar" replace />;
    }

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        try {
            // ⬇️ trimitem { email, parola } către AuthContext
            const u = await login(form);

            if (u.rol === "admin" || u.rol === "prestator") nav("/admin/calendar");
            else nav("/calendar");
        } catch (e) {
            setErr(
                e?.response?.data?.message ||
                "Eroare la autentificare. Verifică emailul și parola."
            );
        }
    }

    async function handleResetPassword() {
        const email = window.prompt("Introdu emailul pentru resetare:");
        if (!email) return;
        const newPassword = window.prompt("Introdu noua parolă:");
        if (!newPassword) return;

        try {
            const { data } = await api.post("/utilizatori/reset-password", {
                email,
                newPassword,
            });
            alert(data?.message || "Parola a fost resetată.");
        } catch (e) {
            console.error("reset-password frontend:", e);
            alert(
                e?.response?.data?.message || "Eroare la resetarea parolei."
            );
        }
    }

    return (
        <section className="section">
            <div className="max split-50">
                <div className="title-major">
                    <div className="over">Bun venit</div>
                    <h2>Autentificare</h2>
                </div>

                <div className="card" style={{ alignSelf: "start" }}>
                    <div className="body">
                        {err && (
                            <div
                                className="pill"
                                style={{
                                    background: "#ffe3ef",
                                    borderColor: "#f6c4d6",
                                    color: "#5a2d34",
                                }}
                            >
                                {err}
                            </div>
                        )}

                        <form className="form" onSubmit={onSubmit}>
                            <div>
                                <label className="label">Email</label>
                                <input
                                    className="input"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, email: e.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Parola</label>
                                <input
                                    className="input"
                                    type="password"
                                    value={form.parola}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, parola: e.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <button className="btn btn-primary" type="submit">
                                Intră
                            </button>
                        </form>

                        <p style={{ marginTop: 16 }}>
                            Ți-ai uitat parola?{" "}
                            <button
                                type="button"
                                onClick={handleResetPassword}
                                style={{
                                    border: "none",
                                    background: "none",
                                    color: "#c03",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                }}
                            >
                                Resetează parola
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
