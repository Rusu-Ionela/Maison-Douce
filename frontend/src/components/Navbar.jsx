import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { getTopNavLinks } from "../lib/siteMap";
import NotificationBell from "./NotificationBell";

function navLinkClass({ isActive }) {
  return [
    "group relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition",
    isActive
      ? "text-pink-700"
      : "text-[#5f564d] hover:text-pink-700",
  ].join(" ");
}

function mobileNavLinkClass({ isActive }) {
  return [
    "rounded-[22px] border px-3 py-3 text-sm font-medium transition",
    isActive
      ? "border-sage-deep/30 bg-sage/40 text-pink-700 shadow-soft"
      : "border-rose-100 bg-white/85 text-[#5f564d] hover:border-rose-200 hover:bg-white",
  ].join(" ");
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuth() || {};
  const { items } = useCart();
  const navLinks = useMemo(() => getTopNavLinks(user), [user]);
  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [items]
  );

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const renderNavLabel = (link) => {
    if (link.to !== "/cart") return link.label;

    return (
      <>
        <span>{link.label}</span>
        <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-rose-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-pink-700">
          {cartCount}
        </span>
      </>
    );
  };

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "border-b border-rose-100/80 bg-[rgba(251,247,239,0.88)] shadow-[0_18px_48px_rgba(68,53,41,0.08)] backdrop-blur-xl"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-editorial items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link to="/" className="shrink-0">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-pink-500">
            Maison-Douce
          </div>
          <div className="font-serif text-[1.95rem] font-semibold leading-none text-ink">
            Atelier de cofetarie
          </div>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-5 overflow-x-auto px-2 xl:flex">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {({ isActive }) => (
                <>
                  {renderNavLabel(link)}
                  <span
                    className={`absolute inset-x-3 -bottom-0.5 h-px origin-left bg-gradient-to-r from-pink-600 to-gold transition-transform duration-200 ${
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? <NotificationBell user={user} /> : null}

          {user ? (
            <>
              <Link
                to="/profil"
                className="hidden rounded-full border border-rose-200 bg-white/80 px-4 py-2 text-sm font-semibold text-pink-700 shadow-soft hover:-translate-y-0.5 hover:bg-white sm:inline-flex"
              >
                Profil
              </Link>
              <button
                className="hidden rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-0.5 hover:bg-pink-700 sm:inline-flex"
                onClick={logout}
              >
                Iesire
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full border border-rose-200 bg-white/80 px-4 py-2 text-sm font-semibold text-pink-700 shadow-soft hover:-translate-y-0.5 hover:bg-white sm:inline-flex"
              >
                Autentificare
              </Link>
              <Link
                to="/register"
                className="hidden rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-0.5 hover:bg-pink-700 sm:inline-flex"
              >
                Inregistrare
              </Link>
            </>
          )}

          <button
            type="button"
            className="inline-flex items-center rounded-full border border-rose-200 bg-white/88 px-3 py-2 text-sm font-semibold text-[#5f564d] shadow-soft hover:-translate-y-0.5 hover:bg-white xl:hidden"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label="Deschide meniul"
          >
            Meniu
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-rose-100 bg-[linear-gradient(180deg,_rgba(255,252,247,0.98),_rgba(246,239,228,0.96))] xl:hidden">
          <nav className="mx-auto grid max-w-editorial gap-2 px-4 py-4 sm:grid-cols-2 md:px-6">
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
                    <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-xs font-semibold text-pink-700">
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
                  className="rounded-[22px] border border-rose-200 bg-white px-3 py-3 text-left text-sm font-semibold text-pink-700 shadow-soft hover:bg-rose-50"
                  onClick={() => {
                    logout?.();
                    setIsOpen(false);
                  }}
                >
                  Iesire
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={mobileNavLinkClass}
                  onClick={() => setIsOpen(false)}
                >
                  Autentificare
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
      ) : null}
    </header>
  );
}
