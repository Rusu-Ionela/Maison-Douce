const { normalizeUserRole } = require("../utils/roles");
const AssistantKnowledgeEntry = require("../models/AssistantKnowledgeEntry");

const CONTACT_EMAIL = "contact@maisondouce.md";
const CONTACT_PHONE = "+373 600 000 00";
const CONTACT_PHONE_URI = "tel:+37360000000";
const CONTACT_EMAIL_URI = `mailto:${CONTACT_EMAIL}`;

const STARTER_QUESTIONS = [
  "Nu gasesc constructorul 2D",
  "Cum functioneaza livrarea?",
  "Unde aplic voucherul?",
  "Cum rezerv un slot?",
  "Cum vorbesc cu patiserul?",
];

const ROUTES = [
  { label: "Home", to: "/" },
  { label: "Catalog", to: "/catalog" },
  { label: "Cos", to: "/cart" },
  { label: "Constructor 2D", to: "/constructor" },
  { label: "Personalizeaza", to: "/personalizeaza" },
  { label: "Designer AI", to: "/designer-ai", requiresAuth: true },
  { label: "Calendar", to: "/calendar" },
  { label: "Contact", to: "/contact" },
  { label: "FAQ", to: "/faq" },
  { label: "Login", to: "/login" },
  { label: "Inregistrare", to: "/register" },
  { label: "Resetare parola", to: "/reset-parola" },
  { label: "Chat cu patiserul", to: "/chat", requiresAuth: true },
  { label: "Profil", to: "/profil", requiresAuth: true },
  { label: "Fidelizare", to: "/fidelizare", requiresAuth: true },
  { label: "Plata", to: "/plata", requiresAuth: true },
];

const CONTEXT_BRIDGES = [
  {
    matchPrefix: "/catalog",
    targets: ["/constructor", "/personalizeaza", "/calendar", "/contact"],
  },
  {
    matchPrefix: "/constructor",
    targets: ["/personalizeaza", "/catalog", "/calendar", "/contact"],
  },
  {
    matchPrefix: "/calendar",
    targets: ["/contact", "/profil", "/catalog", "/constructor"],
  },
  {
    matchPrefix: "/plata",
    targets: ["/profil", "/fidelizare", "/contact"],
  },
];

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
        "Programul afisat in pagina de contact este Luni - Sambata, 09:00 - 19:00. Pentru discutii despre comenzi sau livrare poti folosi si formularul de contact.",
      actions: [
        createRouteAction("Pagina contact", "/contact"),
        createHrefAction("Trimite email", CONTACT_EMAIL_URI),
        createHrefAction("Suna", CONTACT_PHONE_URI),
      ],
    }),
  },
];

function buildEntryResponse(entry) {
  return {
    id: String(entry?._id || ""),
    title: String(entry?.title || ""),
    answer: String(entry?.answer || ""),
    keywords: Array.isArray(entry?.keywords)
      ? entry.keywords.map((item) => String(item || ""))
      : [],
    actions: Array.isArray(entry?.actions)
      ? entry.actions.map((action) => ({
          type: action?.type === "href" ? "href" : "route",
          label: String(action?.label || ""),
          to: String(action?.to || ""),
          href: String(action?.href || ""),
        }))
      : [],
    priority: Number(entry?.priority || 0),
    active: entry?.active !== false,
    createdBy: entry?.createdBy || null,
    updatedBy: entry?.updatedBy || null,
    updatedAt: entry?.updatedAt || null,
    createdAt: entry?.createdAt || null,
  };
}

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

  return intent.keywords.reduce(
    (score, keyword) => score + scorePhrase(normalizedQuery, keyword),
    0
  );
}

function getUserRole(user) {
  return normalizeUserRole(user?.rol || user?.role || "client");
}

function canAccessRoute(route, user) {
  if (Array.isArray(route.roles) && route.roles.length > 0) {
    return route.roles.includes(getUserRole(user));
  }
  if (route.requiresAuth) {
    return Boolean(user);
  }
  return true;
}

