import { Link } from "react-router-dom";

const PLANS = [
  { id: "basic", name: "Basic", price: 400, desc: "2 deserturi artizanale + surpriza" },
  { id: "premium", name: "Premium", price: 600, desc: "4 deserturi + selectie sezoniera" },
  { id: "deluxe", name: "Deluxe", price: 900, desc: "6 deserturi + bonus personalizat" },
];

export default function AbonamentCutiePage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Cutia lunara</h1>
        <p className="text-gray-600">Abonament lunar cu deserturi artizanale si surprize de sezon.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div key={plan.id} className="border rounded-lg p-4 bg-white space-y-2">
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <div className="text-2xl font-bold text-pink-600">{plan.price} MDL</div>
            <p className="text-sm text-gray-600">{plan.desc}</p>
            <Link
              to={`/abonament/form?plan=${plan.id}`}
              className="inline-block mt-2 px-3 py-2 rounded bg-pink-500 text-white"
            >
              Alege planul
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
