const mongoose = require("mongoose");
const Utilizator = require("../models/Utilizator");
const { isAdminRole, isProviderRole, normalizeUserRole } = require("./roles");
const CalendarPrestator = require("../models/CalendarPrestator");
const CalendarSlotEntry = require("../models/CalendarSlotEntry");
const Comanda = require("../models/Comanda");
const Rezervare = require("../models/Rezervare");
const Tort = require("../models/Tort");

const ENV_DEFAULT_PROVIDER_ID = String(
  process.env.DEFAULT_PRESTATOR_ID ||
    process.env.DEFAULT_PROVIDER_ID ||
    process.env.PROVIDER_ID ||
    ""
).trim();
const LEGACY_PROVIDER_SENTINELS = new Set(["default", "legacy"]);

function normalizeId(value) {
  return String(value || "").trim();
}

function buildProviderDisplayName(user) {
  return (
    String(user?.providerProfile?.displayName || "").trim() ||
    [user?.nume, user?.prenume].filter(Boolean).join(" ").trim() ||
    String(user?.email || "").trim() ||
    "Atelier"
  );
}

function serializeProvider(user) {
  return {
    id: normalizeId(user?._id),
    displayName: buildProviderDisplayName(user),
    slug: String(user?.providerProfile?.slug || "").trim(),
    bio: String(user?.providerProfile?.bio || "").trim(),
    isDefault: Boolean(user?.providerProfile?.isDefaultProvider),
    acceptsOrders: user?.providerProfile?.acceptsOrders !== false,
    isPublic: user?.providerProfile?.isPublic !== false,
  };
}

function buildLegacyProvider(providerId, { isDefault = false } = {}) {
  const normalizedId = normalizeId(providerId) || "default";
  return {
    _id: normalizedId,
    id: normalizedId,
    email: "",
    nume: normalizedId === "default" ? "Atelier principal" : normalizedId,
    providerProfile: {
      displayName: normalizedId === "default" ? "Atelier principal" : normalizedId,
      slug: normalizedId === "default" ? "atelier-principal" : normalizedId,
      bio: "Provider legacy pastrat pentru compatibilitatea datelor existente.",
      isDefaultProvider: isDefault,
      acceptsOrders: true,
      isPublic: true,
    },
    isLegacyProvider: true,
  };
}

async function hasLegacyProviderData(providerId) {
  const normalizedId = normalizeId(providerId);
  if (!normalizedId) return false;

  const models = [CalendarSlotEntry, CalendarPrestator, Comanda, Rezervare, Tort];
  for (const Model of models) {
    const existing = await Model.findOne({ prestatorId: normalizedId }, { prestatorId: 1 }).lean();
    if (existing?.prestatorId) {
      return true;
    }
  }

  return false;
}

async function findLegacyProviderCandidate(preferredId = "") {
  const preferred = normalizeId(preferredId);
  if (preferred) {
    if (LEGACY_PROVIDER_SENTINELS.has(preferred)) return preferred;
    const envDefaultId = normalizeId(ENV_DEFAULT_PROVIDER_ID);
    if (envDefaultId && !mongoose.Types.ObjectId.isValid(envDefaultId) && preferred === envDefaultId) {
      return preferred;
    }
    if (!mongoose.Types.ObjectId.isValid(preferred) && (await hasLegacyProviderData(preferred))) {
      return preferred;
    }
  }

  const envDefaultId = normalizeId(ENV_DEFAULT_PROVIDER_ID);
  if (envDefaultId && !mongoose.Types.ObjectId.isValid(envDefaultId)) {
    return envDefaultId;
  }

  const models = [CalendarSlotEntry, CalendarPrestator, Comanda, Rezervare, Tort];
  for (const Model of models) {
    const doc = await Model.findOne(
      { prestatorId: { $exists: true, $nin: ["", null] } },
      { prestatorId: 1 }
    ).lean();
    const candidateId = normalizeId(doc?.prestatorId);
    if (candidateId && !mongoose.Types.ObjectId.isValid(candidateId)) {
      return candidateId;
    }
  }

  return "";
}

function providerQuery(extraFilter = {}) {
  return {
    ...extraFilter,
    activ: { $ne: false },
    rol: { $in: ["patiser", "prestator"] },
  };
}

async function findProviderById(providerId) {
  const normalizedId = normalizeId(providerId);
  if (!normalizedId) {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
    const legacyProviderId = await findLegacyProviderCandidate(normalizedId);
    if (!legacyProviderId || legacyProviderId !== normalizedId) {
      return null;
    }
    return buildLegacyProvider(legacyProviderId, { isDefault: true });
  }

  return Utilizator.findOne(providerQuery({ _id: normalizedId })).lean();
}

