import { useState } from "react";
import api from "/src/lib/api.js";

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

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", text: "" });
    setLoading(true);

    try {
      const payload = {
        nume: form.nume,
        email: form.email,
        telefon: form.telefon,
        subiect: form.subiect,
        mesaj: form.mesaj,
      };
      const { data } = await api.post("/contact", payload);
      setStatus({
        type: "success",
        text: data?.message || "Mesaj trimis. Revenim in cel mai scurt timp.",
      });
      setForm(initialForm());
    } catch (err) {
      setStatus({
        type: "error",
        text: err?.response?.data?.message || "Nu am putut trimite mesajul. Incearca din nou.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Contact</h1>
      <p>
        Ne poti contacta la <strong>contact@maisondouce.md</strong> sau la telefonul <strong>+373 600 000 00</strong>.
      </p>
      <p>Program: Luni - Sambata, 09:00 - 19:00</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={submit} className="space-y-3 border rounded-lg p-4 bg-white">
          <h2 className="text-xl font-semibold">Trimite mesaj</h2>
          {status.text && (
            <div className={status.type === "success" ? "text-green-700 text-sm" : "text-rose-700 text-sm"}>
              {status.text}
            </div>
          )}

          <input
            className="border rounded p-2 w-full"
            placeholder="Nume"
            value={form.nume}
            onChange={(e) => onChange("nume", e.target.value)}
            required
          />
          <input
            className="border rounded p-2 w-full"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            required
          />
          <input
            className="border rounded p-2 w-full"
            placeholder="Telefon (optional)"
            value={form.telefon}
            onChange={(e) => onChange("telefon", e.target.value)}
          />
          <input
            className="border rounded p-2 w-full"
            placeholder="Subiect (optional)"
            value={form.subiect}
            onChange={(e) => onChange("subiect", e.target.value)}
          />
          <textarea
            className="border rounded p-2 w-full min-h-[120px]"
            placeholder="Mesaj"
            value={form.mesaj}
            onChange={(e) => onChange("mesaj", e.target.value)}
            required
          />
          <button
            className="bg-pink-500 text-white px-4 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
          >
            {loading ? "Se trimite..." : "Trimite"}
          </button>
        </form>

        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-xl font-semibold mb-3">Harta</h2>
          <iframe
            title="Harta Maison Douce"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2722.1409!2d28.832!3d47.026!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40c97c30d2c7d4a3%3A0x34b5f12aee9f0f70!2sChisinau!5e0!3m2!1sro!2smd!4v1686140000000!5m2!1sro!2smd"
            width="100%"
            height="300"
            style={{ border: 0, borderRadius: "12px" }}
            allowFullScreen=""
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
