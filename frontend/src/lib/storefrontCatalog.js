const MOJIBAKE_REPLACEMENTS = [
  ["Ä‚", "Ă"],
  ["Äƒ", "ă"],
  ["Ã‚", "Â"],
  ["Ã¢", "â"],
  ["ÃŽ", "Î"],
  ["Ã®", "î"],
  ["È˜", "Ș"],
  ["È™", "ș"],
  ["Åž", "Ș"],
  ["ÅŸ", "ș"],
  ["Èš", "Ț"],
  ["È›", "ț"],
  ["Å¢", "Ț"],
  ["Å£", "ț"],
];

const STOREFRONT_TEXT_FIXUPS = [
  ["\u00C4\u0192", "\u0103"],
  ["\u00C4\u201A", "\u0102"],
  ["\u00C3\u00A2", "\u00E2"],
  ["\u00C3\u201A", "\u00C2"],
  ["\u00C3\u00AE", "\u00EE"],
  ["\u00C3\u0160", "\u00CE"],
  ["\u00C8\u2122", "\u0219"],
  ["\u00C8\u02DC", "\u0218"],
  ["\u00C5\u0178", "\u0219"],
  ["\u00C5\u017E", "\u0218"],
  ["\u00C8\u203A", "\u021B"],
  ["\u00C8\u0161", "\u021A"],
  ["\u00C5\u00A3", "\u021B"],
  ["\u00C5\u00A2", "\u021A"],
];

function repairCatalogText(value = "") {
  let text = String(value ?? "");

  if (!/[\u00C3\u00C4\u00C5\u00C8]/.test(text)) {
    return text;
  }

  for (const [broken, fixed] of STOREFRONT_TEXT_FIXUPS) {
    text = text.replaceAll(broken, fixed);
  }

  return text;
}

function repairStorefrontText(value = "") {
  let text = String(value ?? "");

  if (!/[ÄÃÈÅ]/.test(text)) {
    return text;
  }

  for (const [broken, fixed] of MOJIBAKE_REPLACEMENTS) {
    text = text.replaceAll(broken, fixed);
  }

  return text;
}

function repairStorefrontValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => repairStorefrontValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, repairStorefrontValue(item)])
    );
  }

  if (typeof value === "string") {
    return repairCatalogText(value);
  }

  return value;
}

const OCCASION_MAP = {
  nunta: "nuntă",
  "zi de nastere": "zi de naștere",
  "zi de naştere": "zi de naștere",
  botez: "botez",
  aniversare: "aniversare",
  corporate: "corporate",
};

export const STOREFRONT_OCCASIONS = [
  "toate",
  "nuntă",
  "zi de naștere",
  "botez",
  "aniversare",
  "corporate",
];

export const STOREFRONT_FLAVOR_FILTERS = [
  "toate",
  "ciocolată",
  "fructe",
  "vanilie",
  "premium",
  "etajat",
];

export const STOREFRONT_SORT_OPTIONS = [
  { value: "recommended", label: "Recomandate" },
  { value: "rating", label: "Cele mai apreciate" },
  { value: "price_asc", label: "Preț crescător" },
  { value: "price_desc", label: "Preț descrescător" },
  { value: "newest", label: "Cele mai noi" },
];

for (const key of Object.keys(OCCASION_MAP)) {
  OCCASION_MAP[key] = repairCatalogText(OCCASION_MAP[key]);
}

for (let index = 0; index < STOREFRONT_OCCASIONS.length; index += 1) {
  STOREFRONT_OCCASIONS[index] = repairCatalogText(STOREFRONT_OCCASIONS[index]);
}

for (let index = 0; index < STOREFRONT_FLAVOR_FILTERS.length; index += 1) {
  STOREFRONT_FLAVOR_FILTERS[index] = repairCatalogText(STOREFRONT_FLAVOR_FILTERS[index]);
}

for (let index = 0; index < STOREFRONT_SORT_OPTIONS.length; index += 1) {
  STOREFRONT_SORT_OPTIONS[index] = repairStorefrontValue(STOREFRONT_SORT_OPTIONS[index]);
}

