import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function DesenTort() {
    const canvasRef = useRef(null);

    const salveazaImagine = async () => {
        const canvasElement = canvasRef.current;
        if (!canvasElement) return;

        const canvasImage = await html2canvas(canvasElement);

        // âš ï¸ AdÄƒugÄƒm watermark direct pe canvasul generat
        const ctx = canvasImage.getContext('2d');
        ctx.font = '20px Arial';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.textAlign = 'right';
        ctx.fillText('TortApp Â©', canvasImage.width - 10, canvasImage.height - 10);

        // ExportÄƒm ca PNG cu watermark inclus
        const dataURL = canvasImage.toDataURL('image/png');

        try {
            await api.post('/', {
                imagine: dataURL,
                numeClient: 'Ionela Test',
            });
            alert('Imagine trimisÄƒ cu succes cu watermark!');
        } catch (err) {
            console.error('Eroare la trimiterea imaginii:', err);
        }
    };


    return (
        <div className="p-6">
            <div ref={canvasRef} className="w-64 h-64 bg-pink-200 rounded-full mx-auto mb-4">
                {/* aici poÈ›i adÄƒuga decoruri, straturi etc. */}
                <div className="w-32 h-32 bg-white rounded-full mx-auto mt-8 shadow-inner"></div>
            </div>
            <button onClick={salveazaImagine} className="bg-green-600 text-white px-4 py-2 rounded">
                SalveazÄƒ tort ca imagine PNG
            </button>
        </div>
    );
}

export default DesenTort;

