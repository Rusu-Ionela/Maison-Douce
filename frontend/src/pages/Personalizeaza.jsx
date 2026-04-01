import { Link } from "react-router-dom";

const OPTIONS = {
  blaturi: ["Vanilie", "Ciocolata", "Red Velvet"],
  creme: ["Vanilie", "Pistachio", "Lamaie"],
  umpluturi: ["Capsuni", "Fructe de padure", "Oreo"],
  decor: ["Minimal", "Lambeth", "Floral"],
};

export default function Personalizeaza() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Ghid rapid pentru cererea personalizata</h1>
        <p className="text-gray-600">
          Pagina aceasta ramane doar ca ghid. Fluxul principal de personalizare este in
          constructorul 2D, unde configurezi tortul, salvezi draftul si trimiti cererea spre
          validare.
        </p>
        <div className="flex gap-3">
          <Link to="/constructor" className="px-4 py-2 rounded bg-pink-500 text-white">
            Deschide constructorul 2D
          </Link>
          <Link to="/calendar" className="px-4 py-2 rounded border border-pink-200 text-pink-600">
            Rezerva slotul
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(OPTIONS).map(([title, list]) => (
          <div key={title} className="border rounded-lg p-4 bg-white">
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <div className="flex flex-wrap gap-2">
              {list.map((item) => (
                <span key={item} className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="border rounded-lg p-4 bg-white space-y-2">
        <h2 className="text-lg font-semibold">Cum functioneaza</h2>
        <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
          <li>Alegi optiunile din constructorul 2D.</li>
          <li>Salvezi draftul sau trimiti cererea personalizata catre atelier.</li>
          <li>Rezervi data si ora din calendar daca vrei sa blochezi slotul.</li>
          <li>Platesti dupa confirmarea pretului final.</li>
        </ol>
      </section>
    </div>
  );
}
