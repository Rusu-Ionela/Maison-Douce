import { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "cart-items";

function loadInitial() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(loadInitial);

    const persist = (next) => {
        setItems(next);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            // ignore storage errors
        }
    };

    const add = (item) => {
        if (!item || !item.id) return;
        persist((prev) => {
            const existing = prev.find((p) => p.id === item.id && p.variantKey === item.variantKey);
            if (existing) {
                return prev.map((p) =>
                    p.id === item.id && p.variantKey === item.variantKey
                        ? { ...p, qty: p.qty + (item.qty || 1) }
                        : p
                );
            }
            return [
                ...prev,
                {
                    id: item.id,
                    name: item.name,
                    price: Number(item.price || 0),
                    image: item.image || "",
                    qty: Number(item.qty || 1),
                    options: item.options || {},
                    variantKey: item.variantKey || "",
                },
            ];
        });
    };

    const updateQty = (id, qty, variantKey = "") => {
        persist((prev) =>
            prev.map((p) =>
                p.id === id && p.variantKey === variantKey
                    ? { ...p, qty: Math.max(1, Number(qty || 1)) }
                    : p
            )
        );
    };

    const remove = (id, variantKey = "") => {
        persist((prev) => prev.filter((p) => !(p.id === id && p.variantKey === variantKey)));
    };

    const clear = () => persist([]);

    const subtotal = useMemo(
        () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
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
