const express = require('express');
const Rezervare = require('../models/Rezervare');
const { Parser } = require('json2csv');
const router = express.Router();


// GET /api/rapoarte-rezervari/csv?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/csv', async (req, res) => {
    const { from, to } = req.query;
    const match = {};
    if (from) match.createdAt = { $gte: new Date(from) };
    if (to) match.createdAt = Object.assign(match.createdAt || {}, { $lte: new Date(to) });


    const rows = await Rezervare.find(match).lean();
    const fields = [
        'createdAt',
        'dataISO',
        'ora',
        'numeTort',
        'cantitate',
        'pretTotalMDL',
        'livrare.method',
        'livrare.feeMDL',
        'statusPlata',
        'statusComanda',
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);


    res.header('Content-Type', 'text/csv');
    res.attachment(`raport-rezervari-${from || 'ALL'}-${to || 'ALL'}.csv`);
    res.send(csv);
});


module.exports = router;