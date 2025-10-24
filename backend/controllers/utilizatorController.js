const express = require('express');
const router = express.Router();
const Utilizator = require('../models/Utilizator');

// GET utilizator dupa email
router.get('/api/utilizatori/:email', async (req, res) => {
    try {
        const utilizator = await Utilizator.findOne({ email: req.params.email });
        if (!utilizator) {
            return res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
        }
        res.json(utilizator);
    } catch (err) {
        console.error('Eroare la get utilizator:', err);
        res.status(500).json({ message: 'Eroare server.' });
    }
});

// PUT update utilizator
router.put('/api/utilizatori/:email', async (req, res) => {
    try {
        const { nume, parola, pozaProfil } = req.body;

        const utilizator = await Utilizator.findOneAndUpdate(
            { email: req.params.email },
            { nume, parola, pozaProfil },
            { new: true }
        );

        if (!utilizator) {
            return res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
        }

        res.json(utilizator);
    } catch (err) {
        console.error('Eroare update utilizator:', err);
        res.status(500).json({ message: 'Eroare server.' });
    }
});

// POST login
router.post('/api/login', async (req, res) => {
    try {
        const { email, parola } = req.body;

        const utilizator = await Utilizator.findOne({ email });

        if (!utilizator) {
            return res.status(404).json({ message: 'Utilizatorul nu a fost găsit.' });
        }

        if (utilizator.parola !== parola) {
            return res.status(401).json({ message: 'Parola incorectă.' });
        }

        res.json({
            email: utilizator.email,
            userId: utilizator._id,
            rol: utilizator.rol
        });

    } catch (err) {
        console.error('Eroare la login:', err);
        res.status(500).json({ message: 'Eroare server.' });
    }
});

// RUTA TEMPORARĂ pentru a adăuga un utilizator admin de test
router.get('/api/utilizatori/adauga-admin-test', async (req, res) => {
    try {
        const exista = await Utilizator.findOne({ email: 'ionelarusu158@gmail.com' });
        if (exista) return res.json({ message: 'Utilizatorul există deja' });

        const utilizator = new Utilizator({
            email: 'ionelarusu158@gmail.com',
            parola: '123456', // parola simplă pt test
            nume: 'Ionela',
            rol: 'admin'
        });
        await utilizator.save();
        res.json({ message: 'Utilizator admin creat cu succes' });
    } catch (err) {
        res.status(500).json({ message: 'Eroare la creare admin' });
    }
});

module.exports = router;
