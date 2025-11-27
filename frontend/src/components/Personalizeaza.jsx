import React, { useState } from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

const Personalizeaza = () => {
    const [customizationData, setCustomizationData] = useState({
        size: '',
        flavor: '',
        toppings: [],
        message: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await API.post('/api/comenzi-personalizate', customizationData);
            if (response.success) {
                alert('Comanda personalizatÄƒ a fost trimisÄƒ cu succes!');
            }
        } catch (error) {
            console.error('Eroare la trimiterea comenzii:', error);
            alert('A apÄƒrut o eroare. VÄƒ rugÄƒm Ã®ncercaÈ›i din nou.');
        }
    };

    return (
        <div className="personalizare-container">
            <h2>PersonalizeazÄƒ Tortul TÄƒu</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Dimensiune:</label>
                    <select
                        value={customizationData.size}
                        onChange={(e) => setCustomizationData({ ...customizationData, size: e.target.value })}
                    >
                        <option value="">SelecteazÄƒ dimensiunea</option>
                        <option value="mic">Mic (6-8 persoane)</option>
                        <option value="mediu">Mediu (10-12 persoane)</option>
                        <option value="mare">Mare (14-16 persoane)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>AromÄƒ:</label>
                    <select
                        value={customizationData.flavor}
                        onChange={(e) => setCustomizationData({ ...customizationData, flavor: e.target.value })}
                    >
                        <option value="">SelecteazÄƒ aroma</option>
                        <option value="ciocolata">CiocolatÄƒ</option>
                        <option value="vanilie">Vanilie</option>
                        <option value="fructe">Fructe</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Mesaj pe tort:</label>
                    <input
                        type="text"
                        value={customizationData.message}
                        onChange={(e) => setCustomizationData({ ...customizationData, message: e.target.value })}
                        placeholder="Ex: La mulÈ›i ani!"
                        maxLength={50}
                    />
                </div>

                <button type="submit" className="submit-btn">
                    Trimite Comanda
                </button>
            </form>
        </div>
    );
};

export default Personalizeaza;
