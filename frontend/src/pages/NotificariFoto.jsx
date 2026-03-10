import React, { useEffect, useState } from "react";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";

function NotificariFoto() {
  const { user } = useAuth() || {};
  const [notificari, setNotificari] = useState([]);

  useEffect(() => {
    const fetchNotificari = async () => {
      const userId = user?._id || user?.id;
      if (!userId) return;
      const res = await api.get(`/notificari-foto/${userId}`);
      setNotificari(Array.isArray(res.data) ? res.data : []);
    };
    fetchNotificari();
  }, [user?._id, user?.id]);

  const citesteNotificare = async (id) => {
    await api.put(`/notificari-foto/citeste/${id}`);
    setNotificari((prev) =>
      prev.map((n) => (n._id === id ? { ...n, citit: true } : n))
    );
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Notificarile mele</h2>
      {notificari.map((n) => (
        <div
          key={n._id}
          className={`border p-2 my-2 ${n.citit ? "bg-gray-200" : "bg-white"}`}
        >
          <p>{n.mesaj}</p>
          <p className="text-sm text-gray-500">
            {new Date(n.data).toLocaleString()}
          </p>
          {!n.citit && (
            <button
              onClick={() => citesteNotificare(n._id)}
              className="bg-green-500 text-white px-2 py-1 rounded mt-1"
            >
              Marcare ca citita
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default NotificariFoto;
