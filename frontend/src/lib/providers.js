import { useEffect, useMemo, useState } from "react";
import api from "./api";
import { getConfiguredPrestatorId } from "./runtimeConfig";
import { isProviderRole, normalizeRole } from "./roles";

const ACTIVE_PROVIDER_STORAGE_KEY = "active_provider_id";

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeProvider(item) {
  if (!item || typeof item !== "object") return null;
  const id = normalizeId(item.id || item._id);
  if (!id) return null;
  return {
    id,
    displayName: String(item.displayName || item.nume || item.email || "Atelier").trim(),
    slug: String(item.slug || "").trim(),
    bio: String(item.bio || "").trim(),
    isDefault: Boolean(item.isDefault || item.isDefaultProvider),
    acceptsOrders: item.acceptsOrders !== false,
    isPublic: item.isPublic !== false,
  };
}

function getStoredProviderId() {
  if (typeof window === "undefined") return "";
  return normalizeId(window.localStorage.getItem(ACTIVE_PROVIDER_STORAGE_KEY));
}

function persistProviderId(providerId) {
  if (typeof window === "undefined") return;
  if (providerId) {
    window.localStorage.setItem(ACTIVE_PROVIDER_STORAGE_KEY, providerId);
    return;
  }
  window.localStorage.removeItem(ACTIVE_PROVIDER_STORAGE_KEY);
}

function buildProviderFromUser(user) {
  const id = normalizeId(user?._id || user?.id);
  if (!id) return null;
  return {
    id,
    displayName:
      String(user?.providerProfile?.displayName || "").trim() ||
      [user?.nume, user?.prenume].filter(Boolean).join(" ").trim() ||
      String(user?.email || "").trim() ||
      "Atelier",
    slug: String(user?.providerProfile?.slug || "").trim(),
    bio: String(user?.providerProfile?.bio || "").trim(),
    isDefault: false,
    acceptsOrders: user?.providerProfile?.acceptsOrders !== false,
    isPublic: user?.providerProfile?.isPublic !== false,
  };
}

function resolveProviderId({ user, providers, selectedProviderId, defaultProviderId }) {
  const role = normalizeRole(user?.rol || user?.role);
  if (isProviderRole(role)) {
    return normalizeId(user?._id || user?.id);
  }

  const normalizedProviders = Array.isArray(providers) ? providers : [];
  const availableIds = new Set(normalizedProviders.map((item) => item.id));
  const configuredFallbackId = normalizeId(getConfiguredPrestatorId());
  const candidates = [
    normalizeId(selectedProviderId),
    normalizeId(defaultProviderId),
    configuredFallbackId,
    normalizedProviders.find((item) => item.isDefault)?.id,
    normalizedProviders[0]?.id,
  ];

  return candidates.find((candidate) => candidate && availableIds.has(candidate)) || "";
}

export function buildConversationRoom(clientId, prestatorId) {
  const normalizedClientId = normalizeId(clientId);
  const normalizedPrestatorId = normalizeId(prestatorId);
  if (!normalizedClientId || !normalizedPrestatorId) return "";
  return `provider:${normalizedPrestatorId}::client:${normalizedClientId}`;
}

export function parseConversationRoom(room) {
  const normalizedRoom = normalizeId(room);
  if (!normalizedRoom) {
    return { room: "", type: "unknown", clientId: "", prestatorId: "" };
  }
  if (normalizedRoom.startsWith("user-")) {
    return {
      room: normalizedRoom,
      type: "legacy-client",
      clientId: normalizedRoom.slice(5),
      prestatorId: "",
    };
  }
  const match = normalizedRoom.match(/^provider:([^:]+)::client:([^:]+)$/);
  if (!match) {
    return { room: normalizedRoom, type: "unknown", clientId: "", prestatorId: "" };
  }
  return {
    room: normalizedRoom,
    type: "provider-client",
    prestatorId: normalizeId(match[1]),
    clientId: normalizeId(match[2]),
  };
}

export function formatConversationLabel(room, providers = []) {
  const details = parseConversationRoom(room);
  if (details.type === "legacy-client") {
    const suffix = details.clientId.slice(-6) || details.clientId;
    return `Client #${suffix}`;
  }
  if (details.type !== "provider-client") return room || "Conversatie";
  const provider = providers.find((item) => item.id === details.prestatorId);
  const suffix = details.clientId.slice(-6) || details.clientId;
  return `${provider?.displayName || "Atelier"} - Client #${suffix}`;
}

export function useProviderDirectory({ user, enabled = true } = {}) {
  const [providers, setProviders] = useState([]);
  const [defaultProviderId, setDefaultProviderId] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState(() => getStoredProviderId());
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState("");

  const normalizedRole = normalizeRole(user?.rol || user?.role);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .get("/utilizatori/providers")
      .then((response) => {
        if (cancelled) return;
        const items = Array.isArray(response.data?.items)
          ? response.data.items.map(normalizeProvider).filter(Boolean)
          : [];
        setProviders(items);
        setDefaultProviderId(normalizeId(response.data?.defaultProviderId));
      })
      .catch((requestError) => {
        if (cancelled) return;
        setProviders([]);
        setDefaultProviderId("");
        setError(
          requestError?.response?.data?.message ||
            "Nu am putut incarca lista de ateliere."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const providerOptions = useMemo(() => {
    if (isProviderRole(normalizedRole)) {
      const currentProvider = buildProviderFromUser(user);
      return currentProvider ? [currentProvider] : [];
    }
    return providers;
  }, [normalizedRole, providers, user]);

  const activeProviderId = useMemo(
    () =>
      resolveProviderId({
        user,
        providers: providerOptions,
        selectedProviderId,
        defaultProviderId,
      }),
    [defaultProviderId, providerOptions, selectedProviderId, user]
  );

  const activeProvider = useMemo(() => {
    if (isProviderRole(normalizedRole)) {
      return buildProviderFromUser(user);
    }
    return providerOptions.find((item) => item.id === activeProviderId) || null;
  }, [activeProviderId, normalizedRole, providerOptions, user]);

  useEffect(() => {
    if (!activeProviderId || isProviderRole(normalizedRole)) return;
    persistProviderId(activeProviderId);
  }, [activeProviderId, normalizedRole]);

  const updateSelectedProviderId = (providerId) => {
    const normalizedProviderId = normalizeId(providerId);
    setSelectedProviderId(normalizedProviderId);
    persistProviderId(normalizedProviderId);
  };

  return {
    providers: providerOptions,
    defaultProviderId,
    selectedProviderId,
    activeProviderId,
    activeProvider,
    loading,
    error,
    hasSingleProvider:
      !isProviderRole(normalizedRole) && providerOptions.length === 1,
    hasMultipleProviders:
      !isProviderRole(normalizedRole) && providerOptions.length > 1,
    canChooseProvider: !isProviderRole(normalizedRole) && providerOptions.length > 1,
    setSelectedProviderId: updateSelectedProviderId,
  };
}
