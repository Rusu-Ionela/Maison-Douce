const SPONGE_PRESETS = {
  vanilie: {
    fill: "#d7a460",
    crumb: "#f5d699",
    crumbDark: "#b97b42",
    edge: "#b2763e",
  },
  ciocolata: {
    fill: "#8f5a39",
    crumb: "#b67a52",
    crumbDark: "#6a3f28",
    edge: "#5b3420",
  },
  redvelvet: {
    fill: "#b85262",
    crumb: "#da7f8e",
    crumbDark: "#8f3645",
    edge: "#7a2634",
  },
};

const CREAM_PRESETS = {
  vanilie: {
    fill: "#f7efdf",
    highlight: "#fffaf2",
    shadow: "#ddcdb8",
    accent: "#f2e5cf",
  },
  pistachio: {
    fill: "#d9e7c0",
    highlight: "#eef5dc",
    shadow: "#aac081",
    accent: "#c8d8ab",
  },
  fructe: {
    fill: "#efcade",
    highlight: "#f9e8f1",
    shadow: "#cb8ca7",
    accent: "#e6b5cd",
  },
};

const FILLING_PRESETS = {
  capsuni: {
    fill: "#d94f63",
    accent: "#f58a9b",
    speck: "#a72b3f",
    texture: "jam",
  },
  "fructe-padure": {
    fill: "#7c3560",
    accent: "#b3678d",
    speck: "#552241",
    texture: "berry",
  },
  oreo: {
    fill: "#ddd9e2",
    accent: "#f5f2f7",
    speck: "#63585f",
    texture: "cookie",
  },
};

const DECOR_PRESETS = {
  minimal: {
    shellThickness: 18,
    topRows: 1,
    bottomRows: 1,
    swagRows: 0,
    sideBands: 1,
    flowerClusters: 0,
    pipingScale: 0.8,
  },
  lambeth: {
    shellThickness: 22,
    topRows: 3,
    bottomRows: 3,
    swagRows: 2,
    sideBands: 4,
    flowerClusters: 0,
    pipingScale: 1.15,
  },
  floral: {
    shellThickness: 20,
    topRows: 1,
    bottomRows: 1,
    swagRows: 0,
    sideBands: 2,
    flowerClusters: 3,
    pipingScale: 0.9,
  },
};

const COLOR_PRESETS = {
  "#f6d7c3": {
    label: "Ivoire",
    shell: "#f7eee5",
    shellTop: "#fff8f0",
    shadow: "#ddc5b2",
    accent: "#cfa98d",
    piping: "#fffaf4",
    plaque: "#fff8ef",
    floral: "#e3bac8",
    leaf: "#99aa8b",
    pearl: "#fff8ed",
    chocolate: "#7f543f",
  },
  "#f2c9e5": {
    label: "Rose",
    shell: "#f4d7e8",
    shellTop: "#f9e6f1",
    shadow: "#d8b6ca",
    accent: "#bf6f97",
    piping: "#fff3fa",
    plaque: "#fcecf5",
    floral: "#c8648b",
    leaf: "#94a97d",
    pearl: "#fff6fb",
    chocolate: "#83513e",
  },
  "#e8e2f2": {
    label: "Lavanda",
    shell: "#ece6f7",
    shellTop: "#f5f0fc",
    shadow: "#cac0df",
    accent: "#9c89c7",
    piping: "#faf6ff",
    plaque: "#f7f1fc",
    floral: "#ac8bc7",
    leaf: "#96ab8f",
    pearl: "#faf7ff",
    chocolate: "#775243",
  },
  "#f7e6c4": {
    label: "Champagne",
    shell: "#f7eed6",
    shellTop: "#fff7e8",
    shadow: "#decca8",
    accent: "#c4a269",
    piping: "#fffaf1",
    plaque: "#fff8ea",
    floral: "#d7b384",
    leaf: "#99aa82",
    pearl: "#fff9ee",
    chocolate: "#815641",
  },
};

const FONT_PRESETS = {
  Georgia: {
    label: "Elegant Serif",
    fontFamily: "Georgia",
    fontStyle: "italic",
  },
  Garamond: {
    label: "Classic",
    fontFamily: "Garamond",
    fontStyle: "normal",
  },
  "Times New Roman": {
    label: "Formal",
    fontFamily: "Times New Roman",
    fontStyle: "bold",
  },
};

const TOPPING_PRESETS = {
  perle: {
    accent: "#f5ecdd",
    shadow: "#d7c1aa",
  },
  fructe: {
    accent: "#d74c63",
    berryDark: "#7f355e",
    leaf: "#76945d",
  },
  ciocolata: {
    accent: "#7b513e",
    dark: "#5e3927",
    glaze: "#9a6650",
  },
};

export const CAKE_OPTIONS = {
  blat: [
    {
      id: "vanilie",
      label: "Vanilie",
      price: 80,
      color: "#e5c28c",
      preview: SPONGE_PRESETS.vanilie,
    },
    {
      id: "ciocolata",
      label: "Ciocolată",
      price: 90,
      color: "#8f5a39",
      preview: SPONGE_PRESETS.ciocolata,
    },
    {
      id: "redvelvet",
      label: "Red Velvet",
      price: 100,
      color: "#c6616f",
      preview: SPONGE_PRESETS.redvelvet,
    },
  ],
  crema: [
    {
      id: "vanilie",
      label: "Vanilie",
      price: 60,
      color: "#f7efdf",
      preview: CREAM_PRESETS.vanilie,
    },
    {
      id: "pistachio",
      label: "Pistachio",
      price: 80,
      color: "#d9e7c0",
      preview: CREAM_PRESETS.pistachio,
    },
    {
      id: "fructe",
      label: "Fructe",
      price: 75,
      color: "#efcade",
      preview: CREAM_PRESETS.fructe,
    },
  ],
  umplutura: [
    {
      id: "capsuni",
      label: "Căpșuni",
      price: 40,
      preview: FILLING_PRESETS.capsuni,
    },
    {
      id: "fructe-padure",
      label: "Fructe de pădure",
      price: 45,
      preview: FILLING_PRESETS["fructe-padure"],
    },
    {
      id: "oreo",
      label: "Oreo",
      price: 35,
      preview: FILLING_PRESETS.oreo,
    },
  ],
  decor: [
    {
      id: "minimal",
      label: "Minimal",
      price: 30,
      color: "#f4d6df",
      preview: DECOR_PRESETS.minimal,
    },
    {
      id: "lambeth",
      label: "Lambeth",
      price: 70,
      color: "#f2c5d8",
      preview: DECOR_PRESETS.lambeth,
    },
    {
      id: "floral",
      label: "Floral",
      price: 60,
      color: "#f3d7e6",
      preview: DECOR_PRESETS.floral,
    },
  ],
  topping: [
    {
      id: "perle",
      label: "Perle",
      price: 20,
      preview: TOPPING_PRESETS.perle,
    },
    {
      id: "fructe",
      label: "Fructe proaspete",
      price: 30,
      preview: TOPPING_PRESETS.fructe,
    },
    {
      id: "ciocolata",
      label: "Ciocolată",
      price: 25,
      preview: TOPPING_PRESETS.ciocolata,
    },
  ],
  culori: [
    {
      id: "#f6d7c3",
      label: "Ivoire",
      preview: COLOR_PRESETS["#f6d7c3"],
    },
    {
      id: "#f2c9e5",
      label: "Rose",
      preview: COLOR_PRESETS["#f2c9e5"],
    },
    {
      id: "#e8e2f2",
      label: "Lavandă",
      preview: COLOR_PRESETS["#e8e2f2"],
    },
    {
      id: "#f7e6c4",
      label: "Champagne",
      preview: COLOR_PRESETS["#f7e6c4"],
    },
  ],
  font: [
    {
      id: "Georgia",
      label: "Elegant Serif",
      preview: FONT_PRESETS.Georgia,
    },
    {
      id: "Garamond",
      label: "Classic",
      preview: FONT_PRESETS.Garamond,
    },
    {
      id: "Times New Roman",
      label: "Formal",
      preview: FONT_PRESETS["Times New Roman"],
    },
  ],
};

