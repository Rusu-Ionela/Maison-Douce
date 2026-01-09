// src/pages/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", telefon: "", adresa: "" });
  const [role, setRole] = useState("client");
  const [inviteCode, setInviteCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setErr("Completeaza nume, email si parola.");
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
    } catch (e) {
      setErr(e?.response?.data?.message || "Eroare la inregistrare.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-serif mb-4">Creeaza cont</h1>
      {err && <div className="mb-3 text-red-600">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded-md p-2"
          placeholder="Nume"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full border rounded-md p-2"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="w-full border rounded-md p-2"
          placeholder="Telefon"
          value={form.telefon}
          onChange={(e) => setForm({ ...form, telefon: e.target.value })}
        />
        <input
          className="w-full border rounded-md p-2"
          placeholder="Adresa"
          value={form.adresa}
          onChange={(e) => setForm({ ...form, adresa: e.target.value })}
        />
        <input
          className="w-full border rounded-md p-2"
          placeholder="Parola"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <input
          className="w-full border rounded-md p-2"
          placeholder="Confirma parola"
          type="password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />

        <label className="block">
          Rol:
          <select value={role} onChange={(e) => setRole(e.target.value)} className="ml-2 border rounded-md p-1">
            <option value="client">client</option>
            <option value="patiser">patiser</option>
          </select>
        </label>

        {role === "patiser" && (
          <input
            className="w-full border rounded-md p-2"
            placeholder="Cod invitatie patiser"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#d8e5cf] hover:bg-[#b7d2b3] py-2 disabled:opacity-60"
        >
          {loading ? "Se creeaza..." : "Inregistreaza-te"}
        </button>
      </form>

      <p className="mt-3 text-sm">
        Ai deja cont? <Link to="/login" className="underline">Autentifica-te</Link>
      </p>
    </div>
  );
}
