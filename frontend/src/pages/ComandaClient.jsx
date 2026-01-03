import React, { useState } from "react";
import api from "/src/lib/api.js";
import { buttons, cards, inputs, containers } from "/src/lib/tailwindComponents.js";

function ComandaClient() {
  const [dataLivrare, setDataLivrare] = useState("");
  const [oraLivrare, setOraLivrare] = useState("");
  const [metodaLivrare, setMetodaLivrare] = useState("");
  const [adresaLivrare, setAdresaLivrare] = useState("");
  const [produse, setProduse] = useState([]);
  const [produsNou, setProdusNou] = useState("");
  const [cantitateNoua, setCantitateNoua] = useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!dataLivrare || !oraLivrare || !metodaLivrare) {
      alert("Completeaza toate campurile obligatorii.");
      return;
    }

    try {
      await api.post("/comenzi", {
        clientId: localStorage.getItem("utilizatorId"),
        produse,
        preferinte: "",
        imagineGenerata: "",
        dataLivrare,
        oraLivrare,
        metodaLivrare,
        adresaLivrare: metodaLivrare === "livrare" ? adresaLivrare : "",
      });

      alert("Comanda a fost trimisa cu succes!");
      setProduse([]);
      setProdusNou("");
      setCantitateNoua(1);
    } catch (error) {
      console.error("Eroare creare comanda:", error);
      alert("Eroare la trimiterea comenzii.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      <div className={`${containers.pageMax} grid grid-cols-1 lg:grid-cols-3 gap-6`}>
        <div className="lg:col-span-2 space-y-4">
          <header className="space-y-1">
            <p className="text-pink-500 font-semibold uppercase tracking-wide">ComandŽŸ rapid</p>
            <h1 className="text-3xl font-bold text-gray-900">Formular client</h1>
            <p className="text-gray-600">Introdu detaliile de livrare ETi produsele preferate.</p>
          </header>

          <div className={cards.bordered}>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Produse comandate</h3>

            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <input
                type="text"
                placeholder="Nume produs"
                value={produsNou}
                onChange={(e) => setProdusNou(e.target.value)}
                className={inputs.default}
              />
              <input
                type="number"
                min="1"
                value={cantitateNoua}
                onChange={(e) => setCantitateNoua(e.target.value)}
                className={`${inputs.default} md:w-32`}
              />
              <button
                type="button"
                onClick={() => {
                  if (produsNou.trim() !== "" && cantitateNoua > 0) {
                    setProduse([
                      ...produse,
                      {
                        produsId: Date.now().toString(),
                        numeProdus: produsNou,
                        cantitate: parseInt(cantitateNoua, 10),
                      },
                    ]);
                    setProdusNou("");
                    setCantitateNoua(1);
                  }
                }}
                className={buttons.primary}
              >
                Adauga produs
              </button>
            </div>

            {produse.length > 0 && (
              <ul className="divide-y divide-rose-100">
                {produse.map((prod, index) => (
                  <li key={index} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{prod.numeProdus}</div>
                      <div className="text-gray-600 text-sm">{prod.cantitate} buc.</div>
                    </div>
                    <button
                      className={buttons.outline}
                      onClick={() => setProduse(produse.filter((_, idx) => idx !== index))}
                    >
                      E~terge
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleSubmit} className={cards.elevated}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-700">Data livrare</span>
                <input
                  type="date"
                  value={dataLivrare}
                  onChange={(e) => setDataLivrare(e.target.value)}
                  className={inputs.default}
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-700">Ora livrare</span>
                <select
                  value={oraLivrare}
                  onChange={(e) => setOraLivrare(e.target.value)}
                  className={inputs.default}
                  required
                >
                  <option value="">Selecteaza ora</option>
                  {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-2">
              <span className="text-sm font-semibold text-gray-700">Metoda livrare</span>
              <div className="flex flex-col md:flex-row gap-2 mt-2">
                <label className={`${cards.default} flex items-center gap-2 cursor-pointer`}>
                  <input
                    type="radio"
                    name="metodaLivrare"
                    value="livrare"
                    checked={metodaLivrare === "livrare"}
                    onChange={(e) => setMetodaLivrare(e.target.value)}
                  />
                  Livrare la domiciliu (+100 MDL)
                </label>
                <label className={`${cards.default} flex items-center gap-2 cursor-pointer`}>
                  <input
                    type="radio"
                    name="metodaLivrare"
                    value="ridicare"
                    checked={metodaLivrare === "ridicare"}
                    onChange={(e) => setMetodaLivrare(e.target.value)}
                  />
                  Ridicare personalŽŸ
                </label>
              </div>
            </div>

            {metodaLivrare === "livrare" && (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-gray-700">Adresa pentru livrare</span>
                <input
                  type="text"
                  value={adresaLivrare}
                  onChange={(e) => setAdresaLivrare(e.target.value)}
                  className={inputs.default}
                  required
                />
              </label>
            )}

            <button type="submit" className={`${buttons.primary} w-full mt-2`}>
              Trimite comanda
            </button>
          </form>
        </div>

        <aside className={cards.bordered}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sfaturi rapide</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-2 text-sm">
            <li>SelecteazŽŸ din timp ora ETi adresa exactŽŸ pentru livrare.</li>
            <li>AdaugŽŸ fiecare produs cu nume clar (ex: "Tort Red Velvet 1kg").</li>
            <li>DacŽŸ ai preferinE>e speciale, noteazŽŸ-le Arn câmpul de adresa.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default ComandaClient;
