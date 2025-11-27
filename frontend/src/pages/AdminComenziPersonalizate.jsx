import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function AdminComenziPersonalizate() {
  const navigate = useNavigate();
  const [comenzi, setComenzi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdmin = localStorage.getItem("admin") === "true";
    if (!isAdmin) { navigate("/admin"); return; }

    (async () => {
      try {
        // recomand: pe backend sÄƒ expui GET /comenzi?tip=personalizata (sau /comenzi/personalizate)
        const data = (await api.get("/comenzi", { params: { tip: "personalizata" } })).data;
        setComenzi(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Eroare la Ã®ncÄƒrcarea comenzilor personalizate:", e);
        setComenzi([]);
      } finally { setLoading(false); }
    })();
  }, [navigate]);

  if (loading) return <div className="p-6">Se Ã®ncarcÄƒâ€¦</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">ðŸ“¦ Comenzi Personalizate</h1>
      {comenzi.length === 0 ? (
        <p className="text-gray-600">Nu existÄƒ comenzi personalizate.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {comenzi.map((c) => (
            <div key={c._id} className="border p-4 rounded shadow bg-white">
              <h3 className="text-lg font-semibold">ðŸ‘¤ {c.numeClient || c.client?.nume || "Client"}</h3>
              {c.preferinte && <p className="text-sm text-gray-600 mt-1">PreferinÈ›e: {c.preferinte}</p>}
              <p className="text-sm text-gray-500 mt-1">Data: {new Date(c.createdAt || c.data).toLocaleString()}</p>
              {c.imagineGenerata && (
                <img src={c.imagineGenerata} alt="Tort personalizat" className="mt-3 w-full h-48 object-contain border rounded" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

