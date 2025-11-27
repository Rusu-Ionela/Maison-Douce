// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function Header() {
    return (
        <header className="bg-gray-800 text-white p-4 text-center">
            <nav className="space-x-4">
                <Link to="/" className="hover:text-yellow-300">Home</Link>
                <Link to="/about" className="hover:text-yellow-300">About</Link>
                <Link to="/contact" className="hover:text-yellow-300">Contact</Link>
            </nav>
        </header>
    );
}

export default Header;

