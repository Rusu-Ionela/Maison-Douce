// controllers/produseController.js
const Produs = require('../models/ProdusStudio');
const Notificare = require('../models/Notificare');

const verificaExpirari = async () => {
    const produse = await Produs.find();
    const azi = new Date();

    for (let produs of produse) {
        const dataExpirare = new Date(produs.dataExpirare);
        const zileRamase = Math.ceil((dataExpirare - azi) / (1000 * 60 * 60 * 24));

        if (zileRamase < 0) {
            await Notificare.create({
                tip: 'produs',
                mesaj: ` Produsul ${produs.nume} a expirat.`,
                data: new Date(),
            });
        } else if (zileRamase <= 3) {
            await Notificare.create({
                tip: 'produs',
                mesaj: ` Produsul ${produs.nume} expiră în ${zileRamase} zile.`,
                data: new Date(),
            });
        }
    }
};

module.exports = { verificaExpirari };
