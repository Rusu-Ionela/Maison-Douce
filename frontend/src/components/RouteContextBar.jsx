import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getContextLinks } from "../lib/siteMap";

export default function RouteContextBar() {
  const { pathname } = useLocation();
  const { user } = useAuth() || {};
  const links = getContextLinks(pathname, user, 6);

  if (!links.length) return null;

  return (
    <div className="w-full border-b border-rose-100/80 bg-[linear-gradient(180deg,_rgba(255,252,247,0.86),_rgba(250,245,236,0.82))] backdrop-blur">
      <div className="mx-auto flex max-w-editorial flex-wrap items-center gap-2 px-4 py-3 text-sm md:px-6">
        <span className="font-medium uppercase tracking-[0.2em] text-[#8a8178]">
          Mai departe:
        </span>
        {links.map((item) => (
          <Link
            key={`${item.to}-${item.label}`}
            to={item.to}
            className="rounded-full border border-rose-100 bg-white/82 px-3 py-1.5 text-pink-700 shadow-sm hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
