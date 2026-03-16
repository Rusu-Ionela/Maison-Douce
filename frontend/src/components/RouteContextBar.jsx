import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getContextLinks } from "../lib/siteMap";

export default function RouteContextBar() {
  const { pathname } = useLocation();
  const { user } = useAuth() || {};
  const links = getContextLinks(pathname, user, 6);

  if (!links.length) return null;

  return (
    <div className="w-full border-b border-rose-100/80 bg-[linear-gradient(180deg,_rgba(255,250,242,0.88),_rgba(255,255,255,0.94))] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 text-sm">
        <span className="font-medium text-gray-500">Legaturi rapide:</span>
        {links.map((item) => (
          <Link
            key={`${item.to}-${item.label}`}
            to={item.to}
            className="rounded-full border border-rose-100 bg-white px-3 py-1.5 text-pink-700 shadow-sm hover:border-rose-200 hover:bg-rose-50"
          >
            {item.label}
          </Link>
        ))}
        <Link
          to="/harta-site"
          className="rounded-full border border-rose-100 bg-white px-3 py-1.5 text-gray-700 shadow-sm hover:border-rose-200 hover:bg-rose-50"
        >
          Toata harta
        </Link>
      </div>
    </div>
  );
}
