// src/components/Footer.js
import React from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function Footer() {
  return (
    <footer className="bg-gray-200 text-center p-4 mt-8">
      <p>&copy; 2025 TortApp. Toate drepturile rezervate.</p>
    </footer>
  );
}

export default Footer;

