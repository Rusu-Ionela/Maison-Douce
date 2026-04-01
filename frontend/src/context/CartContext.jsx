import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "cart-items";

function normalizeCartItem(item) {
  if (!item || typeof item !== "object" || !item.id) return null;

  const sourceType = String(item.sourceType || "");
  const requiresQuote =
    item.requiresQuote === true ||
    item.requiresManualQuote === true ||
    sourceType === "local-fallback" ||
    String(item.id || "").startsWith("curated-");

  return {
    id: String(item.id),
    name: String(item.name || "Produs"),
    price: Number(item.price || 0),
    image: String(item.image || ""),
    qty: Math.max(1, Number(item.qty || 1)),
    options: item.options && typeof item.options === "object" ? item.options : {},
    variantKey: String(item.variantKey || ""),
    prepHours: Math.max(0, Number(item.prepHours || item.timpPreparareOre || 0)),
    sourceType,
    requiresQuote,
  };
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCartItem).filter(Boolean);
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  const applyUpdate = (updater) => {
    setItems((prev) => {
      const next =
        typeof updater === "function" ? updater(prev) : Array.isArray(updater) ? updater : prev;
      return Array.isArray(next) ? next.map(normalizeCartItem).filter(Boolean) : prev;
    });
  };

  const add = (item) => {
    const normalizedItem = normalizeCartItem(item);
    if (!normalizedItem) return;

    applyUpdate((prev) => {
      const existing = prev.find(
        (p) =>
          p.id === normalizedItem.id &&
          p.variantKey === normalizedItem.variantKey
      );

      if (existing) {
        return prev.map((p) =>
          p.id === normalizedItem.id &&
          p.variantKey === normalizedItem.variantKey
            ? {
                ...p,
                qty: p.qty + normalizedItem.qty,
                prepHours: Math.max(p.prepHours, normalizedItem.prepHours),
              }
            : p
        );
      }

      return [...prev, normalizedItem];
    });
  };

  const updateQty = (id, qty, variantKey = "") => {
    applyUpdate((prev) =>
      prev.map((p) =>
        p.id === id && p.variantKey === variantKey
          ? { ...p, qty: Math.max(1, Number(qty || 1)) }
          : p
      )
    );
  };

  const remove = (id, variantKey = "") => {
    applyUpdate((prev) =>
      prev.filter((p) => !(p.id === id && p.variantKey === variantKey))
    );
  };

  const clear = () => applyUpdate([]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
        0
      ),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, clear, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
