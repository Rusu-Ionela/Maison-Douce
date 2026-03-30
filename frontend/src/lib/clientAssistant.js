import { canAccessLink, getContextLinks, getVisibleSections } from "./siteMap";
import { APP_CONTACT, ASSISTANT_STARTER_QUESTIONS } from "./publicSiteConfig";

const CONTACT_EMAIL = APP_CONTACT.email;
const CONTACT_PHONE = APP_CONTACT.phoneDisplay;
const CONTACT_PHONE_URI = APP_CONTACT.phoneUri;
const CONTACT_EMAIL_URI = APP_CONTACT.emailUri;

export const STARTER_QUESTIONS = ASSISTANT_STARTER_QUESTIONS;

const INTENTS = [
  {
    id: "constructor",
    keywords: [
      "constructor",
      "constructor 2d",
      "2d",
      "design tort",
      "personalizare",
      "personalizez",
      "nu gasesc constructor",
    ],
    buildResponse: ({ user }) => ({
      text:
        "Constructorul 2D este in pagina /constructor. Acolo alegi compozitia, decorul si mesajul, apoi poti salva draftul sau trimite conceptul catre patiser.",
      actions: [
        createRouteAction("Deschide constructorul", "/constructor"),
        createRouteAction("Ghid de utilizare", "/personalizeaza"),
        user
          ? createRouteAction("Chat cu patiserul", "/chat")
          : createRouteAction("Contact atelier", "/contact"),
      ],
    }),
  },
  {
    id: "delivery",
    keywords: [
      "livrare",
      "ridicare",
      "pickup",
      "curier",
      "adresa",
      "taxa livrare",
      "cat costa livrarea",
    ],
    buildResponse: () => ({
      text:
        "Livrarea este 100 MDL, iar in calendar poti alege si ridicare personala. Daca selectezi livrare, completezi adresa si optional intervalul orar pentru curier.",
      actions: [
        createRouteAction("Rezervare si livrare", "/calendar"),
        createRouteAction("Vezi FAQ", "/faq"),
        createRouteAction("Contact", "/contact"),
      ],
    }),
  },
  {
    id: "voucher",
    keywords: [
      "voucher",
      "puncte",
      "fidelizare",
      "reducere",
      "discount",
      "cupon",
      "promo",
    ],
    buildResponse: ({ user }) => ({
      text:
        "Codul de voucher si punctele se aplica in pagina de plata, pe baza unei comenzi active. Daca esti autentificat, iti poti verifica punctele si voucherele disponibile si in pagina de fidelizare.",
      actions: [
        user
          ? createRouteAction("Vezi fidelizarea", "/fidelizare")
          : createRouteAction("Intra in cont", "/login"),
        user
          ? createRouteAction("Profilul meu", "/profil")
          : createRouteAction("Creeaza cont", "/register"),
        createRouteAction("FAQ", "/faq"),
      ],
    }),
  },
  {
    id: "booking",
    keywords: [
      "calendar",
      "rezervare",
      "slot",
      "programare",
      "data",
      "ora",
      "rezerv un slot",
    ],
    buildResponse: ({ user }) => ({
      text:
        "Pentru rezervare mergi in /calendar, alegi prestatorul, data, ora si modul de predare. Dupa confirmare, comanda apare in profil, iar cand pretul este gata poti continua la plata.",
      actions: [
        createRouteAction("Deschide calendarul", "/calendar"),
        user
          ? createRouteAction("Vezi profilul", "/profil")
          : createRouteAction("Autentificare", "/login"),
        createRouteAction("Contact", "/contact"),
      ],
    }),
  },
  {
    id: "contact",
    keywords: [
      "contact",
      "telefon",
      "email",
      "operator",
      "uman",
      "patiser",
      "vorbesc cu cineva",
      "ajutor urgent",
    ],
    buildResponse: ({ user }) => ({
      text: `Ne poti scrie din pagina de contact sau, daca esti autentificat, poti continua discutia in chat. Date rapide: ${CONTACT_EMAIL} si ${CONTACT_PHONE}.`,
      actions: [
        createRouteAction("Pagina contact", "/contact"),
        user
          ? createRouteAction("Chat cu patiserul", "/chat")
          : createRouteAction("Intra in cont", "/login"),
        createHrefAction("Suna acum", CONTACT_PHONE_URI),
      ],
    }),
  },
  {
    id: "auth",
    keywords: [
      "login",
      "cont",
      "autentificare",
      "profil",
      "parola",
      "inregistrare",
      "register",
    ],
    buildResponse: ({ user }) => ({
      text:
        "Pentru chat, profil, comenzi si fidelizare ai nevoie de cont client. Daca ai uitat parola, poti folosi pagina de resetare.",
      actions: user
        ? [
            createRouteAction("Profilul meu", "/profil"),
            createRouteAction("Fidelizare", "/fidelizare"),
            createRouteAction("Resetare parola", "/reset-parola"),
          ]
        : [
            createRouteAction("Login", "/login"),
            createRouteAction("Creeaza cont", "/register"),
            createRouteAction("Resetare parola", "/reset-parola"),
          ],
    }),
  },
  {
    id: "catalog",
    keywords: [
      "catalog",
      "torturi",
      "produse",
      "arome",
      "umplutura",
      "blat",
      "gust",
    ],
    buildResponse: () => ({
      text:
        "In catalog vezi produsele disponibile, iar pentru un tort complet personalizat poti continua direct in constructorul 2D.",
      actions: [
        createRouteAction("Deschide catalogul", "/catalog"),
        createRouteAction("Constructor 2D", "/constructor"),
        createRouteAction("Personalizeaza", "/personalizeaza"),
      ],
    }),
  },
  {
    id: "payment",
    keywords: [
      "plata",
      "platesc",
      "stripe",
      "card",
      "checkout",
      "achitare",
      "plata comenzii",
    ],
    buildResponse: ({ user }) => ({
      text:
        "Plata se face dupa ce ai o comanda activa si pretul final este confirmat. Din profil intri in comanda, apoi continui spre pagina de plata unde poti aplica voucher, puncte sau cupon.",
      actions: [
        user
          ? createRouteAction("Profilul meu", "/profil")
          : createRouteAction("Autentificare", "/login"),
        user
          ? createRouteAction("Fidelizare", "/fidelizare")
          : createRouteAction("Creeaza cont", "/register"),
        createRouteAction("Contact", "/contact"),
      ],
    }),
  },
  {
    id: "ai_designer",
    keywords: [
      "designer ai",
      "ai",
      "genereaza imagine",
      "imagine tort",
      "inspiratie",
      "model ai",
    ],
    buildResponse: ({ user }) => ({
      text:
        "Designerul AI este in /designer-ai si necesita autentificare. Il poti folosi pentru inspiratie vizuala, iar pentru configuratia finala recomand sa treci apoi prin constructorul 2D.",
      actions: [
        user
          ? createRouteAction("Deschide Designer AI", "/designer-ai")
          : createRouteAction("Login", "/login"),
        createRouteAction("Constructor 2D", "/constructor"),
        createRouteAction("Contact", "/contact"),
      ],
    }),
  },
  {
    id: "lead_time",
    keywords: [
      "cat timp",
      "termen",
      "inainte",
      "cand pot plasa",
      "urgent",
      "azi",
      "maine",
      "rapid",
    ],
    buildResponse: () => ({
      text:
        "Recomandarea actuala este minim 24-48 ore pentru torturi standard si 3-5 zile pentru personalizari complexe. Daca ai o cerere urgenta, merita sa verifici direct in calendar sau sa scrii atelierului.",
      actions: [
        createRouteAction("Verifica calendarul", "/calendar"),
        createRouteAction("Contact atelier", "/contact"),
        createRouteAction("FAQ", "/faq"),
      ],
    }),
  },
  {
    id: "program",
    keywords: [
      "program",
      "orar",
      "ce program aveti",
      "cand sunteti deschisi",
      "programul",
      "orarul",
    ],
    buildResponse: () => ({
      text:
        `Programul afisat in pagina de contact este ${APP_CONTACT.program}. Pentru discutii despre comenzi sau livrare poti folosi si formularul de contact.`,
      actions: [
        createRouteAction("Pagina contact", "/contact"),
        createHrefAction("Trimite email", CONTACT_EMAIL_URI),
        createHrefAction("Suna", CONTACT_PHONE_URI),
      ],
    }),
  },
];

