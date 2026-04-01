import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessLink, getVisibleSections } from "../lib/siteMap";

const activeLinkClassName = "text-pink-600 hover:text-pink-700";
const lockedLinkClassName = "text-gray-400";

function accessNote(item) {
  if (item.note) return item.note;
  if (Array.isArray(item.roles) && item.roles.length) {
    return `rol: ${item.roles.join("/")}`;
  }
  if (item.requiresAuth) return "login necesar";
  return "";
}

export default function HartaSite() {
  const { user } = useAuth() || {};
  const sections = getVisibleSections(user, { includeLocked: true });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Arhitectura interna a platformei</h1>
        <p className="text-gray-600">
          Vedere interna pentru staff. Te ajuta sa urmaresti rapid legaturile dintre module,
          rutele protejate si zonele operationale ale platformei.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.id}
            className={`bg-white border border-rose-100 rounded-2xl p-5 shadow-sm ${
              section.fullWidth ? "md:col-span-2" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
              {section.note && <span className="text-xs text-gray-500">{section.note}</span>}
            </div>

            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-700">
              {section.items.map((item) => {
                const allowed = canAccessLink(item, user);
                const note = accessNote(item);
                const className = allowed ? activeLinkClassName : lockedLinkClassName;

                return (
                  <li key={`${item.to}-${item.label}`} className="flex items-center gap-2">
                    {allowed ? (
                      <Link to={item.to} className={className}>
                        {item.label}
                      </Link>
                    ) : (
                      <span className={className}>{item.label}</span>
                    )}
                    {note && <span className="text-xs text-gray-500">({note})</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
