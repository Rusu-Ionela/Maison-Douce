import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "/src/lib/api.js";

export default function ResetParola() {
  const [sp] = useSearchParams();
  const tokenFromQuery = sp.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!tokenFromQuery) return;

    setMsg("");
    setLoading(true);
    try {
      const { data } = await api.post("/utilizatori/reset-password", {
        token: tokenFromQuery,
        newPassword,
      });
      setMsg(data.message || "Parola a fost resetata.");
    } catch (e) {
      setMsg(
        e?.response?.data?.message ||
          "Eroare la resetarea parolei. Cere un link nou de resetare."
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

            {!tokenFromQuery ? (
              <div className="space-y-4">
                <p>Linkul de resetare lipseste sau este invalid.</p>
                <Link to="/resetare-parola" className="btn btn-primary">
                  Cere un link nou
                </Link>
              </div>
            ) : (
              <form className="form" onSubmit={onSubmit}>
                <div>
                  <label className="label">Parola noua</label>
                  <input
                    className="input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Se proceseaza..." : "Reseteaza parola"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
