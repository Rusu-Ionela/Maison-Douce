// frontend/src/pages/ResetParola.jsx
import { useState } from "react";
import api from "/src/lib/api.js";

export default function ResetParola() {
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setMsg("");
        setLoading(true);
        try {
            const { data } = await api.post("/utilizatori/reset-password-dev", {
                email,
                newPassword,
            });
            setMsg(data.message || "Parola a fost resetată.");
        } catch (e) {
            setMsg(
                e?.response?.data?.message ||
                "Eroare la resetarea parolei. Verifică emailul."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="section">
            <div className="max">
                <div className="title-major">
                    <div className="over">Securitate cont</div>
                    <h2>Resetare parolă (DEV)</h2>
                    <p className="text-sm text-gray-600">
                        Folosește această pagină doar pe localhost, pentru testare.
                    </p>
                </div>

                <div className="card" style={{ alignSelf: "start" }}>
                    <div className="body">
                        {msg && (
                            <div
                                className="pill"
                                style={{
                                    background: "#f5f5ff",
                                    borderColor: "#c7c7ff",
                                    color: "#1f2440",
                                }}
                            >
                                {msg}
                            </div>
                        )}

                        <form className="form" onSubmit={onSubmit}>
                            <div>
                                <label className="label">Email utilizator</label>
                                <input
                                    className="input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Parolă nouă</label>
                                <input
                                    className="input"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                className="btn btn-primary"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Se procesează..." : "Resetează parola"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
