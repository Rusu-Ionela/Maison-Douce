import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "/src/lib/api.js";
import OrderFlowContextBanner from "../components/order-flow/OrderFlowContextBanner";
import ProviderSelector from "../components/ProviderSelector";
import { useAuth } from "../context/AuthContext";
import {
  buildOrderFlowHref,
  cleanOrderFlowForSave,
  loadOrderFlowContext,
  normalizeOrderFlowContext,
  readOrderFlowContextFromSearch,
  saveGeneratedIdeaSession,
  saveOrderFlowContext,
} from "../lib/orderFlow";
import { useProviderDirectory } from "../lib/providers";
import { buttons, cards, inputs } from "../lib/tailwindComponents";

const STYLE_OPTIONS = [
  "elegant",
  "minimalist",
  "romantic",
  "luxury",
  "floral",
  "modern",
  "vintage",
  "wedding",
  "birthday",
];

const COLOR_OPTIONS = [
  "ivory si gold",
  "rose gold si nude",
  "lavanda si ivory",
  "baby blue si alb",
  "emerald si gold",
  "burgundy si blush",
  "pastel mix",
];

const THEME_OPTIONS = [
  "flori delicate",
  "tort de nunta premium",
  "aniversare eleganta",
  "copii cu figurine",
  "botez luminos",
  "look modern editorial",
];

const DECOR_SUGGESTIONS = [
  "flori",
  "perle",
  "macarons",
  "fundite",
  "fluturi",
  "fructe",
  "foita aurie",
  "lumanari",
];

function formatDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toSentence(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function buildIdeaPrompt({ flowContext, theme, palette, style, decorElements, brief }) {
  const parts = [
    "tort premium semi-realistic pentru cofetarie",
    flowContext?.hasContext ? `pentru aproximativ ${flowContext.persons} persoane` : "",
    flowContext?.eventLabel ? `eveniment ${flowContext.eventLabel.toLowerCase()}` : "",
    theme ? `tema ${theme}` : "",
    palette ? `paleta ${palette}` : "",
    style ? `stil ${style}` : "",
    decorElements ? `decor cu ${toSentence(decorElements)}` : "",
    brief ? `preferinte suplimentare: ${brief}` : "",
    "lumina naturala, texturi fine de crema, volum realist, umbre discrete, look premium",
  ].filter(Boolean);

  return parts.join(", ");
}

function buildVariantPrompts(basePrompt) {
  const prompt = String(basePrompt || "").trim();
  if (!prompt) return [];

  return [
    prompt,
    `${prompt}, varianta 2 cu compozitie usor diferita si accent decorativ secundar.`,
    `${prompt}, varianta 3 cu styling premium alternativ si echilibru vizual mai aerisit.`,
  ];
}

function ChoiceChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-sage-deep/35 bg-charcoal text-white"
          : "border-rose-200 bg-white/90 text-[#5e554d] hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function buildDraftPayload({
  user,
  activeProviderId,
  flowContext,
  prompt,
  brief,
  theme,
  palette,
  style,
  decorElements,
  items,
}) {
  const orderFlow = cleanOrderFlowForSave({
    ...flowContext,
    orderType: "idea",
  });
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item, index) => ({
          imageUrl: item?.imageUrl || "",
          prompt: item?.prompt || prompt,
          source: item?.source || "",
          fallback: item?.fallback === true,
          label: item?.label || `Varianta ${index + 1}`,
        }))
        .filter((item) => item.imageUrl)
    : [];

  return {
    clientId: user?._id || undefined,
    prestatorId: activeProviderId || undefined,
    forma: "concept-ai",
    culori: palette ? [palette] : [],
    mesaj: brief || theme || "Concept generat AI",
    note: "Saved from guided idea generator",
    options: {
      aiDecorRequest: brief || prompt,
      aiPrompt: prompt,
      aiPreviewUrl: normalizedItems[0]?.imageUrl || "",
      aiPreviewVariants: normalizedItems,
      estimatedServings: orderFlow?.persons ? `${orderFlow.persons} persoane` : "",
      estimatedWeightKg: orderFlow?.estimatedKgLabel || "",
      orderFlow,
      sourceType: "generated-idea",
      ideaTheme: theme,
      ideaPalette: palette,
      ideaStyle: style,
      ideaDecorElements: decorElements,
    },
    pretEstimat: 0,
    timpPreparareOre: 0,
    status: "draft",
  };
}

