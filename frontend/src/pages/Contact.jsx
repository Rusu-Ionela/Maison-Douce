import { useState } from "react";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { buttons, cards, containers, inputs } from "/src/lib/tailwindComponents.js";

function initialForm() {
  return { nume: "", email: "", telefon: "", subiect: "", mesaj: "" };
}

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
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      <div className={`${containers.pageMax} max-w-5xl space-y-6`}>
        <header className="space-y-2">
          <p className="font-semibold uppercase tracking-[0.2em] text-pink-500">
            Contact
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Hai sa vorbim</h1>
          <p className="max-w-2xl text-gray-600">
            Ne poti scrie pentru comenzi speciale, intrebari despre livrare sau
            colaborari.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <form onSubmit={submit} className={`${cards.elevated} space-y-4`}>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Trimite mesaj
              </h2>
              <p className="text-sm text-gray-500">
                Iti raspundem prin email sau telefon in functie de preferinta ta.
              </p>
            </div>

            <StatusBanner type={status.type || "info"} message={status.text} />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className={inputs.default}
                placeholder="Nume"
                value={form.nume}
                onChange={(event) => onChange("nume", event.target.value)}
                required
                disabled={loading}
              />
              <input
                className={inputs.default}
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(event) => onChange("email", event.target.value)}
                required
                disabled={loading}
              />
            </div>

            <input
              className={inputs.default}
              placeholder="Telefon (optional)"
              value={form.telefon}
              onChange={(event) => onChange("telefon", event.target.value)}
              disabled={loading}
            />

            <input
              className={inputs.default}
              placeholder="Subiect (optional)"
              value={form.subiect}
              onChange={(event) => onChange("subiect", event.target.value)}
              disabled={loading}
            />

            <textarea
              className={`${inputs.default} min-h-[140px]`}
              placeholder="Mesaj"
              value={form.mesaj}
              onChange={(event) => onChange("mesaj", event.target.value)}
              required
              disabled={loading}
            />

            <button className={buttons.primary} type="submit" disabled={loading}>
              {loading ? "Se trimite..." : "Trimite mesajul"}
            </button>
          </form>

          <div className={`${cards.default} space-y-4`}>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Date contact</h2>
              <p className="text-gray-600">
                contact@maisondouce.md
                <br />
                +373 600 000 00
              </p>
            </div>

            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-gray-700">
              Program: Luni - Sambata, 09:00 - 19:00
            </div>

            <iframe
              title="Harta Maison Douce"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2722.1409!2d28.832!3d47.026!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40c97c30d2c7d4a3%3A0x34b5f12aee9f0f70!2sChisinau!5e0!3m2!1sro!2smd!4v1686140000000!5m2!1sro!2smd"
              width="100%"
              height="320"
              style={{ border: 0, borderRadius: "18px" }}
              allowFullScreen=""
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
