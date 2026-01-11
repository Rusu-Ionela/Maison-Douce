import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "/src/lib/api.js";

export default function ResetParola() {
  const [sp] = useSearchParams();
  const emailFromQuery = sp.get("email") || "";
  const tokenFromQuery = sp.get("token") || "";
  const [email, setEmail] = useState(emailFromQuery);
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (emailFromQuery && emailFromQuery !== email) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery, email]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const payload = tokenFromQuery
        ? { token: tokenFromQuery, newPassword }
        : { email, newPassword };
      const { data } = await api.post("/utilizatori/reset-password", {
        ...payload,
      });
      setMsg(data.message || "Parola a fost resetata.");
    } catch (e) {
      setMsg(
        e?.response?.data?.message ||
          "Eroare la resetarea parolei. Verifica emailul."
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
          <h2>Resetare parola</h2>
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
                  disabled={!!tokenFromQuery}
                />
              </div>

              <div>
                <label className="label">Parola noua</label>
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Se proceseaza..." : "Reseteaza parola"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
