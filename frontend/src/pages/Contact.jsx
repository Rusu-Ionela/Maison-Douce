import { useState } from "react";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { buttons, cards, containers, inputs } from "/src/lib/tailwindComponents.js";

function initialForm() {
  return { nume: "", email: "", telefon: "", subiect: "", mesaj: "" };
}

const CONTACT_ITEMS = [
  { title: "Email atelier", value: "contact@maisondouce.md" },
  { title: "Telefon", value: "+373 600 000 00" },
  { title: "Program", value: "Luni - Sambata, 09:00 - 19:00" },
];

export default function Contact() {
  const [form, setForm] = useState(initialForm());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", text: "" });
    setLoading(true);

    try {
      const { data } = await api.post("/contact", {
        nume: form.nume,
        email: form.email,
        telefon: form.telefon,
        subiect: form.subiect,
        mesaj: form.mesaj,
      });
      setStatus({
        type: "success",
        text: data?.message || "Mesaj trimis. Revenim in cel mai scurt timp.",
      });
      setForm(initialForm());
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error?.response?.data?.message ||
          "Nu am putut trimite mesajul. Incearca din nou.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-editorial space-y-8`}>
        <header className={`${cards.tinted} overflow-hidden`}>
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="eyebrow">Contact Maison-Douce</div>
              <div>
                <div className="font-script text-4xl text-pink-500">Atelier & consultanta</div>
                <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
                  Hai sa discutam despre comanda, livrare sau colaborare.
                </h1>
              </div>
              <p className="max-w-2xl text-base leading-8 text-[#655c53]">
                Scrie-ne pentru torturi personalizate, cereri corporate, clarificari despre programari
                sau detalii logistice legate de livrare si ridicare.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              {CONTACT_ITEMS.map((item) => (
                <article key={item.title} className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                    {item.title}
                  </div>
                  <div className="mt-3 text-lg font-semibold text-ink">{item.value}</div>
                </article>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.92fr]">
          <form onSubmit={submit} className={`${cards.elevated} space-y-4`}>
            <div>
              <h2 className="text-2xl font-semibold text-ink">Trimite mesaj</h2>
              <p className="mt-2 text-sm leading-7 text-[#655c53]">
                Iti raspundem prin email sau telefon, in functie de preferinta indicata in formular.
              </p>
            </div>

            <StatusBanner type={status.type || "info"} message={status.text} />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#4f463e]">
                Nume
                <input
                  className={`mt-2 ${inputs.default}`}
                  placeholder="Numele tau"
                  value={form.nume}
                  onChange={(event) => onChange("nume", event.target.value)}
                  required
                  disabled={loading}
                />
              </label>
              <label className="text-sm font-semibold text-[#4f463e]">
                Email
                <input
                  className={`mt-2 ${inputs.default}`}
                  placeholder="email@exemplu.com"
                  type="email"
                  value={form.email}
                  onChange={(event) => onChange("email", event.target.value)}
                  required
                  disabled={loading}
                />
              </label>
            </div>

            <label className="text-sm font-semibold text-[#4f463e]">
              Telefon
              <input
                className={`mt-2 ${inputs.default}`}
                placeholder="+373..."
                value={form.telefon}
                onChange={(event) => onChange("telefon", event.target.value)}
                disabled={loading}
              />
            </label>

            <label className="text-sm font-semibold text-[#4f463e]">
              Subiect
              <input
                className={`mt-2 ${inputs.default}`}
                placeholder="Ex: comanda de nunta, livrare, colaborare"
                value={form.subiect}
                onChange={(event) => onChange("subiect", event.target.value)}
                disabled={loading}
              />
            </label>

            <label className="text-sm font-semibold text-[#4f463e]">
              Mesaj
              <textarea
                className={`mt-2 min-h-[150px] ${inputs.default}`}
                placeholder="Spune-ne pe scurt de ce ai nevoie."
                value={form.mesaj}
                onChange={(event) => onChange("mesaj", event.target.value)}
                required
                disabled={loading}
              />
            </label>

            <button className={buttons.primary} type="submit" disabled={loading}>
              {loading ? "Se trimite..." : "Trimite mesajul"}
            </button>
          </form>

          <div className={`${cards.default} space-y-5`}>
            <div>
              <h2 className="text-2xl font-semibold text-ink">Viziteaza atelierul</h2>
              <p className="mt-2 text-sm leading-7 text-[#655c53]">
                Pentru preluarea comenzilor si discutii programate, foloseste calendarul sau contacteaza-ne
                inainte, astfel incat sa pregatim consultanta potrivita.
              </p>
            </div>

            <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm leading-7 text-[#655c53]">
              Chisinau, Republica Moldova
            </div>

            <iframe
              title="Harta Maison-Douce"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2722.1409!2d28.832!3d47.026!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40c97c30d2c7d4a3%3A0x34b5f12aee9f0f70!2sChisinau!5e0!3m2!1sro!2smd!4v1686140000000!5m2!1sro!2smd"
              width="100%"
              height="360"
              style={{ border: 0, borderRadius: "24px" }}
              allowFullScreen=""
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
