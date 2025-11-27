import React, { useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function CreareAlbum() {
    const [titlu, setTitlu] = useState('');
    const [fisiere, setFisiere] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('titlu', titlu);
        formData.append('utilizatorId', localStorage.getItem('utilizatorId'));
        for (let i = 0; i < fisiere.length; i++) {
            formData.append('fisiere', fisiere[i]);
        }

        await api.post('/', formData);
        alert('Album creat cu succes!');
        setTitlu('');
        setFisiere([]);
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">ðŸ“¸ Creare Album</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" value={titlu} onChange={(e) => setTitlu(e.target.value)} placeholder="Titlu album" required className="border p-2 w-full mb-2" />
                <input type="file" multiple onChange={(e) => setFisiere(e.target.files)} className="mb-2" />
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">CreeazÄƒ Album</button>
            </form>
        </div>
    );
}

export default CreareAlbum;

