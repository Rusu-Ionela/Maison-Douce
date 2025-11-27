import React from 'react';
import { Link } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function Succes() {
    return (
        <div className="max-w-md mx-auto p-6 text-center">
            <h1 className="text-3xl font-bold text-green-600 mb-4">âœ… PlatÄƒ reuÈ™itÄƒ!</h1>
            <p className="text-gray-700 mb-6">ÃŽÈ›i mulÈ›umim pentru comandÄƒ. O vom procesa cÃ¢t mai curÃ¢nd.</p>
            <Link to="/" className="text-blue-500 underline">
                ÃŽnapoi la pagina principalÄƒ
            </Link>
        </div>
    );
}

export default Succes;

