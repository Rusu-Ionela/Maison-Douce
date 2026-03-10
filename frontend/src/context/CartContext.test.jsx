import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "./CartContext.jsx";

function CartProbe() {
  const { items, subtotal, add, updateQty, remove, clear } = useCart();

  return (
    <div>
      <div data-testid="item-count">{String(items.length)}</div>
      <div data-testid="subtotal">{String(subtotal)}</div>
      <div data-testid="first-qty">{String(items[0]?.qty || 0)}</div>
      <button
        type="button"
        onClick={() =>
          add({
            id: "cake-1",
            name: "Tort Velvet",
            price: 120,
            qty: 2,
            variantKey: "mare",
            timpPreparareOre: 24,
          })
        }
      >
        add
      </button>
      <button type="button" onClick={() => updateQty("cake-1", 4, "mare")}>
        update
      </button>
      <button type="button" onClick={() => remove("cake-1", "mare")}>
        remove
      </button>
      <button type="button" onClick={clear}>
        clear
      </button>
    </div>
  );
}

describe("CartContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads persisted items and keeps subtotal in sync", async () => {
    localStorage.setItem(
      "cart-items",
      JSON.stringify([
        { id: "cake-1", name: "Tort Velvet", price: 100, qty: 2, variantKey: "mare" },
      ])
    );

    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    expect(screen.getByTestId("item-count")).toHaveTextContent("1");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("200");

    fireEvent.click(screen.getByText("update"));

    await waitFor(() => {
      expect(screen.getByTestId("first-qty")).toHaveTextContent("4");
      expect(screen.getByTestId("subtotal")).toHaveTextContent("400");
    });

    expect(JSON.parse(localStorage.getItem("cart-items"))).toEqual([
      expect.objectContaining({
        id: "cake-1",
        qty: 4,
        variantKey: "mare",
      }),
    ]);
  });

  it("normalizes adds, merges matching variants, and clears storage", async () => {
    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    fireEvent.click(screen.getByText("add"));
    fireEvent.click(screen.getByText("add"));

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("1");
      expect(screen.getByTestId("first-qty")).toHaveTextContent("4");
      expect(screen.getByTestId("subtotal")).toHaveTextContent("480");
    });

    fireEvent.click(screen.getByText("clear"));

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("0");
      expect(screen.getByTestId("subtotal")).toHaveTextContent("0");
      expect(JSON.parse(localStorage.getItem("cart-items"))).toEqual([]);
    });
  });
});
