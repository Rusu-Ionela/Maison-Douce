// backend/controllers/calendarController.js
const Disponibilitate = require('../models/Disponibilitate');

exports.getDisponibilitate = async (req, res) => {
    try {
        const disponibil = await Disponibilitate.findOne();
        res.json(disponibil ? disponibil.date : []);
    } catch (err) {
        res.status(500).json({ error: 'Eroare la citirea disponibilității' });
    }
};

exports.setDisponibilitate = async (req, res) => {
    try {
        const { date } = req.body;
        let disponibil = await Disponibilitate.findOne();

        if (!disponibil) {
            disponibil = new Disponibilitate({ date });
        } else {
            disponibil.date = date;
        }

        await disponibil.save();
        res.json({ message: 'Datele au fost salvate cu succes!' });
    } catch (err) {
        res.status(500).json({ error: 'Eroare la salvare' });
    }
};
