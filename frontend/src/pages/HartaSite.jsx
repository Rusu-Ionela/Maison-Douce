import { Link } from "react-router-dom";

const sections = [
  {
    title: "Public",
    fullWidth: true,
    items: [
      { label: "Home", to: "/" },
      { label: "Catalog", to: "/catalog" },
      { label: "Cos", to: "/cart" },
      { label: "Constructor", to: "/constructor" },
      { label: "Personalizeaza", to: "/personalizeaza" },
      { label: "Personalizare", to: "/personalizare" },
      { label: "Desen tort", to: "/desen-tort" },
      { label: "Designer AI", to: "/designer-ai" },
      { label: "Tort Designer", to: "/tort-designer" },
      { label: "Patiser Drawing", to: "/patiser-drawing" },
      { label: "Retete", to: "/retete" },
      { label: "Abonament", to: "/abonament" },
      { label: "Abonament form", to: "/abonament/form" },
      { label: "Abonament planuri", to: "/abonament/planuri" },
      { label: "Comanda", to: "/comanda" },
      { label: "Comanda demo", to: "/comanda-demo" },
      { label: "Calendar", to: "/calendar" },
      { label: "Calendar legacy", to: "/calendar-legacy" },
      { label: "Rezervare (alias)", to: "/rezervare" },
      { label: "Rezervare client", to: "/rezervare/client" },
      { label: "Plata", to: "/plata" },
      { label: "Plata succes", to: "/plata/succes" },
      { label: "Plata eroare", to: "/plata/eroare" },
      { label: "Plata cancel", to: "/plata/cancel" },
      { label: "Succes", to: "/succes" },
      { label: "Contact", to: "/contact" },
      { label: "Contact vechi", to: "/contact-old" },
      { label: "Despre", to: "/despre" },
      { label: "Despre noi", to: "/despre-noi" },
      { label: "About", to: "/about" },
      { label: "FAQ", to: "/faq" },
      { label: "Termeni", to: "/termeni" },
      { label: "Confidentialitate", to: "/confidentialitate" },
      { label: "Harta site", to: "/harta-site" },
    ],
  },
  {
    title: "Cont si autentificare",
    items: [
      { label: "Login", to: "/login" },
      { label: "Inregistrare", to: "/register" },
      { label: "Reset parola", to: "/reset-parola" },
      { label: "Resetare parola", to: "/resetare-parola" },
      { label: "Admin login", to: "/admin/login" },
    ],
  },
  {
    title: "Client (necesita autentificare)",
    note: "necesita login; unele necesita rol patiser/admin",
    items: [
      { label: "Albume", to: "/albume" },
      { label: "Creare album", to: "/album/creare" },
      { label: "Partajare fisiere", to: "/partajare" },
      { label: "Personalizari", to: "/personalizari" },
      { label: "Chat", to: "/chat" },
      { label: "Chat client", to: "/chat/client" },
      { label: "Chat history", to: "/chat/history", note: "patiser/admin" },
      { label: "Chat utilizatori", to: "/chat/utilizatori", note: "patiser/admin" },
      { label: "Chat mesaj", to: "/chat/mesaj" },
      { label: "Calendar prestator", to: "/prestator/calendar" },
      { label: "Profil", to: "/profil" },
      { label: "Fidelizare", to: "/fidelizare" },
      { label: "Fidelizare pagina", to: "/fidelizare/pagina" },
    ],
  },
  {
    title: "Admin (necesita rol)",
    fullWidth: true,
    items: [
      { label: "Dashboard", to: "/admin" },
      { label: "Panel", to: "/admin/panel" },
      { label: "Produse", to: "/admin/produse" },
      { label: "Torturi", to: "/admin/torturi" },
      { label: "Comenzi", to: "/admin/comenzi" },
      { label: "Comenzi personalizate", to: "/admin/comenzi-personalizate" },
      { label: "Comenzi complete", to: "/admin/comenzi-complete" },
      { label: "Calendar", to: "/admin/calendar" },
      { label: "Calendar livrare", to: "/admin/calendar-livrare" },
      { label: "Calendar view", to: "/admin/calendar-view" },
      { label: "Rapoarte", to: "/admin/rapoarte" },
      { label: "Raport rezervari", to: "/admin/raport-rezervari" },
      { label: "Stats", to: "/admin/stats" },
      { label: "Notificari", to: "/admin/notificari" },
      { label: "Mesaje contact", to: "/admin/contact" },
      { label: "Notificari foto", to: "/admin/notificari-foto" },
      { label: "Fidelizare admin", to: "/admin/fidelizare" },
      { label: "Productie", to: "/admin/production" },
      { label: "Contabilitate stoc", to: "/admin/contabilitate" },
      { label: "Umpluturi", to: "/admin/umpluturi" },
      { label: "Albume admin", to: "/admin/albume" },
      { label: "Adauga produs", to: "/admin/adauga-produs" },
      { label: "Add produs", to: "/admin/add-produs" },
      { label: "Add tort", to: "/admin/add-tort" },
      { label: "Catalog admin", to: "/admin/catalog" },
    ],
  },
];

const linkClassName = "text-pink-600 hover:text-pink-700";

export default function HartaSite() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Harta site</h1>
        <p className="text-gray-600">
          Navigare rapida intre toate paginile. Unele sectiuni necesita autentificare sau rol.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.title}
            className={`bg-white border border-rose-100 rounded-2xl p-5 shadow-sm ${
              section.fullWidth ? "md:col-span-2" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
              {section.note && <span className="text-xs text-gray-500">{section.note}</span>}
            </div>
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-700">
              {section.items.map((item) => (
                <li key={`${item.to}-${item.label}`} className="flex items-center gap-2">
                  <Link to={item.to} className={linkClassName}>
                    {item.label}
                  </Link>
                  {item.note && <span className="text-xs text-gray-500">({item.note})</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
