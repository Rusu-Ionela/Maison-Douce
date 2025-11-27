// ðŸ“ src/pages/Abonament.jsx
import React, { useState } from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function Abonament() {
    const [planSelectat, setPlanSelectat] = useState(null);

    const planuri = [
        {
            id: 1,
            nume: "Mini Sweet Box",
            descriere: "Cutie lunarÄƒ cu 5 mini-prÄƒjituri artizanale.",
            pret: 350,
        },
        {
            id: 2,
            nume: "Maison Deluxe",
            descriere: "Cutie lunarÄƒ cu 10 deserturi variate + 1 tort mic-surprizÄƒ.",
            pret: 650,
        },
        {
            id: 3,
            nume: "Royal Experience",
            descriere: "Cutie exclusivÄƒ cu selecÈ›ie premium de prÄƒjituri + acces la degustÄƒri VIP.",
            pret: 950,
        },
    ];

    const handleSelect = (plan) => {
        setPlanSelectat(plan);
    };

    return (
        <div className="container abonament">
            <div className="card">
                <h1>Abonament Maison Douce ðŸŽ</h1>
                <p>
                    PrimeÈ™te lunar o cutie-surprizÄƒ cu cele mai fine deserturi artizanale.
                    PerfectÄƒ pentru tine sau pentru a oferi un cadou dulce!
                </p>

                <div className="planuri-grid" style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "30px" }}>
                    {planuri.map((plan) => (
                        <div
                            key={plan.id}
                            className={`plan-card ${planSelectat?.id === plan.id ? "selectat" : ""}`}
                            onClick={() => handleSelect(plan)}
                            style={{
                                flex: "1 1 250px",
                                border: "1px solid #e5e0d6",
                                borderRadius: "12px",
                                padding: "20px",
                                cursor: "pointer",
                                boxShadow: planSelectat?.id === plan.id ? "0 0 10px #b89f7f" : "none",
                                transition: "0.2s",
                            }}
                        >
                            <h3>{plan.nume}</h3>
                            <p>{plan.descriere}</p>
                            <p>
                                <strong>{plan.pret} MDL / lunÄƒ</strong>
                            </p>
                        </div>
                    ))}
                </div>

                {planSelectat && (
                    <div style={{ marginTop: "40px" }}>
                        <h2>Ai ales: {planSelectat.nume}</h2>
                        <p>PreÈ›: {planSelectat.pret} MDL / lunÄƒ</p>
                        <button
                            className="btn-primary"
                            style={{
                                backgroundColor: "#b89f7f",
                                border: "none",
                                borderRadius: "8px",
                                color: "#fff",
                                padding: "10px 20px",
                                cursor: "pointer",
                                marginTop: "10px",
                            }}
                            onClick={() => alert("FuncÈ›ionalitatea de platÄƒ se activeazÄƒ dupÄƒ integrarea Stripe ðŸ”’")}
                        >
                            AboneazÄƒ-mÄƒ
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

