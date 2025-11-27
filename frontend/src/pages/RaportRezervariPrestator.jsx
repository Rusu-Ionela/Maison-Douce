import React, { useEffect, useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function RaportRezervariPrestator() {
    const [rezervari, setRezervari] = useState([]);
    const userId = localStorage.getItem('userId'); // PrestatorId

    useEffect(() => {
        const fetchRezervari = async () => {
            const res = await api.get(`http://localhost:5000/api/rapoarte-rezervari/prestator/${userId}`);
            setRezervari(res.data);
        };
        fetchRezervari();
    }, [userId]);

    const handleExportCSV = () => {
        window.open(`http://localhost:5000/api/rezervari/${userId}/export-csv`, '_blank');
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">ðŸ“Š Raport RezervÄƒri (Prestator)</h2>
            <button onClick={handleExportCSV} className="bg-green-500 text-white px-4 py-2 rounded mb-4">Export CSV</button>
            <table className="w-full border">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Client</th>
                        <th>Data</th>
                        <th>Interval</th>
                    </tr>
                </thead>
                <tbody>
                    {rezervari.map((r) => (
                        <tr key={r._id}>
                            <td>{r._id}</td>
                            <td>{r.clientId?.nume || r.clientId?._id}</td>
                            <td>{new Date(r.intervalId?.data).toLocaleDateString()}</td>
                            <td>{r.intervalId?.interval}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default RaportRezervariPrestator;

