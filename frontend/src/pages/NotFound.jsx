import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-semibold mb-2">404 - Pagina nu exista</h1>
      <p className="mb-6">Verifica adresa sau navigheaza din meniu.</p>
      <Link className="text-blue-600 underline" to="/">
        Inapoi la Home
      </Link>
    </div>
  );
}
