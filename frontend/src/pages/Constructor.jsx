import { Link, useLocation } from "react-router-dom";
import CakeConstructor2D from "../components/CakeConstructor2D";
import { buttons, cards, containers } from "../lib/tailwindComponents";

const STEPS = [
  "Alegi compozitia si stilul general",
  "Vezi preview-ul 2D si ajustezi detaliile",
  "Salvezi draftul sau il trimiti direct spre productie",
];

export default function Constructor() {
  const location = useLocation();
  const designId = new URLSearchParams(location.search).get("designId");

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      <div className={`${containers.pageMax} max-w-7xl space-y-6`}>
        <header className="rounded-[32px] border border-rose-100 bg-white/88 p-6 shadow-card backdrop-blur">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
                Tailor-made
              </p>
              <h1 className="font-serif text-3xl font-semibold text-gray-900 md:text-4xl">
                Constructor 2D pentru torturi personalizate
              </h1>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                Construiesti rapid un concept clar, il salvezi in cont si il poti
                trimite direct catre patiser fara pasi inutili.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/personalizeaza" className={buttons.outline}>
                  Vezi ghidul de personalizare
                </Link>
                <Link to="/chat" className={buttons.secondary}>
                  Discutie cu patiserul
                </Link>
              </div>
            </div>

            <div className={`${cards.default} grid gap-3 self-start`}>
              <div className="text-sm font-semibold text-gray-900">
                Cum functioneaza
              </div>
              {STEPS.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-600 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="text-sm leading-6 text-gray-700">{step}</div>
                </div>
              ))}
              {designId ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Editezi un draft existent. Modificarile vor actualiza designul deja salvat.
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <CakeConstructor2D designId={designId} />
      </div>
    </div>
  );
}
