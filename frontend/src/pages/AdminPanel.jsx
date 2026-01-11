import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "/src/lib/api.js";

function AdminPanel() {
  const [torturi, setTorturi] = useState([]);

  useEffect(() => {
    api
      .get("/torturi", { params: { limit: 200 } })
      .then((res) => setTorturi(res.data?.items || []))
      .catch((err) => console.error("Eroare la incarcare torturi:", err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Administrare Torturi</h1>

      {torturi.map((tort) => (
        <div key={tort._id} className="border p-4 rounded shadow mb-4">
          <h3 className="text-xl font-bold">{tort.nume}</h3>
          <p className="text-gray-700">{(tort.ingrediente || []).join(", ")}</p>

          <div className="mt-4 flex space-x-2">
            <Link
              to={`/admin/edit-tort/${tort._id}`}
              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
            >
              Editeaza
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminPanel;
