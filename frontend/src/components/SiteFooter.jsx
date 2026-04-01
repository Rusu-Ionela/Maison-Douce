import { Link, useLocation } from "react-router-dom";
import { APP_CONTACT } from "../lib/publicSiteConfig";

const FOOTER_COLUMNS = [
  {
    title: "Colectii",
    links: [
      { to: "/catalog", label: "Torturi de semnatura" },
      { to: "/constructor", label: "Tort personalizat" },
      { to: "/calendar", label: "Rezervare si livrare" },
    ],
  },
  {
    title: "Maison-Douce",
    links: [
      { to: "/despre", label: "Povestea atelierului" },
      { to: "/fidelizare", label: "Club Maison" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Servicii",
    links: [
      { to: "/calendar", label: "Rezervari si livrare" },
      { to: "/cart", label: "Cos si plata" },
      { to: "/chat", label: "Chat cu atelierul" },
    ],
  },
];

export default function SiteFooter() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-16 border-t border-rose-100/80 bg-[linear-gradient(180deg,_rgba(251,247,239,0.96),_rgba(244,238,228,0.98))]">
      <div className="mx-auto grid max-w-editorial gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:px-6">
        <div className="space-y-5">
          <div className="eyebrow">Maison-Douce</div>
          <div>
            <div className="font-script text-4xl text-pink-500">Atelier Maison-Douce</div>
            <h2 className="mt-2 max-w-xl font-serif text-4xl font-semibold text-ink">
              Torturi, deserturi si experiente create cu ritm editorial si gust artizanal.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#665d54]">
            Maison-Douce aduce o estetica de cofetarie rafinata pentru comenzi personalizate,
            aniversari, nunti si colectii de sezon in Chisinau.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-[#5f564d]">
            <span className="rounded-full border border-rose-200 bg-white/70 px-3 py-1.5">
              {APP_CONTACT.email}
            </span>
            <span className="rounded-full border border-rose-200 bg-white/70 px-3 py-1.5">
              {APP_CONTACT.phoneDisplay}
            </span>
            <span className="rounded-full border border-rose-200 bg-white/70 px-3 py-1.5">
              {APP_CONTACT.program}
            </span>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-600">
                {column.title}
              </div>
              <div className="mt-4 space-y-3 text-sm text-[#5f564d]">
                {column.links.map((item) => (
                  <Link
                    key={`${column.title}-${item.to}`}
                    to={item.to}
                    className="block hover:text-pink-700"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
