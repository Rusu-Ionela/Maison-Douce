import React, { useEffect, useState } from 'react';
import api from '/src/lib/api.js';
import { useNavigate } from 'react-router-dom';

export default function VizualizarePersonalizari() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const clientId = localStorage.getItem('userId');
                if (!clientId) return setList([]);
                const { data } = await api.get(`/personalizare/client/${clientId}`);
                setList(data || []);
            } catch (e) {
                console.error(e);
            } finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="container p-6">
            <h1 className="text-2xl font-bold mb-4">Design-urile mele</h1>
            {loading && <div>Se încarcă…</div>}
            {!loading && list.length === 0 && <div>Nu aveți design-uri salvate încă.</div>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {list.map(d => (
                    <div key={d._id} className="bg-white rounded shadow-sm p-3">
                        {d.imageUrl ? (
                            <img src={d.imageUrl} alt="preview" className="w-full h-40 object-cover rounded" />
                        ) : (
                            <div className="w-full h-40 bg-gray-100 rounded" />
                        )}
                        <div className="mt-2">
                            <div className="font-semibold">{d.forma || 'Tort'}</div>
                            <div className="text-sm text-gray-600">{d.mesaj || d.note || ''}</div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button className="px-3 py-1 border rounded text-sm" onClick={() => window.open(d.imageUrl || '#')}>Vezi</button>
                            <button className="px-3 py-1 bg-emerald-600 text-white rounded text-sm" onClick={() => nav(`/constructor?designId=${d._id}`)}>Editează</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