function normalizeStorefrontText(value = "") {
  return repairCatalogText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function uniqueList(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasUsefulText(value, minLength = 14) {
  const text = String(value || "").trim();
  if (text.length < minLength) return false;
  return !/\b(admin|smoke|test|mock|demo|dev|placeholder|seed|staging)\b/i.test(text);
}

function isTechnicalName(value) {
  return /\b(admin|smoke|test|mock|demo|dev|placeholder|catalog|seed|staging)\b/i.test(
    String(value || "")
  );
}

function hasUsableImage(value) {
  const image = String(value || "").trim();
  return Boolean(image) && !/placeholder\.svg$/i.test(image);
}

function isRealisticPrice(value) {
  const price = Number(value || 0);
  return price >= 450 && price <= 4500;
}

function formatOccasion(value) {
  return OCCASION_MAP[normalizeStorefrontText(value)] || "";
}

function buildCakeIllustration({
  label,
  top = "#fffaf4",
  bottom = "#f7dfe6",
  sponge = "#e3c59d",
  cream = "#fffaf7",
  accent = "#d56b8d",
  garnish = "#b68554",
  levels = 1,
}) {
  const baseWidth = 216;
  const baseX = 480 - baseWidth / 2;
  const secondWidth = 172;
  const secondX = 480 - secondWidth / 2;
  const thirdWidth = 104;
  const thirdX = 480 - thirdWidth / 2;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${top}" />
          <stop offset="100%" stop-color="${bottom}" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#a67b88" flood-opacity="0.18" />
        </filter>
      </defs>
      <rect width="960" height="720" fill="url(#bg)" />
      <circle cx="180" cy="120" r="80" fill="${accent}" opacity="0.08" />
      <circle cx="780" cy="180" r="110" fill="${garnish}" opacity="0.08" />
      <ellipse cx="480" cy="560" rx="250" ry="54" fill="#f2e3d7" opacity="0.96" />
      <g filter="url(#shadow)">
        <rect x="${baseX}" y="150" width="${baseWidth}" height="84" rx="24" fill="${cream}" />
        <rect x="${baseX}" y="194" width="${baseWidth}" height="40" rx="24" fill="${sponge}" opacity="0.96" />
        ${levels > 1 ? `<rect x="${secondX}" y="108" width="${secondWidth}" height="54" rx="20" fill="${cream}" /><rect x="${secondX}" y="138" width="${secondWidth}" height="24" rx="20" fill="${sponge}" opacity="0.96" />` : ""}
        ${levels > 2 ? `<rect x="${thirdX}" y="70" width="${thirdWidth}" height="40" rx="16" fill="${cream}" /><rect x="${thirdX}" y="92" width="${thirdWidth}" height="18" rx="16" fill="${sponge}" opacity="0.96" />` : ""}
        <path d="M ${secondX} 168 C ${secondX + 38} 148, ${secondX + 138} 148, ${secondX + secondWidth} 170" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" />
        <circle cx="480" cy="${levels > 2 ? 58 : levels > 1 ? 94 : 138}" r="16" fill="${accent}" />
        <circle cx="548" cy="184" r="14" fill="${accent}" opacity="0.9" />
        <circle cx="410" cy="184" r="11" fill="${accent}" opacity="0.78" />
      </g>
      <text x="480" y="652" text-anchor="middle" font-family="'Playfair Display', serif" font-size="42" fill="#483336">${label}</text>
      <text x="480" y="688" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="3" fill="#8a6671">MAISON-DOUCE</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const PHOTO_LIBRARY = {
  royal: "/images/royalcake.jpg",
  darkOne: "/images/tort negru.jpg",
  darkTwo: "/images/tort negru2.jpg",
  berries: "/images/lambeth cu capsuni.jpg",
  berriesAlt: "/images/lambeth cu capsuni2.jpg",
  lambeth: "/images/lambeth.jpg",
  lambethAlt: "/images/lambeth2.jpg",
  signature: "/images/tort lambeth.jpg",
  fruit: "/images/image.png",
  blush: "/images/532357278_18057699383581416_8655315749488309036_n.jpg",
  ivory: "/images/534304524_18057699401581416_1478944765467702830_n.jpg",
  peony: "/images/534315242_18057987737581416_2774484021057247960_n.jpg",
  soft: "/images/536449907_18058389059581416_1372212784409589345_n.jpg",
  pearl: "/images/536532200_18058389068581416_6628438650216617227_n.jpg",
  cosmos: "/images/cosmos.jpg",
  cosmosAlt: "/images/cosmos2.jpg",
  cosmosDark: "/images/cosmos3.jpg",
  spring: "/images/easther cake.jpg",
};

const ARTWORKS = {
  medovik: buildCakeIllustration({
    label: "Medovik",
    top: "#fff8f0",
    bottom: "#edd4b8",
    sponge: "#d4a268",
    accent: "#b77b38",
    garnish: "#d2a45c",
  }),
  ferrero: buildCakeIllustration({
    label: "Ferrero",
    top: "#fbf4ef",
    bottom: "#e8d4c8",
    sponge: "#9d6a43",
    accent: "#7d4f31",
    garnish: "#c7a06b",
  }),
  mango: buildCakeIllustration({
    label: "Mango & Pasiune",
    top: "#fffaf5",
    bottom: "#f7dcc7",
    sponge: "#ffd38d",
    accent: "#ef8c53",
    garnish: "#e4b24d",
  }),
  napoleon: buildCakeIllustration({
    label: "Napoleon",
    top: "#fffaf5",
    bottom: "#f4e3d8",
    sponge: "#dfbf8d",
    accent: "#c28b4b",
    garnish: "#9b6d41",
  }),
  caramel: buildCakeIllustration({
    label: "Caramel Sărat",
    top: "#fff9f3",
    bottom: "#ecd8c9",
    sponge: "#be8b5e",
    accent: "#8e5a39",
    garnish: "#d5a86f",
  }),
  pistachio: buildCakeIllustration({
    label: "Fistic & Zmeură",
    top: "#f7faf4",
    bottom: "#e4e8dd",
    sponge: "#c8d7a2",
    accent: "#cc5a7d",
    garnish: "#8ea76c",
  }),
};

const CURATED_CAKES = [
  {
    slug: "red-velvet",
    name: "Tort Red Velvet",
    description: "Blat catifelat, cremă fină de brânză și un finisaj elegant pentru aniversări rafinate.",
    price: 650,
    prepHours: 28,
    portii: 14,
    servingLabel: "12-14 porții",
    occasions: ["zi de naștere", "aniversare"],
    filterTags: ["vanilie", "fructe"],
    filling: "blat red velvet, cremă fină de brânză și zmeură proaspătă",
    shortFlavor: "textură catifelată, cremă fină și fructe roșii",
    badge: "Popular",
    badgeTone: "rose",
    image: PHOTO_LIBRARY.soft,
    gallery: [PHOTO_LIBRARY.berries],
    style: "romantic",
    marime: "18 cm / 1.8 kg",
    levels: 1,
    aromas: ["Red velvet clasic", "Red velvet cu zmeură"],
    ingredients: ["făină", "cacao fină", "cremă de brânză", "unt", "zmeură"],
    allergens: ["gluten", "ouă", "lactoză"],
    categoryLabel: "Zi de naștere",
    collectionNote: "Favoritul casei Maison-Douce",
    featuredRank: 2,
  },
  {
    slug: "medovik",
    name: "Tort Medovik",
    description: "Foi cu miere, cremă fină de smântână și un gust cald, nostalgic și foarte echilibrat.",
    price: 620,
    prepHours: 24,
    portii: 12,
    servingLabel: "10-12 porții",
    occasions: ["aniversare"],
    filterTags: ["premium"],
    filling: "foi cu miere și cremă fină de smântână",
    shortFlavor: "miere florală și cremă catifelată",
    badge: "Recomandat",
    badgeTone: "amber",
    image: ARTWORKS.medovik,
    gallery: [PHOTO_LIBRARY.ivory],
    style: "clasic",
    marime: "18 cm / 1.6 kg",
    levels: 1,
    aromas: ["Miere și smântână", "Miere cu vanilie"],
    ingredients: ["miere", "smântână", "unt", "făină", "zahăr brun"],
    allergens: ["gluten", "ouă", "lactoză"],
    categoryLabel: "Aniversare",
    collectionNote: "Clasic reinterpretat cu finețe",
    featuredRank: 8,
  },
  {
    slug: "trio-de-ciocolata",
    name: "Tort Trio de Ciocolată",
    description: "Trei straturi de mousse fin și un profil intens de cacao pentru iubitorii de deserturi spectaculoase.",
    price: 780,
    prepHours: 30,
    portii: 14,
    servingLabel: "12-14 porții",
    occasions: ["corporate", "zi de naștere"],
    filterTags: ["ciocolată", "premium"],
    filling: "mousse de ciocolată belgiană și insert de vișine",
    shortFlavor: "mousse aerat și cacao intensă",
    badge: "Semnătură",
    badgeTone: "slate",
    image: PHOTO_LIBRARY.darkOne,
    gallery: [PHOTO_LIBRARY.cosmosDark],
    style: "modern",
    marime: "20 cm / 2 kg",
    levels: 1,
    aromas: ["Trio clasic", "Trio cu vișine"],
    ingredients: ["ciocolată belgiană", "frișcă", "unt", "ouă", "vișine"],
    allergens: ["ouă", "lactoză"],
    categoryLabel: "Corporate",
    collectionNote: "Pentru evenimente cu gust intens",
    featuredRank: 3,
  },
  {
    slug: "vanilie-fructe-de-padure",
    name: "Tort Vanilie și Fructe de Pădure",
    description: "Lejer și luminos, cu cremă mascarpone și fructe de pădure într-o combinație foarte fotogenică.",
    price: 720,
    prepHours: 26,
    portii: 12,
    servingLabel: "12 porții",
    occasions: ["zi de naștere", "botez"],
    filterTags: ["vanilie", "fructe"],
    filling: "blat de vanilie, cremă mascarpone și fructe de pădure",
    shortFlavor: "vanilie fină și fructe proaspete",
    badge: "Nou",
    badgeTone: "emerald",
    image: PHOTO_LIBRARY.fruit,
    gallery: [PHOTO_LIBRARY.berriesAlt],
    style: "floral",
    marime: "18 cm / 1.7 kg",
    levels: 1,
    aromas: ["Vanilie și fructe de pădure", "Vanilie cu afine"],
    ingredients: ["vanilie", "mascarpone", "afine", "coacăze", "zmeură"],
    allergens: ["gluten", "ouă", "lactoză"],
    categoryLabel: "Botez",
    collectionNote: "Proaspăt și foarte fotogenic",
    featuredRank: 4,
  },
  {
    slug: "ferrero",
    name: "Tort Ferrero",
    description: "Praline, cremă Gianduja și accente crocante într-un tort premium potrivit pentru cadouri elegante și seri speciale.",
    price: 950,
    prepHours: 34,
    portii: 16,
    servingLabel: "14-16 porții",
    occasions: ["corporate", "aniversare"],
    filterTags: ["ciocolată", "premium"],
    filling: "cremă de ciocolată cu alune de pădure și glazură crocantă",
    shortFlavor: "alune de pădure și cremă gianduja",
    badge: "Premium",
    badgeTone: "amber",
    image: ARTWORKS.ferrero,
    gallery: [PHOTO_LIBRARY.cosmosAlt],
    style: "modern",
    marime: "20 cm / 2.2 kg",
    levels: 1,
    aromas: ["Ferrero clasic", "Ferrero cu caramel"],
    ingredients: ["pralină", "alune de pădure", "frișcă", "ciocolată", "napolitană"],
    allergens: ["alune", "gluten", "lactoză"],
    categoryLabel: "Premium",
    collectionNote: "Cadoul perfect pentru iubitorii de praline",
    featuredRank: 6,
  },
  {
    slug: "raffaello",
    name: "Tort Raffaello",
    description: "Delicat și luminos, cu cocos, migdale și cremă fină, într-o prezentare curată și elegantă.",
    price: 920,
    prepHours: 30,
    portii: 14,
    servingLabel: "14 porții",
    occasions: ["botez", "aniversare"],
    filterTags: ["premium", "vanilie"],
    filling: "cremă de cocos, migdale crocante și blat fin de vanilie",
    shortFlavor: "cocos fin și cremă aerată",
    badge: "Recomandat",
    badgeTone: "emerald",
    image: PHOTO_LIBRARY.pearl,
    gallery: [PHOTO_LIBRARY.ivory],
    style: "minimal",
    marime: "20 cm / 2 kg",
    levels: 1,
    aromas: ["Cocos și vanilie", "Raffaello cu migdale"],
    ingredients: ["fulgi de cocos", "migdale", "vanilie", "mascarpone", "frișcă"],
    allergens: ["migdale", "ouă", "lactoză"],
    categoryLabel: "Botez",
    collectionNote: "Alb, delicat și impecabil în fotografii",
    featuredRank: 7,
  },
  {
    slug: "snickers",
    name: "Tort Snickers",
    description: "Blat dens de cacao, caramel sărat și arahide crocante pentru petreceri energice și evenimente corporate.",
    price: 880,
    prepHours: 32,
    portii: 14,
    servingLabel: "14 porții",
    occasions: ["zi de naștere", "corporate"],
    filterTags: ["ciocolată", "premium"],
    filling: "cremă de vanilie, caramel sărat și nuci crocante",
    shortFlavor: "caramel sărat și cacao intensă",
    badge: "Popular",
    badgeTone: "rose",
    image: PHOTO_LIBRARY.darkTwo,
    gallery: [PHOTO_LIBRARY.cosmos],
    style: "modern",
    marime: "20 cm / 2.1 kg",
    levels: 1,
    aromas: ["Snickers clasic", "Snickers cu caramel"],
    ingredients: ["cacao", "caramel sărat", "arahide", "unt", "ciocolată"],
    allergens: ["alune", "gluten", "lactoză", "ouă"],
    categoryLabel: "Zi de naștere",
    collectionNote: "Favoritul invitaților care iubesc contrastele",
    featuredRank: 5,
  },
  {
    slug: "mango-pasiune",
    name: "Tort Mango și Fructul Pasiunii",
    description: "Proaspăt, vibrant și contemporan, cu inserție tropicală și mousse ușor pentru mese elegante de vară.",
    price: 840,
    prepHours: 30,
    portii: 14,
    servingLabel: "12-14 porții",
    occasions: ["aniversare", "corporate"],
    filterTags: ["fructe", "premium"],
    filling: "mousse de mango, cremă ușoară și insert de fructul pasiunii",
    shortFlavor: "note tropicale și aciditate fină",
    badge: "Nou",
    badgeTone: "emerald",
    image: ARTWORKS.mango,
    gallery: [PHOTO_LIBRARY.spring],
    style: "modern",
    marime: "18 cm / 1.8 kg",
    levels: 1,
    aromas: ["Mango tropical", "Mango cu pasiune"],
    ingredients: ["mango", "fructul pasiunii", "frișcă", "vanilie", "gelatină"],
    allergens: ["lactoză", "ouă"],
    categoryLabel: "Aniversare",
    collectionNote: "Pentru mese luminoase și elegante",
    featuredRank: 9,
  },
  {
    slug: "diplomat",
    name: "Tort Diplomat",
    description: "Cremă de vanilie, fructe proaspete și blat pufos într-o alegere clasică, luminoasă și ușor de iubit.",
    price: 690,
    prepHours: 24,
    portii: 12,
    servingLabel: "12 porții",
    occasions: ["botez", "zi de naștere"],
    filterTags: ["vanilie", "fructe"],
    filling: "cremă de vanilie, fructe proaspete și blat pufos",
    shortFlavor: "vanilie curată și textură lejeră",
    badge: "Clasic",
    badgeTone: "amber",
    image: PHOTO_LIBRARY.peony,
    gallery: [PHOTO_LIBRARY.fruit],
    style: "clasic",
    marime: "18 cm / 1.6 kg",
    levels: 1,
    aromas: ["Diplomat cu ananas", "Diplomat cu fructe de sezon"],
    ingredients: ["vanilie", "frișcă", "ananas", "portocale", "pișcoturi"],
    allergens: ["gluten", "ouă", "lactoză"],
    categoryLabel: "Botez",
    collectionNote: "Elegant, luminos și foarte ofertant",
    featuredRank: 10,
  },
  {
    slug: "napoleon",
    name: "Tort Napoleon",
    description: "Foi crocante și cremă fină de vanilie într-un desert sofisticat, inspirat de cofetăria clasică europeană.",
    price: 760,
    prepHours: 28,
    portii: 12,
    servingLabel: "12 porții",
    occasions: ["aniversare"],
    filterTags: ["vanilie", "premium"],
    filling: "foi fine, cremă de vanilie și unt, cu textură delicată",
    shortFlavor: "foi crocante și aromă intensă de vanilie",
    badge: "Recomandat",
    badgeTone: "amber",
    image: ARTWORKS.napoleon,
    gallery: [PHOTO_LIBRARY.soft],
    style: "clasic",
    marime: "18 cm / 1.7 kg",
    levels: 1,
    aromas: ["Napoleon clasic", "Napoleon cu vanilie Madagascar"],
    ingredients: ["foietaj artizanal", "unt", "lapte", "vanilie", "zahăr"],
    allergens: ["gluten", "ouă", "lactoză"],
    categoryLabel: "Aniversare",
    collectionNote: "Textură impecabilă, gust de cofetărie fină",
    featuredRank: 11,
  },
  {
    slug: "caramel-sarat",
    name: "Tort Caramel Sărat",
    description: "Cremă bogată, caramel brun și un echilibru clar între dulce și sărat pentru palate mature și comenzi elegante.",
    price: 850,
    prepHours: 30,
    portii: 14,
    servingLabel: "14 porții",
    occasions: ["corporate", "zi de naștere"],
    filterTags: ["premium", "ciocolată"],
    filling: "cremă de vanilie, caramel sărat și nuci crocante",
    shortFlavor: "caramel brun și note ușor sărate",
    badge: "Recomandat",
    badgeTone: "amber",
    image: PHOTO_LIBRARY.cosmosAlt,
    gallery: [ARTWORKS.caramel],
    style: "modern",
    marime: "20 cm / 2 kg",
    levels: 1,
    aromas: ["Caramel sărat", "Caramel cu vanilie"],
    ingredients: ["caramel artizanal", "vanilie", "unt", "smântână", "nuci"],
    allergens: ["lactoză", "gluten", "nuci"],
    categoryLabel: "Corporate",
    collectionNote: "Pentru palate mature și evenimente elegante",
    featuredRank: 12,
  },
  {
    slug: "fistic-zmeura",
    name: "Tort Fistic și Zmeură",
    description: "Cea mai cerută combinație premium, cu cremă de fistic, zmeură proaspătă și un finisaj actual, foarte curat.",
    price: 980,
    prepHours: 34,
    portii: 14,
    servingLabel: "14 porții",
    occasions: ["aniversare", "botez"],
    filterTags: ["premium", "fructe"],
    filling: "cremă de fistic și zmeură proaspătă",
    shortFlavor: "fistic fin și zmeură vie",
    badge: "Semnătură",
    badgeTone: "emerald",
    image: ARTWORKS.pistachio,
    gallery: [PHOTO_LIBRARY.berriesAlt],
    style: "floral",
    marime: "20 cm / 2 kg",
    levels: 1,
    aromas: ["Fistic și zmeură", "Fistic cu vanilie"],
    ingredients: ["pastă de fistic", "zmeură", "mascarpone", "frișcă", "migdale"],
    allergens: ["migdale", "fistic", "ouă", "lactoză"],
    categoryLabel: "Premium",
    collectionNote: "Cea mai cerută combinație premium",
    featuredRank: 1,
  },
  {
    slug: "capsuni-si-crema-de-vanilie",
    name: "Tort Căpșuni și Cremă de Vanilie",
    description: "Luminos, vesel și foarte fotogenic, cu cremă fină de vanilie și căpșuni proaspete pentru sărbători de familie.",
    price: 760,
    prepHours: 24,
    portii: 12,
    servingLabel: "12 porții",
    occasions: ["zi de naștere", "botez"],
    filterTags: ["fructe", "vanilie"],
    filling: "cremă de vanilie, căpșuni proaspete și blat ușor",
    shortFlavor: "vanilie aerată și căpșuni proaspete",
    badge: "Popular",
    badgeTone: "rose",
    image: PHOTO_LIBRARY.berries,
    gallery: [PHOTO_LIBRARY.berriesAlt],
    style: "floral",
    marime: "18 cm / 1.7 kg",
    levels: 1,
    aromas: ["Căpșuni și vanilie", "Căpșuni cu mascarpone"],
    ingredients: ["căpșuni", "vanilie", "mascarpone", "ouă", "unt"],
    allergens: ["gluten", "ouă", "lactoză"],
    categoryLabel: "Zi de naștere",
    collectionNote: "Perfect pentru sărbători de familie",
    featuredRank: 13,
  },
  {
    slug: "oreo",
    name: "Tort Oreo",
    description: "Cremos și intens, cu textură crocantă și cremă cu biscuiți, foarte apreciat la petreceri și mese festive premium.",
    price: 790,
    prepHours: 28,
    portii: 14,
    servingLabel: "12-14 porții",
    occasions: ["zi de naștere", "corporate"],
    filterTags: ["ciocolată", "premium"],
    filling: "cremă cu biscuiți Oreo și mousse fin de cacao",
    shortFlavor: "biscuiți crocanți și cremă densă",
    badge: "Popular",
    badgeTone: "slate",
    image: PHOTO_LIBRARY.cosmosDark,
    gallery: [PHOTO_LIBRARY.cosmos],
    style: "modern",
    marime: "20 cm / 2 kg",
    levels: 1,
    aromas: ["Oreo clasic", "Oreo cu vanilie"],
    ingredients: ["biscuiți Oreo", "cacao", "frișcă", "unt", "ciocolată albă"],
    allergens: ["gluten", "ouă", "lactoză"],
    categoryLabel: "Corporate",
    collectionNote: "Modern și ușor de comandat pentru petreceri",
    featuredRank: 14,
  },
  {
    slug: "ciocolata-belgiana",
    name: "Tort Ciocolată Belgiană",
    description: "Blat umed de cacao și cremă bogată de ciocolată belgiană pentru deserturi premium cu profil intens.",
    price: 890,
    prepHours: 30,
    portii: 14,
    servingLabel: "14 porții",
    occasions: ["corporate", "aniversare"],
    filterTags: ["ciocolată", "premium"],
    filling: "ganache de ciocolată belgiană și cremă catifelată de cacao",
    shortFlavor: "cacao intensă și ganache bogat",
    badge: "Semnătură",
    badgeTone: "slate",
    image: PHOTO_LIBRARY.cosmos,
    gallery: [PHOTO_LIBRARY.darkOne],
    style: "modern",
    marime: "20 cm / 2.2 kg",
    levels: 1,
    aromas: ["Ciocolată belgiană", "Ciocolată cu vișine"],
    ingredients: ["ciocolată belgiană", "cacao", "frișcă", "unt", "ouă"],
    allergens: ["lactoză", "ouă"],
    categoryLabel: "Aniversare",
    collectionNote: "Pentru comenzi premium cu profil intens",
    featuredRank: 15,
  },
  {
    slug: "nunta-elegant",
    name: "Tort Nuntă Elegant",
    description: "Tort etajat cu linii curate, finisaj sofisticat și echilibru perfect între estetică și gust pentru ceremonii memorabile.",
    price: 2200,
    prepHours: 72,
    portii: 32,
    servingLabel: "28-34 porții",
    occasions: ["nuntă"],
    filterTags: ["premium", "etajat", "vanilie"],
    filling: "blat de vanilie, cremă mascarpone și fructe fine de sezon",
    shortFlavor: "vanilie fină și decor floral elegant",
    badge: "Premium",
    badgeTone: "amber",
    image: PHOTO_LIBRARY.royal,
    gallery: [PHOTO_LIBRARY.lambeth, PHOTO_LIBRARY.signature],
    style: "minimal",
    marime: "2 niveluri / 4.5 kg",
    levels: 2,
    aromas: ["Vanilie și fructe fine", "Champagne și zmeură"],
    ingredients: ["vanilie", "mascarpone", "frișcă", "fructe de sezon", "unt"],
    allergens: ["gluten", "ouă", "lactoză"],
    categoryLabel: "Nuntă",
    collectionNote: "Colecția premium pentru ceremonii",
    featuredRank: 16,
  },
];

const PRESET_BY_SLUG = new Map(CURATED_CAKES.map((preset) => [preset.slug, preset]));
const PRESET_RULES = [
  { slug: "red-velvet", keywords: ["red velvet", "velvet"] },
  { slug: "medovik", keywords: ["medovik", "miere"] },
  { slug: "trio-de-ciocolata", keywords: ["trio", "trei ciocol", "3 ciocol"] },
  { slug: "vanilie-fructe-de-padure", keywords: ["fructe de padure", "fructe", "vanilie"] },
  { slug: "ferrero", keywords: ["ferrero", "gianduja"] },
  { slug: "raffaello", keywords: ["raffaello", "cocos"] },
  { slug: "snickers", keywords: ["snickers", "caramel", "arahide"] },
  { slug: "mango-pasiune", keywords: ["mango", "pasiunii", "passion"] },
  { slug: "diplomat", keywords: ["diplomat"] },
  { slug: "napoleon", keywords: ["napoleon"] },
  { slug: "caramel-sarat", keywords: ["caramel sarat", "caramel"] },
  { slug: "fistic-zmeura", keywords: ["fistic", "zmeura"] },
  { slug: "capsuni-si-crema-de-vanilie", keywords: ["capsuni", "căpșuni"] },
  { slug: "oreo", keywords: ["oreo"] },
  { slug: "ciocolata-belgiana", keywords: ["ciocolata belg", "ciocolata"] },
  { slug: "nunta-elegant", keywords: ["nunta", "wedding"] },
];

function detectPresetByName(name) {
  const normalized = normalizeStorefrontText(name);
  if (!normalized) return null;

  const matched = PRESET_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeStorefrontText(keyword)))
  );

  return matched ? PRESET_BY_SLUG.get(matched.slug) || null : null;
}

