function buildFillingIllustration({
  label,
  top = "#fff8f3",
  bottom = "#f2ddd7",
  cream = "#f7efe6",
  sponge = "#e2c39d",
  accent = "#d98ca1",
  drizzle = "#b7865d",
  garnish = "#fff7f0",
  garnishAccent = "#b4895f",
}) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${top}" />
          <stop offset="100%" stop-color="${bottom}" />
        </linearGradient>
        <linearGradient id="cream" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${cream}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="20" stdDeviation="22" flood-color="#6b4f47" flood-opacity="0.16" />
        </filter>
      </defs>

      <rect width="960" height="720" fill="url(#bg)" />
      <circle cx="210" cy="130" r="95" fill="${accent}" opacity="0.09" />
      <circle cx="760" cy="170" r="120" fill="${drizzle}" opacity="0.08" />
      <ellipse cx="485" cy="590" rx="250" ry="52" fill="#f4e4d8" opacity="0.92" />

      <g filter="url(#shadow)">
        <path d="M285 455 L430 210 C445 184 477 172 505 181 L694 236 C730 246 754 281 748 318 L721 505 C717 536 689 560 658 560 H348 C304 560 270 517 285 455Z" fill="#fffdf9" />
        <path d="M327 487 L448 236 C458 214 482 204 505 211 L651 250 C676 257 693 280 690 306 L672 461 H327Z" fill="${sponge}" />
        <path d="M337 421 C381 373 425 343 474 333 C525 323 575 332 640 362 L665 408 L647 458 H327Z" fill="url(#cream)" />
        <path d="M342 365 C382 328 423 305 474 296 C529 286 576 297 642 332" fill="none" stroke="${drizzle}" stroke-width="18" stroke-linecap="round" />
        <path d="M352 340 C391 304 433 279 487 272 C546 264 589 279 651 315" fill="none" stroke="${garnish}" stroke-width="26" stroke-linecap="round" />
        <path d="M360 319 C401 283 444 258 496 254 C550 250 596 265 657 302" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" />
        <circle cx="622" cy="248" r="20" fill="${garnishAccent}" />
        <circle cx="570" cy="218" r="15" fill="${garnish}" />
        <circle cx="658" cy="284" r="12" fill="${accent}" />
        <circle cx="515" cy="206" r="10" fill="${garnishAccent}" opacity="0.95" />
      </g>

      <text x="480" y="655" text-anchor="middle" font-family="'Playfair Display', serif" font-size="42" fill="#4b3a34">${label}</text>
      <text x="480" y="689" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="4" fill="#8b7065">UMPLUTURA MAISON-DOUCE</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const CATALOG_FILLINGS = [
  {
    id: "crema-vanilie",
    name: "Cremă de vanilie",
    image: buildFillingIllustration({
      label: "Vanilie",
      top: "#fffaf5",
      bottom: "#f2e3d5",
      cream: "#fff8ee",
      accent: "#f4d8aa",
      drizzle: "#c6945e",
      garnish: "#fffdf9",
      garnishAccent: "#ba8a58",
    }),
    shortDescription:
      "Fină, luminoasă și delicată, ideală pentru torturi clasice de aniversare și combinații cu fructe proaspete.",
    aromaticProfile:
      "Cremă catifelată cu vanilie, textură aerată și gust curat, foarte potrivită pentru blaturi pufoase și finisaje elegante.",
    category: "Clasică",
    priceExtra: 60,
    pairing: "blat de vanilie sau red velvet",
    textureLabel: "textură fină și aerată",
    recommendation: "Preferată pentru torturi aniversare",
    catalogKeywords: ["vanilie", "mascarpone", "fructe", "diplomat"],
    recommendedCatalogSlugs: [
      "vanilie-fructe-de-padure",
      "diplomat",
      "napoleon",
      "capsuni-si-crema-de-vanilie",
      "nunta-elegant",
    ],
  },
  {
    id: "ganache-ciocolata",
    name: "Ganache de ciocolată",
    image: buildFillingIllustration({
      label: "Ganache",
      top: "#fbf5f1",
      bottom: "#e7d5ca",
      cream: "#7b5648",
      sponge: "#c99d76",
      accent: "#4a2d25",
      drizzle: "#7f4b34",
      garnish: "#f4e1d3",
      garnishAccent: "#b47c56",
    }),
    shortDescription:
      "Intensă și bogată, cu gust profund de cacao, perfectă pentru torturi premium și colecții elegante cu ciocolată.",
    aromaticProfile:
      "Ganache dens, lucios și echilibrat, cu note ample de cacao și o textură mătăsoasă care oferă structură și profunzime.",
    category: "Ciocolată",
    priceExtra: 95,
    pairing: "blat umed de cacao sau Ferrero",
    textureLabel: "densă și mătăsoasă",
    recommendation: "Excelentă pentru torturi statement",
    catalogKeywords: ["ciocolata", "ganache", "cacao", "ferrero"],
    recommendedCatalogSlugs: [
      "trio-de-ciocolata",
      "ferrero",
      "oreo",
      "ciocolata-belgiana",
    ],
  },
  {
    id: "mascarpone-fructe",
    name: "Cremă mascarpone cu fructe",
    image: buildFillingIllustration({
      label: "Mascarpone",
      top: "#fff9f4",
      bottom: "#f0d8dd",
      cream: "#fff7f7",
      sponge: "#e2c49f",
      accent: "#d96d8d",
      drizzle: "#bc6d86",
      garnish: "#ffe9ef",
      garnishAccent: "#c15275",
    }),
    shortDescription:
      "Lejeră, cremoasă și foarte proaspătă, cu note fructate ce aduc luminozitate torturilor feminine și festive.",
    aromaticProfile:
      "Mascarpone aerat cu accent fructat, echilibru între onctuozitate și prospețime, ideal pentru compoziții romantice.",
    category: "Fructată",
    priceExtra: 85,
    pairing: "blat de vanilie și fructe de pădure",
    textureLabel: "proaspătă și catifelată",
    recommendation: "Perfectă pentru botez și aniversări",
    catalogKeywords: ["mascarpone", "fructe", "zmeura", "capsuni"],
    recommendedCatalogSlugs: [
      "vanilie-fructe-de-padure",
      "capsuni-si-crema-de-vanilie",
      "fistic-zmeura",
      "nunta-elegant",
    ],
  },
  {
    id: "caramel-sarat",
    name: "Caramel sărat",
    image: buildFillingIllustration({
      label: "Caramel",
      top: "#fff8f2",
      bottom: "#ecd8c9",
      cream: "#d8aa72",
      sponge: "#d4b18a",
      accent: "#9a603d",
      drizzle: "#7c4c32",
      garnish: "#f7ead8",
      garnishAccent: "#be8958",
    }),
    shortDescription:
      "Seducător și matur, cu contrast dulce-sărat discret, potrivit pentru torturi premium și combinații intense.",
    aromaticProfile:
      "Caramel brun cu note fine de sare, textură fluidă și rotundă, foarte potrivit pentru compoziții cu nuci sau ciocolată.",
    category: "Premium",
    priceExtra: 90,
    pairing: "Snickers, vanilie sau nuci pralinate",
    textureLabel: "onctuos cu final intens",
    recommendation: "Foarte cerut pentru evenimente corporate",
    catalogKeywords: ["caramel sarat", "caramel", "arahide", "nuci"],
    recommendedCatalogSlugs: ["snickers", "caramel-sarat", "ferrero"],
  },
  {
    id: "mousse-ciocolata",
    name: "Mousse de ciocolată",
    image: buildFillingIllustration({
      label: "Mousse",
      top: "#faf4ef",
      bottom: "#e5d4cf",
      cream: "#9a6f62",
      sponge: "#c79e80",
      accent: "#553933",
      drizzle: "#6d433a",
      garnish: "#f2dfd8",
      garnishAccent: "#ae715d",
    }),
    shortDescription:
      "Aerată și rafinată, cu senzație de desert franțuzesc, pentru torturi elegante cu profil fin de cacao.",
    aromaticProfile:
      "Mousse delicat de ciocolată, foarte ușor și catifelat, ideal când vrei o secțiune elegantă și o textură mai fină.",
    category: "Ciocolată",
    priceExtra: 100,
    pairing: "trio de ciocolată sau vișine",
    textureLabel: "foarte aerată și fină",
    recommendation: "Ideală pentru secțiuni premium",
    catalogKeywords: ["mousse", "ciocolata", "trio"],
    recommendedCatalogSlugs: ["trio-de-ciocolata", "ciocolata-belgiana", "oreo"],
  },
  {
    id: "crema-fistic",
    name: "Cremă de fistic",
    image: buildFillingIllustration({
      label: "Fistic",
      top: "#f8fbf3",
      bottom: "#e1e8d8",
      cream: "#dbe8bc",
      sponge: "#d7c2a2",
      accent: "#98af69",
      drizzle: "#7f9562",
      garnish: "#edf5dc",
      garnishAccent: "#b35a76",
    }),
    shortDescription:
      "Bogată, elegantă și actuală, cu aromă nobilă de fistic, foarte potrivită pentru torturi de semnătură.",
    aromaticProfile:
      "Cremă densă de fistic, cu final fin și nobil, excelentă în combinații cu zmeură, vanilie sau fructe roșii.",
    category: "Semnătură",
    priceExtra: 120,
    pairing: "zmeură, vanilie, blat alb",
    textureLabel: "cremoasă și sofisticată",
    recommendation: "Una dintre cele mai cerute umpluturi",
    catalogKeywords: ["fistic", "zmeura", "premium"],
    recommendedCatalogSlugs: ["fistic-zmeura", "nunta-elegant"],
  },
  {
    id: "crema-cocos-raffaello",
    name: "Cremă de cocos tip Raffaello",
    image: buildFillingIllustration({
      label: "Cocos",
      top: "#fffdf9",
      bottom: "#ece7df",
      cream: "#fffbf7",
      sponge: "#ddc3a4",
      accent: "#d6d0c3",
      drizzle: "#b49b7e",
      garnish: "#ffffff",
      garnishAccent: "#dcb67f",
    }),
    shortDescription:
      "Delicată, albă și elegantă, cu cocos fin și notă de desert festiv, ideală pentru torturi luminoase și curate.",
    aromaticProfile:
      "Cremă aerată de cocos cu profil suav și foarte feminin, potrivită pentru compoziții elegante și decoruri minimaliste.",
    category: "Elegantă",
    priceExtra: 85,
    pairing: "vanilie, migdale și decor alb",
    textureLabel: "aerată și delicată",
    recommendation: "Minunată pentru botez și mese luminoase",
    catalogKeywords: ["raffaello", "cocos", "migdale", "vanilie"],
    recommendedCatalogSlugs: ["raffaello", "nunta-elegant"],
  },
  {
    id: "crema-lamaie",
    name: "Cremă de lămâie",
    image: buildFillingIllustration({
      label: "Lămâie",
      top: "#fffdf2",
      bottom: "#f1ebc9",
      cream: "#fff6bf",
      sponge: "#dfc49e",
      accent: "#d9c64f",
      drizzle: "#b9a93c",
      garnish: "#fffce3",
      garnishAccent: "#a08b48",
    }),
    shortDescription:
      "Revigorantă și luminoasă, cu aciditate fină, perfectă pentru torturi fresh și combinații de primăvară-vară.",
    aromaticProfile:
      "Cremă cu lămâie echilibrată, proaspătă și curată, excelentă pentru torturi ușoare și texturi elegante.",
    category: "Fresh",
    priceExtra: 70,
    pairing: "vanilie, fructe de pădure, bezea",
    textureLabel: "fresh și echilibrată",
    recommendation: "Adaugă prospețime torturilor feminine",
    catalogKeywords: ["lamaie", "fresh", "fructe", "vanilie"],
    recommendedCatalogSlugs: [
      "mango-pasiune",
      "vanilie-fructe-de-padure",
      "diplomat",
      "capsuni-si-crema-de-vanilie",
    ],
  },
  {
    id: "crema-cafea",
    name: "Cremă de cafea",
    image: buildFillingIllustration({
      label: "Cafea",
      top: "#fbf5f0",
      bottom: "#e8d8cf",
      cream: "#dcc5b2",
      sponge: "#cfb08f",
      accent: "#8c664f",
      drizzle: "#6f4b39",
      garnish: "#f3e6db",
      garnishAccent: "#b28564",
    }),
    shortDescription:
      "Rafinată și matură, cu notă discretă de espresso, potrivită pentru torturi elegante și deserturi cu personalitate.",
    aromaticProfile:
      "Cremă cu cafea fină, gust rotund și sofisticat, ideală pentru asocieri cu ciocolată, nuci sau mascarpone.",
    category: "Rafinată",
    priceExtra: 80,
    pairing: "ciocolată, tiramisu, nuci",
    textureLabel: "fină și aromată",
    recommendation: "Foarte bună pentru comenzi corporate",
    catalogKeywords: ["cafea", "espresso", "ciocolata", "nuci"],
    recommendedCatalogSlugs: ["oreo", "trio-de-ciocolata", "ciocolata-belgiana", "ferrero"],
  },
  {
    id: "crema-arahide-snickers",
    name: "Cremă de arahide tip Snickers",
    image: buildFillingIllustration({
      label: "Arahide",
      top: "#fbf5ef",
      bottom: "#ead8cb",
      cream: "#ceb083",
      sponge: "#d4b392",
      accent: "#9e6b45",
      drizzle: "#6e4a33",
      garnish: "#f4e2ce",
      garnishAccent: "#c3884e",
    }),
    shortDescription:
      "Intensă, crocantă și foarte satisfăcătoare, perfectă pentru torturi spectaculoase cu caramel și ciocolată.",
    aromaticProfile:
      "Cremă bogată de arahide, cu final pralinat și textură amplă, ideală pentru compoziții energice și indulgente.",
    category: "Gurmandă",
    priceExtra: 95,
    pairing: "caramel sărat și blat de cacao",
    textureLabel: "bogată și intensă",
    recommendation: "Pentru torturi cu profil Snickers",
    catalogKeywords: ["snickers", "arahide", "caramel", "ciocolata"],
    recommendedCatalogSlugs: ["snickers", "caramel-sarat", "ferrero"],
  },
];
