// src/components/Navbar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

/* ---------------- Admin dropdown (desktop) ---------------- */
function AdminMenu() {
  const [open, setOpen] = useState(false);
  const refBtn = useRef(null);
  const refMenu = useRef(null);
  const loc = useLocation();

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClick = (e) => {
      if (!open) return;
      if (refMenu.current && !refMenu.current.contains(e.target) &&
        refBtn.current && !refBtn.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="admin-wrap">
      <button
        ref={refBtn}
        className="btn-ghost"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Admin â–¾
      </button>
      {open && (
        <div ref={refMenu} className="dropdown" role="menu">
          <NavLink to="/admin" className="drop-link">Dashboard</NavLink>
          <NavLink to="/admin/produse" className="drop-link">Produse</NavLink>
          <NavLink to="/admin/torturi" className="drop-link">Torturi</NavLink>
          <NavLink to="/admin/comenzi" className="drop-link">Comenzi</NavLink>
          <NavLink to="/admin/calendar" className="drop-link">Calendar</NavLink>
          <NavLink to="/admin/rapoarte" className="drop-link">Rapoarte</NavLink>
          <NavLink to="/admin/notificari" className="drop-link">NotificÄƒri</NavLink>
        </div>
      )}
    </div>
  );
}

/* ---------------- Navbar principal ---------------- */
export default function Navbar() {
  let authSafe = {};
  try { authSafe = useAuth() || {}; } catch { authSafe = {}; }

  const { isAuthenticated, user, logout } = {
    isAuthenticated: authSafe.isAuthenticated ?? false,
    user: authSafe.user ?? null,
    logout: authSafe.logout ?? (() => { }),
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const [zonesOpen, setZonesOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => { setMobileOpen(false); setZonesOpen(false); }, [loc.pathname]);

  const mainItems = useMemo(() => ([
    { to: "/", label: "AcasÄƒ" },
    { to: "/catalog", label: "ColecÈ›ii" },
    { to: "/personalizeaza", label: "PersonalizeazÄƒ" },
    { to: "/despre", label: "Despre" },
    { to: "/calendar", label: "Calendar" }, // âœ… vizibil Ã®n meniu
    { to: "/contact", label: "Contact" },
    { to: "/fidelizare", label: "Fidelizare" },
    { to: "/plata", label: "PlatÄƒ (test)" }, // âœ… link direct de test
  ]), []);

  const zoneItems = useMemo(() => ([
    { to: "/login", label: "Autentificare" },
    { to: "/chat", label: "Chat clienÈ›i" },
    { to: "/profil", label: "Profil" },
  ]), []);

  return (
    <header className="nav-root">
      <div className="nav-bar container">
        {/* Brand */}
        <Link to="/" className="brand" aria-label="AcasÄƒ">
          <span className="brand-top">IONELA CAKE</span>
          <span className="brand-sub">Maison Douce</span>
        </Link>

        {/* Meniu Desktop */}
        <nav className="menu desktop" aria-label="Meniu principal">
          {mainItems.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) => "menu-link" + (isActive ? " active" : "")}
            >
              {i.label}
            </NavLink>
          ))}

          {isAuthenticated && (
            <>
              <NavLink to="/chat" className="menu-link">Chat</NavLink>
              <NavLink to="/profil" className="menu-link">Profil</NavLink>
            </>
          )}
        </nav>

        {/* Dreapta Desktop */}
        <div className="right desktop">
          {!isAuthenticated ? (
            <>
              <NavLink to="/login" className="btn-ghost">Autentificare</NavLink>
              <NavLink to="/register" className="btn-solid">ÃŽnregistrare</NavLink>
            </>
          ) : (
            <>
              {(user?.role === "patiser" || user?.role === "admin") && <AdminMenu />}
              <button className="btn-ghost" onClick={logout}>Deconectare</button>
            </>
          )}
        </div>

        {/* Hamburger (mobil) */}
        <button
          className={"hamburger mobile" + (mobileOpen ? " is-open" : "")}
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Deschide meniul"
          aria-expanded={mobileOpen}
          aria-controls="drawer-nav"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Drawer mobil */}
      {mobileOpen && (
        <div className="drawer mobile" onClick={() => setMobileOpen(false)}>
          <div
            id="drawer-nav"
            className="drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="drawer-header">
              <div className="brand-mini">
                <div className="b1">IONELA CAKE</div>
                <div className="b2">Maison Douce</div>
              </div>
              <button className="close" onClick={() => setMobileOpen(false)} aria-label="ÃŽnchide">Ã—</button>
            </div>

            <nav className="drawer-links" aria-label="Meniu mobil">
              {mainItems.map(i => (
                <NavLink key={i.to} to={i.to} className="drawer-link">{i.label}</NavLink>
              ))}

              {/* Zone aplicaÈ›ie â€“ doar Ã®n hamburger */}
              <button
                className={"zones-toggle" + (zonesOpen ? " expanded" : "")}
                onClick={() => setZonesOpen(v => !v)}
                type="button"
                aria-expanded={zonesOpen}
                aria-controls="zones-list"
              >
                <span>Zone aplicaÈ›ie</span>
                <span>{zonesOpen ? "â–´" : "â–¾"}</span>
              </button>

              {zonesOpen && (
                <div id="zones-list" className="zones">
                  {zoneItems.map(z => (
                    <NavLink key={z.to} to={z.to} className="zone-link">{z.label}</NavLink>
                  ))}
                </div>
              )}

              {isAuthenticated ? (
                <>
                  {(user?.role === "patiser" || user?.role === "admin") && (
                    <>
                      <div className="section-h">Admin</div>
                      <NavLink to="/admin" className="drawer-link">Dashboard</NavLink>
                      <NavLink to="/admin/produse" className="drawer-link">Produse</NavLink>
                      <NavLink to="/admin/torturi" className="drawer-link">Torturi</NavLink>
                      <NavLink to="/admin/comenzi" className="drawer-link">Comenzi</NavLink>
                      <NavLink to="/admin/calendar" className="drawer-link">Calendar</NavLink>
                      <NavLink to="/admin/rapoarte" className="drawer-link">Rapoarte</NavLink>
                      <NavLink to="/admin/notificari" className="drawer-link">NotificÄƒri</NavLink>
                    </>
                  )}
                  <button className="btn-ghost full" onClick={logout}>Deconectare</button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="drawer-link">Autentificare</NavLink>
                  <NavLink to="/register" className="drawer-link">ÃŽnregistrare</NavLink>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

