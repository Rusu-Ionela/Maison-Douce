import { useEffect, useState } from "react";
import api from "/src/lib/api.js";

export default function AdminFidelizare() {
  const [config, setConfig] = useState({ pointsPer10: 1, pointsPerOrder: 0, minTotal: 0 });
  const [msg, setMsg] = useState("");
  const [voucherForm, setVoucherForm] = useState({
    utilizatorId: "",
    cod: "",
    procent: 0,
    valoareFixa: 0,
    valoareMinima: 0,
    dataExpirare: "",
  });
  const [userId, setUserId] = useState("");
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    api.get("/fidelizare/admin/config")
      .then((res) => setConfig(res.data || {}))
      .catch(() => setConfig({ pointsPer10: 1, pointsPerOrder: 0, minTotal: 0 }));
  }, []);

  const saveConfig = async () => {
    setMsg("");
    try {
      const res = await api.put("/fidelizare/admin/config", config);
      setConfig(res.data?.config || config);
      setMsg("Config actualizat.");
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la salvare config.");
    }
  };

  const loadWallet = async () => {
    if (!userId) return;
    setMsg("");
    try {
      const res = await api.get(`/fidelizare/admin/user/${userId}`);
      setWallet(res.data?.fidelizare || null);
    } catch (e) {
      setWallet(null);
      setMsg(e?.response?.data?.message || "Eroare la incarcare portofel.");
    }
  };

  const createVoucher = async () => {
    setMsg("");
    try {
      const payload = {
        utilizatorId: voucherForm.utilizatorId,
        cod: voucherForm.cod || undefined,
        procent: Number(voucherForm.procent || 0),
        valoareFixa: Number(voucherForm.valoareFixa || 0),
        valoareMinima: Number(voucherForm.valoareMinima || 0),
        dataExpirare: voucherForm.dataExpirare || undefined,
      };
      const res = await api.post("/fidelizare/admin/voucher", payload);
      setMsg(`Voucher creat: ${res.data?.voucher?.codigPromo || payload.cod}`);
      setVoucherForm((v) => ({ ...v, cod: "" }));
    } catch (e) {
      setMsg(e?.response?.data?.message || "Eroare la creare voucher.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Fidelizare (Admin)</h1>
      {msg && <div className="text-rose-700">{msg}</div>}

      <section className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="text-lg font-semibold">Reguli puncte</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm text-gray-700">
            Puncte / 10 MDL
            <input
              type="number"
              className="mt-1 border rounded p-2 w-full"
              value={config.pointsPer10}
              onChange={(e) => setConfig((c) => ({ ...c, pointsPer10: Number(e.target.value || 0) }))}
            />
          </label>
          <label className="text-sm text-gray-700">
            Puncte / comanda
            <input
              type="number"
              className="mt-1 border rounded p-2 w-full"
              value={config.pointsPerOrder}
              onChange={(e) => setConfig((c) => ({ ...c, pointsPerOrder: Number(e.target.value || 0) }))}
            />
          </label>
          <label className="text-sm text-gray-700">
            Total minim (MDL)
            <input
              type="number"
              className="mt-1 border rounded p-2 w-full"
              value={config.minTotal}
              onChange={(e) => setConfig((c) => ({ ...c, minTotal: Number(e.target.value || 0) }))}
            />
          </label>
        </div>
        <button className="border px-3 py-2 rounded" onClick={saveConfig}>
          Salveaza configuratia
        </button>
      </section>

      <section className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="text-lg font-semibold">Vouchere</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded p-2"
            placeholder="Utilizator ID"
            value={voucherForm.utilizatorId}
            onChange={(e) => setVoucherForm((v) => ({ ...v, utilizatorId: e.target.value }))}
          />
          <input
            className="border rounded p-2"
            placeholder="Cod voucher (optional)"
            value={voucherForm.cod}
            onChange={(e) => setVoucherForm((v) => ({ ...v, cod: e.target.value }))}
          />
          <input
            type="number"
            className="border rounded p-2"
            placeholder="Procent reducere"
            value={voucherForm.procent}
            onChange={(e) => setVoucherForm((v) => ({ ...v, procent: e.target.value }))}
          />
          <input
            type="number"
            className="border rounded p-2"
            placeholder="Valoare fixa (MDL)"
            value={voucherForm.valoareFixa}
            onChange={(e) => setVoucherForm((v) => ({ ...v, valoareFixa: e.target.value }))}
          />
          <input
            type="number"
            className="border rounded p-2"
            placeholder="Valoare minima (MDL)"
            value={voucherForm.valoareMinima}
            onChange={(e) => setVoucherForm((v) => ({ ...v, valoareMinima: e.target.value }))}
          />
          <input
            type="date"
            className="border rounded p-2"
            value={voucherForm.dataExpirare}
            onChange={(e) => setVoucherForm((v) => ({ ...v, dataExpirare: e.target.value }))}
          />
        </div>
        <button className="border px-3 py-2 rounded" onClick={createVoucher}>
          Creeaza voucher
        </button>
      </section>

      <section className="border rounded-lg p-4 bg-white space-y-3">
        <h2 className="text-lg font-semibold">Portofel client</h2>
        <div className="flex gap-2">
          <input
            className="border rounded p-2 flex-1"
            placeholder="Client ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <button className="border px-3 py-2 rounded" onClick={loadWallet}>
            Incarca
          </button>
        </div>
        {wallet && (
          <div className="text-sm text-gray-700 space-y-1">
            <div>Puncte curente: {wallet.puncteCurent}</div>
            <div>Total puncte: {wallet.puncteTotal}</div>
            <div>Nivel: {wallet.nivelLoyalitate}</div>
            <div>Vouchere: {wallet.reduceriDisponibile?.length || 0}</div>
          </div>
        )}
      </section>
    </div>
  );
}
