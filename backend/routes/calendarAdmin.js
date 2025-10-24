const express = require('express');
const CalendarPrestator = require('../models/CalendarPrestator');
const Rezervare = require('../models/Rezervare');
const router = express.Router();


// GET /api/calendar-admin/zi?dateISO=YYYY-MM-DD
router.get('/zi', async (req, res) => {
    try {
        const { dateISO, prestatorId } = req.query;
        if (!dateISO) return res.status(400).json({ message: 'dateISO lipsă' });


        const cal = await CalendarPrestator.findOne({ prestatorId });
        const zi = cal?.zile?.find((z) => z.dateISO === dateISO);


        // suplimentar, returnăm și rezervările brute pt acea zi
        const rezervari = await Rezervare.find({ dataISO: dateISO });


        res.json({ tasks: zi?.tasks || [], rezervari });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});


module.exports = router;