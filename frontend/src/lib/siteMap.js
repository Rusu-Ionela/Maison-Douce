const STAFF_ROLES = ["admin", "patiser", "prestator"];
const ADMIN_ROLES = ["admin"];

export const SITE_SECTIONS = [
  {
    id: "public",
    title: "Public",
    fullWidth: true,
    items: [
      { label: "Home", to: "/" },
      { label: "Catalog", to: "/catalog" },
      { label: "Cos", to: "/cart" },
      { label: "Constructor", to: "/constructor" },
      { label: "Personalizeaza", to: "/personalizeaza" },
      { label: "Desen tort", to: "/desen-tort" },
      { label: "Designer AI", to: "/designer-ai" },
      { label: "Tort Designer", to: "/tort-designer" },
      { label: "Patiser Drawing", to: "/patiser-drawing" },
      { label: "Detalii tort", to: "/catalog", matchPrefix: "/tort/", hidden: true },
      { label: "Retete", to: "/retete" },
      { label: "Abonament", to: "/abonament" },
      { label: "Abonament form", to: "/abonament/form" },
      { label: "Abonament planuri", to: "/abonament/planuri" },
      { label: "Comanda", to: "/comanda" },
      { label: "Calendar", to: "/calendar" },
      { label: "Rezervare client", to: "/rezervare/client" },
      { label: "Plata", to: "/plata" },
      { label: "Plata succes", to: "/plata/succes", matchPrefix: "/plata/succes" },
      { label: "Plata eroare", to: "/plata/eroare", matchPrefix: "/plata/eroare" },
      { label: "Partajare publica", to: "/harta-site", matchPrefix: "/partajare/", hidden: true },
      { label: "Contact", to: "/contact" },
      { label: "Despre", to: "/despre" },
      { label: "FAQ", to: "/faq" },
      { label: "Termeni", to: "/termeni" },
      { label: "Confidentialitate", to: "/confidentialitate" },
      { label: "Harta site", to: "/harta-site" },
    ],
  },
  {
    id: "auth",
    title: "Cont si autentificare",
    items: [
      { label: "Login", to: "/login" },
      { label: "Inregistrare", to: "/register" },
      { label: "Reset parola", to: "/reset-parola" },
      { label: "Resetare parola", to: "/resetare-parola" },
      { label: "Admin login", to: "/admin/login" },
    ],
  },
  {
    id: "client",
    title: "Client (necesita autentificare)",
    note: "necesita login; unele necesita rol patiser/admin",
    items: [
      { label: "Albume", to: "/albume", requiresAuth: true },
      { label: "Creare album", to: "/album/creare", requiresAuth: true },
      { label: "Partajare fisiere", to: "/partajare", requiresAuth: true },
      { label: "Personalizari", to: "/personalizari", requiresAuth: true },
      { label: "Chat", to: "/chat", requiresAuth: true },
      { label: "Chat client", to: "/chat/client", requiresAuth: true },
      { label: "Chat history", to: "/chat/history", roles: STAFF_ROLES, note: "patiser/admin" },
      { label: "Chat utilizatori", to: "/chat/utilizatori", roles: STAFF_ROLES, note: "patiser/admin" },
      { label: "Chat mesaj", to: "/chat/mesaj", requiresAuth: true },
      { label: "Calendar prestator", to: "/prestator/calendar", requiresAuth: true },
      { label: "Profil", to: "/profil", requiresAuth: true },
      { label: "Fidelizare", to: "/fidelizare", requiresAuth: true },
      {
        label: "Recenzii prestator",
        to: "/admin/comenzi",
        requiresAuth: true,
        matchPrefix: "/recenzii/prestator/",
        hidden: true,
      },
      {
        label: "Recenzie comanda",
        to: "/admin/comenzi",
        requiresAuth: true,
        matchPrefix: "/recenzii/comanda/",
        hidden: true,
      },
    ],
  },
  {
    id: "admin",
    title: "Admin (necesita rol)",
    fullWidth: true,
    items: [
      { label: "Dashboard", to: "/admin", roles: STAFF_ROLES },
      { label: "Panel", to: "/admin/panel", roles: STAFF_ROLES },
      { label: "Produse", to: "/admin/produse", roles: STAFF_ROLES },
      { label: "Torturi", to: "/admin/torturi", roles: STAFF_ROLES },
      { label: "Comenzi", to: "/admin/comenzi", roles: STAFF_ROLES },
      { label: "Comenzi personalizate", to: "/admin/comenzi-personalizate", roles: STAFF_ROLES },
      { label: "Calendar", to: "/admin/calendar", roles: STAFF_ROLES },
      { label: "Rapoarte", to: "/admin/rapoarte", roles: ADMIN_ROLES },
      { label: "Raport rezervari", to: "/admin/raport-rezervari", roles: STAFF_ROLES },
      { label: "Stats", to: "/admin/stats", roles: ADMIN_ROLES },
      { label: "Notificari", to: "/admin/notificari", roles: STAFF_ROLES },
      { label: "Mesaje contact", to: "/admin/contact", roles: STAFF_ROLES },
      { label: "Notificari foto", to: "/admin/notificari-foto", roles: STAFF_ROLES },
      { label: "Fidelizare admin", to: "/admin/fidelizare", roles: ADMIN_ROLES },
      { label: "Productie", to: "/admin/production", roles: STAFF_ROLES },
      { label: "Contabilitate stoc", to: "/admin/contabilitate", roles: STAFF_ROLES },
      { label: "Umpluturi", to: "/admin/umpluturi", roles: STAFF_ROLES },
      { label: "Albume admin", to: "/admin/albume", roles: STAFF_ROLES },
      { label: "Adauga produs", to: "/admin/adauga-produs", roles: STAFF_ROLES },
      { label: "Add tort", to: "/admin/add-tort", roles: STAFF_ROLES },
      {
        label: "Edit produs",
        to: "/admin/produse",
        roles: STAFF_ROLES,
        matchPrefix: "/admin/edit-produs/",
        hidden: true,
      },
      {
        label: "Edit tort",
        to: "/admin/torturi",
        roles: STAFF_ROLES,
        matchPrefix: "/admin/edit-tort/",
        hidden: true,
      },
      { label: "Catalog admin", to: "/admin/catalog", roles: STAFF_ROLES },
    ],
  },
];

