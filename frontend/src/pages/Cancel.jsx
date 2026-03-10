import { Link } from "react-router-dom";

function Cancel() {
  return (
    <div className="text-center mt-10">
      <h1 className="text-2xl font-bold text-red-600">Plata a fost anulata!</h1>
      <p className="mt-4">Poti incerca din nou sau revino mai tarziu.</p>
      <Link to="/" className="mt-6 inline-block bg-blue-500 text-white px-4 py-2 rounded">
        Inapoi la pagina principala
      </Link>
    </div>
  );
}

export default Cancel;
