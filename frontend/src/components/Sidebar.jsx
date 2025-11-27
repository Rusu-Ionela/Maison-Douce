// src/components/Sidebar.js
import React from 'react';
import { Link } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function Sidebar() {
  return (
    <aside className="w-48 h-screen bg-gray-800 text-white p-4 fixed left-0 top-0">
      <h2 className="text-xl font-bold mb-4">TortApp</h2>
      <nav className="space-y-2">
        <Link to="/" className="block hover:text-yellow-300">ðŸ  Home</Link>
        <Link to="/about" className="block hover:text-yellow-300">ðŸ“– About</Link>
        <Link to="/contact" className="block hover:text-yellow-300">ðŸ“ž Contact</Link>
      </nav>
    </aside>
  );
}

export default Sidebar;

