import React, { useState } from "react";
import { Link } from "react-router-dom";

// Navbar refăcut cu utilitare simple (Tailwind classes)
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="w-full bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-2xl font-bold text-pink-600">
          <Link to="/">Maison-Douce</Link>
        </div>
        <nav className="hidden md:flex items-center gap-5 text-gray-700 font-medium">
          <Link to="/catalog" className="hover:text-pink-600">
            Catalog
          </Link>
          <Link to="/constructor" className="hover:text-pink-600">
            Constructor
          </Link>
          <Link to="/despre" className="hover:text-pink-600">
            Despre
          </Link>
          <Link to="/contact" className="hover:text-pink-600">
            Contact
          </Link>
          <Link to="/fidelizare" className="hover:text-pink-600">
            Fidelizare
          </Link>
          <Link to="/calendar" className="hover:text-pink-600">
            Calendar
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-3 py-2 rounded-lg border border-pink-300 text-pink-600 hover:bg-pink-50"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-3 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600"
          >
            Înregistrare
          </Link>
          <button
            className="md:hidden flex flex-col gap-1"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <span className="w-6 h-0.5 bg-gray-800" />
            <span className="w-6 h-0.5 bg-gray-800" />
            <span className="w-6 h-0.5 bg-gray-800" />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-white shadow-inner">
          <nav className="flex flex-col px-4 py-3 gap-3 text-gray-700 font-medium">
            <Link to="/catalog" onClick={() => setIsOpen(false)}>
              Catalog
            </Link>
            <Link to="/constructor" onClick={() => setIsOpen(false)}>
              Constructor
            </Link>
            <Link to="/despre" onClick={() => setIsOpen(false)}>
              Despre
            </Link>
            <Link to="/contact" onClick={() => setIsOpen(false)}>
              Contact
            </Link>
            <Link to="/fidelizare" onClick={() => setIsOpen(false)}>
              Fidelizare
            </Link>
            <Link to="/calendar" onClick={() => setIsOpen(false)}>
              Calendar
            </Link>
            <Link to="/login" onClick={() => setIsOpen(false)}>
              Login
            </Link>
            <Link to="/register" onClick={() => setIsOpen(false)}>
              Înregistrare
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

