import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import api from "/src/lib/api.js";

vi.mock("/src/lib/api.js", () => ({
  default: {
    defaults: { headers: { common: {} } },
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function AuthProbe() {
  const { user, loading, isAuthenticated, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="auth">{String(isAuthenticated)}</div>
      <div data-testid="email">{user?.email || ""}</div>
      <div data-testid="role">{user?.rol || ""}</div>
      <button
        type="button"
        onClick={() => login({ email: "ana@example.com", parola: "secret123" })}
      >
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
    api.defaults.headers.common = {};
  });

  it("finishes loading immediately when there is no token", async () => {
    localStorage.setItem("md_user", JSON.stringify({ id: "legacy-user" }));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("auth")).toHaveTextContent("false");
    expect(localStorage.getItem("md_user")).toBeNull();
  });

  it("restores the session from token and persists normalized user data", async () => {
    localStorage.setItem("token", "jwt-token");
    api.get.mockResolvedValueOnce({
      data: { id: "user-1", nume: "Ana", email: "ana@example.com", rol: "client" },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("auth")).toHaveTextContent("true");
      expect(screen.getByTestId("email")).toHaveTextContent("ana@example.com");
    });

    expect(api.get).toHaveBeenCalledWith("/utilizatori/me");
    expect(api.defaults.headers.common.Authorization).toBe("Bearer jwt-token");
    expect(JSON.parse(localStorage.getItem("md_user"))).toEqual({
      id: "user-1",
      nume: "Ana",
      email: "ana@example.com",
      rol: "client",
    });
  });

  it("logs in, persists the session, and clears everything on logout", async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: "new-token",
        user: { _id: "user-2", nume: "Maria", email: "maria@example.com", rol: "client" },
      },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    fireEvent.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("true");
      expect(screen.getByTestId("email")).toHaveTextContent("maria@example.com");
    });

    expect(localStorage.getItem("token")).toBe("new-token");
    expect(JSON.parse(localStorage.getItem("md_user"))).toEqual({
      id: "user-2",
      nume: "Maria",
      email: "maria@example.com",
      rol: "client",
    });

    fireEvent.click(screen.getByText("logout"));

    await waitFor(() => {
      expect(screen.getByTestId("auth")).toHaveTextContent("false");
      expect(screen.getByTestId("email")).toHaveTextContent("");
    });

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("md_user")).toBeNull();
    expect(api.defaults.headers.common.Authorization).toBeUndefined();
  });
});
