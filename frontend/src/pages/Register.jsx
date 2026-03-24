import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import { buttons, cards, inputs } from "../lib/tailwindComponents";
import api from "../lib/api";

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
  const [inviteInfo, setInviteInfo] = useState({
    loading: false,
    message: "",
    code: "",
    source: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role !== "patiser") {
      return undefined;
    }

    let isCancelled = false;
    setInviteInfo((current) => ({ ...current, loading: true }));

    api
      .get("/utilizatori/provider-invite-info")
      .then((response) => {
        if (isCancelled) return;
        setInviteInfo({
          loading: false,
          message: response.data?.message || "",
          code: response.data?.code || "",
          source: response.data?.source || "",
        });
      })
      .catch(() => {
        if (isCancelled) return;
        setInviteInfo({
          loading: false,
          message: import.meta.env.DEV
            ? "In mediul local, codul implicit pentru test este PATISER-INVITE."
            : "Solicita codul de invitatie de la administrator.",
          code: import.meta.env.DEV ? "PATISER-INVITE" : "",
          source: import.meta.env.DEV ? "default" : "",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [role]);

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
      const message = error?.response?.data?.message || "Eroare la inregistrare.";
      const hint = error?.response?.data?.hint || "";
      setErr([message, hint].filter(Boolean).join(" "));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-12 md:px-6">
      <div className="mx-auto grid max-w-editorial gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section className={`${cards.tinted} overflow-hidden p-8 md:p-10`}>
          <div className="eyebrow">Cont Maison-Douce</div>
          <div className="mt-5">
            <div className="font-script text-4xl text-pink-500">Create your account</div>
            <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
              Creeaza un cont pentru comenzi, livrari si experiente personalizate.
            </h1>
          </div>
          <p className="mt-5 text-base leading-8 text-[#655c53]">
            Profilul tau salveaza preferintele, adresele si istoricul comenzilor. Pentru rolul
            de patiser este necesar codul de invitatie primit din sistem.
          </p>
          <div className="mt-8 space-y-3 text-sm text-[#655c53]">
            <div className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
              Profilul de client este activ imediat dupa inregistrare.
            </div>
            <div className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
              Parola trebuie sa aiba minim 8 caractere.
            </div>
          </div>
        </section>

        <section className={`${cards.elevated} p-8`}>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-ink">Datele contului</h2>
            <p className="mt-2 text-sm leading-7 text-[#655c53]">
              Completeaza formularul o singura data. Restul il poti actualiza ulterior din profil.
            </p>
          </div>

          <StatusBanner type="error" message={err} className="mb-4" />

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-[#4f463e]">
                Nume
                <input
                  className={`mt-2 ${inputs.default}`}
                  placeholder="Nume"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  autoComplete="name"
                />
              </label>
              <label className="block text-sm font-semibold text-[#4f463e]">
                Telefon
                <input
                  className={`mt-2 ${inputs.default}`}
                  placeholder="Telefon"
                  value={form.telefon}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, telefon: event.target.value }))
                  }
                  autoComplete="tel"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-[#4f463e]">
              Email
              <input
                className={`mt-2 ${inputs.default}`}
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                autoComplete="email"
              />
            </label>

            <label className="block text-sm font-semibold text-[#4f463e]">
              Adresa
              <input
                className={`mt-2 ${inputs.default}`}
                placeholder="Adresa"
                value={form.adresa}
                onChange={(event) =>
                  setForm((current) => ({ ...current, adresa: event.target.value }))
                }
                autoComplete="street-address"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-[#4f463e]">
                Parola
                <input
                  className={`mt-2 ${inputs.default}`}
                  placeholder="Parola"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  autoComplete="new-password"
                />
              </label>
              <label className="block text-sm font-semibold text-[#4f463e]">
                Confirma parola
                <input
                  className={`mt-2 ${inputs.default}`}
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

            <label className="block text-sm font-semibold text-[#4f463e]">
              Rol
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className={`mt-2 ${inputs.default}`}
              >
                <option value="client">Client</option>
                <option value="patiser">Patiser</option>
              </select>
            </label>

            {role === "patiser" ? (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-[#4f463e]">
                  Cod invitatie patiser
                  <input
                    className={`mt-2 ${inputs.default}`}
                    placeholder="Introdu codul primit"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    autoComplete="one-time-code"
                  />
                </label>

                <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4 text-sm leading-7 text-[#655c53]">
                  <div className="font-semibold text-ink">De unde iei codul?</div>
                  <p className="mt-2">
                    {inviteInfo.loading
                      ? "Se verifica informatia pentru codul de invitatie..."
                      : inviteInfo.message ||
                        "Solicita codul de invitatie de la administrator."}
                  </p>

                  {inviteInfo.code ? (
                    <div className="mt-3 rounded-[18px] border border-rose-100 bg-white/80 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d775c]">
                        Cod disponibil acum
                      </div>
                      <div className="mt-1 font-mono text-sm text-ink">
                        {inviteInfo.code}
                      </div>
                      <div className="mt-1 text-xs text-[#8a8178]">
                        {inviteInfo.source === "default"
                          ? "Codul implicit de dezvoltare este activ."
                          : "Codul este configurat din backend."}
                      </div>
                    </div>
                  ) : null}

                  {inviteInfo.code ? (
                    <button
                      type="button"
                      onClick={() => setInviteCode(inviteInfo.code)}
                      className={`mt-3 ${buttons.outline}`}
                    >
                      Completeaza automat codul
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <button type="submit" disabled={loading} className={`w-full ${buttons.primary}`}>
              {loading ? "Se creeaza contul..." : "Inregistreaza-te"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#655c53]">
            Ai deja cont?{" "}
            <Link to="/login" className="font-semibold text-pink-700 underline">
              Autentifica-te
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
