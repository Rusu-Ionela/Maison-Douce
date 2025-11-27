import React, { useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function ComandaClient() {
    const [dataLivrare, setDataLivrare] = useState('');
    const [oraLivrare, setOraLivrare] = useState('');
    const [metodaLivrare, setMetodaLivrare] = useState('');
    const [adresaLivrare, setAdresaLivrare] = useState('');
    const [produse, setProduse] = useState([]);
    const [produsNou, setProdusNou] = useState('');
    const [cantitateNoua, setCantitateNoua] = useState(1);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!dataLivrare || !oraLivrare || !metodaLivrare) {
            alert('CompleteazÄƒ toate cÃ¢mpurile obligatorii.');
            return;
        }

        try {
            await api.post('/', {
                clientId: localStorage.getItem('utilizatorId'),
                produse, // â† acum trimitem produsele reale
                preferinte: '',
                imagineGenerata: '',
                dataLivrare,
                oraLivrare,
                metodaLivrare,
                adresaLivrare: metodaLivrare === 'livrare' ? adresaLivrare : ''
            });

            await api.post('/', {
                clientId: localStorage.getItem('utilizatorId'), // sau cum ai tu salvat clientId-ul
                produse: [], // dacÄƒ vrei, poÈ›i pune È™i produsele comandate aici
                preferinte: '',
                imagineGenerata: '',
                dataLivrare,
                oraLivrare,
                metodaLivrare,
                adresaLivrare: metodaLivrare === 'livrare' ? adresaLivrare : ''
            });

            alert('Comanda a fost trimisÄƒ cu succes!');
        } catch (error) {
            console.error('Eroare creare comanda:', error);
            alert('Eroare la trimiterea comenzii.');
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">ðŸ“… ComandÄƒ desert</h2>
            <div className="mb-4 border p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-2">ðŸ° Produse comandate</h3>

                <div className="flex space-x-2 mb-2">
                    <input
                        type="text"
                        placeholder="Nume produs"
                        value={produsNou}
                        onChange={(e) => setProdusNou(e.target.value)}
                        className="border p-2 flex-1"
                    />
                    <input
                        type="number"
                        min="1"
                        value={cantitateNoua}
                        onChange={(e) => setCantitateNoua(e.target.value)}
                        className="border p-2 w-20"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (produsNou.trim() !== '' && cantitateNoua > 0) {
                                setProduse([...produse, {
                                    produsId: Date.now().toString(), // poÈ›i pune ID real dacÄƒ ai produse in DB
                                    numeProdus: produsNou,
                                    cantitate: parseInt(cantitateNoua)
                                }]);
                                setProdusNou('');
                                setCantitateNoua(1);
                            }
                        }}
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        AdaugÄƒ produs
                    </button>
                </div>

                {produse.length > 0 && (
                    <ul className="list-disc list-inside">
                        {produse.map((prod, index) => (
                            <li key={index}>
                                {prod.numeProdus} â€” {prod.cantitate} buc.
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label>Data livrare:</label>
                    <input
                        type="date"
                        value={dataLivrare}
                        onChange={(e) => setDataLivrare(e.target.value)}
                        className="border p-2 w-full"
                        required
                    />
                </div>

                <div>
                    <label>Ora livrare:</label>
                    <select
                        value={oraLivrare}
                        onChange={(e) => setOraLivrare(e.target.value)}
                        className="border p-2 w-full"
                        required
                    >
                        <option value="">SelecteazÄƒ ora</option>
                        <option value="09:00">09:00</option>
                        <option value="10:00">10:00</option>
                        <option value="11:00">11:00</option>
                        <option value="12:00">12:00</option>
                        <option value="13:00">13:00</option>
                        <option value="14:00">14:00</option>
                        <option value="15:00">15:00</option>
                        <option value="16:00">16:00</option>
                        <option value="17:00">17:00</option>
                    </select>
                </div>

                <div>
                    <label>MetodÄƒ livrare:</label>
                    <div className="flex space-x-2">
                        <label>
                            <input
                                type="radio"
                                name="metodaLivrare"
                                value="livrare"
                                checked={metodaLivrare === 'livrare'}
                                onChange={(e) => setMetodaLivrare(e.target.value)}
                            />
                            Livrare la domiciliu (+100 MDL)
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="metodaLivrare"
                                value="ridicare"
                                checked={metodaLivrare === 'ridicare'}
                                onChange={(e) => setMetodaLivrare(e.target.value)}
                            />
                            Ridicare personalÄƒ
                        </label>
                    </div>
                </div>

                {metodaLivrare === 'livrare' && (
                    <div>
                        <label>Adresa pentru livrare:</label>
                        <input
                            type="text"
                            value={adresaLivrare}
                            onChange={(e) => setAdresaLivrare(e.target.value)}
                            className="border p-2 w-full"
                            required
                        />
                    </div>
                )}

                <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded w-full"
                >
                    Trimite comanda
                </button>
            </form>
        </div>
    );
}

export default ComandaClient;

