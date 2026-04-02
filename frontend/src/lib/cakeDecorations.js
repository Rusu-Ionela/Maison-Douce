const DECORATION_LIBRARY = [
  {
    id: "sugar-pearls",
    kind: "pearlCluster",
    label: "Perle sidefate",
    category: "decoratiuni",
    keywords: ["perle", "bile", "sidef", "elegant", "wedding"],
    styleTags: ["elegant", "minimalist", "luxury", "wedding"],
    zones: ["top", "front"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.52, y: 0.36 },
    defaultScale: 0.96,
    price: 24,
    prepHours: 0.3,
  },
  {
    id: "fondant-balls",
    kind: "fondantBalls",
    label: "Bile satinate",
    category: "decoratiuni",
    keywords: ["bile", "sfere", "fondant", "birthday", "kids"],
    styleTags: ["modern", "birthday", "childish"],
    zones: ["top", "front"],
    defaultZone: "front",
    defaultTierBias: "bottom",
    defaultPosition: { x: 0.78, y: 0.28 },
    defaultScale: 1,
    price: 28,
    prepHours: 0.4,
  },
  {
    id: "sugar-rose",
    kind: "roseCluster",
    label: "Trandafiri din zahar",
    category: "decoratiuni",
    keywords: ["flori", "trandafiri", "romantic", "wedding", "nunta"],
    styleTags: ["romantic", "floral", "luxury", "wedding", "vintage"],
    zones: ["top", "front"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.7, y: 0.34 },
    defaultScale: 1.08,
    price: 36,
    prepHours: 0.7,
  },
  {
    id: "wild-bloom",
    kind: "wildBloom",
    label: "Flori fine de gradina",
    category: "decoratiuni",
    keywords: ["flori", "floral", "garden", "elegant", "minimal"],
    styleTags: ["floral", "elegant", "romantic", "modern"],
    zones: ["top", "front"],
    defaultZone: "front",
    defaultTierBias: "middle",
    defaultPosition: { x: 0.26, y: 0.46 },
    defaultScale: 1,
    price: 32,
    prepHours: 0.5,
  },
  {
    id: "butterfly-flight",
    kind: "butterflyFlight",
    label: "Fluturi delicati",
    category: "decoratiuni",
    keywords: ["fluturi", "butterfly", "romantic", "botez", "birthday"],
    styleTags: ["romantic", "birthday", "childish", "floral"],
    zones: ["top", "front"],
    defaultZone: "front",
    defaultTierBias: "top",
    defaultPosition: { x: 0.58, y: 0.18 },
    defaultScale: 0.96,
    price: 22,
    prepHours: 0.3,
  },
  {
    id: "gold-leaf",
    kind: "goldLeaf",
    label: "Foita aurie",
    category: "decoratiuni",
    keywords: ["gold", "foita aurie", "auriu", "luxury", "premium"],
    styleTags: ["luxury", "elegant", "wedding", "modern"],
    zones: ["top", "front"],
    defaultZone: "front",
    defaultTierBias: "top",
    defaultPosition: { x: 0.68, y: 0.38 },
    defaultScale: 0.92,
    price: 30,
    prepHours: 0.35,
  },
  {
    id: "macaron-stack",
    kind: "macaronStack",
    label: "Macarons couture",
    category: "decoratiuni",
    keywords: ["macarons", "macaron", "premium", "birthday", "modern"],
    styleTags: ["luxury", "modern", "birthday", "romantic"],
    zones: ["top", "front"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.3, y: 0.4 },
    defaultScale: 1.04,
    price: 34,
    prepHours: 0.55,
  },
  {
    id: "berry-cluster",
    kind: "berryCluster",
    label: "Fructe proaspete",
    category: "decoratiuni",
    keywords: ["fructe", "capsuni", "berries", "fresh", "anniversary"],
    styleTags: ["modern", "birthday", "floral", "elegant"],
    zones: ["top", "front"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.68, y: 0.42 },
    defaultScale: 1.04,
    price: 26,
    prepHours: 0.35,
  },
  {
    id: "satin-bow",
    kind: "satinBow",
    label: "Fundita satinata",
    category: "decoratiuni",
    keywords: ["fundita", "bow", "panglica", "gift", "botez", "baby"],
    styleTags: ["romantic", "minimalist", "birthday", "childish"],
    zones: ["front", "top"],
    defaultZone: "front",
    defaultTierBias: "middle",
    defaultPosition: { x: 0.5, y: 0.52 },
    defaultScale: 1,
    price: 22,
    prepHours: 0.35,
  },
  {
    id: "heart-charms",
    kind: "heartCharms",
    label: "Inimioare lucioase",
    category: "decoratiuni",
    keywords: ["inimioare", "inima", "heart", "romantic", "anniversary"],
    styleTags: ["romantic", "birthday", "wedding", "childish"],
    zones: ["top", "front"],
    defaultZone: "front",
    defaultTierBias: "middle",
    defaultPosition: { x: 0.38, y: 0.34 },
    defaultScale: 0.94,
    price: 20,
    prepHours: 0.25,
  },
  {
    id: "star-sparkles",
    kind: "starSparkles",
    label: "Stelute sidefate",
    category: "decoratiuni",
    keywords: ["stelute", "stars", "birthday", "kids", "sparkle"],
    styleTags: ["birthday", "childish", "modern"],
    zones: ["top", "front"],
    defaultZone: "front",
    defaultTierBias: "top",
    defaultPosition: { x: 0.64, y: 0.24 },
    defaultScale: 0.96,
    price: 18,
    prepHours: 0.2,
  },
  {
    id: "candle-trio",
    kind: "candleTrio",
    label: "Lumanari elegante",
    category: "lumanari",
    keywords: ["lumanari", "candles", "birthday", "spark", "anniversary"],
    styleTags: ["birthday", "elegant", "luxury", "minimalist"],
    zones: ["top"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.54, y: 0.28 },
    defaultScale: 1,
    price: 16,
    prepHours: 0.2,
  },
  {
    id: "gold-topper",
    kind: "goldTopper",
    label: "Topper acrilic",
    category: "topper",
    keywords: ["topper", "happy birthday", "mr mrs", "wedding", "anniversary"],
    styleTags: ["birthday", "wedding", "luxury", "modern"],
    zones: ["top"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.5, y: 0.16 },
    defaultScale: 1.06,
    price: 38,
    prepHours: 0.15,
  },
  {
    id: "wedding-arch",
    kind: "weddingArch",
    label: "Topper de nunta",
    category: "topper",
    keywords: ["wedding", "nunta", "mr and mrs", "ceremony", "romantic"],
    styleTags: ["wedding", "luxury", "romantic", "elegant"],
    zones: ["top"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.5, y: 0.16 },
    defaultScale: 1.12,
    price: 42,
    prepHours: 0.2,
  },
  {
    id: "christening-cross",
    kind: "christeningCross",
    label: "Topper pentru botez",
    category: "topper",
    keywords: ["botez", "cross", "christening", "baby", "ceremony"],
    styleTags: ["wedding", "minimalist", "elegant", "childish"],
    zones: ["top"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.5, y: 0.16 },
    defaultScale: 1,
    price: 34,
    prepHours: 0.15,
  },
  {
    id: "teddy-bear",
    kind: "teddyBear",
    label: "Ursulet premium",
    category: "figurine",
    keywords: ["ursuleti", "ursuleti", "teddy", "copii", "baby", "birthday"],
    styleTags: ["childish", "birthday", "romantic"],
    zones: ["top", "front"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.34, y: 0.38 },
    defaultScale: 1.05,
    price: 34,
    prepHours: 0.45,
  },
  {
    id: "figurine-silhouette",
    kind: "figurineSilhouette",
    label: "Figurina sculpturala",
    category: "figurine",
    keywords: ["figurine", "figurina", "silueta", "theme", "custom"],
    styleTags: ["luxury", "modern", "birthday", "wedding"],
    zones: ["top", "front"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.62, y: 0.3 },
    defaultScale: 1.02,
    price: 40,
    prepHours: 0.55,
  },
  {
    id: "kids-crown",
    kind: "kidsCrown",
    label: "Tema pentru copii",
    category: "figurine",
    keywords: ["copii", "kids", "crown", "birthday", "theme"],
    styleTags: ["childish", "birthday", "luxury"],
    zones: ["top"],
    defaultZone: "top",
    defaultTierBias: "top",
    defaultPosition: { x: 0.52, y: 0.22 },
    defaultScale: 1.02,
    price: 30,
    prepHours: 0.3,
  },
];

