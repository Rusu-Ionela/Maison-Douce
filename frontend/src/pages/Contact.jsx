import { useState } from "react";

export default function Contact() {
  const [form, setForm] = useState({ nume: "", email: "", mesaj: "" });
  const [msg, setMsg] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setMsg("Mesaj trimis. Revenim in cel mai scurt timp.");
    setForm({ nume: "", email: "", mesaj: "" });
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
          {msg && <div className="text-green-700 text-sm">{msg}</div>}
          <input
            className="border rounded p-2 w-full"
            placeholder="Nume"
            value={form.nume}
            onChange={(e) => setForm((f) => ({ ...f, nume: e.target.value }))}
            required
          />
          <input
            className="border rounded p-2 w-full"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <textarea
            className="border rounded p-2 w-full min-h-[120px]"
            placeholder="Mesaj"
            value={form.mesaj}
            onChange={(e) => setForm((f) => ({ ...f, mesaj: e.target.value }))}
            required
          />
          <button className="bg-pink-500 text-white px-4 py-2 rounded" type="submit">
            Trimite
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
