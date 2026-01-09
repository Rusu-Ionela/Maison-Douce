export default function Despre() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Despre noi</h1>
      <p className="text-gray-700">
        Maison Douce este o patiserie artizanala dedicata torturilor personalizate si deserturilor fine. Fiecare produs este
        creat manual, cu ingrediente premium si atentie la detalii.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-lg font-semibold">Misiune</h2>
          <p className="text-sm text-gray-600">
            Sa livram deserturi memorabile, adaptate fiecarei ocazii, cu gust echilibrat si design elegant.
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-lg font-semibold">Atelierul nostru</h2>
          <p className="text-sm text-gray-600">
            Lucram in loturi mici, folosim retete testate si oferim consultanta pentru personalizare si evenimente.
          </p>
        </div>
      </div>
      <div className="border rounded-lg p-4 bg-white">
        <h2 className="text-lg font-semibold">De ce Maison Douce</h2>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>Ingrediente naturale, fara compromisuri.</li>
          <li>Design personalizat pentru fiecare client.</li>
          <li>Livrare rapida si comunicare clara.</li>
        </ul>
      </div>
    </div>
  );
}