async function listPublicProviders() {
  const providers = await Utilizator.find(
    providerQuery({
      $and: [
        {
          $or: [
            { "providerProfile.isPublic": { $exists: false } },
            { "providerProfile.isPublic": true },
          ],
        },
        {
          $or: [
            { "providerProfile.acceptsOrders": { $exists: false } },
            { "providerProfile.acceptsOrders": true },
          ],
        },
      ],
    }),
    {
      nume: 1,
      prenume: 1,
      email: 1,
      providerProfile: 1,
    }
  )
    .sort({
      "providerProfile.isDefaultProvider": -1,
      createdAt: 1,
    })
    .lean();

  const items = providers.map(serializeProvider);
  const legacyProviderId = await findLegacyProviderCandidate();
  if (legacyProviderId && !items.some((item) => item.id === legacyProviderId)) {
    items.push(serializeProvider(buildLegacyProvider(legacyProviderId, { isDefault: items.length === 0 })));
  }
  return items;
}

async function getDefaultProvider() {
  if (ENV_DEFAULT_PROVIDER_ID) {
    const envProvider = await findProviderById(ENV_DEFAULT_PROVIDER_ID);
    if (envProvider) return serializeProvider(envProvider);
  }

  const preferred = await Utilizator.findOne(
    providerQuery({
      $and: [
        {
          $or: [
            { "providerProfile.isPublic": { $exists: false } },
            { "providerProfile.isPublic": true },
          ],
        },
        {
          $or: [
            { "providerProfile.acceptsOrders": { $exists: false } },
            { "providerProfile.acceptsOrders": true },
          ],
        },
        { "providerProfile.isDefaultProvider": true },
      ],
    }),
    { nume: 1, prenume: 1, email: 1, providerProfile: 1 }
  )
    .sort({ createdAt: 1 })
    .lean();

  if (preferred) return serializeProvider(preferred);

  const fallback = await Utilizator.findOne(
    providerQuery({
      $and: [
        {
          $or: [
            { "providerProfile.isPublic": { $exists: false } },
            { "providerProfile.isPublic": true },
          ],
        },
        {
          $or: [
            { "providerProfile.acceptsOrders": { $exists: false } },
            { "providerProfile.acceptsOrders": true },
          ],
        },
      ],
    }),
    { nume: 1, prenume: 1, email: 1, providerProfile: 1 }
  )
    .sort({ createdAt: 1 })
    .lean();

  if (fallback) return serializeProvider(fallback);

  const legacyProviderId = await findLegacyProviderCandidate();
  return legacyProviderId
    ? serializeProvider(buildLegacyProvider(legacyProviderId, { isDefault: true }))
    : null;
}

async function resolveProviderId({
  requestedPrestatorId = "",
  user = null,
  allowDefault = true,
} = {}) {
  const requestedId = normalizeId(requestedPrestatorId);
  if (requestedId) {
    const provider = await findProviderById(requestedId);
    return provider ? normalizeId(provider._id) : "";
  }

  const role = normalizeUserRole(user?.rol || user?.role);
  if (isProviderRole(role)) {
    return normalizeId(user?._id || user?.id);
  }

  if (isAdminRole(role)) {
    return "";
  }

  if (!allowDefault) return "";

  const defaultProvider = await getDefaultProvider();
  return defaultProvider?.id || "";
}

async function resolveProviderForRequest(req, requestedPrestatorId = "") {
  return resolveProviderId({
    requestedPrestatorId,
    user: req?.user || null,
    allowDefault: !isAdminRole(req?.user?.rol || req?.user?.role),
  });
}

function ensureProviderScopeAccess(req, prestatorId) {
  const normalizedId = normalizeId(prestatorId);
  if (!normalizedId) return false;

  const role = normalizeUserRole(req?.user?.rol || req?.user?.role);
  if (isAdminRole(role)) return true;
  if (isProviderRole(role)) {
    return normalizedId === normalizeId(req?.user?._id || req?.user?.id);
  }
  return true;
}

module.exports = {
  ENV_DEFAULT_PROVIDER_ID,
  buildProviderDisplayName,
  ensureProviderScopeAccess,
  findProviderById,
  getDefaultProvider,
  listPublicProviders,
  resolveProviderForRequest,
  resolveProviderId,
  serializeProvider,
};
