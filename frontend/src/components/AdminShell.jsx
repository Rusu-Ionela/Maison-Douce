import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SITE_SECTIONS, canAccessLink } from "../lib/siteMap";

function getAdminLinks(user) {
  const section = SITE_SECTIONS.find((item) => item.id === "admin");
  if (!section) return [];

  const seen = new Set();
  return section.items
    .filter((item) => canAccessLink(item, user))
    .filter((item) => !item.hidden)
    .filter((item) => {
      if (seen.has(item.to)) return false;
      seen.add(item.to);
      return true;
    });
}

function tabClass({ isActive }) {
  return [
    "rounded-full border px-3 py-2 text-sm font-medium",
    isActive
      ? "border-rose-200 bg-rose-50 text-pink-700 shadow-soft"
      : "border-white/60 bg-white text-gray-700 hover:border-rose-200 hover:bg-rose-50 hover:text-pink-700",
  ].join(" ");
}

export function AdminMetricGrid({ items = [] }) {
  const toneClasses = {
    rose: "border-rose-200 bg-rose-50/90 text-pink-700",
    sage: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
    gold: "border-amber-200 bg-amber-50/90 text-amber-700",
    slate: "border-slate-200 bg-slate-50/90 text-slate-700",
  };

  if (!items.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className={`rounded-[24px] border p-4 shadow-soft ${
            toneClasses[item.tone] || "border-rose-100 bg-white"
          }`}
        >
          <div className="text-sm font-medium opacity-80">{item.label}</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{item.value}</div>
          {item.hint ? (
            <div className="mt-2 text-sm text-gray-600">{item.hint}</div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function AdminPanel({
  title,
  description = "",
  action = null,
  className = "",
  children,
}) {
  return (
    <section
      className={`rounded-[28px] border border-rose-100 bg-white/92 p-5 shadow-soft backdrop-blur ${className}`.trim()}
    >
      {(title || description || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export default function AdminShell({
  title,
  description,
  eyebrow = "Panou operational",
  actions = null,
  navLimit = 12,
  children,
}) {
  const { user } = useAuth() || {};
  const { pathname } = useLocation();
  const adminLinks = useMemo(() => getAdminLinks(user).slice(0, navLimit), [navLimit, user]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_rgba(255,250,242,0.96),_rgba(247,230,234,0.78),_rgba(255,255,255,0.98))] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-rose-100 bg-white/88 p-6 shadow-card backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
                {eyebrow}
              </div>
              <h1 className="mt-3 font-serif text-3xl font-semibold text-gray-900">
                {title}
              </h1>
              {description ? (
                <p className="mt-3 text-base leading-7 text-gray-600">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>

          {adminLinks.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {adminLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={tabClass}
                  aria-current={pathname === item.to ? "page" : undefined}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ) : null}
        </section>

        {children}
      </div>
    </div>
  );
}
