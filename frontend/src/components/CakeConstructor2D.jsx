import React, { useMemo, useRef, useState, useEffect } from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import api from "/src/lib/api.js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const OPTIONS = {
  blat: [
    { id: "vanilie", label: "Vanilie", price: 80, color: "#f6d7c3" },
    { id: "ciocolata", label: "Ciocolata", price: 90, color: "#d9b3a8" },
    { id: "redvelvet", label: "Red Velvet", price: 100, color: "#e7a3ad" },
  ],
  crema: [
    { id: "vanilie", label: "Vanilie", price: 60, color: "#fff1e6" },
    { id: "pistachio", label: "Pistachio", price: 80, color: "#d9e7c6" },
    { id: "fructe", label: "Fructe", price: 75, color: "#f2d4e7" },
  ],
  umplutura: [
    { id: "capsuni", label: "Capsuni", price: 40 },
    { id: "fructe-padure", label: "Fructe de padure", price: 45 },
    { id: "oreo", label: "Oreo", price: 35 },
  ],
  decor: [
    { id: "minimal", label: "Minimal", price: 30, color: "#ffd6e0" },
    { id: "lambeth", label: "Lambeth", price: 70, color: "#f7c7d9" },
    { id: "floral", label: "Floral", price: 60, color: "#f6d7e3" },
  ],
  topping: [
    { id: "perle", label: "Perle", price: 20 },
    { id: "fructe", label: "Fructe proaspete", price: 30 },
    { id: "ciocolata", label: "Ciocolata", price: 25 },
  ],
  culori: [
    { id: "#f6d7c3", label: "Ivoire" },
    { id: "#f2c9e5", label: "Rose" },
    { id: "#e8e2f2", label: "Lavanda" },
    { id: "#f7e6c4", label: "Champagne" },
  ],
  font: [
    { id: "Georgia", label: "Elegant Serif" },
    { id: "Garamond", label: "Classic" },
    { id: "Times New Roman", label: "Formal" },
  ],
};

const BASE_PRET = 250;
const BASE_ORE = 24;