function createRouteAction(label, to) {
  return { type: "route", label, to };
}

function createHrefAction(label, href) {
  return { type: "href", label, href };
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function scorePhrase(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return 0;
  if (text.includes(normalizedPhrase)) {
    return normalizedPhrase.includes(" ") ? 12 : 6;
  }

  return tokenize(normalizedPhrase).reduce((score, token) => {
    if (token.length < 2) return score;
    return text.includes(token) ? score + 2 : score;
  }, 0);
}

function scoreIntent(query, intent) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  return intent.keywords.reduce((score, keyword) => score + scorePhrase(normalizedQuery, keyword), 0);
}

function flattenRoutes(user) {
  return getVisibleSections(user, { includeLocked: true }).flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionTitle: section.title,
      accessible: canAccessLink(item, user),
    }))
  );
}

function scoreRoute(query, item) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const haystack = normalizeText(
    `${item.label || ""} ${item.to || ""} ${item.note || ""} ${item.sectionTitle || ""}`
  );

  let score = scorePhrase(haystack, normalizedQuery);

  if (normalizeText(item.label) === normalizedQuery) score += 20;
  if (String(item.to || "").toLowerCase() === normalizedQuery) score += 20;
  if (haystack.includes(normalizedQuery)) score += 8;

  for (const token of tokenize(normalizedQuery)) {
    if (token.length < 3) continue;
    if (haystack.includes(token)) score += 2;
  }

  return score;
}

