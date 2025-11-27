import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function AdminEditTort() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [nume, setNume] = useState('');
  const [ingrediente, setIngrediente] = useState('');
  const [imagine, setImagine] = useState('');

  // Preia tortul existent
  useEffect(() => {
    api.get(`http://localhost:5000/api/torturi/${id}`)
      .then((res) => {
        const tort = res.data;
        setNume(tort.nume);
        setIngrediente(tort.ingrediente.join(', '));
        setImagine(tort.imagine);
      })
      .catch((err) => console.error('Eroare la preluare tort:', err));
  }, [id]);

  // SalveazÄƒ modificÄƒrile
  const handleSubmit = (e) => {
    e.preventDefault();

    const tortActualizat = {
      nume,
      ingrediente: ingrediente.split(',').map((i) => i.trim()),
      imagine,
    };

    api.put(`http://localhost:5000/api/torturi/${id}`, tortActualizat)
      .then(() => {
        alert('Tortul a fost actualizat!');
        navigate('/admin/panel');
      })
      .catch((err) => console.error('Eroare la actualizare:', err));
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">âœï¸ Editare Tort</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Nume tort"
          value={nume}
          onChange={(e) => setNume(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Ingrediente (separate prin virgulÄƒ)"
          value={ingrediente}
          onChange={(e) => setIngrediente(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="URL imagine"
          value={imagine}
          onChange={(e) => setImagine(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          SalveazÄƒ modificÄƒrile
        </button>
      </form>
    </div>
  );
}

export default AdminEditTort;

