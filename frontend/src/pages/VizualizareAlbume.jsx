import { useEffect, useState } from "react";
import api from "/src/lib/api.js";

function VizualizareAlbume() {
  const [albume, setAlbume] = useState([]);

  useEffect(() => {
    api
      .get("/albume")
      .then((res) => setAlbume(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Eroare:", err));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Albumele mele</h2>
      {albume.length === 0 && <div className="text-gray-600">Nu ai albume inca.</div>}
      <div className="space-y-6">
        {albume.map((album) => (
          <div key={album._id} className="border p-4 rounded">
            <h3 className="font-semibold">{album.titlu}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {album.fisiere.map((f, index) => (
                <img key={index} src={f} alt="Fisier" className="w-full h-32 object-cover rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VizualizareAlbume;
