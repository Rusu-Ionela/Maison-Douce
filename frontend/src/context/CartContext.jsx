import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);

    const addToCart = (product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item._id === product._id);
            if (existing) {
                return prev.map((item) =>
                    item._id === product._id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                return [...prev, { ...product, quantity: 1 }];
            }
        });
    };

    const removeFromCart = (id) => {
        setCart((prev) => prev.filter((item) => item._id !== id));
    };

    const clearCart = () => setCart([]);

    const totalPrice = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{ cart, addToCart, removeFromCart, clearCart, totalPrice }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