export default function DesignerAI() {
  const { user, isAuthenticated } = useAuth() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const providerState = useProviderDirectory({ user });
  const flowContext = useMemo(
    () => readOrderFlowContextFromSearch(location.search) || loadOrderFlowContext(),
    [location.search]
  );
  const [theme, setTheme] = useState("flori delicate");
  const [palette, setPalette] = useState("ivory si gold");
  const [style, setStyle] = useState("elegant");
  const [decorElements, setDecorElements] = useState("flori, perle, foita aurie");
  const [brief, setBrief] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptTouched, setPromptTouched] = useState(false);
  const [resultItems, setResultItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  const activeProviderId = providerState.activeProviderId;
  const activeProviderName =
    providerState.activeProvider?.displayName || "atelierul selectat";

  const draftPrompt = useMemo(
    () =>
      buildIdeaPrompt({
        flowContext,
        theme,
        palette,
        style,
        decorElements,
        brief,
      }),
    [brief, decorElements, flowContext, palette, style, theme]
  );

  useEffect(() => {
    if (!promptTouched) {
      setPrompt(draftPrompt);
    }
  }, [draftPrompt, promptTouched]);

  useEffect(() => {
    if (!isAuthenticated || !activeProviderId) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);

    api
      .get("/ai/history", {
        params: { prestatorId: activeProviderId },
      })
      .then((response) => {
        if (cancelled) return;
        setHistory(Array.isArray(response.data?.items) ? response.data.items : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setNotice({
          type: "error",
          message:
            error?.response?.data?.message || "Nu am putut incarca istoricul AI.",
        });
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProviderId, isAuthenticated]);

  const selectedResult = resultItems[selectedIndex] || null;
  const flowAwareContext = useMemo(
    () =>
      normalizeOrderFlowContext({
        ...(flowContext || {}),
        orderType: "idea",
      }),
    [flowContext]
  );

  const generate = async () => {
    if (!prompt.trim()) {
      setNotice({ type: "error", message: "Completeaza brief-ul inainte de generare." });
      return;
    }
    if (!activeProviderId) {
      setNotice({
        type: "error",
        message:
          providerState.error ||
          "Selecteaza un atelier valid inainte de a genera ideile.",
      });
      return;
    }

    setLoading(true);
    setNotice({ type: "", message: "" });

    try {
      const res = await api.post("/ai/generate-cake", {
        prompt: prompt.trim(),
        prestatorId: activeProviderId,
        variants: 3,
        variantPrompts: buildVariantPrompts(prompt.trim()),
      });
      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      const normalizedItems = items
        .map((item, index) => ({
          imageUrl: item?.imageUrl || "",
          prompt: item?.prompt || prompt.trim(),
          source: item?.source || "",
          fallback: item?.fallback === true,
          label: `Varianta ${index + 1}`,
          createdAt: new Date().toISOString(),
        }))
        .filter((item) => item.imageUrl);

      setResultItems(normalizedItems);
      setSelectedIndex(0);
      setNotice({
        type: "success",
        message:
          normalizedItems.length > 1
            ? "Am generat trei directii vizuale pe care le poti compara imediat."
            : "Am generat conceptul vizual cerut.",
      });

      if (res?.data?.historyEntries?.length) {
        setHistory((current) => [...res.data.historyEntries, ...current].slice(0, 25));
      }
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Nu am putut genera imaginea pe baza brief-ului introdus.",
      });
    } finally {
      setLoading(false);
    }
  };

  const continueInConstructor = () => {
    if (!selectedResult) {
      setNotice({ type: "error", message: "Genereaza mai intai macar o varianta." });
      return;
    }

    const nextContext = normalizeOrderFlowContext({
      ...(flowAwareContext || {}),
      orderType: "idea",
    });
    saveOrderFlowContext(nextContext);
    saveGeneratedIdeaSession({
      prompt: prompt.trim(),
      note: brief.trim(),
      imageUrl: selectedResult.imageUrl,
      source: selectedResult.source,
      variants: resultItems,
      theme,
      palette,
      style,
      decorElements,
    });
    navigate(buildOrderFlowHref("/constructor?idea=guided", nextContext, { idea: "guided" }));
  };

  const saveDraft = async () => {
    if (!user?._id) {
      setNotice({
        type: "warning",
        message: "Autentifica-te pentru a salva ideea generata ca draft.",
      });
      return;
    }
    if (!selectedResult) {
      setNotice({
        type: "warning",
        message: "Genereaza mai intai o varianta pe care sa o salvezi.",
      });
      return;
    }

    setSavingDraft(true);
    setNotice({ type: "", message: "" });

    try {
      const payload = buildDraftPayload({
        user,
        activeProviderId,
        flowContext: flowAwareContext,
        prompt: prompt.trim(),
        brief: brief.trim(),
        theme,
        palette,
        style,
        decorElements,
        items: resultItems,
      });
      await api.post("/personalizare", payload);
      saveOrderFlowContext(flowAwareContext);
      setNotice({
        type: "success",
        message: "Conceptul a fost salvat in Drafturile mele.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error?.response?.data?.error || "Nu am putut salva conceptul ca draft.",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-editorial space-y-6 px-4 py-8 sm:px-6">
        {flowAwareContext?.hasContext ? (
          <OrderFlowContextBanner
            context={flowAwareContext}
            currentStep="build"
            eyebrow="Pasul 3 din comanda online"
            title="Genereaza o idee de tort plecand din brief-ul tau"
            description="Completezi preferintele principale, obtii concepte vizuale rapide si apoi continui in constructor sau salvezi varianta preferata ca draft."
            primaryAction={{ to: "/comanda-online", label: "Schimba brief-ul" }}
            secondaryActions={[
              { to: "/catalog", label: "Vezi torturi existente" },
              { to: "/constructor", label: "Deschide constructorul" },
            ]}
          />
        ) : null}

        <section className={`${cards.tinted} space-y-5`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
                Generator de idei
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-gray-900">
                Spune ce atmosfera vrei, iar sistemul propune directii vizuale clare
              </h1>
              <p className="mt-3 text-base leading-7 text-gray-600">
                Generatorul este pentru clientii care nu vor sa porneasca direct intr-un constructor
                complex. El transforma cateva preferinte simple intr-un concept pe care il poti
                rafina apoi in detaliu.
              </p>
            </div>
            <div className="min-w-[280px]">
              <ProviderSelector
                providers={providerState.providers}
                value={activeProviderId}
                onChange={providerState.setSelectedProviderId}
                loading={providerState.loading}
                disabled={!providerState.canChooseProvider}
                hideIfSingleOption
                label="Atelier activ"
                helpText={
                  providerState.activeProvider
                    ? `Ideile generate se raporteaza la atelierul ${activeProviderName}.`
                    : providerState.hasMultipleProviders
                    ? "Selecteaza atelierul pentru care vrei sa generezi conceptul."
                    : "Atelierul disponibil se selecteaza automat."
                }
              />
            </div>
          </div>

          {notice.message ? (
            <div
              className={`rounded-[24px] border px-4 py-3 text-sm shadow-soft ${
                notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : notice.type === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {notice.message}
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <section className={`${cards.elevated} space-y-5`}>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Brief-ul de pornire</h2>
              <p className="mt-1 text-sm text-gray-600">
                Alege tema, culorile, stilul si cateva elemente decorative. Promptul final se
                construieste automat, dar il poti ajusta manual.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-[#4f463e]">Tema</div>
              <div className="flex flex-wrap gap-2.5">
                {THEME_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option}
                    label={option}
                    active={theme === option}
                    onClick={() => setTheme(option)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-[#4f463e]">Paleta cromatica</div>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option}
                    label={option}
                    active={palette === option}
                    onClick={() => setPalette(option)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-[#4f463e]">Stil</div>
              <div className="flex flex-wrap gap-2.5">
                {STYLE_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option}
                    label={option}
                    active={style === option}
                    onClick={() => setStyle(option)}
                  />
                ))}
              </div>
            </div>

            <label className="block text-sm font-semibold text-[#4f463e]">
              Elemente decorative
              <input
                type="text"
                value={decorElements}
                onChange={(event) => setDecorElements(event.target.value)}
                className={`mt-2 ${inputs.default}`}
                placeholder="Ex: flori, perle, fundite, topper"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {DECOR_SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={buttons.outline}
                  onClick={() => {
                    const current = toSentence(decorElements);
                    const nextValues = new Set(
                      [current, item]
                        .join(", ")
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean)
                    );
                    setDecorElements(Array.from(nextValues).join(", "));
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <label className="block text-sm font-semibold text-[#4f463e]">
              Note suplimentare
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                className={`mt-2 min-h-[110px] ${inputs.default}`}
                placeholder="Ex: vreau un look foarte elegant, fara prea multe culori, cu decor usor aerisit"
              />
            </label>

            <label className="block text-sm font-semibold text-[#4f463e]">
              Prompt final
              <textarea
                value={prompt}
                onChange={(event) => {
                  setPromptTouched(true);
                  setPrompt(event.target.value);
                }}
                className={`mt-2 min-h-[180px] ${inputs.default}`}
                placeholder="Promptul final se construieste aici si poate fi editat manual."
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generate}
                className={buttons.primary}
                disabled={loading || !prompt.trim() || !activeProviderId}
              >
                {loading ? "Generez ideile..." : "Genereaza 3 idei"}
              </button>
              <button
                type="button"
                className={buttons.outline}
                onClick={() => {
                  setPromptTouched(false);
                  setBrief("");
                  setResultItems([]);
                  setSelectedIndex(0);
                  setNotice({ type: "", message: "" });
                }}
              >
                Reseteaza
              </button>
            </div>
          </section>

          <section className={`${cards.elevated} space-y-4`}>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Rezultatul generat</h2>
              <p className="mt-1 text-sm text-gray-600">
                Alege varianta care se apropie cel mai mult de ce iti imaginezi, apoi continua in
                constructor sau salveaz-o ca draft.
              </p>
            </div>

            {selectedResult?.imageUrl ? (
              <>
                <div className="overflow-hidden rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-3">
                  <img
                    src={selectedResult.imageUrl}
                    alt={`Concept generat pentru promptul ${selectedResult.prompt}`}
                    className="w-full rounded-[18px] object-cover shadow-soft"
                  />
                </div>

                {resultItems.length > 1 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {resultItems.map((item, index) => (
                      <button
                        key={`${item.imageUrl}-${index}`}
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        className={`overflow-hidden rounded-[18px] border p-1 shadow-soft ${
                          selectedIndex === index
                            ? "border-pink-300 bg-rose-50"
                            : "border-rose-100 bg-white"
                        }`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.label}
                          className="h-24 w-full rounded-[14px] object-cover"
                        />
                        <div className="px-2 py-2 text-xs font-semibold text-[#5f564d]">
                          {item.label}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-rose-100 bg-white/85 p-4 text-sm leading-6 text-gray-700">
                  <div>
                    <span className="font-semibold text-gray-900">Prompt:</span> {selectedResult.prompt}
                  </div>
                  <div className="mt-2">
                    <span className="font-semibold text-gray-900">Sursa:</span>{" "}
                    {selectedResult.source || "AI"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" className={buttons.primary} onClick={continueInConstructor}>
                    Continua in constructor
                  </button>
                  <button
                    type="button"
                    className={buttons.secondary}
                    onClick={saveDraft}
                    disabled={savingDraft}
                  >
                    {savingDraft ? "Se salveaza..." : "Salveaza draftul"}
                  </button>
                  <Link
                    to={buildOrderFlowHref("/personalizari", flowAwareContext)}
                    className={buttons.outline}
                  >
                    Drafturile mele
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[24px] border border-dashed border-rose-200 bg-white/70 px-6 text-center text-sm text-gray-500">
                <div className="font-semibold text-gray-900">Nu exista inca un concept generat.</div>
                <div className="mt-2">
                  Completeaza brief-ul si genereaza primele idei pentru a compara directiile vizuale.
                </div>
              </div>
            )}
          </section>
        </div>

        {isAuthenticated ? (
          <section className={`${cards.elevated} space-y-4`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Istoric generari</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Ultimele concepte salvate pentru utilizatorul conectat si atelierul activ.
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {providerState.activeProvider ? activeProviderName : "Fara atelier selectat"}
              </div>
            </div>

            {historyLoading ? (
              <div className="rounded-[24px] border border-dashed border-rose-200 bg-white/70 px-4 py-10 text-sm text-gray-500">
                Se incarca istoricul AI...
              </div>
            ) : history.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {history.map((item) => (
                  <article
                    key={item._id}
                    className="rounded-[24px] border border-rose-100 bg-white/92 p-4 shadow-soft"
                  >
                    <div className="overflow-hidden rounded-[18px] border border-rose-100 bg-[rgba(255,249,242,0.88)]">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={`Istoric AI pentru promptul: ${item.prompt}`}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                          Imagine indisponibila
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-sm font-semibold text-gray-900">{item.prompt}</div>
                    <div className="mt-2 text-xs text-gray-500">
                      {formatDateTime(item.createdAt)} | {item.source || item.status || "-"}
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        className={buttons.outline}
                        onClick={() => {
                          setPromptTouched(true);
                          setPrompt(item.prompt || "");
                          setResultItems(
                            item.imageUrl
                              ? [
                                  {
                                    imageUrl: item.imageUrl,
                                    prompt: item.prompt || "",
                                    source: item.source || "",
                                    label: "Varianta 1",
                                  },
                                ]
                              : []
                          );
                          setSelectedIndex(0);
                        }}
                      >
                        Refoloseste
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-rose-200 bg-white/70 px-4 py-10 text-sm text-gray-500">
                Nu exista inca generari salvate pentru atelierul selectat.
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
