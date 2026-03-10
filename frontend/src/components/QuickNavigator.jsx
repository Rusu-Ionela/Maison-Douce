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
      {open && (
        <div className="w-[340px] max-w-[calc(100vw-1rem)] max-h-[70vh] overflow-hidden bg-white border border-rose-200 rounded-2xl shadow-xl">
          <div className="p-3 border-b border-rose-100">
            <div className="text-sm font-semibold text-gray-900">Navigare completa</div>
            <div className="text-xs text-gray-500">Cauta pagina dupa nume sau ruta</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-2 w-full border rounded-lg p-2 text-sm"
              placeholder="ex: contabilitate, /admin/comenzi"
            />
          </div>

          <div className="max-h-[52vh] overflow-auto p-3 space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="space-y-1">
                <div className="text-xs font-semibold uppercase text-gray-500">{section.title}</div>
                <div className="grid grid-cols-1 gap-1">
                  {section.items.map((item) => {
                    const allowed = canAccessLink(item, user);
                    if (allowed) {
                      return (
                        <Link
                          key={`${section.id}-${item.to}-${item.label}`}
                          to={item.to}
                          className="text-sm px-2 py-1 rounded hover:bg-rose-50 text-pink-700"
                        >
                          {item.label}
                        </Link>
                      );
                    }
                    return (
                      <span
                        key={`${section.id}-${item.to}-${item.label}`}
                        className="text-sm px-2 py-1 rounded text-gray-400"
                      >
                        {item.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-4 py-2 rounded-full bg-pink-600 text-white shadow-lg hover:bg-pink-700"
      >
        {open ? "Inchide navigarea" : "Navigare rapida"}
      </button>
    </div>
  );
}

