import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function VizualizarePartajare() {
    const { linkUnic } = useParams();
    const [partajare, setPartajare] = useState(null);

    useEffect(() => {
        const fetchPartajare = async () => {
            try {
                const res = await api.get(`http://localhost:5000/api/partajare/${linkUnic}`);
                setPartajare(res.data);
            } catch (err) {
                console.error('Eroare:', err);
            }
        };
        fetchPartajare();
    }, [linkUnic]);

    if (!partajare) return <p>Se Ã®ncarcÄƒ...</p>;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">ðŸ“ FiÈ™iere Partajate</h2>
            <div className="grid grid-cols-2 gap-2">
                {partajare.fisiere.map((f, index) => (
                    <img key={index} src={`http://localhost:5000${f}`} alt="FiÈ™ier" className="w-full h-32 object-cover" />
                ))}
            </div>
        </div>
    );
}

export default VizualizarePartajare;

