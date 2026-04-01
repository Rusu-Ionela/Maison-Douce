import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import { resolvePostAuthRedirect } from "../lib/authRedirects";
import { isStaffRole } from "../lib/roles";
import { buttons, cards, inputs } from "../lib/tailwindComponents";

export default function AdminLogin() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", parola: "" });
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const requestedTarget = location.state?.from;
  const redirectTarget = resolvePostAuthRedirect({
    user,
    requestedTarget,
    clientFallback: "/calendar",
    staffFallback: "/admin/calendar",
  });

  if (isAuthenticated && isStaffRole(user?.rol || user?.role)) {
    return <Navigate to={redirectTarget} replace />;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setErr("");

    try {
      setSubmitting(true);
      const loggedUser = await login(form);
      if (!isStaffRole(loggedUser?.rol || loggedUser?.role)) {
        setErr("Contul tau nu are acces in zona interna a atelierului.");
        return;
      }

      navigate(
        resolvePostAuthRedirect({
          user: loggedUser,
          requestedTarget,
          clientFallback: "/calendar",
          staffFallback: "/admin/calendar",
        }),
        { replace: true }
      );
    } catch (error) {
      setErr(error?.response?.data?.message || "Autentificarea a esuat.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-12 md:px-6">
      <div className="mx-auto grid max-w-editorial gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section className={`${cards.tinted} overflow-hidden p-8 md:p-10`}>
          <div className="eyebrow">Acces intern</div>
          <div className="mt-5">
            <div className="font-script text-4xl text-pink-500">Staff Maison-Douce</div>
            <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
              Conectare pentru operatiuni, productie si administrare.
            </h1>
          </div>
          <p className="mt-5 text-base leading-8 text-[#655c53]">
            Fluxul intern este rezervat echipei atelierului. De aici intri direct in calendarul
            operational, inboxul intern si modulele de productie.
          </p>
          <div className="mt-8 space-y-3 text-sm text-[#655c53]">
            <div className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
              Conturile de staff sunt create doar de administrator.
            </div>
            <div className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
              Daca ai fost redirectionat dintr-un modul intern, revii automat exact acolo dupa login.
            </div>
          </div>
        </section>

        <section className={`${cards.elevated} p-8`}>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-ink">Autentificare staff</h2>
            <p className="mt-2 text-sm leading-7 text-[#655c53]">
              Foloseste contul intern configurat pentru atelier.
            </p>
          </div>

          <StatusBanner type="error" message={err} className="mb-4" />

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-semibold text-[#4f463e]">
              Email
              <input
                type="email"
                placeholder="email@atelier.md"
                className={`mt-2 ${inputs.default}`}
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                autoComplete="email"
                required
              />
            </label>

            <label className="block text-sm font-semibold text-[#4f463e]">
              Parola
              <input
                type="password"
                placeholder="Parola contului intern"
                className={`mt-2 ${inputs.default}`}
                value={form.parola}
                onChange={(event) =>
                  setForm((current) => ({ ...current, parola: event.target.value }))
                }
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className={`w-full ${buttons.primary}`} disabled={submitting}>
              {submitting ? "Se autentifica..." : "Intra in zona interna"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#655c53]">
            Pentru acces client foloseste{" "}
            <Link to="/login" className="font-semibold text-pink-700 underline">
              autentificarea publica
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
