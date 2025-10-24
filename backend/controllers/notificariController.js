const Notificare = require('../models/Notificare');

// GET toate notificările
exports.getNotificari = async (req, res) => {
    try {
        const lista = await Notificare.find().sort({ data: -1 });
        res.json(lista);
    } catch (err) {
        res.status(500).json({ mesaj: 'Eroare la preluare notificări' });
    }
};

// PUT – marchează ca citită
exports.markCitita = async (req, res) => {
    try {
        await Notificare.findByIdAndUpdate(req.params.id, { citita: true });
        res.json({ mesaj: 'Notificare marcată ca citită' });
    } catch (err) {
        res.status(500).json({ mesaj: 'Eroare la marcare notificare' });
    }
};

// DELETE – șterge notificarea
exports.deleteNotificare = async (req, res) => {
    try {
        await Notificare.findByIdAndDelete(req.params.id);
        res.json({ mesaj: 'Notificare ștearsă' });
    } catch (err) {
        res.status(500).json({ mesaj: 'Eroare la ștergere notificare' });
    }
};
