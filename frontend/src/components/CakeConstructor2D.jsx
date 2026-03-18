import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Layer, Rect, Stage, Text } from "react-konva";
import api from "/src/lib/api.js";
import StatusBanner from "../components/StatusBanner";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { buttons, cards, inputs } from "../lib/tailwindComponents";

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

const PRESETS = [
  {
    id: "classic",
    label: "Clasic elegant",
    description: "Vanilie, decor fin si tonuri luminoase.",
    values: {
      blat: "vanilie",
      crema: "vanilie",
      umplutura: "capsuni",
      decor: "minimal",
      topping: "perle",
      culoare: "#f6d7c3",
      font: "Georgia",
    },
  },
  {
    id: "romantic",
    label: "Romantic",
    description: "Red velvet, note florale si nuante rose.",
    values: {
      blat: "redvelvet",
      crema: "fructe",
      umplutura: "fructe-padure",
      decor: "floral",
      topping: "fructe",
      culoare: "#f2c9e5",
      font: "Garamond",
    },
  },
  {
    id: "statement",
    label: "Statement",
    description: "Chocolate-forward, contrast puternic si mesaj central.",
    values: {
      blat: "ciocolata",
      crema: "pistachio",
      umplutura: "oreo",
      decor: "lambeth",
      topping: "ciocolata",
      culoare: "#e8e2f2",
      font: "Times New Roman",
    },
  },
];

const BASE_PRET = 250;
const BASE_ORE = 24;
const DEFAULT_OPTIONS = {
  blat: OPTIONS.blat[0].id,
  crema: OPTIONS.crema[0].id,
  umplutura: OPTIONS.umplutura[0].id,
  decor: OPTIONS.decor[0].id,
  topping: OPTIONS.topping[0].id,
  culoare: OPTIONS.culori[0].id,
  font: OPTIONS.font[0].id,
};

function findOption(section, optionId) {
  return (OPTIONS[section] || []).find((item) => item.id === optionId) || null;
}