function findRouteMatches(query, user, limit = 3) {
  return flattenRoutes(user)
    .map((item) => ({ item, score: scoreRoute(query, item) }))
    .filter((entry) => entry.score >= 6)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function describeAccess(item) {
  if (item.accessible) return "";
  if (Array.isArray(item.roles) && item.roles.length) {
    return "Aceasta pagina este disponibila doar pentru personal.";
  }
  if (item.requiresAuth) {
    return "Aceasta pagina necesita autentificare.";
  }
  return "";
}

function buildNavigationResponse(query, pathname, user) {
  const matches = findRouteMatches(query, user);
  const contextLinks = getContextLinks(pathname, user, 3);

  if (matches.length > 0) {
    const [topMatch] = matches;
    const accessMessage = describeAccess(topMatch.item);
    const text = accessMessage
      ? `${topMatch.item.label} este pagina cea mai apropiata de intrebarea ta. ${accessMessage}`
      : `Cred ca ai nevoie de pagina ${topMatch.item.label}. O poti deschide direct din butoanele de mai jos.`;

    return {
      text,
      actions: [
        ...matches.map(({ item }) => createRouteAction(item.label, item.to)),
        ...contextLinks.map((item) => createRouteAction(item.label, item.to)),
      ],
    };
  }

  return {
    text:
      "Te pot ajuta instant cu intrebari despre constructor, livrare, calendar, plata, voucher, cont sau contact. Daca vrei, incearca una dintre sugestiile rapide.",
    actions: contextLinks.map((item) => createRouteAction(item.label, item.to)),
  };
}

function dedupeActions(actions) {
  const list = Array.isArray(actions) ? actions : [];
  const result = [];
  const seen = new Set();

  for (const action of list) {
    if (!action) continue;
    const key = action.type === "href" ? `${action.type}:${action.href}` : `${action.type}:${action.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  return result.slice(0, 5);
}

export function buildAssistantReply({ query, pathname = "/", user = null }) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return {
      text:
        "Scrie-mi ce cauti, de exemplu: constructor 2D, livrare, voucher, calendar, plata sau contact.",
      actions: getContextLinks(pathname, user, 4).map((item) => createRouteAction(item.label, item.to)),
    };
  }

  const rankedIntents = INTENTS.map((intent) => ({
    intent,
    score: scoreIntent(normalizedQuery, intent),
  })).sort((left, right) => right.score - left.score);

  const bestIntent = rankedIntents[0];
  if (bestIntent && bestIntent.score >= 8) {
    const response = bestIntent.intent.buildResponse({ pathname, query: normalizedQuery, user });
    return {
      ...response,
      intentId: bestIntent.intent.id,
      actions: dedupeActions(response.actions),
    };
  }

  const navigationResponse = buildNavigationResponse(normalizedQuery, pathname, user);
  return {
    ...navigationResponse,
    intentId: "navigation",
    actions: dedupeActions(navigationResponse.actions),
  };
}
