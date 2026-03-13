import { normalizeRejectionReason, reportClientError } from "./errorReporting";

describe("errorReporting", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reports a normalized client error and deduplicates rapid repeats", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
    });
    vi.stubGlobal("fetch", fetchMock);

    localStorage.setItem(
      "md_user",
      JSON.stringify({
        id: "507f191e810c19729de860ea",
        email: "ana@example.com",
        rol: "client",
      })
    );

    const error = new Error("Boom");

    await reportClientError({
      kind: "react_render_error",
      error,
      info: { componentStack: "at App" },
    });
    await reportClientError({
      kind: "react_render_error",
      error,
      info: { componentStack: "at App" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);

    expect(url).toContain("/monitoring/client-error");
    expect(payload.kind).toBe("react_render_error");
    expect(payload.message).toBe("Boom");
    expect(payload.componentStack).toBe("at App");
    expect(payload.userId).toBe("507f191e810c19729de860ea");
    expect(payload.userEmail).toBe("ana@example.com");
    expect(payload.userRole).toBe("client");
  });

  it("normalizes non-error rejection reasons", () => {
    const error = normalizeRejectionReason({ code: "EFAIL" });
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain("EFAIL");
  });
});
