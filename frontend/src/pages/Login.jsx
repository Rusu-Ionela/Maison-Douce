import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({ email: "", parola: "" });
  const [err, setErr] = useState("");

  if (isAuthenticated) {
    if (user?.rol === "admin" || user?.rol === "prestator" || user?.rol === "patiser") {
      return <Navigate to="/admin/calendar" replace />;
    }
    return <Navigate to="/calendar" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const u = await login(form);
      if (u.rol === "admin" || u.rol === "prestator" || u.rol === "patiser") nav("/admin/calendar");
      else nav("/calendar");
    } catch (e) {
      setErr(e?.response?.data?.message || "Eroare la autentificare. Verifica emailul si parola.");
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
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Parola</label>
                <input
                  className="input"
                  type="password"
                  value={form.parola}
                  onChange={(e) => setForm((s) => ({ ...s, parola: e.target.value }))}
                  required
                />
              </div>

              <button className="btn btn-primary" type="submit">
                Intra
              </button>
            </form>

            <p style={{ marginTop: 16 }}>
              Ti-ai uitat parola?{" "}
              <Link to="/resetare-parola" style={{ color: "#c03", textDecoration: "underline" }}>
                Reseteaza parola
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
