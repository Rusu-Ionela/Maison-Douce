import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const u = await login({ email, parola });
      const role = u?.rol || u?.role;
      if (role !== "admin" && role !== "patiser") {
        setErr("Nu ai acces in zona admin.");
        return;
      }
      navigate("/admin/calendar");
    } catch (e) {
      setErr(e?.response?.data?.message || "Autentificare esuata.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Autentificare Admin</h2>
      {err && <div className="text-rose-700 mb-2">{err}</div>}
      <form onSubmit={handleLogin} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Parola"
          className="border p-2 w-full"
          value={parola}
          onChange={(e) => setParola(e.target.value)}
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
}

export default AdminLogin;
