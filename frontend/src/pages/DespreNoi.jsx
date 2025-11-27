import React from 'react';
import api, { getJson, BASE_URL } from '/src/lib/api.js';

function DespreNoi() {
    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">ðŸ° Despre Noi</h2>
            <p>
                Bun venit la TortApp! Suntem o echipÄƒ pasionatÄƒ de dulciuri, specializaÈ›i Ã®n crearea torturilor
                personalizate pentru fiecare ocazie. De la reÈ›ete tradiÈ›ionale la combinaÈ›ii inovatoare, fiecare tort
                este realizat cu dragoste È™i atenÈ›ie la detalii.
            </p>
            <p className="mt-4">
                VÄƒ aÈ™teptÄƒm sÄƒ ne vizitaÈ›i È™i sÄƒ vÄƒ Ã®ndulciÈ›i zilele speciale cu torturile noastre!
            </p>
            <img src="/images/despre_noi.jpg" alt="Echipa TortApp" className="w-full rounded mt-4" />
        </div>
    );
}

export default DespreNoi;

