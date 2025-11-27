import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminCalendar from './components/AdminCalendar';
import ClientCalendar from './components/ClientCalendar';
import FidelizarePortofel from './components/FidelizarePortofel';
import AdminRapoarte from './components/AdminRapoarte';

export default function App() {
    const userId = localStorage.getItem('userId') || 'demo-user';
    const userRole = localStorage.getItem('userRole') || 'client';

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-100">
                {/* NAVBAR */}
                <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <h1 className="text-2xl font-bold">🎂 TORT-APP</h1>
                        <div className="space-x-4">
                            {userRole === 'admin' && (
                                <>
                                    <a href="/calendar" className="hover:bg-blue-700 px-4 py-2 rounded transition">📅 Calendar</a>
                                    <a href="/rapoarte" className="hover:bg-blue-700 px-4 py-2 rounded transition">📊 Rapoarte</a>
                                </>
                            )}
                            {userRole === 'client' && (
                                <>
                                    <a href="/book" className="hover:bg-blue-700 px-4 py-2 rounded transition">📅 Rezervare</a>
                                    <a href="/fidelizare" className="hover:bg-blue-700 px-4 py-2 rounded transition">💎 Fidelizare</a>
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* ROUTES */}
                <Routes>
                    <Route path="/calendar" element={<AdminCalendar />} />
                    <Route path="/book" element={<ClientCalendar onConfirm={(data) => console.log('Booking:', data)} />} />
                    <Route path="/fidelizare" element={<FidelizarePortofel userId={userId} />} />
                    <Route path="/rapoarte" element={<AdminRapoarte />} />
                    <Route path="/" element={
                        <div className="text-center py-12">
                            <h2 className="text-3xl font-bold mb-4">🎂 Bun venit în TORT-APP!</h2>
                            <p className="text-gray-600">Selectează o opțiune din meniu</p>
                        </div>
                    } />
                </Routes>
            </div>
        </BrowserRouter>
    );
}