const CATEGORY_ORDER = [
  { id: "all", label: "Toate" },
  { id: "decoratiuni", label: "Decoratiuni" },
  { id: "topper", label: "Toppere" },
  { id: "lumanari", label: "Lumanari" },
  { id: "figurine", label: "Figurine" },
];

const ELEMENT_COLOR_SWATCHES = [
  "#f7eee5",
  "#f4d9e7",
  "#f2d6cb",
  "#e9ecef",
  "#efe1c2",
  "#b97e5f",
  "#b6455c",
  "#5f7f53",
  "#8ba6d8",
  "#7f6ac9",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildElementId() {
  return `decor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveTierIndex(definition, tierCount, preferredTierIndex) {
  if (Number.isInteger(preferredTierIndex)) {
    return clamp(preferredTierIndex, 0, Math.max(0, tierCount - 1));
  }

  if (definition.defaultTierBias === "bottom") {
    return Math.max(0, tierCount - 1);
  }

  if (definition.defaultTierBias === "middle") {
    return tierCount > 2 ? 1 : Math.max(0, tierCount - 1);
  }

  return 0;
}

export function getDecorationLibrary() {
  return DECORATION_LIBRARY;
}

export function getDecorationLibraryItem(id = "") {
  return DECORATION_LIBRARY.find((item) => item.id === id) || null;
}

export function getDecorationCategories() {
  return CATEGORY_ORDER;
}

export function getDecorationColorSwatches() {
  return ELEMENT_COLOR_SWATCHES;
}

export function searchDecorationLibrary({ query = "", category = "all", style = "" } = {}) {
  const normalizedQuery = normalizeText(query);
  const normalizedStyle = normalizeText(style);

  return DECORATION_LIBRARY.filter((item) => {
    if (category !== "all" && item.category !== category) {
      return false;
    }

    if (
      normalizedStyle &&
      !item.styleTags.some((entry) => normalizeText(entry) === normalizedStyle)
    ) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      item.label,
      item.category,
      ...(Array.isArray(item.keywords) ? item.keywords : []),
      ...(Array.isArray(item.styleTags) ? item.styleTags : []),
    ]
      .map((entry) => normalizeText(entry))
      .join(" ");

    return haystack.includes(normalizedQuery);
  });
}

export function createDecorationElement(
  definitionId,
  {
    tierCount = 1,
    preferredTierIndex = null,
    preferredZone = "",
    preferredTint = "",
    order = 0,
  } = {}
) {
  const definition = getDecorationLibraryItem(definitionId);
  if (!definition) return null;

  const tierIndex = resolveTierIndex(definition, Math.max(1, Number(tierCount) || 1), preferredTierIndex);
  const zone = definition.zones.includes(preferredZone) ? preferredZone : definition.defaultZone;

  return {
    id: buildElementId(),
    definitionId: definition.id,
    tierIndex,
    zone,
    x: clamp(Number(definition.defaultPosition?.x ?? 0.5), 0.06, 0.94),
    y: clamp(Number(definition.defaultPosition?.y ?? 0.5), 0.08, 0.92),
    scale: clamp(Number(definition.defaultScale || 1), 0.45, 2.4),
    rotation: Number(definition.defaultRotation || 0),
    opacity: 1,
    tint: String(preferredTint || ""),
    zIndex: Number(order) || 0,
  };
}

export function duplicateDecorationElement(element, order = 0) {
  if (!element || typeof element !== "object") return null;

  return {
    ...element,
    id: buildElementId(),
    x: clamp(Number(element.x || 0.5) + 0.06, 0.06, 0.94),
    y: clamp(Number(element.y || 0.5) + 0.04, 0.08, 0.92),
    zIndex: Number(order) || 0,
  };
}

export function normalizeDecorationElements(elements = [], tierCount = 1) {
  const safeTierCount = Math.max(1, Number(tierCount) || 1);

  return (Array.isArray(elements) ? elements : [])
    .map((item, index) => {
      const definition = getDecorationLibraryItem(item?.definitionId || item?.type || "");
      if (!definition) return null;

      const zone = definition.zones.includes(item?.zone) ? item.zone : definition.defaultZone;

      return {
        id: String(item?.id || buildElementId()),
        definitionId: definition.id,
        tierIndex: clamp(Number(item?.tierIndex ?? 0), 0, safeTierCount - 1),
        zone,
        x: clamp(Number(item?.x ?? definition.defaultPosition?.x ?? 0.5), 0.06, 0.94),
        y: clamp(Number(item?.y ?? definition.defaultPosition?.y ?? 0.5), 0.08, 0.92),
        scale: clamp(Number(item?.scale ?? definition.defaultScale ?? 1), 0.45, 2.4),
        rotation: Number(item?.rotation || 0),
        opacity: clamp(Number(item?.opacity ?? 1), 0.35, 1),
        tint: String(item?.tint || ""),
        zIndex: Number(item?.zIndex ?? index),
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number(left.zIndex || 0) - Number(right.zIndex || 0))
    .map((item, index) => ({ ...item, zIndex: index }));
}

export function summarizeDecorationElements(elements = []) {
  const counts = new Map();

  normalizeDecorationElements(elements).forEach((item) => {
    const definition = getDecorationLibraryItem(item.definitionId);
    if (!definition) return;
    counts.set(definition.label, (counts.get(definition.label) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => `${count}x ${label}`)
    .join(", ");
}

export function estimateDecorationWorkload(elements = []) {
  return normalizeDecorationElements(elements).reduce(
    (totals, item) => {
      const definition = getDecorationLibraryItem(item.definitionId);
      if (!definition) return totals;

      const scaleFactor = clamp(Number(item.scale || 1), 0.75, 1.5);
      return {
        price: totals.price + Math.round((definition.price || 0) * scaleFactor),
        prepHours: Number((totals.prepHours + (definition.prepHours || 0) * scaleFactor).toFixed(1)),
      };
    },
    { price: 0, prepHours: 0 }
  );
}

export function countDecorationsByCategory(elements = []) {
  const counts = {
    all: 0,
    decoratiuni: 0,
    topper: 0,
    lumanari: 0,
    figurine: 0,
  };

  normalizeDecorationElements(elements).forEach((item) => {
    const definition = getDecorationLibraryItem(item.definitionId);
    if (!definition) return;
    counts.all += 1;
    counts[definition.category] = (counts[definition.category] || 0) + 1;
  });

  return counts;
}
