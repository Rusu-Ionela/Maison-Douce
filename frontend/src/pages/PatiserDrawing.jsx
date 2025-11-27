import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function PatiserDrawing() {
    const drawingRef = useRef();

    const salveazaImagine = async () => {
        const canvas = await html2canvas(drawingRef.current);
        const ctx = canvas.getContext('2d');

        // âœ… SetÄƒri text
        ctx.font = '16px Arial';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';

        // âœ… AdaugÄƒ watermark pe douÄƒ linii
        const clientName = 'Ana'; // sau din props/context
        const patiserName = 'Patiser Ionela';

        ctx.fillText(`Â© TortApp - Client: ${clientName}`, 10, canvas.height - 30);
        ctx.fillText(`By ${patiserName}`, 10, canvas.height - 10);

        // âœ… Trimite imaginea
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('imagine', blob, `tort_${clientName}_watermarked.png`);

            try {
                await api.post('/', formData);
                alert('Imaginea cu watermark a fost trimisÄƒ cu succes!');
            } catch (err) {
                console.error('Eroare la trimitere:', err);
            }
        });
    };


    return (
        <div className="p-6">
            <div ref={drawingRef} className="w-64 h-64 bg-pink-200 relative rounded">
                {/* Elemente grafice ale tortului pot fi aici */}
                <div className="absolute bottom-2 right-2 text-sm text-gray-600">Desen Tort</div>
            </div>
            <button onClick={salveazaImagine} className="mt-4 px-4 py-2 bg-green-600 text-white rounded">
                SalveazÄƒ cu Watermark
            </button>
        </div>
    );
}

export default PatiserDrawing;

