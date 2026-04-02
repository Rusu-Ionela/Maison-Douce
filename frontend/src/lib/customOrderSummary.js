import { findCakeOption, findCakeStructureOption } from "./cakePreview2D";

const OPTION_LABELS = {
  shape: "Forma",
  size: "Dimensiune",
  tiers: "Etaje",
  heightProfile: "Profil inaltime",
  estimatedServings: "Portii estimate",
  estimatedWeightKg: "Greutate estimata",
  blat: "Blat",
  crema: "Crema",
  umplutura: "Umplutura",
  decor: "Stil exterior",
  topping: "Topping",
  culoare: "Culoare",
  font: "Font mesaj",
  decorationSummary: "Decor liber",
};

const STATUS_META = {
  noua: {
    label: "Noua",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  in_discutie: {
    label: "In discutie",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  aprobata: {
    label: "Aprobata",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  comanda_generata: {
    label: "Comanda generata",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  respinsa: {
    label: "Respinsa",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function appendField(list, label, value) {
  const normalized = normalizeText(value);
  if (!normalized) return;
  list.push({ label, value: normalized });
}

function resolveStructureValue(section, value) {
  return findCakeStructureOption(section, value)?.label || normalizeText(value);
}

function resolveOptionValue(section, value) {
  return findCakeOption(section, value)?.label || normalizeText(value);
}

export function getCustomOrderOptionLabel(field, value) {
  switch (field) {
    case "shape":
      return resolveStructureValue("shapes", value);
    case "size":
      return resolveStructureValue("sizes", value);
    case "tiers":
      return resolveStructureValue("tiers", value);
    case "heightProfile":
      return resolveStructureValue("heightProfiles", value);
    case "blat":
      return resolveOptionValue("blat", value);
    case "crema":
      return resolveOptionValue("crema", value);
    case "umplutura":
      return resolveOptionValue("umplutura", value);
    case "decor":
      return resolveOptionValue("decor", value);
    case "topping":
      return resolveOptionValue("topping", value);
    case "culoare":
      return resolveOptionValue("culori", value);
    case "font":
      return resolveOptionValue("font", value);
    default:
      return normalizeText(value);
  }
}

export function getCustomOrderDecorationSummary(options = {}) {
  const summary = normalizeText(options?.decorationSummary);
  if (summary) return summary;

  const count = Array.isArray(options?.decorations) ? options.decorations.length : 0;
  return count ? `${count} elemente decorative` : "";
}

export function buildCustomOrderHighlights(options = {}) {
  const decorationSummary = getCustomOrderDecorationSummary(options);
  const decorationCount = Array.isArray(options?.decorations) ? options.decorations.length : 0;

  return [
    getCustomOrderOptionLabel("shape", options.shape)
      ? `forma ${getCustomOrderOptionLabel("shape", options.shape)}`
      : "",
    getCustomOrderOptionLabel("size", options.size)
      ? `dimensiune ${getCustomOrderOptionLabel("size", options.size)}`
      : "",
    getCustomOrderOptionLabel("tiers", options.tiers),
    getCustomOrderOptionLabel("heightProfile", options.heightProfile)
      ? `profil ${getCustomOrderOptionLabel("heightProfile", options.heightProfile).toLowerCase()}`
      : "",
    getCustomOrderOptionLabel("blat", options.blat)
      ? `blat ${getCustomOrderOptionLabel("blat", options.blat)}`
      : "",
    getCustomOrderOptionLabel("crema", options.crema)
      ? `crema ${getCustomOrderOptionLabel("crema", options.crema)}`
      : "",
    getCustomOrderOptionLabel("umplutura", options.umplutura)
      ? `umplutura ${getCustomOrderOptionLabel("umplutura", options.umplutura)}`
      : "",
    decorationSummary ? (decorationCount ? `${decorationCount} decoruri libere` : "decor liber") : "",
  ].filter(Boolean);
}

export function getCustomOrderStatusMeta(status = "") {
  return STATUS_META[normalizeText(status)] || {
    label: normalizeText(status) || "Noua",
    className: "border-stone-200 bg-stone-50 text-stone-700",
  };
}

export function buildCustomOrderSections(order) {
  const options = order?.options && typeof order.options === "object" ? order.options : {};
  const structure = [];
  const interior = [];
  const exterior = [];
  const inspiration = [];
  const progress = [];

  appendField(structure, OPTION_LABELS.shape, getCustomOrderOptionLabel("shape", options.shape));
  appendField(structure, OPTION_LABELS.size, getCustomOrderOptionLabel("size", options.size));
  appendField(structure, OPTION_LABELS.tiers, getCustomOrderOptionLabel("tiers", options.tiers));
  appendField(
    structure,
    OPTION_LABELS.heightProfile,
    getCustomOrderOptionLabel("heightProfile", options.heightProfile)
  );
  appendField(structure, OPTION_LABELS.estimatedServings, options.estimatedServings);
  appendField(structure, OPTION_LABELS.estimatedWeightKg, options.estimatedWeightKg);

  appendField(interior, OPTION_LABELS.blat, getCustomOrderOptionLabel("blat", options.blat));
  appendField(interior, OPTION_LABELS.crema, getCustomOrderOptionLabel("crema", options.crema));
  appendField(
    interior,
    OPTION_LABELS.umplutura,
    getCustomOrderOptionLabel("umplutura", options.umplutura)
  );

  appendField(exterior, OPTION_LABELS.decor, getCustomOrderOptionLabel("decor", options.decor));
  appendField(
    exterior,
    OPTION_LABELS.topping,
    getCustomOrderOptionLabel("topping", options.topping)
  );
  appendField(
    exterior,
    OPTION_LABELS.culoare,
    getCustomOrderOptionLabel("culoare", options.culoare)
  );
  appendField(exterior, OPTION_LABELS.font, getCustomOrderOptionLabel("font", options.font));
  appendField(
    exterior,
    OPTION_LABELS.decorationSummary,
    getCustomOrderDecorationSummary(options)
  );

  const sections = [];
  if (structure.length > 0) sections.push({ id: "structure", title: "Structura", items: structure });
  if (interior.length > 0) sections.push({ id: "interior", title: "Interior", items: interior });
  if (exterior.length > 0) sections.push({ id: "exterior", title: "Exterior", items: exterior });
  if (normalizeText(order?.preferinte)) {
    sections.push({
      id: "request",
      title: "Cerinta client",
      items: [{ label: "Mesaj", value: normalizeText(order.preferinte) }],
    });
  }
  if (normalizeText(options.aiDecorRequest) || normalizeText(options.aiPrompt)) {
    sections.push({
      id: "ai",
      title: "AI decor",
      items: [
        ...(normalizeText(options.aiDecorRequest)
          ? [{ label: "Cerere libera", value: normalizeText(options.aiDecorRequest) }]
          : []),
        ...(normalizeText(options.aiPrompt)
          ? [{ label: "Prompt folosit", value: normalizeText(options.aiPrompt) }]
          : []),
      ],
    });
  }
  if (Array.isArray(options.inspirationImages)) {
    options.inspirationImages.forEach((item, index) => {
      appendField(
        inspiration,
        `Referinta ${index + 1}`,
        normalizeText(item?.label || item?.note || item?.name || item?.url)
      );
    });
  }
  if (inspiration.length > 0) {
    sections.push({
      id: "inspiration",
      title: "Imagini inspiratie",
      items: inspiration,
    });
  }
  if (Array.isArray(order?.statusHistory)) {
    order.statusHistory
      .slice(-3)
      .forEach((entry, index) => {
        appendField(
          progress,
          `Actualizare ${index + 1}`,
          [normalizeText(entry?.status), normalizeText(entry?.note)].filter(Boolean).join(" • ")
        );
      });
  }
  if (progress.length > 0) {
    sections.push({
      id: "progress",
      title: "Istoric",
      items: progress,
    });
  }

  return sections;
}

export function buildCustomOrderPreviewImages(order) {
  const options = order?.options && typeof order.options === "object" ? order.options : {};
  const images = [
    { id: "constructor", label: "Preview 2D", url: normalizeText(order?.imagine) },
    { id: "ai", label: "Preview AI", url: normalizeText(options.aiPreviewUrl) },
    ...(Array.isArray(options.aiPreviewVariants)
      ? options.aiPreviewVariants.map((item, index) => ({
          id: `ai-variant-${index}`,
          label: `Varianta AI ${index + 1}`,
          url: normalizeText(item?.imageUrl || item?.url),
        }))
      : []),
    ...(Array.isArray(options.inspirationImages)
      ? options.inspirationImages.map((item, index) => ({
          id: `reference-${index}`,
          label: `Inspiratie ${index + 1}`,
          url: normalizeText(item?.url || item?.previewUrl),
        }))
      : []),
  ].filter((item) => item.url);

  return images.filter(
    (item, index, list) => list.findIndex((candidate) => candidate.url === item.url) === index
  );
}

export function formatCustomOrderDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
