// backend/routes/rapoarte.js
const express = require('express');
const router = express.Router();

const { Parser } = require('json2csv');
const Comanda = require('../models/Comanda');
const Rezervare = require('../models/Rezervare');
const Utilizator = require('../models/Utilizator');

const { authRequired, role } = require('../utils/auth');

// Protecție: doar admin
router.use(authRequired, role('admin'));

/**
 * GET /api/rapoarte/comenzi-lunare
 * Returnează [{ _id:'YYYY-MM', nrComenzi, totalVanzari }]
 */
router.get('/comenzi-lunare', async (req, res) => {
    try {
        const data = await Comanda.aggregate([
            { $match: {} },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m',
                            date: { $toDate: '$createdAt' }
                        }
                    },
                    nrComenzi: { $sum: 1 },
                    totalVanzari: { $sum: '$total' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // normalizare (exact câmpurile cerute de front)
        res.json(
            data.map(d => ({
                _id: d._id,
                nrComenzi: d.nrComenzi,
                totalVanzari: d.totalVanzari
            }))
        );
    } catch (e) {
        console.error('rapoarte/comenzi-lunare:', e);
        res.status(500).json({ message: e.message });
    }
});

/**
 * GET /api/rapoarte/top-produse?limit=10
 * Returnează [{ nume, count, revenue }]
 *  - count = cantitate totală vândută
 *  - revenue = sum(items.qty * items.price)
 */
router.get('/top-produse', async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

        const agg = await Comanda.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    count: { $sum: '$items.qty' },
                    revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: limit }
        ]);

        res.json(agg.map(x => ({
            nume: x._id,
            count: x.count,
            revenue: x.revenue
        })));
    } catch (e) {
        console.error('rapoarte/top-produse:', e);
        res.status(500).json({ message: e.message });
    }
});

/**
 * GET /api/rapoarte/top-clienti?limit=10
 * Returnează [{ clientId, nume, count, total }]
 *  - nume este completat din colecția Utilizator, dacă există (nume + prenume), altfel fallback la clientId
 */
router.get('/top-clienti', async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

        const agg = await Comanda.aggregate([
            { $match: { clientId: { $ne: null } } },
            {
                $group: {
                    _id: '$clientId',
                    count: { $sum: 1 },
                    total: { $sum: '$total' }
                }
            },
            { $sort: { total: -1 } },
            { $limit: limit }
        ]);

        // mapare nume clienți din colecția Utilizator (dacă există)
        const ids = agg.map(a => a._id).filter(Boolean);
        const users = await Utilizator.find({ _id: { $in: ids } }, { nume: 1, prenume: 1 }).lean();
        const usersById = new Map(users.map(u => [String(u._id), u]));

        const out = agg.map(a => {
            const u = usersById.get(String(a._id));
            const name = u ? `${u.nume || ''} ${u.prenume || ''}`.trim() : null;
            return {
                clientId: a._id,
                nume: name || String(a._id),
                count: a.count,
                total: a.total
            };
        });

        res.json(out);
    } catch (e) {
        console.error('rapoarte/top-clienti:', e);
        res.status(500).json({ message: e.message });
    }
});

/* =========================================================================
   BONUS: Export CSV rezervări (poți muta în routes/rapoarteRezervariRoutes.js)
   GET /api/rapoarte/rezervari/export?from=YYYY-MM-DD&to=YYYY-MM-DD&prestator=<id>
   Returnează CSV cu rezervările din interval și (opțional) pentru un prestator.
   ========================================================================= */
router.get('/rezervari/export', async (req, res) => {
    try {
        const { from, to, prestator } = req.query;

        const q = {};
        if (from || to) {
            q.data = {};
            if (from) q.data.$gte = from;
            if (to) q.data.$lte = to;
        }
        if (prestator) q.prestatorId = prestator;

        const rezervari = await Rezervare.find(q).lean();

        const rows = rezervari.map(r => ({
            'ID Rezervare': r._id?.toString(),
            'Prestator ID': r.prestatorId || '',
            'Data': r.data || '',
            'Ora Start': r.startTime || '',
            'Ora End': r.endTime || '',
            'Client ID': r.clientId || '',
            'Status': r.status || '',
            'Total': (Number(r.total || 0)).toFixed(2),
            'Creat la': r.createdAt ? new Date(r.createdAt).toISOString() : ''
        }));

        const parser = new Parser({ withBOM: true });
        const csv = parser.parse(rows);

        const file = `rezervari_${from || 'all'}_${to || 'all'}${prestator ? '_' + prestator : ''}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
        res.status(200).send(csv);
    } catch (e) {
        console.error('rapoarte/rezervari/export:', e);
        res.status(500).json({ message: 'Eroare server la export CSV rezervări.' });
    }
});

module.exports = router;
