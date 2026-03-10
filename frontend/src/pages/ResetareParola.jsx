import { useState } from "react";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { buttons, cards, containers, inputs } from "/src/lib/tailwindComponents.js";

export default function ResetareParola() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", text: "" });
    setLoading(true);

    try {
      const res = await api.post("/reset-parola/send-reset-email", { email });
      setStatus({
        type: "success",
        text:
          res.data?.message ||
          res.data?.mesaj ||
          "Daca exista un cont pentru acest email, vei primi instructiuni de resetare.",
      });
      setEmail("");
    } catch (error) {
      setStatus({
        type: "error",
        text: error?.response?.data?.message || "Eroare la trimitere email.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      <div className={`${containers.pageMax} max-w-xl`}>
        <div className={`${cards.elevated} space-y-4`}>
          <div>
            <p className="font-semibold uppercase tracking-[0.2em] text-pink-500">
              Password reset
            </p>
            <h1 className="text-3xl font-bold text-gray-900">Resetare parola</h1>
            <p className="text-sm text-gray-600">
              Introdu adresa de email folosita la autentificare si iti trimitem
              linkul de resetare.
            </p>
          </div>

          <StatusBanner type={status.type || "info"} message={status.text} />

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Emailul tau"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputs.default}
              required
              disabled={loading}
            />
            <button type="submit" className={buttons.primary} disabled={loading}>
              {loading ? "Se trimite..." : "Trimite email de resetare"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