function pickStablePreset(item, index = 0) {
  const seed = String(item?._id || item?.id || item?.nume || index || "maison-douce");
  const hash = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return CURATED_CAKES[Math.abs(hash) % CURATED_CAKES.length];
}

function deriveFilterTags(item, preset, occasions) {
  const text = normalizeStorefrontText(
    [
      item?.nume,
      item?.descriere,
      ...(Array.isArray(item?.ingrediente) ? item.ingrediente : []),
      ...(Array.isArray(item?.arome) ? item.arome : []),
    ].join(" ")
  );
  const tags = [...preset.filterTags];

  if (text.includes("ciocol")) tags.push("ciocolată");
  if (text.includes("fruct") || text.includes("zmeura") || text.includes("capsun") || text.includes("mango")) tags.push("fructe");
  if (text.includes("vanilie")) tags.push("vanilie");
  if ((item?.niveluri || preset.levels || 1) > 1 || occasions.includes("nuntă")) tags.push("etajat");
  if (preset.price >= 900 || occasions.includes("nuntă")) tags.push("premium");

  return uniqueList(tags);
}

function buildSearchText(item, preset, occasions, tags, ingredients) {
  return normalizeStorefrontText(
    [
      item.nume,
      item.descriere,
      preset.filling,
      preset.shortFlavor,
      preset.collectionNote,
      preset.categoryLabel,
      ...occasions,
      ...tags,
      ...ingredients,
      ...(Array.isArray(item.arome) ? item.arome : []),
    ].join(" ")
  );
}

