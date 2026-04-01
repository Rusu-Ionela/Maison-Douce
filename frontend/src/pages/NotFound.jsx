import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-[radial-gradient(circle_at_top,_rgba(255,248,244,1),_rgba(250,235,240,0.92),_rgba(255,255,255,1))] px-4 py-16">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-rose-100 bg-white p-10 text-center shadow-xl shadow-rose-100/70">
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-pink-500">
          Pagina lipsa
        </p>
        <h1 className="mt-4 font-serif text-5xl text-gray-900">
          Pagina nu exista
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-600">
          Linkul poate fi vechi sau incomplet. Revino in fluxul principal si
          continua din paginile importante ale platformei.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            className="rounded-full bg-pink-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-700"
            to="/"
          >
            Inapoi la prima pagina
          </Link>
          <Link
            className="rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-pink-600 transition hover:bg-rose-50"
            to="/catalog"
          >
            Vezi catalogul
          </Link>
          <Link
            className="rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            to="/constructor"
          >
            Constructor tort
          </Link>
        </div>
      </div>
    </div>
  );
}