export default function CakeConstructor2D({ designId: propDesignId }) {
  const stageRef = useRef(null);
  const { add } = useCart();
  const { user } = useAuth() || {};
  const [loading, setLoading] = useState(false);
  const [designId, setDesignId] = useState(null);

  const [blat, setBlat] = useState(OPTIONS.blat[0].id);
  const [crema, setCrema] = useState(OPTIONS.crema[0].id);
  const [umplutura, setUmplutura] = useState(OPTIONS.umplutura[0].id);
  const [decor, setDecor] = useState(OPTIONS.decor[0].id);
  const [topping, setTopping] = useState(OPTIONS.topping[0].id);
  const [culoare, setCuloare] = useState(OPTIONS.culori[0].id);
  const [mesaj, setMesaj] = useState("");
  const [font, setFont] = useState(OPTIONS.font[0].id);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = propDesignId || params.get("designId");
      if (!id) return;
      setDesignId(id);
      (async () => {
        setLoading(true);
        try {
          const { data } = await api.get(`/personalizare/${id}`);
          if (data) {
            if (data.options) {
              setBlat(data.options.blat || blat);
              setCrema(data.options.crema || crema);
              setUmplutura(data.options.umplutura || umplutura);
              setDecor(data.options.decor || decor);
              setTopping(data.options.topping || topping);
              setCuloare(data.options.culoare || culoare);
              setFont(data.options.font || font);
            }
            if (data.mesaj) setMesaj(data.mesaj);
          }
        } catch (e) {
          console.error("Failed to load design", e);
        } finally {
          setLoading(false);
        }
      })();
    } catch (e) {
      console.warn("No designId in query", e);
    }
  }, [propDesignId]);

  const layers = useMemo(() => {
    const blatOpt = OPTIONS.blat.find((o) => o.id === blat);
    const cremaOpt = OPTIONS.crema.find((o) => o.id === crema);
    const decorOpt = OPTIONS.decor.find((o) => o.id === decor);
    return [
      { id: "blat", label: "Blat", color: blatOpt?.color || "#f6d7c3", height: 50 },
      { id: "crema", label: "Crema", color: cremaOpt?.color || "#fff1e6", height: 35 },
      { id: "decor", label: "Decor", color: decorOpt?.color || "#ffd6e0", height: 25 },
    ];
  }, [blat, crema, decor]);

  const total = useMemo(() => {
    const pick = (arr, id) => arr.find((o) => o.id === id)?.price || 0;
    return (
      BASE_PRET +
      pick(OPTIONS.blat, blat) +
      pick(OPTIONS.crema, crema) +
      pick(OPTIONS.umplutura, umplutura) +
      pick(OPTIONS.decor, decor) +
      pick(OPTIONS.topping, topping)
    );
  }, [blat, crema, umplutura, decor, topping]);

  const timpOre = useMemo(() => {
    const extra = mesaj ? 4 : 0;
    return BASE_ORE + extra;
  }, [mesaj]);

  const exportImage = () => {
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    return uri;
  };

  const saveDesign = async (nextStatus = "draft") => {
    const imageData = exportImage();
    const payload = {
      clientId: user?._id || undefined,
      forma: "rotund",
      culori: [culoare],
      mesaj,
      imageData,
      options: { blat, crema, umplutura, decor, topping, culoare, font },
      pretEstimat: total,
      timpPreparareOre: timpOre,
      status: nextStatus,
      note: "Saved from constructor 2D",
    };

    try {
      if (designId) {
        await api.put(`/personalizare/${designId}`, payload);
        return designId;
      }
      const res = await api.post("/personalizare", payload);
      const id = res.data?.id;
      if (id) setDesignId(id);
      return id || null;
    } catch (e) {
      console.error("Save design failed", e);
      alert("Eroare la salvare design");
      return null;
    }
  };

  const addToCart = async () => {
    const id = await saveDesign("draft");
    if (!id) return;
    const options = { blat, crema, umplutura, decor, topping, culoare, font, mesaj };
    add({
      id,
      name: "Tort personalizat",
      price: total,
      image: "/images/placeholder.png",
      qty: 1,
      options,
      variantKey: JSON.stringify(options),
    });
    alert("Design salvat si adaugat in cos.");
  };

  const sendToPatiser = async () => {
    if (!user?._id) {
      alert("Autentifica-te pentru a trimite designul.");
      return;
    }
    const id = await saveDesign("trimis");
    if (!id) return;
    try {
      await api.post("/comenzi-personalizate", {
        clientId: user._id,
        numeClient: user?.nume || user?.name || "Client",
        preferinte: mesaj || "Comanda personalizata",
        imagine: exportImage(),
        designId: id,
        options: { blat, crema, umplutura, decor, topping, culoare, font },
        pretEstimat: total,
        timpPreparareOre: timpOre,
      });
      alert("Design trimis catre patiser.");
    } catch (e) {
      console.error("Submit personalizat failed", e);
      alert("Eroare la trimiterea designului.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100">
          <Stage width={520} height={380} ref={stageRef} style={{ background: "#f8fafc" }}>
            <Layer>
              <Rect x={80} y={40} width={360} height={280} fill={"#fff7f0"} cornerRadius={20} />
              {(() => {
                let y = 260;
                return layers.map((l) => {
                  const h = l.height;
                  const node = (
                    <Rect key={l.id} x={160} y={y - h} width={200} height={h} fill={l.color} cornerRadius={h / 2} />
                  );
                  y -= h + 6;
                  return node;
                });
              })()}
              {mesaj ? (
                <Text x={170} y={70} text={mesaj} fontSize={16} fill={"#333"} fontFamily={font} />
              ) : null}
              <Text x={160} y={50} text={"Preview: tort 2D"} fontSize={12} fill={"#333"} />
            </Layer>
          </Stage>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100 space-y-3">
          <h3 className="text-lg font-semibold">Alege compozitia</h3>

          <label className="text-sm font-semibold text-gray-700">
            Blat
            <select value={blat} onChange={(e) => setBlat(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
              {OPTIONS.blat.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} (+{o.price} MDL)
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Crema
            <select value={crema} onChange={(e) => setCrema(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
              {OPTIONS.crema.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} (+{o.price} MDL)
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Umplutura
            <select value={umplutura} onChange={(e) => setUmplutura(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
              {OPTIONS.umplutura.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} (+{o.price} MDL)
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Decor
            <select value={decor} onChange={(e) => setDecor(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
              {OPTIONS.decor.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} (+{o.price} MDL)
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Topping
            <select value={topping} onChange={(e) => setTopping(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
              {OPTIONS.topping.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label} (+{o.price} MDL)
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Culoare
            <select value={culoare} onChange={(e) => setCuloare(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
              {OPTIONS.culori.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Mesaj pe tort
            <input
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              placeholder="Ex: La multi ani!"
              className="mt-1 w-full border rounded-lg p-2"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Font mesaj
            <select value={font} onChange={(e) => setFont(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
              {OPTIONS.font.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Pret estimat</span>
            <span className="font-semibold">{total} MDL</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Timp preparare</span>
            <span className="font-semibold">{timpOre} ore</span>
          </div>
          <div className="flex gap-2 pt-2">
            <button className="px-3 py-2 border rounded-lg" onClick={() => saveDesign("draft")}>
              Salveaza draft
            </button>
            <button className="px-3 py-2 bg-pink-500 text-white rounded-lg" onClick={addToCart}>
              Adauga in cos
            </button>
          </div>
          <button className="w-full px-3 py-2 bg-emerald-500 text-white rounded-lg" onClick={sendToPatiser}>
            Trimite catre patiser
          </button>
          {loading && <div className="text-xs text-gray-500">Se incarca designul...</div>}
        </div>
      </aside>
    </div>
  );
}
