const OPTION_LABELS = {
  tiers: "Etaje",
  heightProfile: "Profil inaltime",
  blat: "Blat",
  crema: "Crema",
  umplutura: "Umplutura",
  decor: "Stil exterior",
  topping: "Topping",
  culoare: "Culoare",
  font: "Font mesaj",
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

  appendField(structure, OPTION_LABELS.tiers, options.tiers);
  appendField(structure, OPTION_LABELS.heightProfile, options.heightProfile);

  appendField(interior, OPTION_LABELS.blat, options.blat);
  appendField(interior, OPTION_LABELS.crema, options.crema);
  appendField(interior, OPTION_LABELS.umplutura, options.umplutura);

  appendField(exterior, OPTION_LABELS.decor, options.decor);
  appendField(exterior, OPTION_LABELS.topping, options.topping);
  appendField(exterior, OPTION_LABELS.culoare, options.culoare);
  appendField(exterior, OPTION_LABELS.font, options.font);

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

  return sections;
}

export function buildCustomOrderPreviewImages(order) {
  const options = order?.options && typeof order.options === "object" ? order.options : {};
  const images = [
    { id: "constructor", label: "Preview 2D", url: normalizeText(order?.imagine) },
    { id: "ai", label: "Preview AI", url: normalizeText(options.aiPreviewUrl) },
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
