import React, { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api.js";

const PRESTATOR_ID = "default";
const DELIVERY_FEE = 100;

export default function RezervareClient() {
  const { user } = useAuth() || {};
  const userId = user?._id || user?.id;
  const userNume = user?.nume || user?.name || "";

  const [zi, setZi] = useState(null);
  const [ora, setOra] = useState("");
  const [sloturi, setSloturi] = useState([]);
  const [metodaLivrare, setMetodaLivrare] = useState("pickup");
  const [adresa, setAdresa] = useState("");
  const [telefon, setTelefon] = useState(user?.telefon || "");
  const [subtotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    setTelefon(user?.telefon || "");
    if (metodaLivrare === "delivery" && user?.adresa) {
      setAdresa((current) => current || user.adresa);
    }
  }, [user, metodaLivrare]);

  useEffect(() => {
    if (!zi) return;

    (async () => {
      setLoadingSlots(true);
      try {
        const dateStr = zi.toISOString().split("T")[0];
        const res = await api.get(`/calendar/availability/${PRESTATOR_ID}`, {
          params: { from: dateStr, to: dateStr, hideFull: true },
        });
        setSloturi(res.data?.slots || []);
      } catch (err) {
        console.error("Eroare disponibilitate:", err);
        setSloturi([]);
        setStatus({
          type: "error",
          text: "Nu am putut incarca sloturile pentru ziua selectata.",
        });
      } finally {
        setLoadingSlots(false);
      }
    })();
  }, [zi]);

  const totalMDL = useMemo(
    () => subtotal + (metodaLivrare === "delivery" ? DELIVERY_FEE : 0),
    [subtotal, metodaLivrare]
  );

  const handleRezerva = async () => {
    setStatus({ type: "", text: "" });

    if (!userId) {
      setStatus({ type: "warning", text: "Trebuie sa te autentifici." });
      return;
    }
    if (!zi) {
      setStatus({ type: "warning", text: "Alege o data." });
      return;
    }
    if (!ora) {
      setStatus({ type: "warning", text: "Alege o ora." });
      return;
    }
    if (!telefon.trim()) {
      setStatus({ type: "warning", text: "Introdu numarul de telefon." });
      return;
    }
    if (metodaLivrare === "delivery" && !adresa.trim()) {
      setStatus({ type: "warning", text: "Introdu adresa pentru livrare." });
      return;
    }

    setLoading(true);
    try {
      const dateStr = zi.toISOString().split("T")[0];
      const payload = {
        clientId: userId,
        prestatorId: PRESTATOR_ID,
        date: dateStr,
        time: ora,
        metoda: metodaLivrare === "delivery" ? "livrare" : "ridicare",
        adresaLivrare: metodaLivrare === "delivery" ? adresa : "",
        subtotal: Number(subtotal || 0),
        tortId: null,
        customDetails: null,
      };

      const res = await api.post("/calendar/reserve", payload);

      if (res.data?.ok) {
        setStatus({
          type: "success",
          text: "Rezervare creata. Poti continua in profil sau pe fluxul de plata.",
        });
      } else {
        setStatus({
          type: "error",
          text: "Rezervarea nu a fost creata.",
        });
      }
    } catch (err) {
      console.error("Eroare rezervare:", err);
      setStatus({
        type: "error",
        text: err.response?.data?.message || err.message || "Eroare la rezervare.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-red-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-center text-4xl font-bold">Rezerva-ti Tortul</h1>
        <p className="mb-6 text-center text-gray-600">
          Alege data, ora si metoda de livrare preferata.
        </p>

        <StatusBanner type={status.type || "info"} message={status.text} className="mb-6" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-2xl lg:col-span-1">
            <h2 className="mb-4 text-xl font-bold">Selecteaza data</h2>
            <Calendar
              value={zi}
              onChange={setZi}
              minDate={new Date()}
              maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
              className="w-full"
            />
            {zi && (
              <div className="mt-4 rounded-lg border-2 border-green-400 bg-green-100 p-4">
                <p className="text-xs text-green-700">Data selectata</p>
                <p className="font-bold text-green-800">
                  {zi.toLocaleDateString("ro-RO", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-2">
            {zi && (
              <div className="rounded-2xl bg-white p-6 shadow-2xl">
                <label className="mb-3 block text-lg font-bold">Selecteaza ora</label>
                {loadingSlots ? (
                  <div className="text-sm text-gray-500">Se incarca sloturile...</div>
                ) : sloturi.length > 0 ? (
                  <select
                    value={ora}
                    onChange={(event) => setOra(event.target.value)}
                    className="w-full rounded-xl border-2 border-pink-200 p-4 text-lg focus:border-pink-500 focus:outline-none"
                  >
                    <option value="">-- Alege ora --</option>
                    {sloturi.map((slot, idx) => (
                      <option key={idx} value={slot.time}>
                        {slot.time} ({slot.free ?? Math.max(0, slot.capacity - slot.used)} locuri libere)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-amber-700">
                    Nu exista sloturi disponibile pentru aceasta zi.
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              <label className="mb-3 block text-lg font-bold">Date contact</label>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Nume</label>
                  <input
                    type="text"
                    value={userNume}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border-2 border-gray-200 bg-gray-100 p-3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Telefon *</label>
                  <input
                    type="tel"
                    placeholder="+373 XXXXXXX"
                    value={telefon}
                    onChange={(event) => setTelefon(event.target.value)}
                    className="w-full rounded-lg border-2 border-pink-200 p-3 focus:border-pink-400 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              <label className="mb-4 block text-lg font-bold">Metoda livrare</label>
              <div className="space-y-3">
                {[
                  { val: "pickup", label: "Ridicare din laborator (GRATIS)" },
                  { val: "delivery", label: `Livrare la domiciliu (+${DELIVERY_FEE} MDL)` },
                ].map((opt) => (
                  <label
                    key={opt.val}
                    className={`flex cursor-pointer items-center rounded-xl border-2 p-4 transition ${
                      metodaLivrare === opt.val
                        ? "border-pink-500 bg-pink-50"
                        : "border-gray-200 bg-white hover:border-pink-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="metoda"
                      value={opt.val}
                      checked={metodaLivrare === opt.val}
                      onChange={(event) => setMetodaLivrare(event.target.value)}
                      className="mr-4 h-5 w-5"
                    />
                    <span className="flex-1 font-semibold">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {metodaLivrare === "delivery" && (
              <div className="rounded-2xl border-2 border-orange-200 bg-white p-6 shadow-2xl">
                <label className="mb-3 block text-lg font-bold">Adresa livrare *</label>
                <textarea
                  value={adresa}
                  onChange={(event) => setAdresa(event.target.value)}
                  placeholder="str. Exemplu, nr. 123, apt. 456, Chisinau, MD 2012"
                  className="h-24 w-full rounded-lg border-2 border-orange-200 p-4 focus:border-orange-400 focus:outline-none"
                  required
                />
              </div>
            )}

            <div className="rounded-2xl border-2 border-pink-300 bg-gradient-to-r from-pink-100 to-orange-100 p-6 shadow-xl">
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span>Subtotal:</span>
                  <span className="font-bold">{subtotal} MDL</span>
                </div>
                {metodaLivrare === "delivery" && (
                  <div className="flex justify-between text-lg text-orange-700">
                    <span>Taxa livrare:</span>
                    <span className="font-bold">+{DELIVERY_FEE} MDL</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-pink-300 pt-2 text-2xl">
                  <span className="font-bold">TOTAL:</span>
                  <span className="font-bold text-pink-600">{totalMDL} MDL</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRezerva}
              disabled={loading || !zi || !ora || !telefon.trim()}
              className={`w-full rounded-xl px-6 py-4 text-xl font-bold text-white transition ${
                loading || !zi || !ora || !telefon.trim()
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-gradient-to-r from-pink-500 to-red-500 shadow-lg hover:from-pink-600 hover:to-red-600"
              }`}
            >
              {loading ? "Se proceseaza..." : "Confirma rezervarea"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
