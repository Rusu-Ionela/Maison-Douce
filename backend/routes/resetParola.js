const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Utilizator = require('../models/Utilizator');

// Configurare transport (cu Gmail test sau SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'EMAIL_TAU@gmail.com',
        pass: 'PAROLA_SAU_APP_PASSWORD'
    }
});

// Endpoint pentru trimitere email reset
router.post('/send-reset-email', async (req, res) => {
    const { email } = req.body;

    try {
        const utilizator = await Utilizator.findOne({ email });
        if (!utilizator) {
            return res.status(404).json({ mesaj: 'Utilizatorul nu a fost găsit.' });
        }

        // În mod real ai face token + link securizat — pentru demo simplu pun link direct
        const resetLink = `http://localhost:3000/resetare-parola?email=${email}`;

        await transporter.sendMail({
            from: 'TortApp <EMAIL_TAU@gmail.com>',
            to: email,
            subject: 'Resetare Parola TortApp',
            html: `<p>Click aici pentru a reseta parola:</p><a href="${resetLink}">${resetLink}</a>`
        });

        res.json({ mesaj: 'Email de resetare trimis.' });
    } catch (err) {
        console.error('Eroare reset parola:', err);
        res.status(500).json({ mesaj: 'Eroare la trimitere email.' });
    }
});

module.exports = router;
