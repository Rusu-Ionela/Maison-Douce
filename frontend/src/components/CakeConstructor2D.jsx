import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ProductsAPI } from "../api/products";
import api from "/src/lib/api.js";
import CakePreview2DStage from "../components/CakePreview2DStage";
import CakeDecorationInspector from "./cake-designer/CakeDecorationInspector";
import CakeDecorationLayers from "./cake-designer/CakeDecorationLayers";
import CakeDecorationLibrary from "./cake-designer/CakeDecorationLibrary";
import ProviderSelector from "../components/ProviderSelector";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import { cleanOrderFlowForSave } from "../lib/orderFlow";
import { buttons, cards, inputs } from "../lib/tailwindComponents";
import { useProviderDirectory } from "../lib/providers";
import { getStorefrontCake, getStorefrontFallbackCakeById } from "../lib/storefrontCatalog";
import {
  BASE_PREP_HOURS,
  BASE_PRICE,
  CAKE_OPTIONS,
  CAKE_PRESETS,
  CAKE_STRUCTURE_OPTIONS,
  DEFAULT_CAKE_OPTIONS,
  DEFAULT_CAKE_STRUCTURE,
  PREVIEW_MODES,
  buildCakeAiVariantPrompts,
  buildCakeInspirationSummary,
  buildCakeAiPrompt,
  buildCakePreviewModel,
  estimateCakeOrderMetrics,
  findCakeOption,
  findCakeStructureOption,
  getCakeDesignSummary,
  getRecommendedPreviewModeForField,
  resolveConstructorPrefillFromCake,
  resolveConstructorPrefillFromFilling,
} from "../lib/cakePreview2D";
import {
  createDecorationElement,
  getDecorationLibraryItem,
  duplicateDecorationElement,
  estimateDecorationWorkload,
  normalizeDecorationElements,
  searchDecorationLibrary,
  summarizeDecorationElements,
} from "../lib/cakeDecorations";

