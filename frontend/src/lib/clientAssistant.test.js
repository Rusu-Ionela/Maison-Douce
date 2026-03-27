import { buildAssistantReply } from "./clientAssistant";

describe("clientAssistant", () => {
  it("returns the constructor guidance for constructor questions", () => {
    const reply = buildAssistantReply({
      query: "nu gasesc constructor 2d",
      pathname: "/",
      user: null,
    });

    expect(reply.intentId).toBe("constructor");
    expect(reply.text).toContain("/constructor");
    expect(reply.actions.some((action) => action.to === "/constructor")).toBe(true);
  });

  it("returns loyalty guidance for voucher questions", () => {
    const reply = buildAssistantReply({
      query: "cum aplic voucher sau puncte",
      pathname: "/",
      user: { _id: "user-1", rol: "client" },
    });

    expect(reply.intentId).toBe("voucher");
    expect(reply.text).toContain("pagina de plata");
    expect(reply.actions.some((action) => action.to === "/fidelizare")).toBe(true);
  });

  it("falls back to route navigation when the question matches a page", () => {
    const reply = buildAssistantReply({
      query: "unde este catalogul",
      pathname: "/",
      user: null,
    });

    expect(reply.actions.some((action) => action.to === "/catalog")).toBe(true);
  });

  it("returns the contact schedule when the user asks about program", () => {
    const reply = buildAssistantReply({
      query: "ce program aveti",
      pathname: "/",
      user: null,
    });

    expect(reply.intentId).toBe("program");
    expect(reply.text).toContain("Luni - Sambata, 09:00 - 19:00");
  });
});