function formatLeadTimeLabel(hours = 0) {
  const numericHours = Math.max(24, Number(hours || 0));
  if (numericHours >= 72) {
    return `Comanda cu minim ${Math.ceil(numericHours / 24)} zile inainte.`;
  }
  return `Comanda cu minim ${numericHours}h inainte.`;
}

function deriveStorageSummary({ ingredients = [], prepHours = 24, levels = 1 }) {
  const profile = normalizeStorefrontText(ingredients.join(" "));
  const softenWindow = prepHours >= 48 || levels > 1 ? "30-40" : "20-30";

  if (
    profile.includes("mascarpone") ||
    profile.includes("frisca") ||
    profile.includes("smantana") ||
    profile.includes("mousse")
  ) {
    return `Pastreaza la 2-6C si scoate tortul cu ${softenWindow} minute inainte de servire pentru o textura mai buna.`;
  }

  if (profile.includes("ciocol") || profile.includes("ganache") || profile.includes("caramel")) {
    return `Pastreaza la rece, ferit de caldura directa, si lasa tortul ${softenWindow} minute la temperatura camerei inainte de servire.`;
  }

  return `Pastreaza la rece si scoate tortul cu ${softenWindow} minute inainte de servire.`;
}

function getCommercialTypeLabel(pricingMode) {
  if (pricingMode === "preview") return "Model de inspiratie";
  if (pricingMode === "quote") return "Produs cu confirmare manuala";
  return "Produs cu pret fix";
}