function OptionPill({
  option,
  active,
  onClick,
  showPrice = false,
  swatch = "",
  metaText = "",
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
          {option.description ? (
            <div className={`mt-1 text-xs leading-5 ${active ? "text-rose-100" : "text-gray-500"}`}>
              {option.description}
            </div>
          ) : null}
          {metaText ? (
            <div className={`mt-1 text-xs font-medium ${active ? "text-rose-100" : "text-pink-700"}`}>
              {metaText}
            </div>
          ) : null}
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
  orderFlowContext = null,
  prefillGeneratedIdea = null,
}) {
  const exteriorStageRef = useRef(null);
  const sectionStageRef = useRef(null);
  const previewRef = useRef(null);
  const decorationStepRef = useRef(null);
  const aiStepRef = useRef(null);
  const hintTimerRef = useRef(null);
  const manualModeLockRef = useRef(0);
  const inspirationUrlRegistryRef = useRef(new Set());
  const { user, isAuthenticated } = useAuth() || {};
  const providerState = useProviderDirectory({ user });

  const [loading, setLoading] = useState(false);
  const [designId, setDesignId] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(560);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [aiStatus, setAiStatus] = useState({ type: "", text: "" });
  const [previewMode, setPreviewMode] = useState("exterior");
  const [previewHint, setPreviewHint] = useState("");

  const [shape, setShape] = useState(DEFAULT_CAKE_STRUCTURE.shape);
  const [size, setSize] = useState(DEFAULT_CAKE_STRUCTURE.size);
  const [tiers, setTiers] = useState(DEFAULT_CAKE_STRUCTURE.tiers);
  const [heightProfile, setHeightProfile] = useState(DEFAULT_CAKE_STRUCTURE.heightProfile);
  const [blat, setBlat] = useState(DEFAULT_CAKE_OPTIONS.blat);
  const [crema, setCrema] = useState(DEFAULT_CAKE_OPTIONS.crema);
  const [umplutura, setUmplutura] = useState(DEFAULT_CAKE_OPTIONS.umplutura);
  const [decor, setDecor] = useState(DEFAULT_CAKE_OPTIONS.decor);
  const [topping, setTopping] = useState(DEFAULT_CAKE_OPTIONS.topping);
  const [culoare, setCuloare] = useState(DEFAULT_CAKE_OPTIONS.culoare);
  const [mesaj, setMesaj] = useState("");
  const [font, setFont] = useState(DEFAULT_CAKE_OPTIONS.font);
  const [aiDecorRequest, setAiDecorRequest] = useState("");
  const [inspirationItems, setInspirationItems] = useState([]);
  const [aiPreview, setAiPreview] = useState(null);
  const [aiPreviewVariants, setAiPreviewVariants] = useState([]);
  const [activeAiPreviewIndex, setActiveAiPreviewIndex] = useState(0);
  const [productPrefill, setProductPrefill] = useState(null);
  const [showFloatingPreview, setShowFloatingPreview] = useState(false);
  const [decorationSearch, setDecorationSearch] = useState("");
  const [decorationCategory, setDecorationCategory] = useState("all");
  const [decorationElements, setDecorationElements] = useState([]);
  const [selectedDecorationId, setSelectedDecorationId] = useState("");
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
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth || 0);
    };

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);

    return () => {
      window.removeEventListener("resize", updateViewportWidth);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateFloatingPreview = () => {
      const element = previewRef.current;
      if (!element) {
        setShowFloatingPreview(false);
        return;
      }

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 0;
      const visibleHeight =
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      const previewMostlyHidden = visibleHeight < Math.min(rect.height * 0.42, 220);
      const scrolledPastPreview = window.scrollY > element.offsetTop + 120;

      setShowFloatingPreview(scrolledPastPreview && previewMostlyHidden);
    };

    updateFloatingPreview();
    window.addEventListener("scroll", updateFloatingPreview, { passive: true });
    window.addEventListener("resize", updateFloatingPreview);

    return () => {
      window.removeEventListener("scroll", updateFloatingPreview);
      window.removeEventListener("resize", updateFloatingPreview);
    };
  }, []);

  useEffect(() => {
    const inspirationUrls = inspirationUrlRegistryRef.current;
    return () => {
      if (hintTimerRef.current) {
        window.clearTimeout(hintTimerRef.current);
      }
      inspirationUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore local preview cleanup issues
        }
      });
      inspirationUrls.clear();
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
          setShape(data.options.shape || DEFAULT_CAKE_STRUCTURE.shape);
          setSize(data.options.size || DEFAULT_CAKE_STRUCTURE.size);
          setTiers(Number(data.options.tiers || DEFAULT_CAKE_STRUCTURE.tiers));
          setHeightProfile(
            data.options.heightProfile || DEFAULT_CAKE_STRUCTURE.heightProfile
          );
          setBlat(data.options.blat || DEFAULT_CAKE_OPTIONS.blat);
          setCrema(data.options.crema || DEFAULT_CAKE_OPTIONS.crema);
          setUmplutura(data.options.umplutura || DEFAULT_CAKE_OPTIONS.umplutura);
          setDecor(data.options.decor || DEFAULT_CAKE_OPTIONS.decor);
          setTopping(data.options.topping || DEFAULT_CAKE_OPTIONS.topping);
          setCuloare(data.options.culoare || DEFAULT_CAKE_OPTIONS.culoare);
          setFont(data.options.font || DEFAULT_CAKE_OPTIONS.font);
          setAiDecorRequest(data.options.aiDecorRequest || "");
          setDecorationElements(
            normalizeDecorationElements(
              data.options.decorations || data.options.decorationElements || [],
              Number(data.options.tiers || DEFAULT_CAKE_STRUCTURE.tiers)
            )
          );
          setSelectedDecorationId("");
          const savedInspirationItems = Array.isArray(data.options.inspirationImages)
            ? data.options.inspirationImages
                .map((item, index) => ({
                  id: String(item?.id || item?.url || `saved-${index}`),
                  label: String(item?.label || item?.note || "").trim(),
                  name: String(item?.name || "").trim(),
                  url: String(item?.url || "").trim(),
                  previewUrl: String(item?.url || "").trim(),
                  file: null,
                }))
                .filter((item) => item.url || item.label)
            : [];
          setInspirationItems(savedInspirationItems);
          const savedVariants = Array.isArray(data.options.aiPreviewVariants)
            ? data.options.aiPreviewVariants
                .map((item, index) => ({
                  imageUrl: item?.imageUrl || item?.url || "",
                  prompt: item?.prompt || data.options.aiPrompt || "",
                  source: item?.source || data.options.aiSource || "saved",
                  fallback: item?.fallback === true,
                  label: item?.label || `Varianta ${index + 1}`,
                }))
                .filter((item) => item.imageUrl)
            : [];
          if (savedVariants.length) {
            setAiPreviewVariants(savedVariants);
            setActiveAiPreviewIndex(0);
            setAiPreview(savedVariants[0]);
          } else if (data.options.aiPreviewUrl) {
            const legacyPreview = {
              imageUrl: data.options.aiPreviewUrl,
              prompt: data.options.aiPrompt || "",
              source: data.options.aiSource || "saved",
              fallback: data.options.aiFallback === true,
              label: "Varianta 1",
            };
            setAiPreviewVariants([legacyPreview]);
            setActiveAiPreviewIndex(0);
            setAiPreview(legacyPreview);
          } else {
            setAiPreviewVariants([]);
            setActiveAiPreviewIndex(0);
            setAiPreview(null);
          }
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
    setShape(catalogPrefill.values?.shape || DEFAULT_CAKE_STRUCTURE.shape);
    setSize(catalogPrefill.values?.size || DEFAULT_CAKE_STRUCTURE.size);
    setTiers(Number(catalogPrefill.values?.tiers || DEFAULT_CAKE_STRUCTURE.tiers));
    setHeightProfile(
      catalogPrefill.values?.heightProfile || DEFAULT_CAKE_STRUCTURE.heightProfile
    );
    setBlat(nextValues.blat);
    setCrema(nextValues.crema);
    setUmplutura(nextValues.umplutura);
    setDecor(nextValues.decor);
    setTopping(nextValues.topping);
    setCuloare(nextValues.culoare);
    setFont(nextValues.font);
    setDecorationElements([]);
    setSelectedDecorationId("");
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
    setShape(productPrefill.values?.shape || DEFAULT_CAKE_STRUCTURE.shape);
    setSize(productPrefill.values?.size || DEFAULT_CAKE_STRUCTURE.size);
    setTiers(Number(productPrefill.values?.tiers || DEFAULT_CAKE_STRUCTURE.tiers));
    setHeightProfile(
      productPrefill.values?.heightProfile || DEFAULT_CAKE_STRUCTURE.heightProfile
    );
    setBlat(nextValues.blat);
    setCrema(nextValues.crema);
    setUmplutura(nextValues.umplutura);
    setDecor(nextValues.decor);
    setTopping(nextValues.topping);
    setCuloare(nextValues.culoare);
    setFont(nextValues.font);
    setDecorationElements([]);
    setSelectedDecorationId("");
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

  useEffect(() => {
    setDecorationElements((current) => normalizeDecorationElements(current, tiers));
  }, [tiers]);

  useEffect(() => {
    if (
      selectedDecorationId &&
      !decorationElements.some((item) => String(item.id) === String(selectedDecorationId))
    ) {
      setSelectedDecorationId("");
    }
  }, [decorationElements, selectedDecorationId]);

  useEffect(() => {
    if (!prefillGeneratedIdea || propDesignId) return;
    if (aiPreview || aiPreviewVariants.length > 0 || aiDecorRequest || inspirationItems.length > 0) {
      return;
    }

    const variants = Array.isArray(prefillGeneratedIdea?.variants)
      ? prefillGeneratedIdea.variants
          .map((item, index) => ({
            imageUrl: item?.imageUrl || item?.url || "",
            prompt: item?.prompt || prefillGeneratedIdea?.prompt || "",
            source: item?.source || "guided-idea",
            fallback: item?.fallback === true,
            label: item?.label || `Varianta ${index + 1}`,
          }))
          .filter((item) => item.imageUrl)
      : [];

    const primaryPreview =
      variants[0] ||
      (prefillGeneratedIdea?.imageUrl
        ? {
            imageUrl: prefillGeneratedIdea.imageUrl,
            prompt: prefillGeneratedIdea.prompt || "",
            source: prefillGeneratedIdea.source || "guided-idea",
            fallback: prefillGeneratedIdea.fallback === true,
            label: "Varianta 1",
          }
        : null);

    if (!primaryPreview) return;

    setAiDecorRequest(prefillGeneratedIdea?.note || prefillGeneratedIdea?.prompt || "");
    setAiPreview(primaryPreview);
    setAiPreviewVariants(variants.length ? variants : [primaryPreview]);
    setActiveAiPreviewIndex(0);
    setPreviewMode("exterior");
    setStatus({
      type: "info",
      text: "Am adus in constructor conceptul generat anterior, ca sa il poti rafina manual.",
    });
  }, [
    aiDecorRequest,
    aiPreview,
    aiPreviewVariants.length,
    inspirationItems.length,
    prefillGeneratedIdea,
    propDesignId,
  ]);

  const stageWidth = Math.max(320, Math.min(previewWidth, 680));
  const stageHeight = Math.max(260, Math.min(430, Math.round(stageWidth * 0.64)));
  const floatingPreviewWidth = viewportWidth >= 1024 ? 280 : 200;
  const floatingPreviewHeight = Math.round(floatingPreviewWidth * 0.64);
  const fixedPreviewLabel = viewportWidth >= 1024 ? "Tort fixat" : "Preview live";

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

  const selectedStructure = useMemo(
    () => ({
      shape: findCakeStructureOption("shapes", shape),
      size: findCakeStructureOption("sizes", size),
      tiers: findCakeStructureOption("tiers", tiers),
      heightProfile: findCakeStructureOption("heightProfiles", heightProfile),
    }),
    [heightProfile, shape, size, tiers]
  );

  const previewModel = useMemo(
    () =>
      buildCakePreviewModel({
        stageWidth,
        stageHeight,
        selectedOptions,
        message: mesaj,
        structureOptions: {
          shape,
          size,
          tiers,
          heightProfile,
        },
      }),
    [heightProfile, mesaj, selectedOptions, shape, size, stageHeight, stageWidth, tiers]
  );

  const floatingPreviewModel = useMemo(
    () =>
      buildCakePreviewModel({
        stageWidth: floatingPreviewWidth,
        stageHeight: floatingPreviewHeight,
        selectedOptions,
        message: mesaj,
        structureOptions: {
          shape,
          size,
          tiers,
          heightProfile,
        },
      }),
    [
      floatingPreviewHeight,
      floatingPreviewWidth,
      heightProfile,
      mesaj,
      selectedOptions,
      shape,
      size,
      tiers,
    ]
  );

  const decorationSummary = useMemo(
    () => summarizeDecorationElements(decorationElements),
    [decorationElements]
  );
  const normalizedOrderFlowContext = useMemo(
    () => cleanOrderFlowForSave(orderFlowContext || {}),
    [orderFlowContext]
  );

  const aiPromptPreview = useMemo(
    () =>
      buildCakeAiPrompt({
        selectedOptions,
        structureOptions: {
          shape,
          size,
          tiers,
          heightProfile,
        },
        message: mesaj,
        customRequest: aiDecorRequest,
        freeDecorSummary: decorationSummary,
        inspirationItems,
      }),
    [
      aiDecorRequest,
      decorationSummary,
      heightProfile,
      inspirationItems,
      mesaj,
      selectedOptions,
      shape,
      size,
      tiers,
    ]
  );

  const aiVariantPrompts = useMemo(
    () =>
      buildCakeAiVariantPrompts({
        selectedOptions,
        structureOptions: {
          shape,
          size,
          tiers,
          heightProfile,
        },
        message: mesaj,
        customRequest: aiDecorRequest,
        freeDecorSummary: decorationSummary,
        inspirationItems,
      }),
    [
      aiDecorRequest,
      decorationSummary,
      heightProfile,
      inspirationItems,
      mesaj,
      selectedOptions,
      shape,
      size,
      tiers,
    ]
  );

  const estimateMetrics = useMemo(
    () =>
      estimateCakeOrderMetrics({
        shape,
        size,
        tiers,
        heightProfile,
      }),
    [heightProfile, shape, size, tiers]
  );

  const decorationWorkload = useMemo(
    () => estimateDecorationWorkload(decorationElements),
    [decorationElements]
  );

  const filteredDecorationItems = useMemo(
    () =>
      searchDecorationLibrary({
        query: decorationSearch,
        category: decorationCategory,
      }),
    [decorationCategory, decorationSearch]
  );

  const recommendedDecorationItems = useMemo(() => {
    if (decorationSearch.trim()) return [];
    return searchDecorationLibrary({
      category: decorationCategory,
      style: decor,
    }).slice(0, 6);
  }, [decorationCategory, decorationSearch, decor]);

  const selectedDecoration = useMemo(
    () =>
      decorationElements.find((item) => String(item.id) === String(selectedDecorationId)) || null,
    [decorationElements, selectedDecorationId]
  );

  const selectedStyleLabel = selectedOptions.decor?.label || "";

  const decorationCountLabel = useMemo(() => {
    if (!decorationElements.length) return "Fara decor liber";
    return `${decorationElements.length} elemente adaugate`;
  }, [decorationElements.length]);

  const total = useMemo(() => {
    return (
      BASE_PRICE +
      (selectedStructure.shape?.price || 0) +
      (selectedStructure.size?.price || 0) +
      (selectedStructure.tiers?.price || 0) +
      (selectedStructure.heightProfile?.price || 0) +
      (selectedOptions.blat?.price || 0) +
      (selectedOptions.crema?.price || 0) +
      (selectedOptions.umplutura?.price || 0) +
      (selectedOptions.decor?.price || 0) +
      (selectedOptions.topping?.price || 0) +
      decorationWorkload.price
    );
  }, [decorationWorkload.price, selectedOptions, selectedStructure]);

  const timpOre = useMemo(
    () =>
      BASE_PREP_HOURS +
      (selectedStructure.shape?.prepHours || 0) +
      (selectedStructure.size?.prepHours || 0) +
      (selectedStructure.tiers?.prepHours || 0) +
      (selectedStructure.heightProfile?.prepHours || 0) +
      (mesaj.trim() ? 4 : 0) +
      decorationWorkload.prepHours,
    [decorationWorkload.prepHours, mesaj, selectedStructure]
  );
  const designSummary = useMemo(
    () =>
      getCakeDesignSummary(selectedOptions, {
        shape,
        size,
        tiers,
        heightProfile,
      }),
    [heightProfile, selectedOptions, shape, size, tiers]
  );

  const compositionSummary = useMemo(() => {
    if (!decorationSummary) return designSummary;
    return `${designSummary} Decor liber aplicat: ${decorationSummary}.`;
  }, [decorationSummary, designSummary]);

  const layerSummary = useMemo(
    () =>
      [
        selectedStructure.shape?.label,
        selectedStructure.size?.label,
        selectedStructure.tiers?.label,
        selectedOptions.blat?.label,
        selectedOptions.crema?.label,
        selectedOptions.umplutura?.label,
      ]
        .filter(Boolean)
        .join(" • "),
    [selectedOptions, selectedStructure]
  );

  const exteriorFooter = useMemo(
    () =>
      [
        selectedStructure.shape?.label,
        selectedStructure.size?.label,
        selectedStructure.heightProfile?.label,
        selectedOptions.decor?.label,
        selectedOptions.culoare?.label,
        selectedOptions.topping?.label,
        decorationSummary ? `${decorationElements.length} elemente` : "",
      ]
        .filter(Boolean)
        .join(" • "),
    [decorationElements.length, decorationSummary, selectedOptions, selectedStructure]
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

  const activeProviderId = providerState.activeProviderId;
  const activeProviderName =
    providerState.activeProvider?.displayName || "atelierul selectat";
  const structureSummary = useMemo(
    () =>
      [
        selectedStructure.shape?.label,
        selectedStructure.size?.label,
        selectedStructure.tiers?.label,
        selectedStructure.heightProfile?.label,
        estimateMetrics.servingsLabel,
      ]
        .filter(Boolean)
        .join(" • "),
    [estimateMetrics.servingsLabel, selectedStructure]
  );

  const inspirationSummary = useMemo(
    () => buildCakeInspirationSummary(inspirationItems),
    [inspirationItems]
  );

  const activeModeMeta = PREVIEW_MODES.find((mode) => mode.id === previewMode) || PREVIEW_MODES[0];

  const scrollToPreview = (behavior = "smooth") => {
    const element = previewRef.current;
    if (!element) return;
    element.scrollIntoView({ behavior, block: "start" });
  };

  const scrollToSection = (targetRef, behavior = "smooth") => {
    const element = targetRef?.current;
    if (!element) return;
    element.scrollIntoView({ behavior, block: "start" });
  };

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
    setShape(values.shape || DEFAULT_CAKE_STRUCTURE.shape);
    setSize(values.size || DEFAULT_CAKE_STRUCTURE.size);
    setTiers(Number(values.tiers || DEFAULT_CAKE_STRUCTURE.tiers));
    setHeightProfile(values.heightProfile || DEFAULT_CAKE_STRUCTURE.heightProfile);
    setBlat(values.blat);
    setCrema(values.crema);
    setUmplutura(values.umplutura);
    setDecor(values.decor);
    setTopping(values.topping);
    setCuloare(values.culoare);
    setFont(values.font);
    setDecorationElements([]);
    setSelectedDecorationId("");
    setPreviewMode("exterior");
    showPreviewHint("Preset-ul a fost aplicat. Exteriorul final a fost actualizat.");
    setStatus({
      type: "info",
      text: "Preset-ul a fost aplicat. Poți trece în Secțiune pentru a verifica imediat straturile.",
    });
  };

  const addDecoration = (definitionId) => {
    const definition = getDecorationLibraryItem(definitionId);
    const nextElement = createDecorationElement(definitionId, {
      tierCount: tiers,
      order: decorationElements.length,
    });
    if (!nextElement) return;

    setDecorationElements((current) => normalizeDecorationElements([...current, nextElement], tiers));
    setSelectedDecorationId(nextElement.id);
    setPreviewMode("exterior");
    showPreviewHint(
      `${definition?.label || "Elementul"} a fost adaugat. Il poti muta direct in preview.`
    );
  };

  const updateDecoration = (elementId, patch) => {
    setDecorationElements((current) =>
      normalizeDecorationElements(
        current.map((item) =>
          String(item.id) === String(elementId) ? { ...item, ...patch } : item
        ),
        tiers
      )
    );
  };

  const duplicateDecoration = (elementId) => {
    const source = decorationElements.find((item) => String(item.id) === String(elementId));
    if (!source) return;
    const nextElement = duplicateDecorationElement(source, decorationElements.length);
    if (!nextElement) return;

    setDecorationElements((current) => normalizeDecorationElements([...current, nextElement], tiers));
    setSelectedDecorationId(nextElement.id);
  };

  const deleteDecoration = (elementId) => {
    setDecorationElements((current) =>
      normalizeDecorationElements(
        current.filter((item) => String(item.id) !== String(elementId)),
        tiers
      )
    );
    if (String(selectedDecorationId) === String(elementId)) {
      setSelectedDecorationId("");
    }
  };

  const moveDecoration = (elementId, direction) => {
    setDecorationElements((current) => {
      const ordered = [...current].sort(
        (left, right) => Number(left.zIndex || 0) - Number(right.zIndex || 0)
      );
      const index = ordered.findIndex((item) => String(item.id) === String(elementId));
      if (index === -1) return current;

      const targetIndex = direction === "up" ? index + 1 : index - 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) return current;

      const next = [...ordered];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return normalizeDecorationElements(
        next.map((item, order) => ({ ...item, zIndex: order })),
        tiers
      );
    });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!selectedDecorationId) return;

      const target = event.target;
      const tagName = String(target?.tagName || "").toLowerCase();
      if (target?.isContentEditable || ["input", "textarea", "select"].includes(tagName)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateDecoration(selectedDecorationId);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteDecoration(selectedDecorationId);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedDecorationId("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDecorationId, deleteDecoration, duplicateDecoration]);

  const handleAiRequestChange = (event) => {
    setAiDecorRequest(event.target.value);
    setAiStatus({ type: "", text: "" });
  };

  const handleInspirationUpload = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 3);
    if (!files.length) return;

    setInspirationItems((current) => {
      const availableSlots = Math.max(0, 3 - current.length);
      const nextItems = files.slice(0, availableSlots).map((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        inspirationUrlRegistryRef.current.add(previewUrl);
        return {
          id: `inspiration-${Date.now()}-${index}`,
          file,
          name: file.name,
          label: "",
          url: "",
          previewUrl,
        };
      });
      return [...current, ...nextItems];
    });

    event.target.value = "";
  };

  const updateInspirationItem = (itemId, nextLabel) => {
    setInspirationItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, label: nextLabel } : item
      )
    );
  };

  const removeInspirationItem = (itemId) => {
    setInspirationItems((current) =>
      current.filter((item) => {
        if (item.id !== itemId) return true;
        if (item.previewUrl && inspirationUrlRegistryRef.current.has(item.previewUrl)) {
          try {
            URL.revokeObjectURL(item.previewUrl);
          } catch {
            // ignore local preview cleanup issues
          }
          inspirationUrlRegistryRef.current.delete(item.previewUrl);
        }
        return false;
      })
    );
  };

  const uploadInspirationImages = async () => {
    if (!inspirationItems.length) return [];

    const uploadedItems = [];
    for (const item of inspirationItems) {
      if (item.url) {
        uploadedItems.push({
          id: item.id,
          url: item.url,
          name: item.name || "",
          label: item.label || "",
        });
        continue;
      }

      if (!item.file) continue;

      const formData = new FormData();
      formData.append("file", item.file);
      const response = await api.post("/upload", formData);
      uploadedItems.push({
        id: item.id,
        url: response?.data?.url || "",
        name: item.name || item.file.name || "",
        label: item.label || "",
      });
    }

    setInspirationItems(
      uploadedItems.map((item) => ({
        ...item,
        file: null,
        previewUrl: item.url,
      }))
    );

    return uploadedItems.filter((item) => item.url);
  };

  const generateAiPreview = async () => {
    if (!activeProviderId) {
      setAiStatus({
        type: "error",
        text:
          providerState.error ||
          "Selecteaza un atelier valid inainte de a genera un preview realist.",
      });
      return;
    }

    setAiBusy(true);
    setAiStatus({ type: "", text: "" });

    try {
      const response = await api.post("/ai/generate-cake", {
        prompt: aiPromptPreview,
        variants: 3,
        variantPrompts: aiVariantPrompts,
        prestatorId: activeProviderId,
        referenceImages: inspirationItems.map((item) => item.label || item.name || item.url),
      });
      const nextVariants = Array.isArray(response?.data?.items)
        ? response.data.items
            .map((item, index) => ({
              imageUrl: item?.imageUrl || "",
              prompt: item?.prompt || aiVariantPrompts[index] || aiPromptPreview,
              source: item?.source || response?.data?.mode || "ai",
              fallback: Boolean(item?.fallback),
              label: `Varianta ${index + 1}`,
            }))
            .filter((item) => item.imageUrl)
        : [];
      const nextPreview =
        nextVariants[0] || {
          imageUrl: response?.data?.imageUrl || "",
          prompt: aiPromptPreview,
          source: response?.data?.source || response?.data?.mode || "ai",
          fallback: Boolean(response?.data?.fallback),
          label: "Varianta 1",
        };
      setAiPreviewVariants(nextVariants.length ? nextVariants : [nextPreview].filter((item) => item.imageUrl));
      setActiveAiPreviewIndex(0);
      setAiPreview(nextPreview);
      setAiStatus({
        type: nextPreview.fallback ? "info" : "success",
        text: nextPreview.fallback
          ? "A fost generat un preview local. Adauga cheia AI pentru imagini complet fotorealiste."
          : `Au fost generate ${nextVariants.length || 1} variante realiste pentru ${activeProviderName}.`,
      });
    } catch (error) {
      setAiStatus({
        type: "error",
        text:
          error?.response?.data?.message ||
          "Nu am putut genera preview-ul realist pe baza cerintei introduse.",
      });
    } finally {
      setAiBusy(false);
    }
  };

  const exportImage = async () => {
    const activeStage =
      previewMode === "section" ? sectionStageRef.current : exteriorStageRef.current;
    if (!activeStage) {
      throw new Error("Preview-ul nu este pregătit pentru export.");
    }
    const previousSelection = selectedDecorationId;
    if (previousSelection) {
      setSelectedDecorationId("");
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    const imageData = activeStage.toDataURL({ pixelRatio: 2 });
    if (previousSelection) {
      setSelectedDecorationId(previousSelection);
    }
    return imageData;
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
    if (!user?._id) {
      setStatus({
        type: "warning",
        text: "Autentifica-te pentru a salva designul in cont.",
      });
      return { id: null, inspirationImages: [] };
    }

    const uploadedInspirationImages = await uploadInspirationImages();
    const imageData = await exportImage();
    const payload = {
      clientId: user?._id || undefined,
      prestatorId: activeProviderId || undefined,
      forma: selectedStructure.shape?.label || "Rotund",
      culori: [culoare],
      mesaj,
      imageData,
      options: {
        shape,
        size,
        tiers,
        heightProfile,
        blat,
        crema,
        umplutura,
        decor,
        topping,
        culoare,
        font,
        decorationSummary,
        decorations: decorationElements.map((item, index) => ({
          ...item,
          zIndex: Number(item?.zIndex ?? index),
        })),
        aiDecorRequest,
        aiPrompt: aiPromptPreview,
        aiPreviewUrl: aiPreview?.imageUrl || "",
        aiSource: aiPreview?.source || "",
        aiFallback: aiPreview?.fallback === true,
        aiPreviewVariants: aiPreviewVariants.map((item, index) => ({
          imageUrl: item?.imageUrl || "",
          prompt: item?.prompt || aiVariantPrompts[index] || aiPromptPreview,
          source: item?.source || "",
          fallback: item?.fallback === true,
          label: item?.label || `Varianta ${index + 1}`,
        })),
        inspirationImages: uploadedInspirationImages,
        estimatedServings: estimateMetrics.servingsLabel,
        estimatedWeightKg: estimateMetrics.weightLabel,
        orderFlow: normalizedOrderFlowContext,
      },
      pretEstimat: total,
      timpPreparareOre: timpOre,
      status: nextStatus,
      note: "Saved from constructor 2D",
    };

    if (designId) {
      await api.put(`/personalizare/${designId}`, payload);
      setStatus({ type: "success", text: "Designul a fost actualizat." });
      return { id: designId, inspirationImages: uploadedInspirationImages };
    }

    const response = await api.post("/personalizare", payload);
    const nextId = response.data?.id || null;
    if (nextId) {
      setDesignId(nextId);
    }
    setStatus({ type: "success", text: "Designul a fost salvat." });
    return { id: nextId, inspirationImages: uploadedInspirationImages };
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
    if (!user?._id) {
      setStatus({
        type: "warning",
        text: "Autentifica-te pentru a salva designul in contul tau.",
      });
      return;
    }

    try {
      await runAction("save", async () => {
        const result = await saveDesign("draft");
        if (result?.id) {
          window.location.assign("/personalizari");
        }
      });
    } catch {
      setStatus({
        type: "error",
        text: "Nu am putut salva designul in cont.",
      });
    }
    if (busyAction === "__legacy__") setStatus({
      type: "warning",
      text: "Designurile personalizate nu intră direct în checkout-ul public. Salvează draftul sau trimite cererea către patiser pentru confirmarea finală a prețului.",
    });
  };

  const downloadExportImage = async () => {
    try {
      await runAction("export", async () => {
        const uri = await exportImage();
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
        const result = await saveDesign("trimis");
        if (!result?.id) return;

        await api.post("/comenzi-personalizate", {
          clientId: user._id,
          prestatorId: activeProviderId || undefined,
          numeClient: user?.nume || user?.name || "Client",
          preferinte: mesaj || "Comandă personalizată",
          imagine: await exportImage(),
          designId: result.id,
          options: {
            shape,
            size,
            tiers,
            heightProfile,
            blat,
            crema,
            umplutura,
            decor,
            topping,
            culoare,
            font,
            decorationSummary,
            decorations: decorationElements.map((item, index) => ({
              ...item,
              zIndex: Number(item?.zIndex ?? index),
            })),
            aiDecorRequest,
            aiPrompt: aiPromptPreview,
            aiPreviewUrl: aiPreview?.imageUrl || "",
            aiPreviewVariants: aiPreviewVariants.map((item, index) => ({
              imageUrl: item?.imageUrl || "",
              prompt: item?.prompt || aiVariantPrompts[index] || aiPromptPreview,
              source: item?.source || "",
              fallback: item?.fallback === true,
              label: item?.label || `Varianta ${index + 1}`,
            })),
            inspirationImages: (result.inspirationImages || inspirationItems)
              .map((item) => ({
                id: item.id,
                url: item.url || item.previewUrl || "",
                name: item.name || "",
                label: item.label || "",
              }))
              .filter((item) => item.url),
            estimatedServings: estimateMetrics.servingsLabel,
            estimatedWeightKg: estimateMetrics.weightLabel,
            orderFlow: normalizedOrderFlowContext,
          },
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
    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
      <section className="space-y-6 2xl:min-w-0">
        <div className={`${cards.elevated} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                Pasul 1
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Structura si pornire rapida</h2>
              <p className="text-sm text-gray-600">
                Incepi cu forma, dimensiunea, etajele si profilul de inaltime, apoi poti
                porni de la un preset sau construi liber fiecare detaliu al tortului.
              </p>
            </div>
            {designId ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Draft #{String(designId).slice(-6)}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {CAKE_STRUCTURE_OPTIONS.shapes.map((option) => (
              <OptionPill
                key={`shape-${option.id}`}
                option={option}
                active={shape === option.id}
                onClick={() => handleOptionChange("shape", setShape, option.id)}
                showPrice
              />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {CAKE_STRUCTURE_OPTIONS.sizes.map((option) => (
              <OptionPill
                key={`size-${option.id}`}
                option={option}
                active={size === option.id}
                onClick={() => handleOptionChange("size", setSize, option.id)}
                showPrice
                metaText={option.detail}
              />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {CAKE_STRUCTURE_OPTIONS.tiers.map((option) => (
              <OptionPill
                key={`tier-${option.id}`}
                option={option}
                active={String(tiers) === String(option.id)}
                onClick={() => handleOptionChange("tiers", setTiers, option.id)}
                showPrice
                metaText={option.servings}
              />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {CAKE_STRUCTURE_OPTIONS.heightProfiles.map((option) => (
              <OptionPill
                key={`height-${option.id}`}
                option={option}
                active={heightProfile === option.id}
                onClick={() => handleOptionChange("heightProfile", setHeightProfile, option.id)}
                showPrice
                metaText={option.detail}
              />
            ))}
          </div>

          <div className="rounded-[24px] border border-sage-deep/15 bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(233,240,228,0.82))] px-4 py-4 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-deep">
              Rezumat rapid
            </div>
            <div className="mt-2 text-lg font-semibold text-[#2f2126]">{structureSummary}</div>
            <p className="mt-2 text-sm leading-6 text-[#5c524a]">
              Preview-ul 2D se redimensioneaza imediat, iar sectiunea arata mai realist
              interiorul cand alegi un profil inalt.
            </p>
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

        <div
          ref={previewRef}
          data-testid="constructor-preview-panel"
          className={`${cards.elevated} scroll-mt-28 space-y-4`}
        >
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
                  decorations={decorationElements}
                  selectedDecorationId={selectedDecorationId}
                  editable
                  onDecorationSelect={setSelectedDecorationId}
                  onDecorationChange={updateDecoration}
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
                  decorations={decorationElements}
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
                  : "stil, culoare, topping si decor liber"}
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

          <div className="rounded-[22px] border border-sage-deep/15 bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(233,240,228,0.82))] px-4 py-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-deep">
                  Urmeaza in flux
                </div>
                <div className="mt-1 text-sm leading-6 text-[#5c524a]">
                  Dupa preview continui cu decorul liber si apoi cu varianta AI, fara containere
                  cu scroll intern care sa ascunda pasii urmatori.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttons.outline}
                  onClick={() => scrollToSection(decorationStepRef)}
                >
                  Mergi la decoruri
                </button>
                <button
                  type="button"
                  className={buttons.outline}
                  onClick={() => scrollToSection(aiStepRef)}
                >
                  Mergi la AI
                </button>
              </div>
            </div>
          </div>
        </div>

        <div ref={decorationStepRef} className={`${cards.elevated} scroll-mt-28 space-y-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                Pasul 4
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Decor liber si layer management</h2>
              <p className="text-sm text-gray-600">
                Cauti rapid decoratiunea, o adaugi pe tort, apoi o muti, rotesti,
                scalezi sau duplici direct din preview.
              </p>
            </div>
            <div className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6856] shadow-soft">
              {previewMode === "section"
                ? "Editeaza in Exterior"
                : decorationSummary || selectedStyleLabel || "Fara limite presetate"}
            </div>
          </div>

          {previewMode === "section" ? (
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Pentru mutarea elementelor, comuta preview-ul pe Exterior. In Sectiune pastram
              accentul pe straturile interne.
            </div>
          ) : null}

          <div className="rounded-[22px] border border-rose-100 bg-white/85 px-4 py-3 text-sm text-[#5f564d] shadow-soft">
            <div className="font-semibold text-gray-900">{decorationCountLabel}</div>
            <div className="mt-1">
              {decorationSummary ||
                "Adauga decoratiuni din biblioteca si aseaza-le liber pe etaje sau pe laterale."}
            </div>
            <div className="mt-2 text-xs uppercase tracking-[0.12em] text-pink-600">
              Delete sterge, Ctrl/Cmd + D duplica, Esc deselecteaza.
            </div>
          </div>

          <div className="grid gap-5 2xl:grid-cols-[1.1fr_0.9fr]">
            <CakeDecorationLibrary
              query={decorationSearch}
              category={decorationCategory}
              items={filteredDecorationItems}
              recommendedItems={recommendedDecorationItems}
              activeStyleLabel={selectedStyleLabel}
              onQueryChange={setDecorationSearch}
              onCategoryChange={setDecorationCategory}
              onAdd={addDecoration}
            />

            <div className="space-y-5">
              <div>
                <div className="mb-3 text-sm font-semibold text-gray-800">Straturi decorative</div>
                <CakeDecorationLayers
                  elements={decorationElements}
                  selectedId={selectedDecorationId}
                  onSelect={setSelectedDecorationId}
                  onDuplicate={duplicateDecoration}
                  onDelete={deleteDecoration}
                  onMove={moveDecoration}
                />
              </div>

              <div>
                <div className="mb-3 text-sm font-semibold text-gray-800">Controale element</div>
                <CakeDecorationInspector
                  element={selectedDecoration}
                  tierCount={tiers}
                  onUpdate={(patch) => {
                    if (!selectedDecoration) return;
                    updateDecoration(selectedDecoration.id, patch);
                  }}
                  onDuplicate={() => {
                    if (!selectedDecoration) return;
                    duplicateDecoration(selectedDecoration.id);
                  }}
                  onDelete={() => {
                    if (!selectedDecoration) return;
                    deleteDecoration(selectedDecoration.id);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div ref={aiStepRef} className={`${cards.elevated} scroll-mt-28 space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                Pasul 5
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Preview realist cu AI</h2>
              <p className="text-sm text-gray-600">
                Clientul poate descrie liber decorul dorit, iar promptul se compune din
                structura, interiorul si exteriorul deja alese.
              </p>
            </div>
            <span className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6856] shadow-soft">
              {isAuthenticated ? "Istoric salvat" : "Disponibil si fara cont"}
            </span>
          </div>

          <ProviderSelector
            providers={providerState.providers}
            value={activeProviderId}
            onChange={providerState.setSelectedProviderId}
            loading={providerState.loading}
            disabled={!providerState.canChooseProvider}
            hideIfSingleOption
            label="Atelier pentru preview"
            helpText={
              activeProviderId
                ? `Imaginea se genereaza pentru ${activeProviderName}.`
                : providerState.hasMultipleProviders
                  ? "Selecteaza atelierul pentru care vrei simularea vizuala."
                  : "Atelierul disponibil se selecteaza automat pentru acest preview."
            }
          />

          <div className="rounded-[22px] border border-rose-100 bg-white/85 px-4 py-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
                  Poze de inspiratie
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Incarca pana la 3 referinte si descrie ce detalii vrei sa preluam.
                </div>
              </div>
              <label className={buttons.outline}>
                Incarca imagini
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleInspirationUpload}
                />
              </label>
            </div>

            {inspirationItems.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {inspirationItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-[20px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-3 md:grid-cols-[96px,1fr,auto]"
                  >
                    <img
                      src={item.previewUrl || item.url}
                      alt={item.label || item.name || `Inspiratie ${index + 1}`}
                      className="h-24 w-24 rounded-2xl object-cover"
                    />
                    <label className="text-sm font-semibold text-gray-700">
                      Ce pastrezi din aceasta poza?
                      <input
                        value={item.label || ""}
                        onChange={(event) => updateInspirationItem(item.id, event.target.value)}
                        placeholder="Ex: florile albe, silueta inalta, perlele mici..."
                        className={`mt-2 ${inputs.default}`}
                      />
                    </label>
                    <button
                      type="button"
                      className={buttons.outline}
                      onClick={() => removeInspirationItem(item.id)}
                    >
                      Sterge
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] border border-dashed border-rose-200 bg-[rgba(255,249,242,0.68)] px-4 py-4 text-sm text-[#6d625a]">
                Poti genera tortul doar din text, dar referintele vizuale ajuta mult pentru decor.
              </div>
            )}
          </div>

          <label className="block text-sm font-semibold text-gray-700">
            Ce vrei sa ceri liber pentru decor?
            <textarea
              value={aiDecorRequest}
              onChange={handleAiRequestChange}
              placeholder="Ex: vreau un tort foarte elegant, cu textura fina de unt, flori albe naturale, accente aurii subtile si look de fotografie reala."
              className={`mt-2 ${inputs.default} min-h-[120px] resize-y`}
            />
          </label>

          <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.9)] px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
              Prompt compus automat
            </div>
            <div className="mt-2 text-sm leading-6 text-[#5c524a]">{aiPromptPreview}</div>
            {inspirationSummary ? (
              <div className="mt-3 rounded-[18px] border border-rose-100 bg-white/80 px-3 py-3 text-sm text-[#5c524a]">
                {inspirationSummary}
              </div>
            ) : null}
          </div>

          {aiStatus.text ? <StatusBanner type={aiStatus.type || "info"} message={aiStatus.text} /> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttons.secondary}
              disabled={aiBusy || providerState.loading || !activeProviderId}
              onClick={generateAiPreview}
            >
              {aiBusy ? "Generez imagine..." : "Genereaza preview realist"}
            </button>
            <button
              type="button"
              className={buttons.outline}
              onClick={() => setPreviewMode("exterior")}
            >
              Revino la preview 2D
            </button>
          </div>

          {aiPreviewVariants.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {aiPreviewVariants.map((item, index) => (
                  <button
                    key={`${item.imageUrl}-${index}`}
                    type="button"
                    onClick={() => {
                      setActiveAiPreviewIndex(index);
                      setAiPreview(item);
                    }}
                    className={`overflow-hidden rounded-[24px] border bg-white text-left shadow-soft transition ${
                      activeAiPreviewIndex === index
                        ? "border-charcoal ring-2 ring-sage/30"
                        : "border-rose-100 hover:-translate-y-0.5 hover:border-rose-300"
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={`${item.label || `Varianta ${index + 1}`} pentru ${designSummary}`}
                      className="h-40 w-full object-cover"
                    />
                    <div className="px-3 py-3 text-sm font-semibold text-gray-900">
                      {item.label || `Varianta ${index + 1}`}
                    </div>
                  </button>
                ))}
              </div>

              <div className="overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-soft">
              <img
                src={aiPreview.imageUrl}
                alt={`Preview realist pentru ${designSummary}`}
                className="h-auto w-full object-cover"
              />
              <div className="border-t border-rose-100 px-4 py-3 text-sm text-[#5f564d]">
                Sursa: {aiPreview.source || "AI"}{aiPreview.fallback ? " • fallback local" : ""}
              </div>
            </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-rose-200 bg-white/80 px-4 py-6 text-sm leading-6 text-[#6d625a]">
              Dupa ce generezi imaginea, aici apare un preview mai aproape de un tort real,
              util pentru confirmarea stilului final.
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-6 2xl:min-w-0">
        <div className={`${cards.elevated} space-y-5`}>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Compoziție</h2>
            <p className="text-sm text-gray-600">
              Controlezi separat interiorul tortului, frosting-ul exterior, culoarea dominantă și mesajul.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                Pasul 2 • Interior
              </div>
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
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                Pasul 3 • Exterior
              </div>
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
              <label className="mt-3 flex items-center gap-3 rounded-[22px] border border-rose-100 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-700 shadow-soft">
                Culoare personalizata
                <input
                  type="color"
                  value={/^#([0-9a-f]{6})$/i.test(culoare) ? culoare : "#f6d7c3"}
                  onChange={(event) => handleOptionChange("culoare", setCuloare, event.target.value)}
                  className="h-10 w-16 rounded-xl border border-rose-200 bg-white"
                />
              </label>
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
              <SummaryRow
                label={`Forma ${selectedStructure.shape?.label || "rotund"}`}
                value={`+${selectedStructure.shape?.price || 0} MDL`}
              />
              <SummaryRow
                label={`Dimensiune ${selectedStructure.size?.label || "mediu"}`}
                value={`+${selectedStructure.size?.price || 0} MDL`}
              />
              <SummaryRow
                label={selectedStructure.tiers?.label || "Structura"}
                value={`+${selectedStructure.tiers?.price || 0} MDL`}
              />
              <SummaryRow
                label={`Profil ${selectedStructure.heightProfile?.label || "echilibrat"}`}
                value={`+${selectedStructure.heightProfile?.price || 0} MDL`}
              />
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
              <SummaryRow
                label="Decor liber"
                value={`+${decorationWorkload.price || 0} MDL`}
              />
              <div className="border-t border-rose-100 pt-3">
                <SummaryRow label="Total estimat" value={`${total} MDL`} emphasize />
              </div>
              <SummaryRow label="Portii estimate" value={estimateMetrics.servingsLabel} />
              <SummaryRow label="Greutate estimata" value={estimateMetrics.weightLabel} />
              <SummaryRow label="Timp estimat" value={`${timpOre} ore`} />
              <SummaryRow
                label="Mod export curent"
                value={activeModeMeta.label}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.9)] px-4 py-4 text-sm text-gray-700">
            <div className="font-semibold text-gray-900">Compoziția curentă</div>
            <div className="mt-2 leading-6">{compositionSummary}</div>
            <div className="mt-3 grid gap-3 border-t border-rose-100 pt-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-600">
                  Decor liber
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  {decorationSummary || "Nu ai adaugat elemente inca."}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-pink-600">
                  Stil recomandat
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  {selectedStyleLabel || "Fara stil presetat"}
                </div>
              </div>
            </div>
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
              {busyAction === "send" ? "Se trimite..." : "Trimite atelierului"}
            </button>
          </div>

          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Comenzile personalizate se confirmă manual. Designul se poate salva, exporta și trimite spre validare înainte de prețul final.
          </div>

          {designId ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Draftul este deja in contul tau si poate fi reluat din pagina Designurile mele.
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-gray-500">Se încarcă designul salvat...</div>
          ) : null}
        </div>
      </aside>

      {showFloatingPreview ? (
        <div className="fixed bottom-4 right-4 z-40 lg:bottom-auto lg:right-6 lg:top-28">
          <div className="w-[220px] rounded-[26px] border border-rose-200 bg-[rgba(255,251,245,0.96)] p-3 shadow-card backdrop-blur-md lg:w-[320px]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pink-500">
                  {fixedPreviewLabel}
                </div>
                <div className="text-xs font-semibold text-[#2f2126]">
                  {activeModeMeta.shortLabel}
                </div>
              </div>
              <button
                type="button"
                className={buttons.outline}
                onClick={() => scrollToPreview("smooth")}
              >
                Vezi mare
              </button>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-rose-100 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(249,244,236,0.96),_rgba(231,237,228,0.86))]">
              <CakePreview2DStage
                stageWidth={floatingPreviewWidth}
                stageHeight={floatingPreviewHeight}
                mode={previewMode}
                model={floatingPreviewModel}
                footerText=""
                decorations={decorationElements}
                selectedDecorationId={selectedDecorationId}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
