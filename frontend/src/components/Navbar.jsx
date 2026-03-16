import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { getTopNavLinks } from "../lib/siteMap";

function navLinkClass({ isActive }) {
  return [
    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap",
    isActive
      ? "bg-rose-100 text-pink-700 shadow-soft"
      : "text-gray-700 hover:bg-white hover:text-pink-700",
  ].join(" ");
}

function mobileNavLinkClass({ isActive }) {
  return [
    "rounded-2xl border px-3 py-3 text-sm font-medium",
    isActive
      ? "border-rose-200 bg-rose-50 text-pink-700"
      : "border-transparent bg-white text-gray-700 hover:border-rose-100 hover:bg-rose-50/70",
  ].join(" ");
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth() || {};
  const { items } = useCart();
  const navLinks = useMemo(() => getTopNavLinks(user), [user]);
  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [items]
  );

  const renderNavLabel = (link) => {
    if (link.to !== "/cart") return link.label;

    return (
      <>
        <span>{link.label}</span>
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-pink-700">
          {cartCount}
        </span>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-rose-100/80 bg-white/85 shadow-[0_12px_32px_rgba(165,110,112,0.12)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="shrink-0">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-pink-500">
            Atelier artizanal
          </div>
          <div className="font-serif text-2xl font-semibold text-gray-900">
            Maison-Douce
          </div>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto px-2 xl:flex">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {renderNavLabel(link)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/profil"
                className="hidden rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-soft hover:border-rose-300 hover:bg-rose-50 sm:inline-flex"
              >
                Profil
              </Link>
              <button
                className="hidden rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-pink-700 sm:inline-flex"
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-soft hover:border-rose-300 hover:bg-rose-50 sm:inline-flex"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="hidden rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-pink-700 sm:inline-flex"
              >
                Inregistrare
              </Link>
            </>
          )}

          <button
            type="button"
            className="inline-flex items-center rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-soft hover:border-rose-300 hover:bg-rose-50 xl:hidden"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label="Toggle menu"
          >
            Meniu
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-rose-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(255,247,241,0.96))] xl:hidden">
          <nav className="mx-auto grid max-w-6xl gap-2 px-4 py-4 sm:grid-cols-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={mobileNavLinkClass}
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{link.label}</span>
                  {link.to === "/cart" ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-pink-700">
                      {cartCount}
                    </span>
                  ) : null}
                </div>
              </NavLink>
            ))}

            {user ? (
              <>
                <NavLink
                  to="/profil"
                  className={mobileNavLinkClass}
                  onClick={() => setIsOpen(false)}
                >
                  Profil
                </NavLink>
                <button
                  className="rounded-2xl border border-rose-100 bg-white px-3 py-3 text-left text-sm font-semibold text-pink-700 hover:bg-rose-50"
                  onClick={() => {
                    logout?.();
                    setIsOpen(false);
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={mobileNavLinkClass}
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className={mobileNavLinkClass}
                  onClick={() => setIsOpen(false)}
                >
                  Inregistrare
                </NavLink>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
