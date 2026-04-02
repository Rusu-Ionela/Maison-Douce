const ORDER_FLOW_FLAG = "guided";

export const ORDER_FLOW_STORAGE_KEY = "maison-douce-order-flow";
export const GENERATED_IDEA_STORAGE_KEY = "maison-douce-generated-idea";

export const ORDER_FLOW_STEPS = [
  { id: "estimate", label: "Pasul 1", title: "Estimare kg" },
  { id: "choose", label: "Pasul 2", title: "Alege tipul comenzii" },
  { id: "build", label: "Pasul 3", title: "Selecteaza / construieste / genereaza" },
  { id: "draft", label: "Pasul 4", title: "Salveaza draftul" },
  { id: "send", label: "Pasul 5", title: "Trimite catre patiser" },
];

export const ORDER_EVENT_OPTIONS = [
  {
    id: "aniversare",
    label: "Aniversare",
    summary: "Pentru petreceri clasice si seri speciale in familie.",
  },
  {
    id: "zi_nastere",
    label: "Zi de nastere",
    summary: "Pentru torturi festive, inclusiv teme pentru copii.",
  },
  {
    id: "nunta",
    label: "Nunta",
    summary: "Pentru evenimente elegante, cu focus pe prezentare premium.",
  },
  {
    id: "botez",
    label: "Botez",
    summary: "Pentru un brief delicat, luminos si usor de rafinat vizual.",
  },
  {
    id: "corporate",
    label: "Corporate",
    summary: "Pentru evenimente de brand, lansari si aniversari de echipa.",
  },
  {
    id: "copii",
    label: "Petrecere copii",
    summary: "Pentru teme jucause si elemente vizuale mai expresive.",
  },
  {
    id: "alt_eveniment",
    label: "Alt eveniment",
    summary: "Cand vrei doar un reper initial si decizi ulterior detaliile.",
  },
];

export const ORDER_PORTION_STYLE_OPTIONS = [
  {
    id: "normal",
    label: "Portii normale",
    gramsPerPerson: 150,
    summary: "O estimare echilibrata pentru majoritatea torturilor clasice.",
  },
  {
    id: "generous",
    label: "Portii mai mari",
    gramsPerPerson: 190,
    summary: "Recomandat daca vrei felii mai generoase sau un tort mai inalt.",
  },
];

export const ORDER_TYPE_OPTIONS = [
  {
    id: "catalog",
    label: "Vreau sa aleg un tort existent",
    shortLabel: "Tort existent",
    route: "/catalog",
    ctaLabel: "Mergi in catalog",
    summary: "Alegere rapida din modelele deja disponibile.",
    detail:
      "Primesti modelele din colectie, iar filtrele pornesc de la numarul de persoane si eveniment.",
  },
  {
    id: "custom",
    label: "Vreau sa construiesc un tort personalizat",
    shortLabel: "Construieste",
    route: "/constructor",
    ctaLabel: "Deschide constructorul",
    summary: "Personalizare manuala completa, pas cu pas.",
    detail:
      "Pornesti de la baza tortului si adaugi liber decorul, apoi salvezi sau trimiti draftul.",
  },
  {
    id: "idea",
    label: "Vreau sa generez o idee de tort",
    shortLabel: "Genereaza",
    route: "/designer-ai",
    ctaLabel: "Genereaza idei",
    summary: "Sistemul propune concepte vizuale pe baza preferintelor tale.",
    detail:
      "Pornesti din preferinte simple, generezi un concept si apoi continui in editare sau draft.",
  },
];

function clampPersons(value) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(1, Math.min(parsed, 400));
}

function findById(options, value, fallbackId = "") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return options.find((item) => item.id === fallbackId) || null;
  }
  return (
    options.find((item) => item.id === normalized) ||
    options.find((item) => item.id === fallbackId) ||
    null
  );
}

