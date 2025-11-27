import React from 'react';
import { Link } from 'react-router-dom'; // âœ… Import adÄƒugat
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function Cancel() {
    return (
        <div className="text-center mt-10">
            <h1 className="text-2xl font-bold text-red-600">Plata a fost anulatÄƒ!</h1>
            <p className="mt-4">PoÈ›i Ã®ncerca din nou sau revino mai tÃ¢rziu.</p>
            <Link to="/" className="mt-6 inline-block bg-blue-500 text-white px-4 py-2 rounded">
                ÃŽnapoi la paginÄƒ principalÄƒ
            </Link>
        </div>
    );
}

export default Cancel;