function getCustomizationSummary(pricingMode) {
  if (pricingMode === "fixed") {
    return "Pretul afisat acopera varianta standard a produsului. Pentru alta marime, mai multe portii, etaje suplimentare sau decor personalizat, foloseste constructorul 2D.";
  }

  if (pricingMode === "quote") {
    return "Acest produs necesita confirmare manuala de pret si disponibilitate. Pentru modificari importante sau cerinte speciale, trimite cererea de oferta sau porneste din constructor.";
  }

  return "Modelul este afisat ca inspiratie vizuala. Il poti folosi pentru comparatie, pentru constructor sau pentru o cerere personalizata catre atelier.";
}

function buildVirtualCake(preset, index) {
  return {
    __catalogFallback: true,
    _id: `curated-${preset.slug}`,
    nume: preset.name,
    descriere: preset.description,
    imagine: preset.image,
    galerie: preset.gallery,
    pret: preset.price,
    arome: preset.aromas,
    ingrediente: preset.ingredients,
    ocazii: preset.occasions,
    stil: preset.style,
    marime: preset.marime,
    portii: preset.portii,
    timpPreparareOre: preset.prepHours,
    niveluri: preset.levels,
    alergeniFolositi: preset.allergens,
    ratingAvg: 0,
    ratingCount: 0,
    activ: true,
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
  };
}