function OptionPill({
  option,
  active,
  onClick,
  showPrice = false,
  swatch = "",
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[22px] border px-4 py-3 text-left shadow-soft",
        active
          ? "border-pink-400 bg-pink-600 text-white"
          : "border-rose-200 bg-white text-gray-800 hover:-translate-y-0.5 hover:border-pink-300 hover:bg-rose-50",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {swatch ? (
          <span
            className="h-5 w-5 shrink-0 rounded-full border border-white/80 shadow-sm"
            style={{ backgroundColor: swatch }}
          />
        ) : null}
        <div className="min-w-0">
          <div className="font-semibold">{option.label}</div>
          {showPrice ? (
            <div className={`text-xs ${active ? "text-pink-50" : "text-pink-700"}`}>
              +{option.price || 0} MDL
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function SummaryRow({ label, value, emphasize = false }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-right ${emphasize ? "text-lg font-semibold text-gray-900" : "font-semibold text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

export default function CakeConstructor2D({ designId: propDesignId }) {
  const stageRef = useRef(null);
  const previewRef = useRef(null);
  const { add } = useCart();
  const { user } = useAuth() || {};

  const [loading, setLoading] = useState(false);
  const [designId, setDesignId] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [previewWidth, setPreviewWidth] = useState(560);
  const [status, setStatus] = useState({ type: "", text: "" });

  const [blat, setBlat] = useState(DEFAULT_OPTIONS.blat);
  const [crema, setCrema] = useState(DEFAULT_OPTIONS.crema);
  const [umplutura, setUmplutura] = useState(DEFAULT_OPTIONS.umplutura);
  const [decor, setDecor] = useState(DEFAULT_OPTIONS.decor);
  const [topping, setTopping] = useState(DEFAULT_OPTIONS.topping);
  const [culoare, setCuloare] = useState(DEFAULT_OPTIONS.culoare);
  const [mesaj, setMesaj] = useState("");
  const [font, setFont] = useState(DEFAULT_OPTIONS.font);

  useEffect(() => {
    const element = previewRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || 560;
      setPreviewWidth(Math.max(320, Math.min(760, Math.round(width - 24))));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedId = propDesignId || params.get("designId");
    if (!requestedId) return;

    let cancelled = false;
    setDesignId(requestedId);
    setLoading(true);

    (async () => {
      try {
        const { data } = await api.get(`/personalizare/${requestedId}`);
        if (cancelled || !data) return;

        if (data.options) {
          setBlat(data.options.blat || DEFAULT_OPTIONS.blat);
          setCrema(data.options.crema || DEFAULT_OPTIONS.crema);
          setUmplutura(data.options.umplutura || DEFAULT_OPTIONS.umplutura);
          setDecor(data.options.decor || DEFAULT_OPTIONS.decor);
          setTopping(data.options.topping || DEFAULT_OPTIONS.topping);
          setCuloare(data.options.culoare || DEFAULT_OPTIONS.culoare);
          setFont(data.options.font || DEFAULT_OPTIONS.font);
        }

        if (data.mesaj) {
          setMesaj(data.mesaj);
        }
      } catch {
        if (!cancelled) {
          setStatus({
            type: "error",
            text: "Nu am putut incarca designul salvat.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [propDesignId]);

  const stageWidth = Math.max(320, previewWidth);
  const stageHeight = Math.round(stageWidth * 0.7);

  const selectedOptions = useMemo(
    () => ({
      blat: findOption("blat", blat),
      crema: findOption("crema", crema),
      umplutura: findOption("umplutura", umplutura),
      decor: findOption("decor", decor),
      topping: findOption("topping", topping),
      culoare: findOption("culori", culoare),
      font: findOption("font", font),
    }),
    [blat, crema, umplutura, decor, topping, culoare, font]
  );

  const total = useMemo(() => {
    return (
      BASE_PRET +
      (selectedOptions.blat?.price || 0) +
      (selectedOptions.crema?.price || 0) +
      (selectedOptions.umplutura?.price || 0) +
      (selectedOptions.decor?.price || 0) +
      (selectedOptions.topping?.price || 0)
    );
  }, [selectedOptions]);

  const timpOre = useMemo(() => BASE_ORE + (mesaj.trim() ? 4 : 0), [mesaj]);

  const previewMessage = useMemo(() => {
    const trimmed = mesaj.trim();
    if (!trimmed) return "";
    return trimmed.length > 22 ? `${trimmed.slice(0, 22)}...` : trimmed;
  }, [mesaj]);

  const layerSpecs = useMemo(() => {
    return [
      {
        id: "blat",
        label: selectedOptions.blat?.label || "Blat",
        color: selectedOptions.blat?.color || "#f6d7c3",
        height: Math.round(stageHeight * 0.18),
      },
      {
        id: "crema",
        label: selectedOptions.crema?.label || "Crema",
        color: selectedOptions.crema?.color || "#fff1e6",
        height: Math.round(stageHeight * 0.12),
      },
      {
        id: "decor",
        label: selectedOptions.decor?.label || "Decor",
        color: culoare || selectedOptions.decor?.color || "#ffd6e0",
        height: Math.round(stageHeight * 0.1),
      },
    ];
  }, [culoare, selectedOptions, stageHeight]);

  const toppingDecor = useMemo(() => {
    const colors = {
      perle: "#fff4de",
      fructe: "#d84f71",
      ciocolata: "#7a4f43",
    };

    return Array.from({ length: 6 }, (_, index) => ({
      x: stageWidth * 0.34 + index * (stageWidth * 0.055),
      y: stageHeight * 0.24 + (index % 2 === 0 ? 0 : 6),
      radius: topping === "fructe" ? 7 : topping === "ciocolata" ? 6 : 5,
      color: colors[topping] || "#fff4de",
    }));
  }, [stageHeight, stageWidth, topping]);

  const designSummary = useMemo(
    () => [
      `Blat ${selectedOptions.blat?.label || ""}`,
      `crema ${selectedOptions.crema?.label || ""}`,
      `umplutura ${selectedOptions.umplutura?.label || ""}`,
      `decor ${selectedOptions.decor?.label || ""}`,
    ].join(", "),
    [selectedOptions]
  );

  const applyPreset = (values) => {
    setBlat(values.blat);
    setCrema(values.crema);
    setUmplutura(values.umplutura);
    setDecor(values.decor);
    setTopping(values.topping);
    setCuloare(values.culoare);
    setFont(values.font);
    setStatus({
      type: "info",
      text: "Preset-ul a fost aplicat. Ajusteaza liber detaliile daca vrei.",
    });
  };

  const exportImage = () => {
    if (!stageRef.current) {
      throw new Error("Preview-ul nu este pregatit pentru export.");
    }
    return stageRef.current.toDataURL({ pixelRatio: 2 });
  };

  const runAction = async (action, handler) => {
    setBusyAction(action);
    try {
      return await handler();
    } finally {
      setBusyAction("");
    }
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

    if (designId) {
      await api.put(`/personalizare/${designId}`, payload);
      setStatus({ type: "success", text: "Designul a fost actualizat." });
      return designId;
    }

    const response = await api.post("/personalizare", payload);
    const nextId = response.data?.id || null;
    if (nextId) {
      setDesignId(nextId);
    }
    setStatus({ type: "success", text: "Designul a fost salvat." });
    return nextId;
  };

  const handleSaveDraft = async () => {
    try {
      await runAction("save", async () => {
        await saveDesign("draft");
      });
    } catch {
      setStatus({ type: "error", text: "Nu am putut salva designul." });
    }
  };

  const addToCart = async () => {
    try {
      await runAction("cart", async () => {
        const nextId = await saveDesign("draft");
        if (!nextId) return;

        const options = { blat, crema, umplutura, decor, topping, culoare, font, mesaj };
        add({
          id: nextId,
          name: "Tort personalizat",
          price: total,
          image: "/images/placeholder.svg",
          qty: 1,
          options,
          variantKey: JSON.stringify(options),
          prepHours: timpOre,
        });
        setStatus({
          type: "success",
          text: "Designul a fost adaugat in cos.",
        });
      });
    } catch {
      setStatus({
        type: "error",
        text: "Nu am putut adauga designul in cos.",
      });
    }
  };

  const downloadExportImage = async () => {
    try {
      await runAction("export", async () => {
        const uri = exportImage();
        const link = document.createElement("a");
        link.href = uri;
        link.download = `design-tort-${Date.now()}.png`;
        link.click();
      });
    } catch {
      setStatus({ type: "error", text: "Exportul imaginii a esuat." });
    }
  };

  const sendToPatiser = async () => {
    if (!user?._id) {
      setStatus({
        type: "warning",
        text: "Autentifica-te pentru a trimite designul catre patiser.",
      });
      return;
    }

    try {
      await runAction("send", async () => {
        const nextId = await saveDesign("trimis");
        if (!nextId) return;

        await api.post("/comenzi-personalizate", {
          clientId: user._id,
          numeClient: user?.nume || user?.name || "Client",
          preferinte: mesaj || "Comanda personalizata",
          imagine: exportImage(),
          designId: nextId,
          options: { blat, crema, umplutura, decor, topping, culoare, font },
          pretEstimat: total,
          timpPreparareOre: timpOre,
        });

        setStatus({
          type: "success",
          text: "Designul a fost trimis catre patiser.",
        });
      });
    } catch {
      setStatus({
        type: "error",
        text: "Nu am putut trimite designul catre patiser.",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-6">
        <div className={`${cards.elevated} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Preset-uri rapide</h2>
              <p className="text-sm text-gray-600">
                Pleci de la o directie vizuala clara si apoi finisezi detaliile.
              </p>
            </div>
            {designId ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Draft #{String(designId).slice(-6)}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.values)}
                className="rounded-[24px] border border-rose-200 bg-white px-4 py-4 text-left shadow-soft hover:-translate-y-0.5 hover:border-pink-300 hover:bg-rose-50"
              >
                <div className="font-semibold text-gray-900">{preset.label}</div>
                <div className="mt-2 text-sm text-gray-600">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div ref={previewRef} className={`${cards.elevated} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Preview 2D</h2>
              <p className="text-sm text-gray-600">
                Renderul se adapteaza automat la latimea ecranului si ramane exportabil.
              </p>
            </div>
            <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-pink-700">
              Responsive canvas
            </div>
          </div>

          <StatusBanner
            type={status.type || "info"}
            message={status.text}
          />

          <div className="overflow-hidden rounded-[28px] border border-rose-100 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(252,243,246,0.96),_rgba(244,229,234,0.9))] p-3 shadow-soft">
            <Stage
              width={stageWidth}
              height={stageHeight}
              ref={stageRef}
              style={{ display: "block", margin: "0 auto" }}
            >
              <Layer>
                <Rect
                  x={0}
                  y={0}
                  width={stageWidth}
                  height={stageHeight}
                  fill="#fff8f5"
                />
                <Rect
                  x={stageWidth * 0.18}
                  y={stageHeight * 0.78}
                  width={stageWidth * 0.64}
                  height={stageHeight * 0.06}
                  fill="#eadfd6"
                  cornerRadius={999}
                />

                {(() => {
                  const cakeWidth = stageWidth * 0.42;
                  const cakeX = (stageWidth - cakeWidth) / 2;
                  let currentBottom = stageHeight * 0.77;

                  return layerSpecs.map((layer) => {
                    const y = currentBottom - layer.height;
                    const node = (
                      <Rect
                        key={layer.id}
                        x={cakeX}
                        y={y}
                        width={cakeWidth}
                        height={layer.height}
                        fill={layer.color}
                        cornerRadius={layer.height / 2}
                        shadowColor="rgba(94, 60, 74, 0.12)"
                        shadowBlur={8}
                        shadowOffsetY={4}
                      />
                    );
                    currentBottom = y - 8;
                    return node;
                  });
                })()}

                <Rect
                  x={stageWidth * 0.29}
                  y={stageHeight * 0.21}
                  width={stageWidth * 0.42}
                  height={stageHeight * 0.02}
                  fill="#ffffff"
                  opacity={0.7}
                  cornerRadius={999}
                />

                {toppingDecor.map((item, index) => (
                  <Circle
                    key={`${topping}_${index}`}
                    x={item.x}
                    y={item.y}
                    radius={item.radius}
                    fill={item.color}
                    shadowColor="rgba(0,0,0,0.08)"
                    shadowBlur={2}
                  />
                ))}

                <Text
                  x={stageWidth * 0.12}
                  y={stageHeight * 0.08}
                  width={stageWidth * 0.76}
                  text={previewMessage || "Mesajul tau va aparea aici"}
                  align="center"
                  fontSize={previewMessage ? 18 : 15}
                  fontFamily={font}
                  fill={previewMessage ? "#4b3540" : "#9c7b86"}
                />

                <Text
                  x={stageWidth * 0.08}
                  y={stageHeight * 0.9}
                  width={stageWidth * 0.84}
                  text={designSummary}
                  align="center"
                  fontSize={13}
                  fill="#7f6170"
                />
              </Layer>
            </Stage>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-rose-100 bg-rose-50/70 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                Stil
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {selectedOptions.decor?.label}
              </div>
              <div className="text-sm text-gray-600">{selectedOptions.culoare?.label}</div>
            </div>
            <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                Timp estimat
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{timpOre} ore</div>
              <div className="text-sm text-gray-600">include 4 ore extra pentru mesaj</div>
            </div>
            <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                Ready for export
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">PNG la 2x</div>
              <div className="text-sm text-gray-600">bun pentru confirmare si productie</div>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className={`${cards.elevated} space-y-5`}>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Compozitie</h2>
            <p className="text-sm text-gray-600">
              Controlezi fiecare strat, culoarea dominanta si mesajul final.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Blat</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {OPTIONS.blat.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={blat === option.id}
                    onClick={() => setBlat(option.id)}
                    showPrice
                    swatch={option.color}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Crema</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {OPTIONS.crema.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={crema === option.id}
                    onClick={() => setCrema(option.id)}
                    showPrice
                    swatch={option.color}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Umplutura</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {OPTIONS.umplutura.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={umplutura === option.id}
                    onClick={() => setUmplutura(option.id)}
                    showPrice
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Decor</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {OPTIONS.decor.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={decor === option.id}
                    onClick={() => setDecor(option.id)}
                    showPrice
                    swatch={option.color}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Topping</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {OPTIONS.topping.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={topping === option.id}
                    onClick={() => setTopping(option.id)}
                    showPrice
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Culoare dominanta</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {OPTIONS.culori.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={culoare === option.id}
                    onClick={() => setCuloare(option.id)}
                    swatch={option.id}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Font mesaj</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {OPTIONS.font.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={font === option.id}
                    onClick={() => setFont(option.id)}
                  />
                ))}
              </div>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              Mesaj pe tort
              <input
                value={mesaj}
                onChange={(event) => setMesaj(event.target.value)}
                placeholder="Ex: La multi ani, Mara!"
                className={`mt-2 ${inputs.default}`}
              />
            </label>
          </div>
        </div>

        <div className={`${cards.elevated} space-y-4`}>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Estimare si actiuni</h2>
            <p className="text-sm text-gray-600">
              Salvezi draftul, il exporti pentru confirmare sau il trimiti direct in fluxul de comanda.
            </p>
          </div>

          <div className="rounded-[26px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(253,244,246,0.92))] p-5 shadow-soft">
            <div className="space-y-3">
              <SummaryRow label="Pret de baza" value={`${BASE_PRET} MDL`} />
              <SummaryRow label="Blat" value={`+${selectedOptions.blat?.price || 0} MDL`} />
              <SummaryRow label="Crema" value={`+${selectedOptions.crema?.price || 0} MDL`} />
              <SummaryRow label="Umplutura" value={`+${selectedOptions.umplutura?.price || 0} MDL`} />
              <SummaryRow label="Decor" value={`+${selectedOptions.decor?.price || 0} MDL`} />
              <SummaryRow label="Topping" value={`+${selectedOptions.topping?.price || 0} MDL`} />
              <div className="border-t border-rose-100 pt-3">
                <SummaryRow label="Total estimat" value={`${total} MDL`} emphasize />
              </div>
              <SummaryRow label="Timp estimat" value={`${timpOre} ore`} />
            </div>
          </div>

          <div className="rounded-[24px] border border-rose-100 bg-rose-50/70 px-4 py-4 text-sm text-gray-700">
            <div className="font-semibold text-gray-900">Compozitia curenta</div>
            <div className="mt-2 leading-6">{designSummary}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={buttons.outline}
              disabled={busyAction !== ""}
              onClick={handleSaveDraft}
            >
              {busyAction === "save" ? "Se salveaza..." : "Salveaza draft"}
            </button>
            <button
              type="button"
              className={buttons.primary}
              disabled={busyAction !== ""}
              onClick={addToCart}
            >
              {busyAction === "cart" ? "Se adauga..." : "Adauga in cos"}
            </button>
            <button
              type="button"
              className={buttons.secondary}
              disabled={busyAction !== ""}
              onClick={downloadExportImage}
            >
              {busyAction === "export" ? "Se exporta..." : "Export PNG"}
            </button>
            <button
              type="button"
              className={buttons.success}
              disabled={busyAction !== ""}
              onClick={sendToPatiser}
            >
              {busyAction === "send" ? "Se trimite..." : "Trimite patiserului"}
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Se incarca designul salvat...</div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