export const CAKE_PRESETS = [
  {
    id: "classic",
    label: "Clasic elegant",
    description: "Vanilie luminoasă, umplutură de căpșuni și finisaj minimalist ivoire.",
    values: {
      tiers: 1,
      heightProfile: "balanced",
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
    label: "Romantic floral",
    description: "Red Velvet, cremă de fructe și accente rose cu flori elegante.",
    values: {
      tiers: 2,
      heightProfile: "balanced",
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
    label: "Statement Lambeth",
    description: "Ciocolată, pistachio, Oreo și piping vintage în tonuri lavandă.",
    values: {
      tiers: 2,
      heightProfile: "tall",
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

export const CAKE_STRUCTURE_OPTIONS = {
  tiers: [
    {
      id: 1,
      label: "1 etaj",
      description: "Compact si usor de comandat.",
      servings: "8-14 portii",
      minServings: 8,
      maxServings: 14,
      price: 0,
      prepHours: 0,
    },
    {
      id: 2,
      label: "2 etaje",
      description: "Mai festiv, cu silueta eleganta.",
      servings: "18-28 portii",
      minServings: 18,
      maxServings: 28,
      price: 220,
      prepHours: 10,
    },
    {
      id: 3,
      label: "3 etaje",
      description: "Impact vizual pentru evenimente mari.",
      servings: "32-48 portii",
      minServings: 32,
      maxServings: 48,
      price: 420,
      prepHours: 18,
    },
  ],
  heightProfiles: [
    {
      id: "compact",
      label: "Scund",
      description: "Aspect delicat, straturi mai joase.",
      detail: "Mai usor de portionat si transportat.",
      bodyScale: 0.88,
      price: 0,
      prepHours: 0,
    },
    {
      id: "balanced",
      label: "Echilibrat",
      description: "Proportii clasice de atelier.",
      detail: "Recomandat pentru cele mai multe comenzi.",
      bodyScale: 1,
      price: 40,
      prepHours: 2,
    },
    {
      id: "tall",
      label: "Inalt",
      description: "Mai mult volum si o sectiune bogata.",
      detail: "Potrivit pentru un efect premium in poze.",
      bodyScale: 1.14,
      price: 95,
      prepHours: 6,
    },
  ],
};

export const BASE_PRICE = 250;
export const BASE_PREP_HOURS = 24;
export const PREVIEW_MODES = [
  {
    id: "exterior",
    label: "Exterior",
    description: "Accent pe frosting, stil, culoare, topping și mesajul final.",
    shortLabel: "Exterior final",
  },
  {
    id: "section",
    label: "Secțiune",
    description: "Accent pe blat, cremă, umplutură și structura internă.",
    shortLabel: "Interiorul tortului",
  },
];

export const DEFAULT_CAKE_OPTIONS = {
  blat: CAKE_OPTIONS.blat[0].id,
  crema: CAKE_OPTIONS.crema[0].id,
  umplutura: CAKE_OPTIONS.umplutura[0].id,
  decor: CAKE_OPTIONS.decor[0].id,
  topping: CAKE_OPTIONS.topping[0].id,
  culoare: CAKE_OPTIONS.culori[0].id,
  font: CAKE_OPTIONS.font[0].id,
};

export const DEFAULT_CAKE_STRUCTURE = {
  tiers: CAKE_STRUCTURE_OPTIONS.tiers[0].id,
  heightProfile: CAKE_STRUCTURE_OPTIONS.heightProfiles[1].id,
};

function normalizeCakeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const CATALOG_FILLING_PREFILLS = [
  {
    keywords: ["crema de vanilie", "vanilie"],
    values: {
      crema: "vanilie",
      umplutura: "capsuni",
      decor: "minimal",
      topping: "perle",
      culoare: "#f6d7c3",
      font: "Georgia",
    },
    summary:
      "Am preselectat o compozitie delicata cu crema de vanilie si umplutura de capsuni.",
  },
  {
    keywords: ["ganache de ciocolata", "ganache", "ciocolata"],
    values: {
      blat: "ciocolata",
      crema: "vanilie",
      umplutura: "oreo",
      decor: "minimal",
      topping: "ciocolata",
      culoare: "#f7e6c4",
      font: "Times New Roman",
    },
    summary:
      "Am preselectat cea mai apropiata compozitie intensa disponibila in constructor pentru un profil de ciocolata.",
  },
  {
    keywords: ["crema mascarpone cu fructe", "mascarpone", "fructe"],
    values: {
      blat: "vanilie",
      crema: "fructe",
      umplutura: "fructe-padure",
      decor: "floral",
      topping: "fructe",
      culoare: "#f2c9e5",
      font: "Garamond",
    },
    summary:
      "Am preselectat o compozitie proaspata cu crema fructata si umplutura de fructe de padure.",
  },
  {
    keywords: ["caramel sarat", "caramel"],
    values: {
      blat: "ciocolata",
      crema: "vanilie",
      umplutura: "oreo",
      decor: "minimal",
      topping: "ciocolata",
      culoare: "#f7e6c4",
      font: "Georgia",
    },
    summary:
      "Am preselectat cea mai apropiata combinatie disponibila pentru un profil de caramel si contrast intens.",
  },
  {
    keywords: ["mousse de ciocolata", "mousse"],
    values: {
      blat: "ciocolata",
      crema: "vanilie",
      umplutura: "oreo",
      decor: "minimal",
      topping: "ciocolata",
      culoare: "#f7e6c4",
      font: "Times New Roman",
    },
    summary:
      "Am preselectat o combinatie cu accent de cacao si interior intens, potrivita pentru mousse de ciocolata.",
  },
  {
    keywords: ["crema de fistic", "fistic"],
    values: {
      blat: "vanilie",
      crema: "pistachio",
      umplutura: "fructe-padure",
      decor: "floral",
      topping: "fructe",
      culoare: "#f6d7c3",
      font: "Garamond",
    },
    summary:
      "Am preselectat crema de fistic si o umplutura fructata care se potriveste bine in preview si in compozitie.",
  },
  {
    keywords: ["crema de cocos tip raffaello", "raffaello", "cocos"],
    values: {
      blat: "vanilie",
      crema: "vanilie",
      umplutura: "oreo",
      decor: "minimal",
      topping: "perle",
      culoare: "#f6d7c3",
      font: "Georgia",
    },
    summary:
      "Am preselectat o compozitie luminoasa si delicata, apropiata de profilul Raffaello.",
  },
  {
    keywords: ["crema de lamaie", "lamaie"],
    values: {
      blat: "vanilie",
      crema: "vanilie",
      umplutura: "capsuni",
      decor: "minimal",
      topping: "fructe",
      culoare: "#f6d7c3",
      font: "Georgia",
    },
    summary:
      "Am preselectat o compozitie fresh si luminoasa, apropiata de profilul de lamaie.",
  },
  {
    keywords: ["crema de cafea", "cafea"],
    values: {
      blat: "ciocolata",
      crema: "vanilie",
      umplutura: "oreo",
      decor: "minimal",
      topping: "ciocolata",
      culoare: "#f7e6c4",
      font: "Times New Roman",
    },
    summary:
      "Am preselectat o combinatie mai intensa, apropiata de profilul de cafea si ciocolata.",
  },
  {
    keywords: ["crema de arahide tip snickers", "snickers", "arahide"],
    values: {
      blat: "ciocolata",
      crema: "vanilie",
      umplutura: "oreo",
      decor: "minimal",
      topping: "ciocolata",
      culoare: "#f7e6c4",
      font: "Times New Roman",
    },
    summary:
      "Am preselectat o compozitie apropiata de profilul Snickers, cu blat de ciocolata si accent intens.",
  },
];

const CAKE_PRODUCT_PREFILLS = [
  {
    slugs: ["red-velvet"],
    values: {
      blat: "redvelvet",
      crema: "vanilie",
      umplutura: "fructe-padure",
      decor: "floral",
      topping: "fructe",
      culoare: "#f2c9e5",
      font: "Garamond",
    },
    summary:
      "Am pornit de la un profil Red Velvet si am preselectat o compozitie romantica, cu interior fructat si finisaj floral.",
  },
  {
    slugs: ["medovik", "napoleon", "diplomat"],
    values: {
      blat: "vanilie",
      crema: "vanilie",
      umplutura: "capsuni",
      decor: "minimal",
      topping: "perle",
      culoare: "#f7e6c4",
      font: "Georgia",
    },
    summary:
      "Am preselectat o compozitie luminoasa si clasica, potrivita pentru torturi fine de inspiratie europeana.",
  },
  {
    slugs: ["trio-de-ciocolata", "ferrero", "oreo", "ciocolata-belgiana"],
    values: {
      blat: "ciocolata",
      crema: "vanilie",
      umplutura: "oreo",
      decor: "minimal",
      topping: "ciocolata",
      culoare: "#f7e6c4",
      font: "Times New Roman",
    },
    summary:
      "Am preselectat o compozitie intensa cu blat de ciocolata si interior bogat, apropiata de profilul premium al tortului ales.",
  },
  {
    slugs: ["vanilie-fructe-de-padure", "capsuni-si-crema-de-vanilie", "mango-pasiune"],
    values: {
      blat: "vanilie",
      crema: "fructe",
      umplutura: "fructe-padure",
      decor: "floral",
      topping: "fructe",
      culoare: "#f2c9e5",
      font: "Garamond",
    },
    summary:
      "Am preselectat o compozitie proaspata si feminina, cu accent pe fructe si o sectiune usor de citit in preview.",
  },
  {
    slugs: ["raffaello"],
    values: {
      blat: "vanilie",
      crema: "vanilie",
      umplutura: "oreo",
      decor: "minimal",
      topping: "perle",
      culoare: "#f6d7c3",
      font: "Georgia",
    },
    summary:
      "Am preselectat o compozitie delicata si luminoasa, apropiata de profilul Raffaello si potrivita pentru un finisaj curat.",
  },
  {
    slugs: ["snickers", "caramel-sarat"],
    values: {
      blat: "ciocolata",
      crema: "vanilie",
      umplutura: "oreo",
      decor: "minimal",
      topping: "ciocolata",
      culoare: "#f7e6c4",
      font: "Times New Roman",
    },
    summary:
      "Am preselectat o compozitie intensa, cu blat de ciocolata si accente potrivite pentru un profil de caramel, cacao si contraste puternice.",
  },
  {
    slugs: ["fistic-zmeura"],
    values: {
      blat: "vanilie",
      crema: "pistachio",
      umplutura: "fructe-padure",
      decor: "floral",
      topping: "fructe",
      culoare: "#f6d7c3",
      font: "Garamond",
    },
    summary:
      "Am preselectat una dintre cele mai potrivite combinatii premium din constructor pentru un profil de fistic si zmeura.",
  },
  {
    slugs: ["nunta-elegant"],
    values: {
      blat: "vanilie",
      crema: "vanilie",
      umplutura: "fructe-padure",
      decor: "floral",
      topping: "perle",
      culoare: "#f6d7c3",
      font: "Garamond",
    },
    summary:
      "Am preselectat o compozitie eleganta si echilibrata, cu finisaj luminos si directie potrivita pentru un tort de ceremonie.",
  },
];

const SECTION_PRIORITY_FIELDS = new Set(["blat", "crema", "umplutura"]);
const EXTERIOR_PRIORITY_FIELDS = new Set(["decor", "topping", "culoare", "font", "mesaj"]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(left, right, weight = 0.5) {
  const amount = clamp(weight, 0, 1);
  const start = hexToRgb(left);
  const end = hexToRgb(right);
  return rgbToHex({
    r: start.r + (end.r - start.r) * amount,
    g: start.g + (end.g - start.g) * amount,
    b: start.b + (end.b - start.b) * amount,
  });
}

function lighten(hex, amount = 0.18) {
  return mixHex(hex, "#ffffff", amount);
}

function darken(hex, amount = 0.16) {
  return mixHex(hex, "#000000", amount);
}

function withAlpha(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function buildDistributedDots({
  count,
  x,
  y,
  width,
  height,
  minRadius,
  maxRadius,
  colors,
  seed = 1,
  opacity = 1,
}) {
  return Array.from({ length: count }, (_, index) => {
    const xFactor = ((index * 37 + seed * 13) % 100) / 100;
    const yFactor = ((index * 29 + seed * 17) % 100) / 100;
    const radiusFactor = ((index * 19 + seed * 7) % 100) / 100;
    return {
      x: x + width * (0.08 + xFactor * 0.84),
      y: y + height * (0.18 + yFactor * 0.62),
      radius: minRadius + (maxRadius - minRadius) * radiusFactor,
      fill: colors[index % colors.length],
      opacity,
    };
  });
}

function buildRibbonLines({ x, y, width, height, count, stroke, seed = 1 }) {
  return Array.from({ length: count }, (_, index) => {
    const level = y + height * (0.28 + index * 0.22);
    const wave = Math.max(2, height * 0.12);
    return {
      stroke,
      opacity: 0.7 - index * 0.12,
      strokeWidth: Math.max(1.4, height * 0.07),
      points: [
        x + width * 0.06,
        level,
        x + width * 0.22,
        level - wave,
        x + width * 0.42,
        level + wave * ((seed + index) % 2 === 0 ? 1 : -1),
        x + width * 0.62,
        level - wave * 0.7,
        x + width * 0.82,
        level + wave * 0.5,
        x + width * 0.94,
        level,
      ],
    };
  });
}

function buildBeadRow({ startX, endX, y, count, radius, fill, shadow }) {
  if (count <= 0) return [];
  const step = (endX - startX) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, index) => ({
    x: startX + step * index,
    y,
    radius,
    fill,
    shadow,
  }));
}

function buildSwags({ startX, endX, y, count, drop, stroke, strokeWidth }) {
  return Array.from({ length: count }, (_, index) => {
    const segmentStart = startX + ((endX - startX) / count) * index;
    const segmentEnd = startX + ((endX - startX) / count) * (index + 1);
    const mid = (segmentStart + segmentEnd) / 2;
    return {
      stroke,
      strokeWidth,
      points: [segmentStart, y, mid, y + drop, segmentEnd, y],
    };
  });
}

function buildFlowerCluster({ x, y, size, petalColor, accentColor, leafColor, rotation = 0 }) {
  const petals = Array.from({ length: 5 }, (_, index) => ({
    x: x + Math.cos(((Math.PI * 2) / 5) * index + rotation) * size * 0.95,
    y: y + Math.sin(((Math.PI * 2) / 5) * index + rotation) * size * 0.75,
    radiusX: size * 0.68,
    radiusY: size * 0.42,
    rotation: (rotation * 180) / Math.PI + index * 72,
    fill: petalColor,
  }));
  const leaves = [
    {
      x: x - size * 1.05,
      y: y + size * 0.55,
      radiusX: size * 0.55,
      radiusY: size * 0.24,
      rotation: -26,
      fill: leafColor,
    },
    {
      x: x + size * 1.08,
      y: y + size * 0.48,
      radiusX: size * 0.55,
      radiusY: size * 0.24,
      rotation: 28,
      fill: leafColor,
    },
  ];

  return {
    petals,
    center: {
      x,
      y,
      radius: size * 0.34,
      fill: accentColor,
    },
    leaves,
  };
}

function buildFruitCluster({ x, y, scale, berry, berryDark, leaf }) {
  return {
    berries: [
      { x, y, radius: scale * 0.44, fill: berry },
      { x: x + scale * 0.48, y: y - scale * 0.22, radius: scale * 0.34, fill: berryDark },
      { x: x + scale * 0.8, y: y + scale * 0.14, radius: scale * 0.3, fill: berry },
      { x: x - scale * 0.42, y: y + scale * 0.1, radius: scale * 0.28, fill: berryDark },
    ],
    leaves: [
      { x: x - scale * 0.62, y: y - scale * 0.46, radiusX: scale * 0.44, radiusY: scale * 0.2, rotation: -28, fill: leaf },
      { x: x + scale * 0.86, y: y - scale * 0.52, radiusX: scale * 0.44, radiusY: scale * 0.2, rotation: 24, fill: leaf },
    ],
  };
}

function buildChocolateDecor({ x, y, scale, accent, dark, glaze }) {
  return {
    shards: [
      {
        points: [x, y, x + scale * 0.42, y - scale * 1.2, x + scale * 0.86, y + scale * 0.1],
        fill: accent,
      },
      {
        points: [x + scale * 0.6, y + scale * 0.32, x + scale * 1.06, y - scale * 0.78, x + scale * 1.42, y + scale * 0.22],
        fill: dark,
      },
    ],
    drizzles: [
      {
        stroke: glaze,
        strokeWidth: Math.max(2, scale * 0.16),
        points: [
          x - scale * 0.6,
          y + scale * 0.6,
          x + scale * 0.18,
          y + scale * 0.12,
          x + scale * 0.9,
          y + scale * 0.64,
          x + scale * 1.62,
          y + scale * 0.16,
        ],
      },
    ],
  };
}

export function findCakeOption(section, optionId) {
  return (CAKE_OPTIONS[section] || []).find((item) => item.id === optionId) || null;
}

export function findCakeStructureOption(section, optionId) {
  return (
    (CAKE_STRUCTURE_OPTIONS[section] || []).find(
      (item) => String(item.id) === String(optionId)
    ) || null
  );
}

export function resolveConstructorPrefillFromFilling(fillingName = "") {
  const normalized = normalizeCakeText(fillingName);
  if (!normalized) return null;

  const matched = CATALOG_FILLING_PREFILLS.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(normalizeCakeText(keyword)))
  );

  if (!matched) return null;

  return {
    sourceLabel: String(fillingName || "").trim(),
    values: matched.values,
    summary: matched.summary,
  };
}

export function resolveConstructorPrefillFromCake(cake) {
  if (!cake) return null;

  const normalizedSlug = normalizeCakeText(cake?.slug || "");
  const normalizedName = normalizeCakeText(cake?.nume || cake?.name || "");
  const matched =
    CAKE_PRODUCT_PREFILLS.find((entry) =>
      entry.slugs.some((slug) => normalizeCakeText(slug) === normalizedSlug)
    ) ||
    CAKE_PRODUCT_PREFILLS.find((entry) =>
      entry.slugs.some((slug) => normalizedName.includes(normalizeCakeText(slug)))
    );

  if (!matched) {
    const fallbackText = normalizeCakeText(
      [
        cake?.nume,
        cake?.descriere,
        cake?.fillingSummary,
        cake?.shortFlavor,
        ...(Array.isArray(cake?.displayTags) ? cake.displayTags : []),
      ].join(" ")
    );

    const inferred =
      (fallbackText.includes("fistic") && CAKE_PRODUCT_PREFILLS.find((entry) => entry.slugs.includes("fistic-zmeura"))) ||
      ((fallbackText.includes("snickers") || fallbackText.includes("caramel")) &&
        CAKE_PRODUCT_PREFILLS.find((entry) => entry.slugs.includes("snickers"))) ||
      ((fallbackText.includes("ciocol") || fallbackText.includes("oreo") || fallbackText.includes("ferrero")) &&
        CAKE_PRODUCT_PREFILLS.find((entry) => entry.slugs.includes("trio-de-ciocolata"))) ||
      ((fallbackText.includes("fruct") || fallbackText.includes("capsuni") || fallbackText.includes("zmeura")) &&
        CAKE_PRODUCT_PREFILLS.find((entry) => entry.slugs.includes("vanilie-fructe-de-padure"))) ||
      ((fallbackText.includes("nunta") || fallbackText.includes("etajat")) &&
        CAKE_PRODUCT_PREFILLS.find((entry) => entry.slugs.includes("nunta-elegant"))) ||
      CAKE_PRODUCT_PREFILLS.find((entry) => entry.slugs.includes("diplomat"));

    if (!inferred) return null;

    return {
      sourceLabel: String(cake?.nume || cake?.name || "tortul selectat").trim(),
      sourceSlug: String(cake?.slug || "").trim(),
      values: inferred.values,
      summary: inferred.summary,
    };
  }

  return {
    sourceLabel: String(cake?.nume || cake?.name || "tortul selectat").trim(),
    sourceSlug: String(cake?.slug || "").trim(),
    values: matched.values,
    summary: matched.summary,
  };
}

export function getRecommendedPreviewModeForField(field) {
  if (SECTION_PRIORITY_FIELDS.has(field)) return "section";
  if (EXTERIOR_PRIORITY_FIELDS.has(field)) return "exterior";
  if (field === "tiers" || field === "heightProfile" || field === "structure") {
    return "exterior";
  }
  return "exterior";
}

export function getCakePreviewMessage(message = "") {
  const trimmed = String(message || "").trim();
  if (!trimmed) return "";
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
}

function toInspirationList(inspirationItems = []) {
  if (!Array.isArray(inspirationItems)) return [];
  return inspirationItems
    .map((item, index) => ({
      id: String(item?.id || item?.url || index),
      label: String(item?.label || item?.note || item?.name || "").trim(),
      url: String(item?.url || item?.previewUrl || "").trim(),
      name: String(item?.name || "").trim(),
    }))
    .filter((item) => item.label || item.url || item.name);
}

export function estimateCakeOrderMetrics(structureOptions = {}) {
  const tierOption =
    findCakeStructureOption("tiers", structureOptions.tiers) ||
    CAKE_STRUCTURE_OPTIONS.tiers[0];
  const heightOption =
    findCakeStructureOption("heightProfiles", structureOptions.heightProfile) ||
    CAKE_STRUCTURE_OPTIONS.heightProfiles[1];
  const bodyScale = Number(heightOption?.bodyScale || 1);
  const minServings = Math.max(
    1,
    Math.round(Number(tierOption?.minServings || 8) * (bodyScale < 1 ? 0.94 : bodyScale))
  );
  const maxServings = Math.max(
    minServings,
    Math.round(Number(tierOption?.maxServings || 14) * (bodyScale > 1 ? bodyScale : 1))
  );
  const minWeightKg = Number((minServings * 0.14).toFixed(1));
  const maxWeightKg = Number((maxServings * 0.16).toFixed(1));

  return {
    minServings,
    maxServings,
    servingsLabel: `${minServings}-${maxServings} portii`,
    minWeightKg,
    maxWeightKg,
    weightLabel: `${minWeightKg}-${maxWeightKg} kg`,
  };
}

export function buildCakeInspirationSummary(inspirationItems = []) {
  const normalized = toInspirationList(inspirationItems);
  if (!normalized.length) return "";

  return normalized
    .slice(0, 3)
    .map((item, index) => {
      const label = item.label || item.name || `referinta ${index + 1}`;
      return `Referinta ${index + 1}: ${label}`;
    })
    .join("; ");
}

export function getCakeDesignSummary(selectedOptions, structureOptions = {}) {
  const tierOption = findCakeStructureOption("tiers", structureOptions.tiers);
  const heightOption = findCakeStructureOption(
    "heightProfiles",
    structureOptions.heightProfile
  );
  const metrics = estimateCakeOrderMetrics(structureOptions);

  return [
    tierOption?.label || "1 etaj",
    heightOption ? `profil ${heightOption.label.toLowerCase()}` : "",
    metrics.servingsLabel,
    metrics.weightLabel,
    `Blat ${selectedOptions.blat?.label || ""}`,
    `cremă ${selectedOptions.crema?.label || ""}`,
    `umplutură ${selectedOptions.umplutura?.label || ""}`,
    `stil ${selectedOptions.decor?.label || ""}`,
    `topping ${selectedOptions.topping?.label || ""}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function buildLayerPattern({ filling, tierCount, heightProfile }) {
  const fillingRatio =
    filling.texture === "cookie" ? 0.058 : filling.texture === "jam" ? 0.042 : 0.05;

  if (tierCount > 1 || heightProfile === "tall") {
    return [
      { key: "sponge-1", role: "sponge", ratio: 0.16 },
      { key: "cream-1", role: "cream", ratio: 0.06 },
      { key: "filling-1", role: "filling", ratio: fillingRatio },
      { key: "cream-2", role: "cream", ratio: 0.06 },
      { key: "sponge-2", role: "sponge", ratio: 0.13 },
      { key: "cream-3", role: "cream", ratio: 0.05 },
      { key: "filling-2", role: "filling", ratio: fillingRatio },
      { key: "cream-4", role: "cream", ratio: 0.05 },
      { key: "sponge-3", role: "sponge", ratio: 0.13 },
      { key: "cream-5", role: "cream", ratio: 0.05 },
      { key: "sponge-4", role: "sponge", ratio: 0.11 },
    ];
  }

  return [
    { key: "sponge-1", role: "sponge", ratio: 0.2 },
    { key: "cream-1", role: "cream", ratio: 0.07 },
    { key: "filling-1", role: "filling", ratio: fillingRatio },
    { key: "cream-2", role: "cream", ratio: 0.07 },
    { key: "sponge-2", role: "sponge", ratio: 0.2 },
    { key: "cream-3", role: "cream", ratio: 0.07 },
    { key: "filling-2", role: "filling", ratio: fillingRatio },
    { key: "cream-4", role: "cream", ratio: 0.07 },
    { key: "sponge-3", role: "sponge", ratio: 0.16 },
  ];
}

function getTierWidthRatios(tierCount) {
  if (tierCount === 3) return [0.46, 0.72, 1];
  if (tierCount === 2) return [0.64, 1];
  return [1];
}

function getBodyRatioForTierCount(tierCount) {
  if (tierCount === 3) return 0.48;
  if (tierCount === 2) return 0.58;
  return 0.8;
}

function buildTierModel({
  centerX,
  topY,
  cakeWidth,
  bodyHeight,
  stageHeight,
  themes,
  tierCount,
  heightProfile,
  message,
  tierIndex,
  includeTopDetails,
}) {
  const {
    sponge,
    cream,
    filling,
    decor,
    colorTheme,
    topping,
    fontTheme,
    selectedDecorId,
    selectedToppingId,
  } = themes;

  const topHeight = cakeWidth * 0.18;
  const cakeBottom = topY + bodyHeight;
  const bodyX = centerX - cakeWidth / 2;
  const shellThickness = Math.max(
    12,
    Math.min(cakeWidth * 0.13, decor.shellThickness * (cakeWidth / 258))
  );
  const cutawayX = bodyX + shellThickness;
  const cutawayY = topY + shellThickness * 0.28;
  const cutawayWidth = cakeWidth - shellThickness * 2;
  const cutawayHeight = bodyHeight - shellThickness * 0.4;
  const layerGap = Math.max(3, stageHeight * 0.008);
  const layerPattern = buildLayerPattern({ filling, tierCount, heightProfile });
  const totalRatio = layerPattern.reduce((sum, layer) => sum + layer.ratio, 0);
  const usableHeight = cutawayHeight - layerGap * (layerPattern.length - 1);

  let currentY = cutawayY;
  const layers = layerPattern.map((layer, index) => {
    const height =
      index === layerPattern.length - 1
        ? cutawayY + cutawayHeight - currentY
        : (layer.ratio / totalRatio) * usableHeight;

    const base = {
      id: `${layer.key}-${tierIndex}`,
      role: layer.role,
      x: cutawayX,
      y: currentY,
      width: cutawayWidth,
      height,
      radius: Math.max(8, Math.min(18, height * 0.36)),
      fill: "#ffffff",
      accent: "#ffffff",
      shade: "#ffffff",
      dots: [],
      ribbons: [],
    };

    if (layer.role === "sponge") {
      base.fill = sponge.fill;
      base.accent = sponge.crumb;
      base.shade = sponge.edge;
      base.dots = buildDistributedDots({
        count: 16,
        x: base.x,
        y: base.y,
        width: base.width,
        height: base.height,
        minRadius: Math.max(1.4, base.height * 0.05),
        maxRadius: Math.max(2.2, base.height * 0.09),
        colors: [sponge.crumb, sponge.crumbDark],
        seed: index + 1 + tierIndex * 4,
        opacity: 0.65,
      });
    }

    if (layer.role === "cream") {
      base.fill = cream.fill;
      base.accent = cream.highlight;
      base.shade = cream.shadow;
      base.ribbons = buildRibbonLines({
        x: base.x,
        y: base.y,
        width: base.width,
        height: base.height,
        count: 2,
        stroke: cream.highlight,
        seed: index + 1 + tierIndex * 3,
      });
    }

    if (layer.role === "filling") {
      base.fill = filling.fill;
      base.accent = filling.accent;
      base.shade = filling.speck;
      base.dots = buildDistributedDots({
        count: filling.texture === "cookie" ? 18 : 10,
        x: base.x,
        y: base.y,
        width: base.width,
        height: base.height,
        minRadius: Math.max(1.2, base.height * 0.08),
        maxRadius: Math.max(2.4, base.height * 0.16),
        colors:
          filling.texture === "cookie"
            ? [filling.speck, darken(filling.speck, 0.1)]
            : [filling.accent, filling.speck],
        seed: index + 3 + tierIndex * 4,
        opacity: filling.texture === "cookie" ? 0.9 : 0.74,
      });
    }

    currentY += height + layerGap;
    return base;
  });

  const beadRadius = Math.max(4, cakeWidth * 0.012 * decor.pipingScale);
  const pipingColor = colorTheme.piping;
  const topRowBaseY = topY - topHeight * 0.06;
  const topRows = Array.from({ length: decor.topRows }, (_, rowIndex) =>
    buildBeadRow({
      startX: bodyX + shellThickness * 0.58,
      endX: bodyX + cakeWidth - shellThickness * 0.58,
      y: topRowBaseY + rowIndex * beadRadius * 1.62,
      count: Math.max(10, Math.round(cakeWidth / (beadRadius * 2.8))),
      radius: beadRadius * (1 - rowIndex * 0.08),
      fill: rowIndex === 0 ? pipingColor : lighten(pipingColor, 0.08),
      shadow: colorTheme.shadow,
    })
  ).flat();

  const bottomRows = Array.from({ length: decor.bottomRows }, (_, rowIndex) =>
    buildBeadRow({
      startX: bodyX + shellThickness * 0.55,
      endX: bodyX + cakeWidth - shellThickness * 0.55,
      y: cakeBottom - beadRadius * 1.1 - rowIndex * beadRadius * 1.5,
      count: Math.max(10, Math.round(cakeWidth / (beadRadius * 2.8))),
      radius: beadRadius * (1 - rowIndex * 0.06),
      fill: rowIndex === 0 ? pipingColor : lighten(pipingColor, 0.08),
      shadow: colorTheme.shadow,
    })
  ).flat();

  const swags =
    decor.swagRows > 0
      ? Array.from({ length: decor.swagRows }, (_, rowIndex) =>
          buildSwags({
            startX: cutawayX + cutawayWidth * 0.05,
            endX: cutawayX + cutawayWidth * 0.95,
            y: topY + bodyHeight * (0.24 + rowIndex * 0.2),
            count: 3,
            drop: stageHeight * 0.05,
            stroke: lighten(colorTheme.accent, 0.04),
            strokeWidth: Math.max(2.4, cakeWidth * 0.012),
          })
        ).flat()
      : [];

  const sideBands = Array.from({ length: decor.sideBands }, (_, index) => {
    const progress = (index + 1) / (decor.sideBands + 1);
    const leftX = bodyX + shellThickness * (0.32 + progress * 0.18);
    const rightX = bodyX + cakeWidth - shellThickness * (0.32 + progress * 0.18);
    return [
      {
        x: leftX,
        points: [
          leftX,
          topY + topHeight * 0.38,
          leftX - shellThickness * 0.18,
          topY + bodyHeight * 0.25,
          leftX + shellThickness * 0.14,
          topY + bodyHeight * 0.56,
          leftX - shellThickness * 0.12,
          cakeBottom - shellThickness * 0.24,
        ],
      },
      {
        x: rightX,
        points: [
          rightX,
          topY + topHeight * 0.38,
          rightX + shellThickness * 0.18,
          topY + bodyHeight * 0.25,
          rightX - shellThickness * 0.14,
          topY + bodyHeight * 0.56,
          rightX + shellThickness * 0.12,
          cakeBottom - shellThickness * 0.24,
        ],
      },
    ];
  }).flat();

  const floralClusters =
    selectedDecorId === "floral"
      ? [
          buildFlowerCluster({
            x: centerX + cakeWidth * 0.22,
            y: topY - topHeight * 0.42,
            size: cakeWidth * (includeTopDetails ? 0.04 : 0.03),
            petalColor: lighten(colorTheme.floral, 0.15),
            accentColor: lighten(colorTheme.accent, 0.12),
            leafColor: colorTheme.leaf,
            rotation: 0.25,
          }),
          buildFlowerCluster({
            x: centerX + cakeWidth * 0.29,
            y: topY - topHeight * 0.1,
            size: cakeWidth * (includeTopDetails ? 0.032 : 0.025),
            petalColor: colorTheme.floral,
            accentColor: lighten(colorTheme.accent, 0.08),
            leafColor: colorTheme.leaf,
            rotation: -0.1,
          }),
          buildFlowerCluster({
            x: centerX - cakeWidth * 0.24,
            y: topY + bodyHeight * 0.3,
            size: cakeWidth * (includeTopDetails ? 0.03 : 0.024),
            petalColor: lighten(colorTheme.floral, 0.1),
            accentColor: lighten(colorTheme.accent, 0.16),
            leafColor: colorTheme.leaf,
            rotation: 0.4,
          }),
        ]
      : [];

  const toppingModel = {
    pearls: [],
    fruits: [],
    chocolates: [],
    drizzles: [],
  };

  if (includeTopDetails && selectedToppingId === "perle") {
    toppingModel.pearls = buildBeadRow({
      startX: centerX - cakeWidth * 0.2,
      endX: centerX + cakeWidth * 0.2,
      y: topY - topHeight * 0.1,
      count: 8,
      radius: Math.max(3.5, cakeWidth * 0.01),
      fill: colorTheme.pearl,
      shadow: colorTheme.shadow,
    });
  }

  if (includeTopDetails && selectedToppingId === "fructe") {
    toppingModel.fruits = [
      buildFruitCluster({
        x: centerX - cakeWidth * 0.12,
        y: topY - topHeight * 0.12,
        scale: cakeWidth * 0.05,
        berry: topping.accent,
        berryDark: topping.berryDark,
        leaf: topping.leaf,
      }),
      buildFruitCluster({
        x: centerX + cakeWidth * 0.14,
        y: topY - topHeight * 0.06,
        scale: cakeWidth * 0.044,
        berry: topping.accent,
        berryDark: topping.berryDark,
        leaf: topping.leaf,
      }),
    ];
  }

  if (includeTopDetails && selectedToppingId === "ciocolata") {
    const leftChocolate = buildChocolateDecor({
      x: centerX - cakeWidth * 0.12,
      y: topY - topHeight * 0.2,
      scale: cakeWidth * 0.04,
      accent: topping.accent,
      dark: topping.dark,
      glaze: topping.glaze,
    });
    const rightChocolate = buildChocolateDecor({
      x: centerX + cakeWidth * 0.06,
      y: topY - topHeight * 0.1,
      scale: cakeWidth * 0.036,
      accent: topping.accent,
      dark: topping.dark,
      glaze: topping.glaze,
    });
    toppingModel.chocolates = [...leftChocolate.shards, ...rightChocolate.shards];
    toppingModel.drizzles = [...leftChocolate.drizzles, ...rightChocolate.drizzles];
  }

  const previewText = includeTopDetails ? getCakePreviewMessage(message) : "";
  const messageVisible = Boolean(previewText);
  const plaqueWidth = cakeWidth * (messageVisible ? 0.45 : 0.28);
  const plaqueHeight = topHeight * (messageVisible ? 0.8 : 0.5);

  return {
    cake: {
      bodyX,
      bodyY: topY,
      bodyWidth: cakeWidth,
      bodyHeight,
      topX: centerX,
      topY,
      topRadiusX: cakeWidth / 2,
      topRadiusY: topHeight / 2,
      shellColor: colorTheme.shell,
      shellTop: colorTheme.shellTop,
      shellShadow: colorTheme.shadow,
      shellStroke: darken(colorTheme.shell, 0.12),
      cutawayX,
      cutawayY,
      cutawayWidth,
      cutawayHeight,
      cutawayRadius: Math.max(10, cutawayWidth * 0.05),
      innerTopRadiusX: cakeWidth / 2 - shellThickness * 0.62,
      innerTopRadiusY: topHeight / 2 - Math.max(5, shellThickness * 0.1),
      innerTopFill: mixHex(cream.fill, colorTheme.shellTop, 0.45),
      sideHighlight: {
        x: bodyX + shellThickness * 0.42,
        y: topY + shellThickness * 0.24,
        width: shellThickness * 0.48,
        height: bodyHeight - shellThickness * 0.6,
        fill: withAlpha(lighten(colorTheme.shellTop, 0.08), 0.42),
      },
      sideShadow: {
        x: bodyX + cakeWidth - shellThickness * 0.78,
        y: topY + shellThickness * 0.4,
        width: shellThickness * 0.46,
        height: bodyHeight - shellThickness * 0.8,
        fill: withAlpha(darken(colorTheme.shadow, 0.04), 0.22),
      },
    },
    layers,
    topRows,
    bottomRows,
    swags,
    sideBands,
    sideBandStyle: {
      stroke: lighten(colorTheme.accent, 0.12),
      strokeWidth: Math.max(2.2, cakeWidth * 0.01 * decor.pipingScale),
    },
    floralClusters,
    topping: toppingModel,
    message: {
      visible: messageVisible,
      text: previewText,
      fontFamily: fontTheme.fontFamily,
      fontStyle: fontTheme.fontStyle,
      plaque: {
        x: centerX - plaqueWidth / 2,
        y: topY - plaqueHeight / 2,
        width: plaqueWidth,
        height: plaqueHeight,
        fill: withAlpha(colorTheme.plaque, 0.95),
        stroke: lighten(colorTheme.accent, 0.1),
      },
      textFill: darken(colorTheme.accent, 0.34),
    },
  };
}

export function buildCakeAiPrompt({
  selectedOptions,
  structureOptions = {},
  message = "",
  customRequest = "",
  inspirationItems = [],
}) {
  const tierOption =
    findCakeStructureOption("tiers", structureOptions.tiers) ||
    CAKE_STRUCTURE_OPTIONS.tiers[0];
  const heightOption =
    findCakeStructureOption("heightProfiles", structureOptions.heightProfile) ||
    CAKE_STRUCTURE_OPTIONS.heightProfiles[1];
  const trimmedMessage = getCakePreviewMessage(message);
  const trimmedRequest = String(customRequest || "").trim();
  const metrics = estimateCakeOrderMetrics(structureOptions);
  const inspirationSummary = buildCakeInspirationSummary(inspirationItems);

  return [
    "Tort fotorealist de cofetarie artizanala, fotografie de produs premium.",
    `${tierOption.label}, profil ${heightOption.label.toLowerCase()}, aspect realist de crema si finisaj lucrat manual.`,
    `Dimensiune estimata: ${metrics.servingsLabel}, aproximativ ${metrics.weightLabel}.`,
    `Interior: blat ${selectedOptions.blat?.label || "vanilie"}, crema ${selectedOptions.crema?.label || "vanilie"}, umplutura ${selectedOptions.umplutura?.label || "capsuni"}.`,
    `Exterior: stil ${selectedOptions.decor?.label || "minimal"}, culoare ${selectedOptions.culoare?.label || "ivoire"}, topping ${selectedOptions.topping?.label || "perle"}.`,
    inspirationSummary ? `Imagini de inspiratie incarcate: ${inspirationSummary}.` : "",
    trimmedMessage ? `Mesaj pe tort: "${trimmedMessage}".` : "",
    "Lumina naturala, textura credibila, detalii elegante, fundal curat de studio, fara elemente desenate sau cartoon.",
    trimmedRequest ? `Cerinta personalizata a clientului: ${trimmedRequest}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildCakeAiVariantPrompts(config = {}) {
  const basePrompt = buildCakeAiPrompt(config);
  return [
    `${basePrompt} Varianta 1: look de studio luminos, compozitie echilibrata, focalizare clara pe tort.`,
    `${basePrompt} Varianta 2: styling editorial premium, unghi usor lateral, accente decorative mai expresive.`,
    `${basePrompt} Varianta 3: fotografiere close-up cu accent pe textura cremei si finisajele manuale.`,
  ];
}

export function buildCakePreviewModel({
  stageWidth,
  stageHeight,
  selectedOptions,
  message,
  structureOptions = {},
}) {
  const sponge = selectedOptions.blat?.preview || SPONGE_PRESETS.vanilie;
  const cream = selectedOptions.crema?.preview || CREAM_PRESETS.vanilie;
  const filling = selectedOptions.umplutura?.preview || FILLING_PRESETS.capsuni;
  const decor = selectedOptions.decor?.preview || DECOR_PRESETS.minimal;
  const colorTheme = selectedOptions.culoare?.preview || COLOR_PRESETS["#f6d7c3"];
  const topping = selectedOptions.topping?.preview || TOPPING_PRESETS.perle;
  const fontTheme = selectedOptions.font?.preview || FONT_PRESETS.Georgia;

  const tierOption =
    findCakeStructureOption("tiers", structureOptions.tiers) ||
    CAKE_STRUCTURE_OPTIONS.tiers[0];
  const heightOption =
    findCakeStructureOption("heightProfiles", structureOptions.heightProfile) ||
    CAKE_STRUCTURE_OPTIONS.heightProfiles[1];

  if (tierOption && heightOption) {
    const previewCenterX = stageWidth / 2;
    const previewBoardY = stageHeight * 0.86;
    const previewBoardHeight = stageHeight * 0.085;
    const previewTierCount = Number(tierOption.id) || 1;
    const widthRatios = getTierWidthRatios(previewTierCount);
    const previewLargestTierWidth =
      stageWidth * (previewTierCount === 1 ? 0.46 : previewTierCount === 2 ? 0.52 : 0.56);
    const previewTierWidths = widthRatios.map((ratio) => previewLargestTierWidth * ratio);
    const previewRawBodyHeights = previewTierWidths.map(
      (width) =>
        width * getBodyRatioForTierCount(previewTierCount) * heightOption.bodyScale
    );
    const previewTierGap = previewTierCount === 1 ? 0 : stageHeight * 0.024;
    const previewCakeBottom = previewBoardY - previewBoardHeight * 0.35;
    const previewAvailableBodyHeight =
      previewCakeBottom - stageHeight * 0.16 - previewTierWidths[0] * 0.08;
    const previewRawBodyTotal =
      previewRawBodyHeights.reduce((sum, height) => sum + height, 0) +
      previewTierGap * (previewTierCount - 1);
    const previewFitScale =
      previewRawBodyTotal > previewAvailableBodyHeight
        ? previewAvailableBodyHeight / previewRawBodyTotal
        : 1;
    const previewBodyHeights = previewRawBodyHeights.map(
      (height) => height * previewFitScale
    );
    const previewStackGap = previewTierGap * previewFitScale;
    const previewThemes = {
      sponge,
      cream,
      filling,
      decor,
      colorTheme,
      topping,
      fontTheme,
      selectedDecorId: selectedOptions.decor?.id,
      selectedToppingId: selectedOptions.topping?.id,
    };
    const previewTiers = Array.from({ length: previewTierCount });
    let previewCurrentBottom = previewCakeBottom;

    for (let index = previewTierCount - 1; index >= 0; index -= 1) {
      const previewTopY = previewCurrentBottom - previewBodyHeights[index];
      previewTiers[index] = buildTierModel({
        centerX: previewCenterX,
        topY: previewTopY,
        cakeWidth: previewTierWidths[index],
        bodyHeight: previewBodyHeights[index],
        stageHeight,
        themes: previewThemes,
        tierCount: previewTierCount,
        heightProfile: heightOption.id,
        message,
        tierIndex: index,
        includeTopDetails: index === 0,
      });
      previewCurrentBottom = previewTopY - previewStackGap;
    }

    const previewTopTier = previewTiers[0];
    const previewPrimaryTier = previewTiers[previewTiers.length - 1];
    const previewBoardWidth = previewLargestTierWidth * 1.55;

    return {
      background: {
        base: "#fff9f6",
        orbs: [
          {
            x: stageWidth * 0.22,
            y: stageHeight * 0.18,
            radius: stageWidth * 0.12,
            fill: withAlpha(lighten(colorTheme.shell, 0.08), 0.55),
          },
          {
            x: stageWidth * 0.78,
            y: stageHeight * 0.16,
            radius: stageWidth * 0.1,
            fill: withAlpha(lighten(colorTheme.accent, 0.38), 0.22),
          },
        ],
      },
      board: {
        x: previewCenterX,
        y: previewBoardY,
        radiusX: previewBoardWidth / 2,
        radiusY: previewBoardHeight / 2,
        fill: "#ece0d4",
        highlight: "#fffaf7",
        shadow: "#d6c7b9",
      },
      tiers: previewTiers,
      primaryTier: previewPrimaryTier,
      structure: {
        tierCount: previewTierCount,
        tierLabel: tierOption.label,
        servings: tierOption.servings,
        heightLabel: heightOption.label,
        heightDetail: heightOption.detail,
      },
      cake: previewTopTier.cake,
      layers: previewPrimaryTier.layers,
      topRows: previewTopTier.topRows,
      bottomRows: previewTopTier.bottomRows,
      swags: previewTopTier.swags,
      sideBands: previewTopTier.sideBands,
      sideBandStyle: previewTopTier.sideBandStyle,
      floralClusters: previewTopTier.floralClusters,
      topping: previewTopTier.topping,
      message: previewTopTier.message,
    };
  }

  const centerX = stageWidth / 2;
  const boardY = stageHeight * 0.84;
  const boardWidth = stageWidth * 0.7;
  const boardHeight = stageHeight * 0.085;
  const cakeWidth = stageWidth * 0.46;
  const topHeight = cakeWidth * 0.18;
  const topY = stageHeight * 0.29;
  const cakeBottom = boardY - boardHeight * 0.35;
  const bodyHeight = cakeBottom - topY;
  const bodyX = centerX - cakeWidth / 2;
  const shellThickness = Math.max(
    14,
    Math.min(cakeWidth * 0.13, decor.shellThickness * (stageWidth / 560))
  );
  const cutawayX = bodyX + shellThickness;
  const cutawayY = topY + shellThickness * 0.28;
  const cutawayWidth = cakeWidth - shellThickness * 2;
  const cutawayHeight = bodyHeight - shellThickness * 0.4;
  const layerGap = Math.max(3, stageHeight * 0.008);
  const layerPattern = [
    { key: "sponge-1", role: "sponge", ratio: 0.2 },
    { key: "cream-1", role: "cream", ratio: 0.07 },
    { key: "filling-1", role: "filling", ratio: 0.05 },
    { key: "cream-2", role: "cream", ratio: 0.07 },
    { key: "sponge-2", role: "sponge", ratio: 0.2 },
    { key: "cream-3", role: "cream", ratio: 0.07 },
    { key: "filling-2", role: "filling", ratio: 0.05 },
    { key: "cream-4", role: "cream", ratio: 0.07 },
    { key: "sponge-3", role: "sponge", ratio: 0.16 },
  ];
  const totalRatio = layerPattern.reduce((sum, layer) => sum + layer.ratio, 0);
  const usableHeight = cutawayHeight - layerGap * (layerPattern.length - 1);

  let currentY = cutawayY;
  const layers = layerPattern.map((layer, index) => {
    const height =
      index === layerPattern.length - 1
        ? cutawayY + cutawayHeight - currentY
        : (layer.ratio / totalRatio) * usableHeight;

    const base = {
      id: layer.key,
      role: layer.role,
      x: cutawayX,
      y: currentY,
      width: cutawayWidth,
      height,
      radius: Math.max(8, Math.min(18, height * 0.36)),
      fill: "#ffffff",
      accent: "#ffffff",
      shade: "#ffffff",
      dots: [],
      ribbons: [],
    };

    if (layer.role === "sponge") {
      base.fill = sponge.fill;
      base.accent = sponge.crumb;
      base.shade = sponge.edge;
      base.dots = buildDistributedDots({
        count: 16,
        x: base.x,
        y: base.y,
        width: base.width,
        height: base.height,
        minRadius: Math.max(1.4, base.height * 0.05),
        maxRadius: Math.max(2.2, base.height * 0.09),
        colors: [sponge.crumb, sponge.crumbDark],
        seed: index + 1,
        opacity: 0.65,
      });
    }

    if (layer.role === "cream") {
      base.fill = cream.fill;
      base.accent = cream.highlight;
      base.shade = cream.shadow;
      base.ribbons = buildRibbonLines({
        x: base.x,
        y: base.y,
        width: base.width,
        height: base.height,
        count: 2,
        stroke: cream.highlight,
        seed: index + 1,
      });
    }

    if (layer.role === "filling") {
      base.fill = filling.fill;
      base.accent = filling.accent;
      base.shade = filling.speck;
      base.dots = buildDistributedDots({
        count: filling.texture === "cookie" ? 18 : 10,
        x: base.x,
        y: base.y,
        width: base.width,
        height: base.height,
        minRadius: Math.max(1.2, base.height * 0.08),
        maxRadius: Math.max(2.4, base.height * 0.16),
        colors:
          filling.texture === "cookie"
            ? [filling.speck, darken(filling.speck, 0.1)]
            : [filling.accent, filling.speck],
        seed: index + 3,
        opacity: filling.texture === "cookie" ? 0.9 : 0.74,
      });
    }

    currentY += height + layerGap;
    return base;
  });

  const beadRadius = Math.max(4, cakeWidth * 0.012 * decor.pipingScale);
  const pipingColor = colorTheme.piping;
  const topRowBaseY = topY - topHeight * 0.06;
  const topRows = Array.from({ length: decor.topRows }, (_, rowIndex) =>
    buildBeadRow({
      startX: bodyX + shellThickness * 0.58,
      endX: bodyX + cakeWidth - shellThickness * 0.58,
      y: topRowBaseY + rowIndex * beadRadius * 1.62,
      count: Math.max(10, Math.round(cakeWidth / (beadRadius * 2.8))),
      radius: beadRadius * (1 - rowIndex * 0.08),
      fill: rowIndex === 0 ? pipingColor : lighten(pipingColor, 0.08),
      shadow: colorTheme.shadow,
    })
  ).flat();

  const bottomRows = Array.from({ length: decor.bottomRows }, (_, rowIndex) =>
    buildBeadRow({
      startX: bodyX + shellThickness * 0.55,
      endX: bodyX + cakeWidth - shellThickness * 0.55,
      y: cakeBottom - beadRadius * 1.1 - rowIndex * beadRadius * 1.5,
      count: Math.max(10, Math.round(cakeWidth / (beadRadius * 2.8))),
      radius: beadRadius * (1 - rowIndex * 0.06),
      fill: rowIndex === 0 ? pipingColor : lighten(pipingColor, 0.08),
      shadow: colorTheme.shadow,
    })
  ).flat();

  const swags =
    decor.swagRows > 0
      ? Array.from({ length: decor.swagRows }, (_, rowIndex) =>
          buildSwags({
            startX: cutawayX + cutawayWidth * 0.05,
            endX: cutawayX + cutawayWidth * 0.95,
            y: topY + bodyHeight * (0.24 + rowIndex * 0.2),
            count: 3,
            drop: stageHeight * 0.05,
            stroke: lighten(colorTheme.accent, 0.04),
            strokeWidth: Math.max(2.4, cakeWidth * 0.012),
          })
        ).flat()
      : [];

  const sideBands = Array.from({ length: decor.sideBands }, (_, index) => {
    const progress = (index + 1) / (decor.sideBands + 1);
    const leftX = bodyX + shellThickness * (0.32 + progress * 0.18);
    const rightX = bodyX + cakeWidth - shellThickness * (0.32 + progress * 0.18);
    return [
      {
        x: leftX,
        points: [
          leftX,
          topY + topHeight * 0.38,
          leftX - shellThickness * 0.18,
          topY + bodyHeight * 0.25,
          leftX + shellThickness * 0.14,
          topY + bodyHeight * 0.56,
          leftX - shellThickness * 0.12,
          cakeBottom - shellThickness * 0.24,
        ],
      },
      {
        x: rightX,
        points: [
          rightX,
          topY + topHeight * 0.38,
          rightX + shellThickness * 0.18,
          topY + bodyHeight * 0.25,
          rightX - shellThickness * 0.14,
          topY + bodyHeight * 0.56,
          rightX + shellThickness * 0.12,
          cakeBottom - shellThickness * 0.24,
        ],
      },
    ];
  }).flat();

  const floralClusters =
    selectedOptions.decor?.id === "floral"
      ? [
          buildFlowerCluster({
            x: centerX + cakeWidth * 0.22,
            y: topY - topHeight * 0.42,
            size: cakeWidth * 0.04,
            petalColor: lighten(colorTheme.floral, 0.15),
            accentColor: lighten(colorTheme.accent, 0.12),
            leafColor: colorTheme.leaf,
            rotation: 0.25,
          }),
          buildFlowerCluster({
            x: centerX + cakeWidth * 0.29,
            y: topY - topHeight * 0.1,
            size: cakeWidth * 0.032,
            petalColor: colorTheme.floral,
            accentColor: lighten(colorTheme.accent, 0.08),
            leafColor: colorTheme.leaf,
            rotation: -0.1,
          }),
          buildFlowerCluster({
            x: centerX - cakeWidth * 0.24,
            y: topY + bodyHeight * 0.3,
            size: cakeWidth * 0.03,
            petalColor: lighten(colorTheme.floral, 0.1),
            accentColor: lighten(colorTheme.accent, 0.16),
            leafColor: colorTheme.leaf,
            rotation: 0.4,
          }),
        ]
      : [];

  const toppingModel = {
    pearls: [],
    fruits: [],
    chocolates: [],
    drizzles: [],
  };

  if (selectedOptions.topping?.id === "perle") {
    toppingModel.pearls = buildBeadRow({
      startX: centerX - cakeWidth * 0.2,
      endX: centerX + cakeWidth * 0.2,
      y: topY - topHeight * 0.1,
      count: 8,
      radius: Math.max(3.5, cakeWidth * 0.01),
      fill: colorTheme.pearl,
      shadow: colorTheme.shadow,
    });
  }

  if (selectedOptions.topping?.id === "fructe") {
    toppingModel.fruits = [
      buildFruitCluster({
        x: centerX - cakeWidth * 0.12,
        y: topY - topHeight * 0.12,
        scale: cakeWidth * 0.05,
        berry: topping.accent,
        berryDark: topping.berryDark,
        leaf: topping.leaf,
      }),
      buildFruitCluster({
        x: centerX + cakeWidth * 0.14,
        y: topY - topHeight * 0.06,
        scale: cakeWidth * 0.044,
        berry: topping.accent,
        berryDark: topping.berryDark,
        leaf: topping.leaf,
      }),
    ];
  }

  if (selectedOptions.topping?.id === "ciocolata") {
    const leftChocolate = buildChocolateDecor({
      x: centerX - cakeWidth * 0.12,
      y: topY - topHeight * 0.2,
      scale: cakeWidth * 0.04,
      accent: topping.accent,
      dark: topping.dark,
      glaze: topping.glaze,
    });
    const rightChocolate = buildChocolateDecor({
      x: centerX + cakeWidth * 0.06,
      y: topY - topHeight * 0.1,
      scale: cakeWidth * 0.036,
      accent: topping.accent,
      dark: topping.dark,
      glaze: topping.glaze,
    });
    toppingModel.chocolates = [...leftChocolate.shards, ...rightChocolate.shards];
    toppingModel.drizzles = [...leftChocolate.drizzles, ...rightChocolate.drizzles];
  }

  const previewText = getCakePreviewMessage(message);
  const messageVisible = Boolean(previewText);
  const plaqueWidth = cakeWidth * (messageVisible ? 0.45 : 0.28);
  const plaqueHeight = topHeight * (messageVisible ? 0.8 : 0.5);

  return {
    background: {
      base: "#fff9f6",
      orbs: [
        {
          x: stageWidth * 0.22,
          y: stageHeight * 0.18,
          radius: stageWidth * 0.12,
          fill: withAlpha(lighten(colorTheme.shell, 0.08), 0.55),
        },
        {
          x: stageWidth * 0.78,
          y: stageHeight * 0.16,
          radius: stageWidth * 0.1,
          fill: withAlpha(lighten(colorTheme.accent, 0.38), 0.22),
        },
      ],
    },
    board: {
      x: centerX,
      y: boardY,
      radiusX: boardWidth / 2,
      radiusY: boardHeight / 2,
      fill: "#ece0d4",
      highlight: "#fffaf7",
      shadow: "#d6c7b9",
    },
    cake: {
      bodyX,
      bodyY: topY,
      bodyWidth: cakeWidth,
      bodyHeight,
      topX: centerX,
      topY,
      topRadiusX: cakeWidth / 2,
      topRadiusY: topHeight / 2,
      shellColor: colorTheme.shell,
      shellTop: colorTheme.shellTop,
      shellShadow: colorTheme.shadow,
      shellStroke: darken(colorTheme.shell, 0.12),
      cutawayX,
      cutawayY,
      cutawayWidth,
      cutawayHeight,
      cutawayRadius: Math.max(10, cutawayWidth * 0.05),
      innerTopRadiusX: cakeWidth / 2 - shellThickness * 0.62,
      innerTopRadiusY: topHeight / 2 - Math.max(5, shellThickness * 0.1),
      innerTopFill: mixHex(cream.fill, colorTheme.shellTop, 0.45),
      sideHighlight: {
        x: bodyX + shellThickness * 0.42,
        y: topY + shellThickness * 0.24,
        width: shellThickness * 0.48,
        height: bodyHeight - shellThickness * 0.6,
        fill: withAlpha(lighten(colorTheme.shellTop, 0.08), 0.42),
      },
      sideShadow: {
        x: bodyX + cakeWidth - shellThickness * 0.78,
        y: topY + shellThickness * 0.4,
        width: shellThickness * 0.46,
        height: bodyHeight - shellThickness * 0.8,
        fill: withAlpha(darken(colorTheme.shadow, 0.04), 0.22),
      },
    },
    layers,
    topRows,
    bottomRows,
    swags,
    sideBands,
    sideBandStyle: {
      stroke: lighten(colorTheme.accent, 0.12),
      strokeWidth: Math.max(2.2, cakeWidth * 0.01 * decor.pipingScale),
    },
    floralClusters,
    topping: toppingModel,
    message: {
      visible: messageVisible,
      text: previewText,
      fontFamily: fontTheme.fontFamily,
      fontStyle: fontTheme.fontStyle,
      plaque: {
        x: centerX - plaqueWidth / 2,
        y: topY - plaqueHeight / 2,
        width: plaqueWidth,
        height: plaqueHeight,
        fill: withAlpha(colorTheme.plaque, 0.95),
        stroke: lighten(colorTheme.accent, 0.1),
      },
      textFill: darken(colorTheme.accent, 0.34),
    },
  };
}
