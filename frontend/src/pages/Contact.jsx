// ðŸ“ src/pages/Contact.jsx
import React from "react";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function Contact() {
    return (
        <div className="container">
            <div className="card">
                <h1>Contact</h1>
                <p>
                    Ne poÈ›i contacta la <strong>contact@maisondouce.md</strong> sau la
                    telefonul <strong>+373 600 000 00</strong>.
                </p>
                <p>Program: Luniâ€“SÃ¢mbÄƒtÄƒ, 09:00 â€“ 19:00</p>

                <div style={{ marginTop: "20px" }}>
                    <iframe
                        title="Harta Maison Douce"
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2722.1409!2d28.832!3d47.026!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40c97c30d2c7d4a3%3A0x34b5f12aee9f0f70!2sChiÈ™inÄƒu!5e0!3m2!1sro!2smd!4v1686140000000!5m2!1sro!2smd"
                        width="100%"
                        height="300"
                        style={{ border: 0, borderRadius: "12px" }}
                        allowFullScreen=""
                        loading="lazy"
                    ></iframe>
                </div>
            </div>
        </div>
    );
}

