import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessLink, getVisibleSections } from "../lib/siteMap";

export default function QuickNavigator() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { pathname } = useLocation();
  const { user } = useAuth() || {};

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const sections = useMemo(() => {
    const all = getVisibleSections(user, { includeLocked: true });
    const q = String(query || "").trim().toLowerCase();
    if (!q) return all;

    return all
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const haystack = `${item.label} ${item.to} ${item.note || ""}`.toLowerCase();
          return haystack.includes(q);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [query, user]);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open ? (
        <div className="max-h-[72vh] w-[360px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[30px] border border-rose-100 bg-[rgba(255,251,245,0.96)] shadow-floating backdrop-blur-xl">
          <div className="border-b border-rose-100 bg-[linear-gradient(180deg,_rgba(255,252,247,0.96),_rgba(244,238,228,0.98))] p-4">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-600">
              Navigare completa
            </div>
            <div className="mt-2 font-serif text-2xl text-ink">Maison-Douce</div>
            <div className="mt-1 text-xs leading-5 text-[#7d746a]">
              Cauta o pagina dupa nume, rol sau ruta.
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-3 w-full rounded-[20px] border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-sage/30"
              placeholder="ex: calendar, /admin/comenzi"
            />
          </div>

          <div className="max-h-[54vh] space-y-4 overflow-auto p-4">
            {sections.map((section) => (
              <div key={section.id} className="space-y-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8178]">
                    {section.title}
                  </div>
                  {section.note ? (
                    <div className="mt-1 text-xs text-[#9c9388]">{section.note}</div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {section.items.map((item) => {
                    const allowed = canAccessLink(item, user);
                    const isCurrent =
                      pathname === item.to || pathname.startsWith(`${item.to}/`);

                    if (allowed) {
                      return (
                        <Link
                          key={`${section.id}-${item.to}-${item.label}`}
                          to={item.to}
                          className={[
                            "rounded-[22px] border px-3 py-3 text-sm transition",
                            isCurrent
                              ? "border-sage-deep/30 bg-sage/40 text-pink-700 shadow-soft"
                              : "border-transparent bg-white/86 text-[#5f564d] hover:border-rose-100 hover:bg-white hover:text-pink-700",
                          ].join(" ")}
                        >
                          <div className="font-medium">{item.label}</div>
                          <div className="mt-1 text-xs text-[#8a8178]">{item.to}</div>
                        </Link>
                      );
                    }

                    return (
                      <span
                        key={`${section.id}-${item.to}-${item.label}`}
                        className="rounded-[22px] border border-dashed border-rose-100 bg-[#f3efe8] px-3 py-3 text-sm text-[#8d857b]"
                      >
                        <div className="font-medium">{item.label}</div>
                        <div className="mt-1 text-xs">Acces limitat pentru rolul curent</div>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center rounded-full border border-white/70 bg-charcoal px-4 py-2.5 text-sm font-semibold text-white shadow-card hover:-translate-y-0.5 hover:bg-pink-700"
        aria-expanded={open}
      >
        {open ? "Inchide meniul" : "Navigare rapida"}
      </button>
    </div>
  );
}
