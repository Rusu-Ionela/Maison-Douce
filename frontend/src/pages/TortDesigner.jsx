import React, { useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function TortDesigner() {
    const [forma, setForma] = useState('rotund');
    const [culoare, setCuloare] = useState('#FFC0CB');
    const [decor, setDecor] = useState('flori');
    const [umplutura, setUmplutura] = useState('ciocolata');
    const [niveluri, setNiveluri] = useState(1);
    const [imagine, setImagine] = useState('');

    const genereazaImagine = async () => {
        const res = await api.post('/', {
            forma,
            culoare,
            decor,
            umplutura
        });
        setImagine(res.data.imagine);
    };

    return (
        <div className="text-center mt-10">
            <h2 className="text-2xl font-bold mb-4">ðŸŽ¨ Designer Tort Avansat + AI</h2>

            <div className="mb-4">
                <label>Forma:</label>
                <select value={forma} onChange={(e) => setForma(e.target.value)}>
                    <option value="rotund">Rotund</option>
                    <option value="patrat">PÄƒtrat</option>
                </select>
            </div>

            <div className="mb-4">
                <label>Culoare:</label>
                <input type="color" value={culoare} onChange={(e) => setCuloare(e.target.value)} />
            </div>

            <div className="mb-4">
                <label>Decor:</label>
                <select value={decor} onChange={(e) => setDecor(e.target.value)}>
                    <option value="flori">Flori</option>
                    <option value="fructe">Fructe</option>
                    <option value="macarons">Macarons</option>
                </select>
            </div>

            <div className="mb-4">
                <label>UmpluturÄƒ:</label>
                <select value={umplutura} onChange={(e) => setUmplutura(e.target.value)}>
                    <option value="ciocolata">CiocolatÄƒ</option>
                    <option value="vanilie">Vanilie</option>
                    <option value="capsuni">CÄƒpÈ™uni</option>
                </select>
            </div>

            <div className="mb-4">
                <label>NumÄƒr niveluri:</label>
                <input
                    type="number"
                    value={niveluri}
                    onChange={(e) => setNiveluri(e.target.value)}
                    min="1"
                    max="5"
                />
            </div>

            <div className="mt-6">
                <h3 className="font-bold">Previzualizare 2D</h3>
                {[...Array(parseInt(niveluri))].map((_, index) => (
                    <div
                        key={index}
                        style={{
                            width: forma === 'rotund' ? `${200 - index * 20}px` : `${200 - index * 20}px`,
                            height: `${100}px`,
                            borderRadius: forma === 'rotund' ? '50%' : '0',
                            backgroundColor: culoare,
                            margin: 'auto',
                            marginTop: '10px',
                            position: 'relative'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            color: 'white',
                            fontSize: '0.8rem'
                        }}>
                            {decor} + {umplutura}
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={genereazaImagine} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">
                GenereazÄƒ Imagine AI
            </button>

            {imagine && (
                <div className="mt-4">
                    <h3 className="font-bold">Previzualizare AI</h3>
                    <img src={imagine} alt="Tort Generat" className="mx-auto rounded" />
                </div>
            )}
        </div>
    );
}

export default TortDesigner;

