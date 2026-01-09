import { useEffect, useState } from "react";
import api from "/src/lib/api.js";

function ChatHistory() {
  const [mesaje, setMesaje] = useState([]);

  useEffect(() => {
    api
      .get("/mesaje-chat")
      .then((res) => setMesaje(res.data || []))
      .catch((err) => console.error("Eroare:", err));
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Istoric mesaje chat</h2>
      <div className="border p-4 rounded bg-white">
        {mesaje.length === 0 && <div className="text-gray-500">Nu exista mesaje.</div>}
        {mesaje.map((mesaj) => (
          <div key={mesaj._id} className="my-3 border-b pb-2">
            <p className="font-semibold">{mesaj.utilizator || "Client"}</p>
            <p>{mesaj.text}</p>
            {mesaj.fileUrl && (
              <a href={mesaj.fileUrl} className="text-pink-600 underline" target="_blank" rel="noreferrer">
                {mesaj.fileName || "Fisier atasat"}
              </a>
            )}
            <p className="text-xs text-gray-500">{new Date(mesaj.data).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatHistory;