function canUseAction(action, user) {
  if (!action || typeof action !== "object") return false;
  if (action.type === "href") {
    return Boolean(String(action.href || "").trim() && String(action.label || "").trim());
  }

  const to = String(action.to || "").trim();
  if (!to || !String(action.label || "").trim()) return false;
  const route = findRouteByPath(to);
  if (!route) return true;
  return canAccessRoute(route, user);
}

function sanitizeActionsForUser(actions, user) {
  return (Array.isArray(actions) ? actions : []).filter((action) => canUseAction(action, user));
}

function flattenRoutes(user) {
  return ROUTES.map((route) => ({
    ...route,
    accessible: canAccessRoute(route, user),
  }));
}

function scoreRoute(query, route) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const haystack = normalizeText(
    `${route.label || ""} ${route.to || ""} ${route.note || ""}`
  );

  let score = scorePhrase(haystack, normalizedQuery);

  if (normalizeText(route.label) === normalizedQuery) score += 20;
  if (String(route.to || "").toLowerCase() === normalizedQuery) score += 20;
  if (haystack.includes(normalizedQuery)) score += 8;

  for (const token of tokenize(normalizedQuery)) {
    if (token.length < 3) continue;
    if (haystack.includes(token)) score += 2;
  }

  return score;
}

function findRouteByPath(targetPath) {
  return ROUTES.find((route) => route.to === targetPath) || null;
}

function getContextRoutes(pathname, user, limit = 3) {
  const bridge = CONTEXT_BRIDGES.find((item) =>
    String(pathname || "/").startsWith(item.matchPrefix)
  );
  const rawTargets = bridge?.targets || ["/catalog", "/constructor", "/calendar", "/contact"];
  const routes = [];
  const seen = new Set();

  for (const target of rawTargets) {
    const route = findRouteByPath(target);
    if (!route) continue;
    if (!canAccessRoute(route, user)) continue;
    if (seen.has(route.to)) continue;
    seen.add(route.to);
    routes.push(route);
    if (routes.length >= limit) break;
  }

  return routes;
}

