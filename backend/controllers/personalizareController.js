const Comanda = require('../models/ComandaPersonalizata');

exports.adaugaComanda = async (req, res) => {
    try {
        const { numeClient, preferinte, imagineGenerata } = req.body;

        const comandaNoua = new Comanda({
            numeClient,
            preferinte,
            imagineGenerata,
            data: new Date()
        });

        await comandaNoua.save();
        res.status(201).json({ mesaj: 'Comanda a fost salvată cu succes!' });
    } catch (err) {
        console.error('Eroare la salvarea comenzii:', err);
        res.status(500).json({ mesaj: 'Eroare la salvarea comenzii' });
    }
};
