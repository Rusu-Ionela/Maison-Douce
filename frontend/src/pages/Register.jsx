import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    telefon: "",
    adresa: "",
  });
  const [role, setRole] = useState("client");
  const [inviteCode, setInviteCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setErr("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setErr("Completeaza nume, email si parola.");
      return;
    }
    if (form.password.length < 8) {
      setErr("Parola trebuie sa aiba minim 8 caractere.");
      return;
    }
    if (form.password !== form.confirm) {
      setErr("Parolele nu coincid.");
      return;
    }

    try {
      setLoading(true);
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
        inviteCode: role === "patiser" ? inviteCode : undefined,
        telefon: form.telefon,
        adresa: form.adresa,
      });
      nav("/calendar", { replace: true });
    } catch (error) {
      setErr(error?.response?.data?.message || "Eroare la inregistrare.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_rgba(255,247,241,0.96),_rgba(251,236,239,0.92),_rgba(255,255,255,1))] px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr,1.05fr]">
        <section className="rounded-[32px] border border-rose-100 bg-white/90 p-8 shadow-xl shadow-rose-100/60 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-500">
            Cont nou
          </p>
          <h1 className="mt-4 font-serif text-4xl text-gray-900">
            Creeaza un cont Maison-Douce
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Contul iti salveaza preferintele, istoricul comenzilor si adresele
            de livrare. Pentru rolul de patiser este necesar codul de invitatie.
          </p>
          <div className="mt-8 space-y-3 text-sm text-gray-600">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
              Profilul de client este activ imediat dupa inregistrare.
            </div>
            <div className="rounded-2xl border border-rose-100 bg-white p-4">
              Parola trebuie sa aiba minim 8 caractere.
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-rose-100 bg-white p-8 shadow-xl shadow-rose-100/70">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Datele contului
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Completeaza formularul o singura data. Restul il poti actualiza
              ulterior din profil.
            </p>
          </div>

          <StatusBanner type="error" message={err} className="mb-4" />

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Nume
                <input
                  className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
                  placeholder="Nume"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  autoComplete="name"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Telefon
                <input
                  className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
                  placeholder="Telefon"
                  value={form.telefon}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, telefon: event.target.value }))
                  }
                  autoComplete="tel"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              Email
              <input
                className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                autoComplete="email"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              Adresa
              <input
                className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
                placeholder="Adresa"
                value={form.adresa}
                onChange={(event) =>
                  setForm((current) => ({ ...current, adresa: event.target.value }))
                }
                autoComplete="street-address"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Parola
                <input
                  className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
                  placeholder="Parola"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  autoComplete="new-password"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Confirma parola
                <input
                  className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
                  placeholder="Confirma parola"
                  type="password"
                  value={form.confirm}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, confirm: event.target.value }))
                  }
                  autoComplete="new-password"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              Rol
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
              >
                <option value="client">Client</option>
                <option value="patiser">Patiser</option>
              </select>
            </label>

            {role === "patiser" && (
              <label className="block text-sm font-semibold text-gray-700">
                Cod invitatie patiser
                <input
                  className="mt-2 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 outline-none transition focus:border-pink-400 focus:bg-white"
                  placeholder="Introdu codul primit"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                />
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-pink-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-60"
            >
              {loading ? "Se creeaza contul..." : "Inregistreaza-te"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600">
            Ai deja cont?{" "}
            <Link to="/login" className="font-semibold text-pink-600 underline">
              Autentifica-te
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