function findRouteMatches(query, user, limit = 3) {
  return flattenRoutes(user)
    .map((route) => ({ route, score: scoreRoute(query, route) }))
    .filter((entry) => entry.score >= 6)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function describeAccess(route) {
  if (route.accessible) return "";
  if (route.requiresAuth) {
    return "Aceasta pagina necesita autentificare.";
  }
  if (Array.isArray(route.roles) && route.roles.length > 0) {
    return "Aceasta pagina este disponibila doar pentru personal.";
  }
  return "";
}

function buildNavigationResponse(query, pathname, user) {
  const matches = findRouteMatches(query, user);
  const contextRoutes = getContextRoutes(pathname, user, 3);

  if (matches.length > 0) {
    const [topMatch] = matches;
    const accessMessage = describeAccess(topMatch.route);
    const text = accessMessage
      ? `${topMatch.route.label} este pagina cea mai apropiata de intrebarea ta. ${accessMessage}`
      : `Cred ca ai nevoie de pagina ${topMatch.route.label}. O poti deschide direct din butoanele de mai jos.`;

    return {
      text,
      actions: [
        ...matches.map(({ route }) => createRouteAction(route.label, route.to)),
        ...contextRoutes.map((route) => createRouteAction(route.label, route.to)),
      ],
    };
  }

  return {
    text:
      "Te pot ajuta instant cu intrebari despre constructor, livrare, calendar, plata, voucher, cont sau contact. Daca vrei, incearca una dintre sugestiile rapide.",
    actions: contextRoutes.map((route) => createRouteAction(route.label, route.to)),
  };
}

function dedupeActions(actions) {
  const list = Array.isArray(actions) ? actions : [];
  const result = [];
  const seen = new Set();

  for (const action of list) {
    if (!action) continue;
    const key =
      action.type === "href"
        ? `${action.type}:${action.href}`
        : `${action.type}:${action.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  return result.slice(0, 5);
}

async function listAdminKnowledgeEntries() {
  const items = await AssistantKnowledgeEntry.find({})
    .populate("createdBy", "nume email")
    .populate("updatedBy", "nume email")
    .sort({ priority: 1, updatedAt: -1, createdAt: -1 })
    .lean();

  return items.map((item) => buildEntryResponse(item));
}

async function listActiveKnowledgeEntries() {
  const items = await AssistantKnowledgeEntry.find({ active: true })
    .sort({ priority: 1, updatedAt: -1, createdAt: -1 })
    .lean();

  return items.map((item) => buildEntryResponse(item));
}

function scoreCustomEntry(query, entry) {
  const titleScore = scorePhrase(query, entry?.title || "") * 2;
  const keywordScore = (Array.isArray(entry?.keywords) ? entry.keywords : []).reduce(
    (total, keyword) => total + scorePhrase(query, keyword),
    0
  );
  if (titleScore + keywordScore <= 0) {
    return 0;
  }
  const priorityBoost =
    Math.max(0, 100 - Math.min(100, Number(entry?.priority || 100))) / 10;
  return titleScore + keywordScore + priorityBoost;
}

function selectStarterQuestions(customEntries) {
  const customTitles = (Array.isArray(customEntries) ? customEntries : [])
    .filter((entry) => entry?.active !== false && String(entry?.title || "").trim())
    .slice(0, 5)
    .map((entry) => String(entry.title).trim());

  const merged = [...customTitles, ...STARTER_QUESTIONS];
  const result = [];
  const seen = new Set();

  for (const item of merged) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
    if (result.length >= 5) break;
  }

  return result;
}

async function buildAssistantReply({ query, pathname = "/", user = null }) {
  const customEntries = await listActiveKnowledgeEntries();
  const starterQuestions = selectStarterQuestions(customEntries);
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return {
      text:
        "Scrie-mi ce cauti, de exemplu: constructor 2D, livrare, voucher, calendar, plata sau contact.",
      actions: getContextRoutes(pathname, user, 4).map((route) =>
        createRouteAction(route.label, route.to)
      ),
      intentId: "empty",
      source: "assistant_knowledge_base",
      starterQuestions,
    };
  }

  const rankedCustomEntries = customEntries
    .map((entry) => ({
      entry,
      score: scoreCustomEntry(normalizedQuery, entry),
    }))
    .filter((item) => item.score >= 8)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return Number(left.entry.priority || 100) - Number(right.entry.priority || 100);
    });

  if (rankedCustomEntries.length > 0) {
    const bestMatch = rankedCustomEntries[0].entry;
    return {
      text: String(bestMatch.answer || "").trim(),
      actions: dedupeActions(sanitizeActionsForUser(bestMatch.actions, user)),
      intentId: `custom:${bestMatch.id}`,
      source: "assistant_knowledge_base",
      starterQuestions,
    };
  }

  const rankedIntents = INTENTS.map((intent) => ({
    intent,
    score: scoreIntent(normalizedQuery, intent),
  })).sort((left, right) => right.score - left.score);

  const bestIntent = rankedIntents[0];
  if (bestIntent && bestIntent.score >= 8) {
    const response = bestIntent.intent.buildResponse({
      pathname,
      query: normalizedQuery,
      user,
    });

    return {
      ...response,
      intentId: bestIntent.intent.id,
      actions: dedupeActions(sanitizeActionsForUser(response.actions, user)),
      source: "assistant_knowledge_base",
      starterQuestions,
    };
  }

  const navigationResponse = buildNavigationResponse(normalizedQuery, pathname, user);
  return {
    ...navigationResponse,
    intentId: "navigation",
    actions: dedupeActions(sanitizeActionsForUser(navigationResponse.actions, user)),
    source: "assistant_knowledge_base",
    starterQuestions,
  };
}

module.exports = {
  STARTER_QUESTIONS,
  buildEntryResponse,
  buildAssistantReply,
  listAdminKnowledgeEntries,
};
