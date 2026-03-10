import { Link } from "react-router-dom";

function Succes() {
  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">Plata reusita!</h1>
      <p className="text-gray-700 mb-6">
        Iti multumim pentru comanda. O vom procesa cat mai curand.
      </p>
      <Link to="/" className="text-blue-500 underline">
        Inapoi la pagina principala
      </Link>
    </div>
  );
}

export default Succes;
