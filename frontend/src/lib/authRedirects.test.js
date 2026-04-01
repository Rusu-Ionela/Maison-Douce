import { describe, expect, it } from "vitest";
import { buildRedirectState, resolvePostAuthRedirect } from "./authRedirects";

describe("authRedirects", () => {
  it("returns the requested client path when it is safe", () => {
    expect(
      resolvePostAuthRedirect({
        user: { role: "client" },
        requestedTarget: { pathname: "/plata", search: "?comandaId=123" },
      })
    ).toBe("/plata?comandaId=123");
  });

  it("falls back for client users when the requested route is staff-only", () => {
    expect(
      resolvePostAuthRedirect({
        user: { role: "client" },
        requestedTarget: "/admin/calendar",
      })
    ).toBe("/calendar");
  });

  it("keeps staff users on their requested admin destination", () => {
    expect(
      resolvePostAuthRedirect({
        user: { role: "admin" },
        requestedTarget: "/admin/comenzi-personalizate",
      })
    ).toBe("/admin/comenzi-personalizate");
  });

  it("stores pathname, search and hash when building redirect state", () => {
    expect(
      buildRedirectState({
        pathname: "/tort/abc",
        search: "?preview=1",
        hash: "#galerie",
      })
    ).toEqual({
      from: {
        pathname: "/tort/abc",
        search: "?preview=1",
        hash: "#galerie",
      },
    });
  });
});