export const TOP_NAV_LINKS = [
  { label: "Catalog", to: "/catalog" },
  { label: "Constructor", to: "/constructor" },
  { label: "Cos", to: "/cart" },
  { label: "Despre", to: "/despre" },
  { label: "Contact", to: "/contact" },
  { label: "Calendar", to: "/calendar" },
  { label: "Fidelizare", to: "/fidelizare", requiresAuth: true },
  { label: "Admin", to: "/admin", roles: STAFF_ROLES },
  { label: "Productie", to: "/admin/production", roles: STAFF_ROLES },
  { label: "Stoc studio", to: "/admin/contabilitate", roles: STAFF_ROLES },
  { label: "Umpluturi", to: "/admin/umpluturi", roles: STAFF_ROLES },
  { label: "Mesaje", to: "/admin/contact", roles: STAFF_ROLES },
  { label: "Harta site", to: "/harta-site" },
];

const CONTEXT_BRIDGES = [
  {
    matchPrefix: "/admin/contabilitate",
    targets: ["/admin/umpluturi", "/admin/production", "/admin/notificari", "/admin/comenzi"],
  },
  {
    matchPrefix: "/admin/umpluturi",
    targets: ["/admin/contabilitate", "/admin/production", "/admin/comenzi", "/admin/notificari"],
  },
  {
    matchPrefix: "/admin/production",
    targets: ["/admin/comenzi", "/admin/contabilitate", "/admin/umpluturi", "/admin/notificari"],
  },
  {
    matchPrefix: "/cart",
    targets: ["/catalog", "/comanda", "/plata", "/profil"],
  },
  {
    matchPrefix: "/plata",
    targets: ["/comanda", "/cart", "/profil", "/fidelizare"],
  },
  {
    matchPrefix: "/catalog",
    targets: ["/cart", "/constructor", "/personalizeaza", "/comanda"],
  },
  {
    matchPrefix: "/constructor",
    targets: ["/catalog", "/cart", "/personalizeaza", "/comanda"],
  },
];

function getRole(user) {
  return String(user?.rol || user?.role || "");
}

export function canAccessLink(item, user) {
  if (Array.isArray(item.roles) && item.roles.length) {
    return item.roles.includes(getRole(user));
  }
  if (item.requiresAuth) {
    return Boolean(user);
  }
  return true;
}

export function getVisibleSections(user, { includeLocked = false } = {}) {
  return SITE_SECTIONS.map((section) => {
    const items = (includeLocked
      ? section.items
      : section.items.filter((item) => canAccessLink(item, user))
    ).filter((item) => !item.hidden);
    return { ...section, items };
  }).filter((section) => section.items.length > 0);
}

export function getTopNavLinks(user) {
  return TOP_NAV_LINKS.filter((item) => canAccessLink(item, user));
}

function getAllLinks() {
  return SITE_SECTIONS.flatMap((section) => section.items);
}

function itemMatchPath(item) {
  return item.matchPrefix || item.to;
}

function pathMatchScore(pathname, item) {
  const matchPath = itemMatchPath(item);
  if (!matchPath) return 0;

  if (matchPath === "/") return pathname === "/" ? 2000 : 0;
  if (pathname === matchPath) return 3000 + matchPath.length;
  if (pathname.startsWith(`${matchPath}/`)) return 1000 + matchPath.length;
  if (matchPath.endsWith("/") && pathname.startsWith(matchPath)) return 1000 + matchPath.length;
  if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return 1000 + item.matchPrefix.length;
  return 0;
}

function findSectionByPath(pathname) {
  let best = { score: 0, sectionId: null };

  for (const section of SITE_SECTIONS) {
    for (const item of section.items) {
      const score = pathMatchScore(pathname, item);
      if (score > best.score) {
        best = { score, sectionId: section.id };
      }
    }
  }

  if (!best.sectionId) return null;
  return SITE_SECTIONS.find((section) => section.id === best.sectionId) || null;
}

function findLinkByPath(path) {
  return getAllLinks().find((item) => item.to === path) || null;
}

export function getContextLinks(pathname, user, limit = 6) {
  const section = findSectionByPath(pathname);
  const visibleSections = getVisibleSections(user);
  const visibleByPath = new Map(
    visibleSections.flatMap((group) => group.items.map((item) => [item.to, item]))
  );

  const candidates = [];
  if (section) {
    for (const item of section.items) {
      const isCurrent = pathMatchScore(pathname, item) >= 3000;
      if (isCurrent) continue;
      if (!visibleByPath.has(item.to)) continue;
      candidates.push(item);
    }
  }

  for (const bridge of CONTEXT_BRIDGES) {
    if (!pathname.startsWith(bridge.matchPrefix)) continue;
    for (const target of bridge.targets) {
      const item = findLinkByPath(target);
      if (!item) continue;
      if (!visibleByPath.has(item.to)) continue;
      candidates.push(item);
    }
  }

  candidates.push(...getTopNavLinks(user));

  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    if (!item?.to || seen.has(item.to)) continue;
    if (item.to === pathname) continue;
    seen.add(item.to);
    unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}
