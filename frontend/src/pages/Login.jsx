import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", parola: "" });
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    if (user?.rol === "admin" || user?.rol === "prestator" || user?.rol === "patiser") {
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
      if (
        loggedUser.rol === "admin" ||
        loggedUser.rol === "prestator" ||
        loggedUser.rol === "patiser"
      ) {
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(250,232,236,0.92),_rgba(244,226,219,0.88))] px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-[32px] border border-rose-100 bg-white/85 p-8 shadow-xl shadow-rose-100/60 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-500">
            Maison-Douce
          </p>
          <h1 className="mt-4 font-serif text-4xl text-gray-900">
            Autentificare
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-gray-600">
            Intri rapid in cont pentru comenzi, plata, rezervari si urmarirea
            istoricului tau. Pentru staff, dupa login se deschide direct panoul
            operational.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
              <div className="text-sm font-semibold text-gray-900">Client</div>
              <div className="mt-2 text-sm text-gray-600">
                Vezi comenzi, plateste, lasa recenzii si gestioneaza profilul.
              </div>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-white p-4">
              <div className="text-sm font-semibold text-gray-900">Staff</div>
              <div className="mt-2 text-sm text-gray-600">
                Administrezi calendarul, comenzile, catalogul si moderarea.
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-rose-100 bg-white p-8 shadow-xl shadow-rose-100/70">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Intra in cont
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Foloseste emailul si parola cu care ai creat contul.
            </p>
          </div>

          <StatusBanner type="error" message={err} className="mb-4" />

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-semibold text-gray-700">
              Email
              <input
                className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
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

            <label className="block text-sm font-semibold text-gray-700">
              Parola
              <input
                className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
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

            <button
              className="w-full rounded-full bg-pink-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-700"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Se autentifica..." : "Intra in cont"}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-sm text-gray-600">
            <p>
              Ti-ai uitat parola?{" "}
              <Link to="/resetare-parola" className="font-semibold text-pink-600 underline">
                Reseteaza parola
              </Link>
            </p>
            <p>
              Nu ai cont?{" "}
              <Link to="/register" className="font-semibold text-pink-600 underline">
                Creeaza unul acum
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
