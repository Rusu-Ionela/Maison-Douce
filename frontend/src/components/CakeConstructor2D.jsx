import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ProductsAPI } from "../api/products";
import api from "/src/lib/api.js";
import CakePreview2DStage from "../components/CakePreview2DStage";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import { buttons, cards, inputs } from "../lib/tailwindComponents";
import { getStorefrontCake, getStorefrontFallbackCakeById } from "../lib/storefrontCatalog";
import {
  BASE_PREP_HOURS,
  BASE_PRICE,
  CAKE_OPTIONS,
  CAKE_PRESETS,
  DEFAULT_CAKE_OPTIONS,
  PREVIEW_MODES,
  buildCakePreviewModel,
  findCakeOption,
  getCakeDesignSummary,
  getRecommendedPreviewModeForField,
  resolveConstructorPrefillFromCake,
  resolveConstructorPrefillFromFilling,
} from "../lib/cakePreview2D";

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
        "rounded-[22px] border px-4 py-3 text-left shadow-soft transition",
        active
          ? "border-sage-deep/40 bg-charcoal text-white"
          : "border-rose-200 bg-white text-gray-800 hover:-translate-y-0.5 hover:border-sage-deep/40 hover:bg-white",
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
            <div className={`text-xs ${active ? "text-rose-100" : "text-pink-700"}`}>
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
      <span
        className={`text-right ${
          emphasize ? "text-lg font-semibold text-gray-900" : "font-semibold text-gray-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PreviewModeToggle({ activeMode, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-rose-200 bg-white/90 p-1 shadow-soft">
      {PREVIEW_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChange(mode.id)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeMode === mode.id
              ? "bg-charcoal text-white shadow-soft"
              : "text-[#5f564d] hover:bg-sage/35"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

function ConstructorPrefillBadge({
  sourceLabel,
  summary,
  actionTo,
  actionLabel,
  chipLabel = "Prefill din catalog",
}) {
  return (
    <div className="rounded-[24px] border border-sage-deep/15 bg-[linear-gradient(135deg,rgba(247,244,236,0.96),rgba(233,240,228,0.82))] px-4 py-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-deep">
              Ai pornit de la
            </div>
            <div className="font-display text-2xl text-[#2f2126]">{sourceLabel}</div>
            <p className="max-w-2xl text-sm leading-6 text-[#5c524a]">{summary}</p>
          </div>
          {actionTo && actionLabel ? (
            <Link
              to={actionTo}
              className="inline-flex items-center justify-center rounded-full border border-sage-deep/25 bg-white/90 px-4 py-2 text-sm font-semibold text-[#465141] shadow-soft transition hover:-translate-y-0.5 hover:border-sage-deep/35 hover:bg-white"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
        <span className="rounded-full border border-white/80 bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6856] shadow-soft">
          {chipLabel}
        </span>
      </div>
    </div>
  );
}

export default function CakeConstructor2D({
  designId: propDesignId,
  prefillFilling = "",
  prefillProductId = "",
}) {
  const exteriorStageRef = useRef(null);
  const sectionStageRef = useRef(null);
  const previewRef = useRef(null);
  const hintTimerRef = useRef(null);
  const manualModeLockRef = useRef(0);
  const { user } = useAuth() || {};

  const [loading, setLoading] = useState(false);
  const [designId, setDesignId] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [previewWidth, setPreviewWidth] = useState(560);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [previewMode, setPreviewMode] = useState("exterior");
  const [previewHint, setPreviewHint] = useState("");

  const [blat, setBlat] = useState(DEFAULT_CAKE_OPTIONS.blat);
  const [crema, setCrema] = useState(DEFAULT_CAKE_OPTIONS.crema);
  const [umplutura, setUmplutura] = useState(DEFAULT_CAKE_OPTIONS.umplutura);
  const [decor, setDecor] = useState(DEFAULT_CAKE_OPTIONS.decor);
  const [topping, setTopping] = useState(DEFAULT_CAKE_OPTIONS.topping);
  const [culoare, setCuloare] = useState(DEFAULT_CAKE_OPTIONS.culoare);
  const [mesaj, setMesaj] = useState("");
  const [font, setFont] = useState(DEFAULT_CAKE_OPTIONS.font);
  const [productPrefill, setProductPrefill] = useState(null);
  const catalogPrefill = useMemo(() => {
    if (propDesignId) return null;
    return resolveConstructorPrefillFromFilling(prefillFilling);
  }, [prefillFilling, propDesignId]);
  const activePrefill = catalogPrefill || productPrefill;

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
    return () => {
      if (hintTimerRef.current) {
        window.clearTimeout(hintTimerRef.current);
      }
    };
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
          setBlat(data.options.blat || DEFAULT_CAKE_OPTIONS.blat);
          setCrema(data.options.crema || DEFAULT_CAKE_OPTIONS.crema);
          setUmplutura(data.options.umplutura || DEFAULT_CAKE_OPTIONS.umplutura);
          setDecor(data.options.decor || DEFAULT_CAKE_OPTIONS.decor);
          setTopping(data.options.topping || DEFAULT_CAKE_OPTIONS.topping);
          setCuloare(data.options.culoare || DEFAULT_CAKE_OPTIONS.culoare);
          setFont(data.options.font || DEFAULT_CAKE_OPTIONS.font);
        }

        if (data.mesaj) {
          setMesaj(data.mesaj);
        }
      } catch {
        if (!cancelled) {
          setStatus({
            type: "error",
            text: "Nu am putut încărca designul salvat.",
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

  useEffect(() => {
    if (!catalogPrefill) return;

    const nextValues = { ...DEFAULT_CAKE_OPTIONS, ...catalogPrefill.values };
    setBlat(nextValues.blat);
    setCrema(nextValues.crema);
    setUmplutura(nextValues.umplutura);
    setDecor(nextValues.decor);
    setTopping(nextValues.topping);
    setCuloare(nextValues.culoare);
    setFont(nextValues.font);
    setPreviewMode("section");
    setPreviewHint(`Am preselectat ${catalogPrefill.sourceLabel}.`);
    if (hintTimerRef.current) {
      window.clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = window.setTimeout(() => {
      setPreviewHint("");
    }, 2600);
    setStatus({
      type: "info",
      text: `Configuratia initiala porneste de la ${catalogPrefill.sourceLabel}. ${catalogPrefill.summary} Poti ajusta apoi crema, umplutura si decorul direct din constructor.`,
    });
  }, [catalogPrefill]);

  useEffect(() => {
    if (propDesignId || catalogPrefill || !prefillProductId) {
      setProductPrefill(null);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        let sourceCake = null;
        try {
          const data = await ProductsAPI.get(prefillProductId);
          sourceCake = getStorefrontCake(data, 0);
        } catch {
          sourceCake = getStorefrontFallbackCakeById(prefillProductId);
        }

        const resolved = resolveConstructorPrefillFromCake(sourceCake);
        if (!cancelled) {
          setProductPrefill(resolved);
        }
      } catch {
        if (!cancelled) {
          setProductPrefill(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogPrefill, prefillProductId, propDesignId]);

  useEffect(() => {
    if (catalogPrefill || !productPrefill) return;

    const nextValues = { ...DEFAULT_CAKE_OPTIONS, ...productPrefill.values };
    setBlat(nextValues.blat);
    setCrema(nextValues.crema);
    setUmplutura(nextValues.umplutura);
    setDecor(nextValues.decor);
    setTopping(nextValues.topping);
    setCuloare(nextValues.culoare);
    setFont(nextValues.font);
    setPreviewMode("section");
    setPreviewHint(`Am pornit de la ${productPrefill.sourceLabel}.`);
    if (hintTimerRef.current) {
      window.clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = window.setTimeout(() => {
      setPreviewHint("");
    }, 2600);
    setStatus({
      type: "info",
      text: `Configuratia initiala este inspirata de ${productPrefill.sourceLabel}. ${productPrefill.summary} Poti rafina apoi straturile, decorul si mesajul final direct din constructor.`,
    });
  }, [catalogPrefill, productPrefill]);

  const stageWidth = Math.max(320, previewWidth);
  const stageHeight = Math.round(stageWidth * 0.72);

  const selectedOptions = useMemo(
    () => ({
      blat: findCakeOption("blat", blat),
      crema: findCakeOption("crema", crema),
      umplutura: findCakeOption("umplutura", umplutura),
      decor: findCakeOption("decor", decor),
      topping: findCakeOption("topping", topping),
      culoare: findCakeOption("culori", culoare),
      font: findCakeOption("font", font),
    }),
    [blat, crema, umplutura, decor, topping, culoare, font]
  );

  const previewModel = useMemo(
    () =>
      buildCakePreviewModel({
        stageWidth,
        stageHeight,
        selectedOptions,
        message: mesaj,
      }),
    [mesaj, selectedOptions, stageHeight, stageWidth]
  );

  const total = useMemo(() => {
    return (
      BASE_PRICE +
      (selectedOptions.blat?.price || 0) +
      (selectedOptions.crema?.price || 0) +
      (selectedOptions.umplutura?.price || 0) +
      (selectedOptions.decor?.price || 0) +
      (selectedOptions.topping?.price || 0)
    );
  }, [selectedOptions]);

  const timpOre = useMemo(() => BASE_PREP_HOURS + (mesaj.trim() ? 4 : 0), [mesaj]);
  const designSummary = useMemo(() => getCakeDesignSummary(selectedOptions), [selectedOptions]);
  const layerSummary = useMemo(
    () =>
      [
        selectedOptions.blat?.label,
        selectedOptions.crema?.label,
        selectedOptions.umplutura?.label,
      ]
        .filter(Boolean)
        .join(" • "),
    [selectedOptions]
  );

  const exteriorFooter = useMemo(
    () =>
      [
        selectedOptions.decor?.label,
        selectedOptions.culoare?.label,
        selectedOptions.topping?.label,
      ]
        .filter(Boolean)
        .join(" • "),
    [selectedOptions]
  );

  const estimationContext = useMemo(() => {
    if (catalogPrefill) {
      return {
        eyebrow: "Pornire din umplutura",
        title: `Configuratia initiala porneste de la ${catalogPrefill.sourceLabel}`,
        text: "Estimarea de mai jos foloseste aceasta directie ca punct de plecare si se actualizeaza instant cand schimbi straturile, stilul sau decorul.",
      };
    }

    if (productPrefill) {
      return {
        eyebrow: "Pornire din tort",
        title: `Configuratia initiala este inspirata de ${productPrefill.sourceLabel}`,
        text: "Pretul estimat si preview-ul pornesc de la profilul tortului selectat, apoi se recalculeaza imediat pe masura ce personalizezi compozitia.",
      };
    }

    return null;
  }, [catalogPrefill, productPrefill]);

  const activeModeMeta = PREVIEW_MODES.find((mode) => mode.id === previewMode) || PREVIEW_MODES[0];

  const showPreviewHint = (text) => {
    setPreviewHint(text);
    if (hintTimerRef.current) {
      window.clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = window.setTimeout(() => {
      setPreviewHint("");
    }, 2600);
  };

  const handleGuidedPreview = (field) => {
    const recommendedMode = getRecommendedPreviewModeForField(field);
    const now = Date.now();

    if (previewMode !== recommendedMode && now > manualModeLockRef.current) {
      setPreviewMode(recommendedMode);
      showPreviewHint(
        recommendedMode === "section"
          ? "Am trecut în Secțiune ca să vezi clar blatul, crema și umplutura."
          : "Am trecut pe Exterior ca să vezi finisajul final al tortului."
      );
      return;
    }

    if (previewMode !== recommendedMode) {
      showPreviewHint(
        recommendedMode === "section"
          ? "Vezi interiorul în Secțiune."
          : "Vezi exteriorul final."
      );
      return;
    }

    showPreviewHint(
      recommendedMode === "section" ? "Interiorul a fost actualizat." : "Exteriorul a fost actualizat."
    );
  };

  const handleOptionChange = (field, setter, value) => {
    setter(value);
    handleGuidedPreview(field);
  };

  const handleMessageChange = (event) => {
    setMesaj(event.target.value);
    handleGuidedPreview("mesaj");
  };

  const handleModeToggle = (nextMode) => {
    manualModeLockRef.current = Date.now() + 10000;
    setPreviewMode(nextMode);
    showPreviewHint(
      nextMode === "section"
        ? "Secțiunea evidențiază compoziția internă a tortului."
        : "Exteriorul evidențiază finisajul final și decorul."
    );
  };

  const applyPreset = (values) => {
    setBlat(values.blat);
    setCrema(values.crema);
    setUmplutura(values.umplutura);
    setDecor(values.decor);
    setTopping(values.topping);
    setCuloare(values.culoare);
    setFont(values.font);
    setPreviewMode("exterior");
    showPreviewHint("Preset-ul a fost aplicat. Exteriorul final a fost actualizat.");
    setStatus({
      type: "info",
      text: "Preset-ul a fost aplicat. Poți trece în Secțiune pentru a verifica imediat straturile.",
    });
  };

  const exportImage = () => {
    const activeStage =
      previewMode === "section" ? sectionStageRef.current : exteriorStageRef.current;
    if (!activeStage) {
      throw new Error("Preview-ul nu este pregătit pentru export.");
    }
    return activeStage.toDataURL({ pixelRatio: 2 });
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

  const addToCart = () => {
    setStatus({
      type: "warning",
      text: "Designurile personalizate nu intră direct în checkout-ul public. Salvează draftul sau trimite cererea către patiser pentru confirmarea finală a prețului.",
    });
  };

  const downloadExportImage = async () => {
    try {
      await runAction("export", async () => {
        const uri = exportImage();
        const link = document.createElement("a");
        link.href = uri;
        link.download = `design-tort-${previewMode}-${Date.now()}.png`;
        link.click();
      });
    } catch {
      setStatus({ type: "error", text: "Exportul imaginii a eșuat." });
    }
  };

  const sendToPatiser = async () => {
    if (!user?._id) {
      setStatus({
        type: "warning",
        text: "Autentifică-te pentru a trimite designul către patiser.",
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
          preferinte: mesaj || "Comandă personalizată",
          imagine: exportImage(),
          designId: nextId,
          options: { blat, crema, umplutura, decor, topping, culoare, font },
          pretEstimat: total,
          timpPreparareOre: timpOre,
        });

        setStatus({
          type: "success",
          text: "Designul a fost trimis către patiser.",
        });
      });
    } catch {
      setStatus({
        type: "error",
        text: "Nu am putut trimite designul către patiser.",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <section className="space-y-6">
        <div className={`${cards.elevated} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Preset-uri rapide</h2>
              <p className="text-sm text-gray-600">
                Alegi o direcție de atelier și vezi instant cum se schimbă compoziția, frosting-ul și topping-ul.
              </p>
            </div>
            {designId ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Draft #{String(designId).slice(-6)}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {CAKE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.values)}
                className="rounded-[24px] border border-rose-200 bg-white px-4 py-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-sage-deep/40 hover:bg-white"
              >
                <div className="font-semibold text-gray-900">{preset.label}</div>
                <div className="mt-2 text-sm leading-6 text-gray-600">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div ref={previewRef} className={`${cards.elevated} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Preview premium 2D</h2>
              <p className="text-sm text-gray-600">
                Exteriorul vinde tortul, iar Secțiunea explică clar straturile și compoziția lui.
              </p>
            </div>
            <PreviewModeToggle activeMode={previewMode} onChange={handleModeToggle} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#bf6a86]">
                Mod activ
              </div>
              <div className="mt-1 text-base font-semibold text-[#2f2126]">
                {activeModeMeta.label}
              </div>
              <div className="text-sm text-[#6e5661]">{activeModeMeta.description}</div>
            </div>
            {previewHint ? (
              <div className="rounded-full border border-rose-200 bg-white px-3 py-2 text-sm text-[#6d625a] shadow-soft transition">
                {previewHint}
              </div>
            ) : (
              <div className="rounded-full border border-white/80 bg-white/80 px-3 py-2 text-sm text-[#6d625a]">
                {previewMode === "section" ? "Focus pe interior" : "Focus pe finisajul final"}
              </div>
            )}
          </div>

          {activePrefill ? (
            <ConstructorPrefillBadge
              sourceLabel={activePrefill.sourceLabel}
              summary={`${activePrefill.summary} Acum poti rafina fiecare strat, culoarea si mesajul final exact cum vrei.`}
              actionTo={
                catalogPrefill
                  ? `/catalog?selectedUmplutura=${encodeURIComponent(activePrefill.sourceLabel)}#umpluturile-mele`
                  : activePrefill.sourceSlug
                    ? `/catalog?selectedTort=${encodeURIComponent(activePrefill.sourceSlug)}#umpluturile-mele`
                    : "/catalog#umpluturile-mele"
              }
              actionLabel={catalogPrefill ? "Schimba umplutura" : "Vezi umpluturi compatibile"}
              chipLabel={catalogPrefill ? "Prefill din catalog" : "Prefill din tort"}
            />
          ) : null}

          <StatusBanner type={status.type || "info"} message={status.text} />

          <div className="overflow-hidden rounded-[28px] border border-rose-100 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(249,244,236,0.96),_rgba(231,237,228,0.86))] p-3 shadow-soft">
            <div className="relative mx-auto" style={{ height: stageHeight }}>
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                  previewMode === "exterior"
                    ? "translate-y-0 scale-100 opacity-100"
                    : "-translate-y-2 scale-[0.985] opacity-0 pointer-events-none"
                }`}
              >
                <CakePreview2DStage
                  stageRef={exteriorStageRef}
                  stageWidth={stageWidth}
                  stageHeight={stageHeight}
                  mode="exterior"
                  model={previewModel}
                  footerText={exteriorFooter}
                />
              </div>

              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                  previewMode === "section"
                    ? "translate-y-0 scale-100 opacity-100"
                    : "translate-y-2 scale-[0.985] opacity-0 pointer-events-none"
                }`}
              >
                <CakePreview2DStage
                  stageRef={sectionStageRef}
                  stageWidth={stageWidth}
                  stageHeight={stageHeight}
                  mode="section"
                  model={previewModel}
                  footerText={layerSummary}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.9)] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                Accent acum
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {previewMode === "section"
                  ? selectedOptions.umplutura?.label
                  : selectedOptions.decor?.label}
              </div>
              <div className="text-sm text-gray-600">
                {previewMode === "section"
                  ? "straturile sunt evidențiate în prim-plan"
                  : `${selectedOptions.culoare?.label || "Ivoire"} și ${selectedOptions.topping?.label || "Perle"}`}
              </div>
            </div>

            <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                Compoziție
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {previewMode === "section" ? layerSummary : exteriorFooter}
              </div>
              <div className="text-sm text-gray-600">
                {previewMode === "section"
                  ? "blat, cremă și umplutură"
                  : "stil, culoare și topping"}
              </div>
            </div>

            <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                Export curent
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {activeModeMeta.shortLabel}
              </div>
              <div className="text-sm text-gray-600">PNG la 2x pentru confirmare și producție</div>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <div className={`${cards.elevated} space-y-5`}>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Compoziție</h2>
            <p className="text-sm text-gray-600">
              Controlezi separat interiorul tortului, frosting-ul exterior, culoarea dominantă și mesajul.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Blat</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {CAKE_OPTIONS.blat.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={blat === option.id}
                    onClick={() => handleOptionChange("blat", setBlat, option.id)}
                    showPrice
                    swatch={option.color}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Cremă</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {CAKE_OPTIONS.crema.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={crema === option.id}
                    onClick={() => handleOptionChange("crema", setCrema, option.id)}
                    showPrice
                    swatch={option.color}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Umplutură</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {CAKE_OPTIONS.umplutura.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={umplutura === option.id}
                    onClick={() => handleOptionChange("umplutura", setUmplutura, option.id)}
                    showPrice
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Stil exterior</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {CAKE_OPTIONS.decor.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={decor === option.id}
                    onClick={() => handleOptionChange("decor", setDecor, option.id)}
                    showPrice
                    swatch={option.color}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Topping</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {CAKE_OPTIONS.topping.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={topping === option.id}
                    onClick={() => handleOptionChange("topping", setTopping, option.id)}
                    showPrice
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Culoare dominantă</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {CAKE_OPTIONS.culori.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={culoare === option.id}
                    onClick={() => handleOptionChange("culoare", setCuloare, option.id)}
                    swatch={option.id}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-sm font-semibold text-gray-700">Font mesaj</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {CAKE_OPTIONS.font.map((option) => (
                  <OptionPill
                    key={option.id}
                    option={option}
                    active={font === option.id}
                    onClick={() => handleOptionChange("font", setFont, option.id)}
                  />
                ))}
              </div>
            </div>

            <label className="block text-sm font-semibold text-gray-700">
              Mesaj pe tort
              <input
                value={mesaj}
                onChange={handleMessageChange}
                placeholder="Ex: La mulți ani, Mara!"
                className={`mt-2 ${inputs.default}`}
              />
            </label>
          </div>
        </div>

        <div className={`${cards.elevated} space-y-4`}>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Estimare și acțiuni</h2>
            <p className="text-sm text-gray-600">
              Prețul estimat rămâne sincronizat cu selecția curentă și cu modul de preview activ.
            </p>
          </div>

          {estimationContext ? (
            <div className="rounded-[24px] border border-sage-deep/15 bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(233,240,228,0.82))] px-4 py-4 shadow-soft">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-deep">
                {estimationContext.eyebrow}
              </div>
              <div className="mt-2 font-serif text-2xl text-ink">{estimationContext.title}</div>
              <p className="mt-2 text-sm leading-6 text-[#5c524a]">{estimationContext.text}</p>
            </div>
          ) : null}

          <div className="rounded-[26px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,239,228,0.92))] p-5 shadow-soft">
            <div className="space-y-3">
              <SummaryRow label="Preț de bază" value={`${BASE_PRICE} MDL`} />
              <SummaryRow label="Blat" value={`+${selectedOptions.blat?.price || 0} MDL`} />
              <SummaryRow label="Cremă" value={`+${selectedOptions.crema?.price || 0} MDL`} />
              <SummaryRow
                label="Umplutură"
                value={`+${selectedOptions.umplutura?.price || 0} MDL`}
              />
              <SummaryRow label="Decor" value={`+${selectedOptions.decor?.price || 0} MDL`} />
              <SummaryRow
                label="Topping"
                value={`+${selectedOptions.topping?.price || 0} MDL`}
              />
              <div className="border-t border-rose-100 pt-3">
                <SummaryRow label="Total estimat" value={`${total} MDL`} emphasize />
              </div>
              <SummaryRow label="Timp estimat" value={`${timpOre} ore`} />
              <SummaryRow
                label="Mod export curent"
                value={activeModeMeta.label}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.9)] px-4 py-4 text-sm text-gray-700">
            <div className="font-semibold text-gray-900">Compoziția curentă</div>
            <div className="mt-2 leading-6">{designSummary}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={buttons.outline}
              disabled={busyAction !== ""}
              onClick={handleSaveDraft}
            >
              {busyAction === "save" ? "Se salvează..." : "Salvează draft"}
            </button>

            <button
              type="button"
              className={buttons.primary}
              disabled={busyAction !== ""}
              onClick={addToCart}
            >
              Preț confirmat manual
            </button>

            <button
              type="button"
              className={buttons.secondary}
              disabled={busyAction !== ""}
              onClick={downloadExportImage}
            >
              {busyAction === "export" ? "Se exportă..." : "Export PNG"}
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

          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Comenzile personalizate se confirmă manual. Designul se poate salva, exporta și trimite spre validare înainte de prețul final.
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Se încarcă designul salvat...</div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
