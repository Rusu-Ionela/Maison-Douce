import { Link, useLocation } from "react-router-dom";
import CakeConstructor2D from "../components/CakeConstructor2D";
import ClientOrderFlowGuide from "../components/ClientOrderFlowGuide";
import { buttons, cards, containers } from "../lib/tailwindComponents";

const STEPS = [
  "Alegi mai intai cate etaje vrei si cat de inalt sa fie tortul.",
  "Stabilesti interiorul, apoi exteriorul, iar preview-ul comuta intre Sectiune si Exterior.",
  "Poti incarca poze de inspiratie, descrii liber decorul dorit, iar AI-ul genereaza 3 variante mai apropiate de un tort real.",
];

export default function Constructor() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const designId = params.get("designId");
  const prefillFilling = params.get("umplutura") || "";
  const prefillProductId = params.get("from") || "";

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-editorial space-y-6`}>
        <header className={`${cards.tinted} overflow-hidden`}>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="eyebrow">Atelier de comenzi speciale</div>
              <div>
                <div className="font-script text-4xl text-pink-500">Maison-Douce atelier</div>
                <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
                  Cerere personalizata prin constructorul 2D
                </h1>
              </div>
              <p className="max-w-2xl text-base leading-8 text-[#655c53]">
                Aici pornesti fluxul pentru torturi create de la zero sau pentru decoruri care au
                nevoie de validare manuala. Configurezi structura, interiorul si exteriorul, apoi
                trimiti cererea catre atelier pentru confirmarea finala a pretului.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/calendar" className={buttons.outline}>
                  Rezervare si livrare
                </Link>
                <Link to="/chat" className={buttons.secondary}>
                  Discuta cu atelierul
                </Link>
              </div>
            </div>

            <div className={`${cards.default} grid gap-3 self-start`}>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-600">
                Cum functioneaza
              </div>
              {STEPS.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-[22px] border border-rose-100 bg-white/75 px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-charcoal text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="text-sm leading-6 text-[#5d544c]">{step}</div>
                </div>
              ))}
              {designId ? (
                <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Editezi un draft existent. Modificarile vor actualiza designul deja salvat.
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <ClientOrderFlowGuide activeFlow="custom" />

        <CakeConstructor2D
          designId={designId}
          prefillFilling={prefillFilling}
          prefillProductId={prefillProductId}
        />
      </div>
    </div>
  );
}
