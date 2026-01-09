import { useEffect, useState } from "react";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";
import RecenzieComanda from "./RecenzieComanda";

const emptyProfile = {
  nume: "",
  prenume: "",
  email: "",
  telefon: "",
  adresa: "",
  adreseSalvate: [],
  preferinte: { alergii: [], evit: [], note: "" },
  setariNotificari: { email: true, inApp: true },
};

export default function ProfilClient() {
  const { user } = useAuth() || {};
  const [profile, setProfile] = useState(emptyProfile);
  const [orders, setOrders] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [photoNotifs, setPhotoNotifs] = useState([]);
  const [loadingPhotoNotifs, setLoadingPhotoNotifs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newAddress, setNewAddress] = useState({ label: "", address: "" });

  useEffect(() => {
    if (!user?._id) return;
    setProfile((p) => ({
      ...p,
      ...user,
      preferinte: user.preferinte || emptyProfile.preferinte,
      adreseSalvate: user.adreseSalvate || [],
      setariNotificari: user.setariNotificari || emptyProfile.setariNotificari,
    }));
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;
    api.get(`/comenzi/client/${user._id}`).then((r) => setOrders(r.data || []));
    api.get("/notificari/me").then((r) => setNotifs(Array.isArray(r.data) ? r.data : []));
    setLoadingPhotoNotifs(true);
    api
      .get(`/notificari-foto/${user._id}`)
      .then((r) => setPhotoNotifs(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPhotoNotifs([]))
      .finally(() => setLoadingPhotoNotifs(false));
  }, [user?._id]);

  const markPhotoRead = async (id) => {
    try {
      await api.put(`/notificari-foto/citeste/${id}`);
      setPhotoNotifs((list) =>
        list.map((n) => (n._id === id ? { ...n, citit: true } : n))
      );
    } catch {
      setMsg("Nu am putut marca notificarea ca citita.");
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const { data } = await api.put("/utilizatori/me", profile);
      if (data?.user) {
        setProfile((p) => ({ ...p, ...data.user }));
      }
      setMsg("Profil actualizat cu succes.");
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la actualizare profil.");
    } finally {
      setSaving(false);
    }
  };

  const addAddress = () => {
    if (!newAddress.address.trim()) return;
    setProfile((p) => ({
      ...p,
      adreseSalvate: [
        ...p.adreseSalvate,
        {
          label: newAddress.label || "Adresa",
          address: newAddress.address,
          isDefault: p.adreseSalvate.length === 0,
        },
      ],
    }));
    setNewAddress({ label: "", address: "" });
  };

  const setDefault = (idx) => {
    setProfile((p) => ({
      ...p,
      adreseSalvate: p.adreseSalvate.map((a, i) => ({ ...a, isDefault: i === idx })),
    }));
  };

  const removeAddress = (idx) => {
    setProfile((p) => ({
      ...p,
      adreseSalvate: p.adreseSalvate.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Profil client</h1>
          <p className="text-gray-600">Gestioneaza datele personale, preferintele si istoricul.</p>
          <div className="mt-2">
            <a className="text-pink-600 underline" href="/recenzii/prestator/default">
              Lasa recenzie pentru patiser
            </a>
          </div>
        </header>

        {msg && (
          <div className="bg-rose-100 border border-rose-200 text-rose-700 px-4 py-2 rounded-lg">
            {msg}
          </div>
        )}

        <form onSubmit={updateProfile} className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Date personale</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-semibold text-gray-700">
              Nume
              <input
                value={profile.nume}
                onChange={(e) => setProfile((p) => ({ ...p, nume: e.target.value }))}
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Prenume
              <input
                value={profile.prenume || ""}
                onChange={(e) => setProfile((p) => ({ ...p, prenume: e.target.value }))}
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Email
              <input value={profile.email} disabled className="mt-1 w-full border rounded-lg p-2 bg-gray-50" />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Telefon
              <input
                value={profile.telefon || ""}
                onChange={(e) => setProfile((p) => ({ ...p, telefon: e.target.value }))}
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">
              Adresa principala
              <input
                value={profile.adresa || ""}
                onChange={(e) => setProfile((p) => ({ ...p, adresa: e.target.value }))}
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-rose-100 space-y-3">
            <h3 className="text-lg font-semibold">Preferinte</h3>
            <label className="text-sm font-semibold text-gray-700 block">
              Alergii (separate prin virgula)
              <input
                value={profile.preferinte.alergii?.join(", ") || ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    preferinte: {
                      ...p.preferinte,
                      alergii: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                    },
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700 block">
              Nu doresc (ingrediente)
              <input
                value={profile.preferinte.evit?.join(", ") || ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    preferinte: {
                      ...p.preferinte,
                      evit: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                    },
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700 block">
              Note
              <textarea
                value={profile.preferinte.note || ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    preferinte: { ...p.preferinte, note: e.target.value },
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2 min-h-[80px]"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-rose-100 space-y-3">
            <h3 className="text-lg font-semibold">Adrese salvate</h3>
            <div className="space-y-2">
              {profile.adreseSalvate.map((addr, idx) => (
                <div key={`${addr.label}_${idx}`} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">{addr.label}</div>
                    <div className="text-sm text-gray-600">{addr.address}</div>
                  </div>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-lg text-sm ${
                      addr.isDefault ? "bg-pink-500 text-white" : "border border-rose-200 text-pink-600"
                    }`}
                    onClick={() => setDefault(idx)}
                  >
                    {addr.isDefault ? "Default" : "Seteaza default"}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-lg text-sm border border-rose-200 text-gray-600"
                    onClick={() => removeAddress(idx)}
                  >
                    Sterge
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={newAddress.label}
                onChange={(e) => setNewAddress((s) => ({ ...s, label: e.target.value }))}
                placeholder="Eticheta (ex: Acasa)"
                className="border rounded-lg p-2"
              />
              <input
                value={newAddress.address}
                onChange={(e) => setNewAddress((s) => ({ ...s, address: e.target.value }))}
                placeholder="Adresa completa"
                className="border rounded-lg p-2 md:col-span-2"
              />
              <button type="button" className="px-3 py-2 rounded-lg bg-rose-500 text-white" onClick={addAddress}>
                Adauga adresa
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-rose-100 space-y-2">
            <h3 className="text-lg font-semibold">Setari notificari</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.setariNotificari.email}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    setariNotificari: { ...p.setariNotificari, email: e.target.checked },
                  }))
                }
              />
              Email
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.setariNotificari.inApp}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    setariNotificari: { ...p.setariNotificari, inApp: e.target.checked },
                  }))
                }
              />
              In-app
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-60"
          >
            {saving ? "Se salveaza..." : "Salveaza profilul"}
          </button>
        </form>

        <section className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Istoric comenzi</h2>
          {orders.length === 0 ? (
            <div className="text-gray-600">Nu ai comenzi inca.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o._id} className="border border-rose-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Comanda #{o._id.slice(-6)}</div>
                    <div className="text-sm text-gray-600">{o.status || "inregistrata"}</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {o.dataLivrare || "-"} {o.oraLivrare || ""}
                  </div>
                  <div className="text-sm text-gray-700">
                    {(o.items || []).map((it) => `${it.name || it.nume} x${it.qty || it.cantitate || 1}`).join(" | ")}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">Total: {o.total} MDL</div>
                  <RecenzieComanda comandaId={o._id} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Notificari</h2>
          {notifs.length === 0 ? (
            <div className="text-gray-600">Nu ai notificari recente.</div>
          ) : (
            <div className="space-y-2">
              {notifs.map((n) => (
                <div key={n._id} className="border border-rose-100 rounded-lg p-3">
                  <div className="font-semibold text-gray-900">{n.titlu || "Notificare"}</div>
                  <div className="text-sm text-gray-700">{n.mesaj}</div>
                  <div className="text-xs text-gray-500">{new Date(n.data).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Notificari foto</h2>
          {loadingPhotoNotifs && <div className="text-gray-600">Se incarca...</div>}
          {!loadingPhotoNotifs && photoNotifs.length === 0 && (
            <div className="text-gray-600">Nu ai notificari foto.</div>
          )}
          <div className="space-y-2">
            {photoNotifs.map((n) => (
              <div key={n._id} className="border border-rose-100 rounded-lg p-3">
                <div className="text-sm text-gray-700">{n.mesaj}</div>
                <div className="text-xs text-gray-500">{new Date(n.data).toLocaleString()}</div>
                {!n.citit && (
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 rounded text-xs border border-rose-200 text-pink-600"
                    onClick={() => markPhotoRead(n._id)}
                  >
                    Marcheaza ca citita
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