export function getStorefrontCake(item, index = 0) {
  const matchedPreset = detectPresetByName(item?.nume);
  const preset = matchedPreset || pickStablePreset(item, index);
  const isCatalogFallback =
    item?.__catalogFallback === true || String(item?._id || "").startsWith("curated-");
  const hasFixedPrice = isRealisticPrice(item?.pret);
  const pricingMode = isCatalogFallback ? "preview" : hasFixedPrice ? "fixed" : "quote";
  const usePresetIdentity =
    isTechnicalName(item?.nume) || !hasUsefulText(item?.nume, 6) || Boolean(matchedPreset);
  const occasions = uniqueList(
    (Array.isArray(item?.ocazii) ? item.ocazii : [item?.ocazii])
      .map(formatOccasion)
      .filter(Boolean)
  );
  const effectiveOccasions = occasions.length ? occasions : preset.occasions;
  const ingredients =
    Array.isArray(item?.ingrediente) && item.ingrediente.length >= 3
      ? item.ingrediente
      : preset.ingredients;
  const image = hasUsableImage(item?.imagine) ? item.imagine : preset.image;
  const gallery = uniqueList([
    image,
    ...(Array.isArray(item?.galerie) ? item.galerie.filter(hasUsableImage) : []),
    ...(Array.isArray(preset.gallery) ? preset.gallery : []),
  ]).slice(0, 4);
  const tags = deriveFilterTags(item, preset, effectiveOccasions);
  const ratingAvg = Number(item?.ratingAvg || 0);
  const ratingCount = Number(item?.ratingCount || 0);
  const prepHours =
    Number(item?.timpPreparareOre || 0) > 0 ? Number(item.timpPreparareOre) : preset.prepHours;
  const portii = Number(item?.portii || 0) > 0 ? Number(item.portii) : preset.portii;
  const marime = hasUsefulText(item?.marime, 3) ? String(item.marime).trim() : preset.marime;
  const arome = Array.isArray(item?.arome) && item.arome.length ? item.arome : preset.aromas;
  const alergeni =
    Array.isArray(item?.alergeniFolositi) && item.alergeniFolositi.length
      ? item.alergeniFolositi
      : preset.allergens;
  const niveluri = Number(item?.niveluri || 0) > 0 ? Number(item.niveluri) : preset.levels;
  const commercialTypeLabel = getCommercialTypeLabel(pricingMode);
  const leadTimeLabel = formatLeadTimeLabel(prepHours);
  const deliverySummary =
    pricingMode === "fixed"
      ? "Ridicare gratuita din atelier sau livrare la domiciliu pentru 100 MDL, cu programare din calendarul de checkout."
      : "Data, ora si metoda de predare se confirma manual inainte de executie si plata finala.";
  const storageSummary = deriveStorageSummary({
    ingredients,
    prepHours,
    levels: niveluri,
  });
  const servingSummary =
    portii > 0
      ? `Formatul standard este gandit pentru aproximativ ${portii} portii.`
      : "Formatul standard este stabilit in functie de compozitie.";
  const customizationSummary = getCustomizationSummary(pricingMode);
  const badge =
    ratingAvg > 0 || ratingCount > 0
      ? null
      : isCatalogFallback
        ? {
            label: "Inspiratie",
            tone: "amber",
          }
        : pricingMode === "quote"
          ? {
              label: "La cerere",
              tone: "slate",
            }
          : {
              label: preset.badge,
              tone: preset.badgeTone,
            };

  const storefrontCake = {
    ...item,
    _id: item?._id || `curated-${preset.slug}`,
    id: item?._id || `curated-${preset.slug}`,
    slug: preset.slug,
    nume: usePresetIdentity ? preset.name : String(item?.nume || preset.name).trim(),
    descriere:
      hasUsefulText(item?.descriere, 26) && !isTechnicalName(item?.descriere)
        ? String(item.descriere).trim()
        : preset.description,
    imagine: image,
    galerie: gallery,
    pret:
      pricingMode === "fixed"
        ? Math.round(Number(item?.pret || 0))
        : pricingMode === "preview"
          ? preset.price
          : 0,
    ratingAvg,
    ratingCount,
    ocazii: effectiveOccasions,
    displayTags: tags,
    fillingSummary: preset.filling,
    shortFlavor: preset.shortFlavor,
    badge,
    timpPreparareOre: prepHours,
    prepLabel: prepHours >= 48 ? `pregătit în ${prepHours}h` : `gata în ${prepHours}h`,
    servingLabel: portii > 0 ? `${portii} porții` : preset.servingLabel,
    portii,
    marime,
    arome,
    ingrediente: ingredients,
    alergeniFolositi: alergeni,
    stil: hasUsefulText(item?.stil, 3) ? String(item.stil).trim() : preset.style,
    niveluri,
    categoryLabel: preset.categoryLabel,
    collectionNote: preset.collectionNote,
    featuredRank: preset.featuredRank,
    sourceType: isCatalogFallback ? "local-fallback" : "backend-mapped",
    pricingMode,
    checkoutReady: pricingMode === "fixed",
    requiresManualQuote: pricingMode !== "fixed",
    commercialTypeLabel,
    leadTimeLabel,
    deliverySummary,
    storageSummary,
    servingSummary,
    customizationSummary,
    checkoutSummary:
      pricingMode === "fixed"
        ? "Produsul intra direct in checkout doar in varianta standard afisata pe aceasta pagina."
        : "Fluxul continua prin cerere de oferta sau confirmare manuala, nu direct prin plata standard.",
  };

  storefrontCake.searchText = buildSearchText(
    storefrontCake,
    preset,
    effectiveOccasions,
    tags,
    ingredients
  );

  return repairStorefrontValue(storefrontCake);
}

export function getStorefrontCatalogItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return CURATED_CAKES.map((preset, index) =>
      getStorefrontCake(buildVirtualCake(preset, index), index)
    );
  }

  return items.map((item, index) => getStorefrontCake(item, index));
}

export function getStorefrontFallbackCakeById(id) {
  const preset = CURATED_CAKES.find((item) => `curated-${item.slug}` === String(id || "").trim());
  if (!preset) return null;
  const index = CURATED_CAKES.findIndex((item) => item.slug === preset.slug);
  return getStorefrontCake(buildVirtualCake(preset, index), index);
}

export { normalizeStorefrontText, repairStorefrontText };
