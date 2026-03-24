import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import { isStaffRole } from "../lib/roles";
import { buttons, cards, inputs } from "../lib/tailwindComponents";

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", parola: "" });
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    if (isStaffRole(user?.rol || user?.role)) {
      return <Navigate to="/admin/calendar" replace />;
    }
    return <Navigate to="/calendar" replace />;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setErr("");

    try {
      setSubmitting(true);
      const loggedUser = await login(form);
      if (isStaffRole(loggedUser?.rol || loggedUser?.role)) {
        nav("/admin/calendar");
        return;
      }
      nav("/calendar");
    } catch (error) {
      setErr(
        error?.response?.data?.message ||
          "Eroare la autentificare. Verifica emailul si parola."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-12 md:px-6">
      <div className="mx-auto grid max-w-editorial gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={`${cards.tinted} overflow-hidden p-8 md:p-10`}>
          <div className="eyebrow">Maison-Douce</div>
          <div className="mt-5">
            <div className="font-script text-4xl text-pink-500">Bienvenue</div>
            <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
              Intra in contul tau Maison-Douce
            </h1>
          </div>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#655c53]">
            Accesezi rapid calendarul, comenzile, platile, chatul cu patiserul si istoricul
            complet al experientei tale in atelier.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
              <div className="text-sm font-semibold text-ink">Client</div>
              <div className="mt-2 text-sm leading-6 text-[#655c53]">
                Vezi comenzi, plateste, salveaza preferinte si gestioneaza profilul.
              </div>
            </div>
            <div className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
              <div className="text-sm font-semibold text-ink">Staff</div>
              <div className="mt-2 text-sm leading-6 text-[#655c53]">
                Administrezi calendarul, comenzile, catalogul si fluxul operational.
              </div>
            </div>
          </div>
        </section>

        <section className={`${cards.elevated} p-8`}>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-ink">Autentificare</h2>
            <p className="mt-2 text-sm leading-7 text-[#655c53]">
              Foloseste emailul si parola cu care ai creat contul.
            </p>
          </div>

          <StatusBanner type="error" message={err} className="mb-4" />

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-semibold text-[#4f463e]">
              Email
              <input
                className={`mt-2 ${inputs.default}`}
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="email@exemplu.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-[#4f463e]">
              Parola
              <input
                className={`mt-2 ${inputs.default}`}
                type="password"
                value={form.parola}
                onChange={(event) =>
                  setForm((current) => ({ ...current, parola: event.target.value }))
                }
                placeholder="Parola ta"
                autoComplete="current-password"
                required
              />
            </label>

            <button className={`w-full ${buttons.primary}`} type="submit" disabled={submitting}>
              {submitting ? "Se autentifica..." : "Intra in cont"}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-sm text-[#655c53]">
            <p>
              Ti-ai uitat parola?{" "}
              <Link to="/resetare-parola" className="font-semibold text-pink-700 underline">
                Reseteaza parola
              </Link>
            </p>
            <p>
              Nu ai cont?{" "}
              <Link to="/register" className="font-semibold text-pink-700 underline">
                Creeaza unul acum
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
