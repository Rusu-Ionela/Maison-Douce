import React, { useEffect, useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function VizualizareAlbume() {
    const [albume, setAlbume] = useState([]);

    useEffect(() => {
        const fetchAlbume = async () => {
            const res = await api.get(`http://localhost:5000/api/albume/utilizator/${localStorage.getItem('utilizatorId')}`);
            setAlbume(res.data);
        };
        fetchAlbume();
    }, []);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">ðŸ“¸ Albumele Mele</h2>
            {albume.map((album) => (
                <div key={album._id} className="border p-4 mb-4">
                    <h3 className="font-semibold">{album.titlu}</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {album.fisiere.map((f, index) => (
                            <img key={index} src={`http://localhost:5000${f}`} alt="FiÈ™ier" className="w-full h-32 object-cover" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default VizualizareAlbume;

