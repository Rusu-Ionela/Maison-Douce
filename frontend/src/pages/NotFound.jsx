import React from "react";
import { Link } from "react-router-dom";
import api, { getJson, BASE_URL } from '/src/lib/api.js';
export default function NotFound() {
    return (
        <div className="p-8 text-center">
            <h1 className="text-3xl font-semibold mb-2">404 â€“ Pagina nu existÄƒ</h1>
            <p className="mb-6">VerificÄƒ adresa sau navigheazÄƒ din meniu.</p>
            <Link className="text-blue-600 underline" to="/">ÃŽnapoi la Home</Link>
        </div>
    );
}

