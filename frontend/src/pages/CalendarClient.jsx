// frontend/src/pages/CalendarClient.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAvailability, reserveSlot } from "../api/calendar";
import SlotPicker from "../components/SlotPicker";
import { useAuth } from "../context/AuthContext";
import { buttons, inputs, cards } from "../lib/tailwindComponents";

export default function CalendarClient() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [metoda, setMetoda] = useState("ridicare"); // 'ridicare' | 'livrare'
  const [adresa, setAdresa] = useState("");
  const [slots, setSlots] = useState(null);
  const [subtotal, setSubtotal] = useState(0); // leaga ulterior de cos
  const [descriere, setDescriere] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const prestatorId = import.meta.env.VITE_PRESTATOR_ID || "default";

  // incarcam sloturile
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const data = await getAvailability(prestatorId, {});
        setSlots(data); // { slots: [...] }
      } catch (e) {
        console.error("getAvailability error", e);
        setErr(
          e?.response?.data?.message || "Nu s-au putut incarca intervalele."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [prestatorId]);

  async function handleReserve(e) {
    e.preventDefault();
    setErr("");
    setSuccess("");

    if (!user?._id) {
      setErr("Trebuie sa fii autentificat pentru a face o rezervare.");
      return;
    }

    if (!date || !time) {
      setErr("Selecteaza data si ora.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        clientId: user._id,
        prestatorId,
        date,
        time,
        metoda,
        adresaLivrare: metoda === "livrare" ? adresa : "",
        subtotal: Number(subtotal || 0),
        descriere: descriere || undefined,
      };

      const data = await reserveSlot(payload);

      setSuccess("Rezervarea a fost creata cu succes!");
      console.log("Rezervare raspuns:", data);
    } catch (e) {
      console.error("reserveSlot error", e);
      setErr(e?.response?.data?.message || "Rezervarea a esuat.");
    } finally {
      setLoading(false);
    }
  }

  const total = Number(subtotal || 0) + (metoda === "livrare" ? 100 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Rezerva un interval
          </h1>
          <p className="text-gray-600 text-lg">
            Alege data, ora si modul de predare pentru desertul tau
          </p>
        </div>

        {err && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 font-semibold">Eroare</p>
            <p className="text-red-600 text-sm">{err}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <p className="text-green-700 font-semibold">Succes!</p>
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        <div className={cards.elevated}>
          <form onSubmit={handleReserve} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime("");
                }}
                className={inputs.default}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ora
              </label>
              {loading && !slots && (
                <div className="text-center py-4 text-gray-500">
                  <p>Se incarca intervalele...</p>
                </div>
              )}
              {slots && (
                <SlotPicker slots={slots} date={date} value={time} onChange={setTime} />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Mod de preluare
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-pink-500 transition-colors">
                  <input
                    type="radio"
                    value="ridicare"
                    checked={metoda === "ridicare"}
                    onChange={(e) => setMetoda(e.target.value)}
                    className="mr-3 w-4 h-4"
                  />
                  <span className="font-medium text-gray-700">
                    Ridicare de la patiserie
                  </span>
                </label>
                <label className="flex items-center p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-pink-500 transition-colors">
                  <input
                    type="radio"
                    value="livrare"
                    checked={metoda === "livrare"}
                    onChange={(e) => setMetoda(e.target.value)}
                    className="mr-3 w-4 h-4"
                  />
                  <div>
                    <span className="font-medium text-gray-700">Livrare</span>
                    <p className="text-sm text-gray-500">+100 MDL</p>
                  </div>
                </label>
              </div>
            </div>

            {metoda === "livrare" && (
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adresa livrare
                </label>
                <input
                  type="text"
                  value={adresa}
                  onChange={(e) => setAdresa(e.target.value)}
                  className={inputs.default}
                  placeholder="Strada, numar, bloc, apartament..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subtotal (MDL)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                className={inputs.default}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descriere desert / cerinte
              </label>
              <textarea
                value={descriere}
                onChange={(e) => setDescriere(e.target.value)}
                className={`${inputs.default} min-h-[100px]`}
                placeholder="Ex: Tort ciocolata 1kg, 8 persoane, mesaj: La multi ani!"
              />
            </div>

            <div className="p-4 bg-pink-50 rounded-lg border-2 border-pink-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-semibold">Total:</span>
                <span className="text-2xl font-bold text-pink-600">
                  {total.toFixed(2)} MDL
                </span>
              </div>
              {metoda === "livrare" && (
                <p className="text-sm text-gray-600 mt-2">
                  Include taxa livrare 100 MDL
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !date || !time}
              className={`w-full ${buttons.primary} py-3 text-lg`}
            >
              {loading ? "Se proceseaza..." : "Confirma rezervarea"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

