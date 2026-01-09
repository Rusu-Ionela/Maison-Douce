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
        <h1 className="text-3xl font-bold">Personalizeaza desertul tau</h1>
        <p className="text-gray-600">
          Alege blatul, crema, umplutura si decorul preferat. Poti salva designul si il poti trimite catre patiser.
        </p>
        <div className="flex gap-3">
          <Link to="/constructor" className="px-4 py-2 rounded bg-pink-500 text-white">
            Deschide constructorul 2D
          </Link>
          <Link to="/chat" className="px-4 py-2 rounded border border-pink-200 text-pink-600">
            Discuta cu patiserul
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
          <li>Salvezi designul si il adaugi in cos.</li>
          <li>Stabilesti data si ora de livrare.</li>
          <li>Patiserul confirma si incepe productia.</li>
        </ol>
      </section>
    </div>
  );
}
