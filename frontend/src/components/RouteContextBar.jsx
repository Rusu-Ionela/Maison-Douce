import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getContextLinks } from "../lib/siteMap";

export default function RouteContextBar() {
  const { pathname } = useLocation();
  const { user } = useAuth() || {};
  const links = getContextLinks(pathname, user, 6);

  if (!links.length) return null;

  return (
    <div className="w-full border-b border-rose-100 bg-rose-50/70">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Legaturi rapide:</span>
        {links.map((item) => (
          <Link
            key={`${item.to}-${item.label}`}
            to={item.to}
            className="px-2 py-1 rounded-md bg-white border border-rose-100 text-pink-700 hover:bg-pink-50"
          >
            {item.label}
          </Link>
        ))}
        <Link
          to="/harta-site"
          className="px-2 py-1 rounded-md bg-white border border-rose-100 text-gray-700 hover:bg-gray-50"
        >
          Toata harta
        </Link>
      </div>
    </div>
  );
}

