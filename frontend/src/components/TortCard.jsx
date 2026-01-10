// src/components/TortCard.jsx
import React from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function TortCard({ tort }) {
  return (
    <div className="border rounded-lg p-4 shadow-md bg-white">
      <img
        src={tort.imagine}
        alt={tort.denumire}
        loading="lazy"
        decoding="async"
        className="h-40 w-full object-cover rounded mb-2"
      />
      <h2 className="text-lg font-bold">{tort.denumire}</h2>
      <ul className="text-sm text-gray-600">
        {tort.ingrediente.map((ingr, index) => (
          <li key={index}>â€¢ {ingr}</li>
        ))}
      </ul>
    </div>
  );
}

export default TortCard;