function toFixedLabel(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  if (!Number.isFinite(rounded) || rounded <= 0) return "0 kg";
  if (Number.isInteger(rounded)) return `${rounded} kg`;
  return `${rounded.toLocaleString("ro-RO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;
}

function buildSizeBand(persons) {
  if (persons <= 12) return "tort mic";
  if (persons <= 24) return "tort mediu";
  if (persons <= 40) return "tort mare";
  return "tort de eveniment";
}

function buildTierSuggestion(persons) {
  if (persons <= 18) return "1 etaj";
  if (persons <= 45) return "2 etaje";
  return "3 etaje";
}

export function calculateOrderFlowEstimate({ persons, portionStyle = "normal" } = {}) {
  const safePersons = clampPersons(persons);
  const portionMeta = findById(ORDER_PORTION_STYLE_OPTIONS, portionStyle, "normal");
  const gramsPerPerson = Number(portionMeta?.gramsPerPerson || 150);
  const totalGrams = safePersons * gramsPerPerson;
  const estimatedKg = Math.round((totalGrams / 1000) * 10) / 10;

  return {
    persons: safePersons,
    gramsPerPerson,
    totalGrams,
    estimatedKg,
    estimatedKgLabel: toFixedLabel(estimatedKg),
    portionStyle: portionMeta?.id || "normal",
    portionStyleLabel: portionMeta?.label || "Portii normale",
    sizeBand: buildSizeBand(safePersons || 1),
    tierSuggestion: buildTierSuggestion(safePersons || 1),
    explanation:
      safePersons > 0
        ? `Pentru ${safePersons} persoane iti recomandam aproximativ ${toFixedLabel(
            estimatedKg
          )}. Este o estimare orientativa, utila ca punct de pornire pentru alegerea tortului.`
        : "Introdu numarul de persoane pentru a vedea recomandarea de kg.",
  };
}

export function getOrderEventMeta(eventType = "") {
  return findById(ORDER_EVENT_OPTIONS, eventType, "") || null;
}

export function getOrderTypeMeta(orderType = "") {
  return findById(ORDER_TYPE_OPTIONS, orderType, "") || null;
}

export function normalizeOrderFlowContext(raw = {}) {
  const persons = clampPersons(raw.persons);
  const eventMeta = getOrderEventMeta(raw.eventType);
  const portionMeta = findById(ORDER_PORTION_STYLE_OPTIONS, raw.portionStyle, "normal");
  const orderTypeMeta = getOrderTypeMeta(raw.orderType);
  const estimate = calculateOrderFlowEstimate({
    persons,
    portionStyle: portionMeta?.id || "normal",
  });

  return {
    flow: ORDER_FLOW_FLAG,
    hasContext: persons > 0,
    persons,
    eventType: eventMeta?.id || "",
    eventLabel: eventMeta?.label || "",
    portionStyle: portionMeta?.id || "normal",
    portionStyleLabel: portionMeta?.label || "Portii normale",
    orderType: orderTypeMeta?.id || "",
    orderTypeLabel: orderTypeMeta?.shortLabel || "",
    estimatedKg: estimate.estimatedKg,
    estimatedKgLabel: estimate.estimatedKgLabel,
    gramsPerPerson: estimate.gramsPerPerson,
    sizeBand: estimate.sizeBand,
    tierSuggestion: estimate.tierSuggestion,
    explanation: estimate.explanation,
    updatedAt: Number(raw.updatedAt || Date.now()),
  };
}

export function cleanOrderFlowForSave(raw = {}) {
  const context = normalizeOrderFlowContext(raw);
  if (!context.hasContext) return {};

  return {
    flow: context.flow,
    persons: context.persons,
    eventType: context.eventType,
    eventLabel: context.eventLabel,
    portionStyle: context.portionStyle,
    portionStyleLabel: context.portionStyleLabel,
    orderType: context.orderType,
    orderTypeLabel: context.orderTypeLabel,
    estimatedKg: context.estimatedKg,
    estimatedKgLabel: context.estimatedKgLabel,
    gramsPerPerson: context.gramsPerPerson,
    sizeBand: context.sizeBand,
    tierSuggestion: context.tierSuggestion,
    explanation: context.explanation,
    updatedAt: context.updatedAt,
  };
}

function applyFlowParams(params, context) {
  const normalized = normalizeOrderFlowContext(context);
  if (!normalized.hasContext) {
    params.delete("flow");
    params.delete("persons");
    params.delete("event");
    params.delete("portion");
    params.delete("orderType");
    return params;
  }

  params.set("flow", ORDER_FLOW_FLAG);
  params.set("persons", String(normalized.persons));
  if (normalized.eventType) {
    params.set("event", normalized.eventType);
  } else {
    params.delete("event");
  }
  params.set("portion", normalized.portionStyle);
  if (normalized.orderType) {
    params.set("orderType", normalized.orderType);
  } else {
    params.delete("orderType");
  }
  return params;
}

export function readOrderFlowContextFromSearch(search = "") {
  const params = new URLSearchParams(search || "");
  const hasHint = params.get("flow") === ORDER_FLOW_FLAG || params.has("persons");
  if (!hasHint) return null;

  return normalizeOrderFlowContext({
    persons: params.get("persons"),
    eventType: params.get("event"),
    portionStyle: params.get("portion"),
    orderType: params.get("orderType"),
  });
}

export function buildOrderFlowHref(path, context, extraParams = {}) {
  const input = String(path || "").trim() || "/";
  const [beforeHash, hash = ""] = input.split("#");
  const [pathname, search = ""] = beforeHash.split("?");
  const params = new URLSearchParams(search);

  applyFlowParams(params, context);

  Object.entries(extraParams || {}).forEach(([key, value]) => {
    if (value === null || typeof value === "undefined" || value === "") {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });

  const query = params.toString();
  return `${pathname || "/"}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

export function saveOrderFlowContext(context) {
  if (typeof window === "undefined") return;
  const normalized = cleanOrderFlowForSave(context);
  if (!normalized.persons) return;
  window.localStorage.setItem(ORDER_FLOW_STORAGE_KEY, JSON.stringify(normalized));
}

export function loadOrderFlowContext() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ORDER_FLOW_STORAGE_KEY);
    if (!raw) return null;
    return normalizeOrderFlowContext(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearOrderFlowContext() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ORDER_FLOW_STORAGE_KEY);
}

export function saveGeneratedIdeaSession(payload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GENERATED_IDEA_STORAGE_KEY, JSON.stringify(payload || {}));
}

export function loadGeneratedIdeaSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GENERATED_IDEA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearGeneratedIdeaSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GENERATED_IDEA_STORAGE_KEY);
}

export function getCatalogPortionBandForPersons(persons) {
  const safePersons = clampPersons(persons);
  if (!safePersons) return "toate";
  if (safePersons <= 12) return "max_12";
  if (safePersons <= 18) return "13_18";
  return "peste_18";
}

export function getStepIndex(stepId = "") {
  const index = ORDER_FLOW_STEPS.findIndex((item) => item.id === stepId);
  return index === -1 ? 0 : index;
}
