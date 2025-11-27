// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [torturi, setTorturi] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get("/torturi", { params: { activ: true, limit: 50 } });
                // backend /api/torturi returneazÄƒ { items, total, page, pages }
                setTorturi(Array.isArray(res.data?.items) ? res.data.items : []);
            } catch (err) {
                console.error("Eroare la preluarea torturilor:", err);
            }
        })();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("admin");
        navigate("/");
    };

    const handleDelete = async (id) => {
        if (!window.confirm("EÈ™ti sigur cÄƒ vrei sÄƒ È™tergi acest tort?")) return;
        try {
            await api.delete(`/torturi/${id}`);
            setTorturi((prev) => prev.filter((t) => t._id !== id));
        } catch (err) {
            console.error("Eroare la È™tergere:", err);
            alert("A apÄƒrut o eroare la È™tergerea tortului.");
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">ðŸ“‹ Admin Dashboard</h1>

            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded mb-4">
                Logout
            </button>

            <div className="flex flex-wrap gap-3 mb-4">
                <Link to="/admin/rapoarte" className="bg-purple-500 text-white px-4 py-2 rounded">
                    ðŸ“Š Vezi Rapoarte Admin
                </Link>
                <button onClick={() => navigate("/admin/comenzi")} className="bg-indigo-600 text-white px-4 py-2 rounded">
                    ðŸ“¥ Vezi Comenzile Personalizate
                </button>
                <Link to="/admin/torturi/add" className="bg-blue-500 text-white px-4 py-2 rounded">
                    âž• AdaugÄƒ Tort Nou
                </Link>
            </div>

            <h2 className="text-xl font-semibold mb-2">Torturi disponibile:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {torturi.map((tort) => (
                    <div key={tort._id} className="border p-4 rounded shadow">
                        <img src={tort.imagine} alt={tort.nume} className="mb-2 w-full h-40 object-cover rounded" />
                        <h3 className="text-lg font-semibold">{tort.nume}</h3>
                        <p className="text-sm mt-1">Ingrediente: {(tort.ingrediente || []).join(", ")}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Link to={`/admin/torturi/edit/${tort._id}`} className="bg-yellow-500 text-white px-3 py-1 rounded">
                                EditeazÄƒ
                            </Link>
                            <button onClick={() => handleDelete(tort._id)} className="bg-red-500 text-white px-3 py-1 rounded">
                                È˜terge
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

