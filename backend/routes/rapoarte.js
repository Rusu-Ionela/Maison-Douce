const express = require('express');
const router = express.Router();
const Comanda = require('../models/Comanda');
const CalendarSlot = require('../models/CalendarSlot');
const { authRequired, roleCheck } = require('../middleware/auth');

try {
    const json2csv = require('json2csv').Parser;
    var hasJson2csv = true;
} catch (e) {
    var hasJson2csv = false;
}

// GET - Raport rezervări period
router.get('/reservations/:startDate/:endDate', authRequired, roleCheck('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.params;

        const calendars = await CalendarSlot.find({
            date: { $gte: startDate, $lte: endDate }
        });

        let totalReservations = 0;
        const reservationDetails = [];
        const deliveryMethods = { pickup: 0, delivery: 0, courier: 0 };

        calendars.forEach(cal => {
            cal.slots.forEach(slot => {
                slot.orders.forEach(order => {
                    totalReservations++;
                    if (deliveryMethods[order.deliveryMethod] !== undefined) {
                        deliveryMethods[order.deliveryMethod]++;
                    }

                    reservationDetails.push({
                        data: cal.date,
                        ora: slot.time,
                        client: order.clientName,
                        tort: order.tortName,
                        cantitate: order.quantity,
                        livrare: order.deliveryMethod,
                        adresa: order.address || '-',
                        status: order.status
                    });
                });
            });
        });

        res.json({
            totalReservations,
            deliveryMethods,
            details: reservationDetails,
            period: { startDate, endDate }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET - Export CSV
router.get('/export/csv/:startDate/:endDate', authRequired, roleCheck('admin'), async (req, res) => {
    try {
        if (!hasJson2csv) {
            return res.status(400).json({ error: 'json2csv nu este instalat' });
        }

        const { startDate, endDate } = req.params;

        const calendars = await CalendarSlot.find({
            date: { $gte: startDate, $lte: endDate }
        });

        const data = [];

        calendars.forEach(cal => {
            cal.slots.forEach(slot => {
                slot.orders.forEach(order => {
                    data.push({
                        'Data': cal.date,
                        'Ora': slot.time,
                        'Client': order.clientName,
                        'Produs': order.tortName,
                        'Cantitate': order.quantity,
                        'Metoda Livrare': order.deliveryMethod,
                        'Adresa': order.address || '-',
                        'Status': order.status
                    });
                });
            });
        });

        if (data.length === 0) {
            return res.json({ message: 'Nu sunt date pentru export' });
        }

        const csv = new json2csv({ fields: Object.keys(data[0]) }).parse(data);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=raport-rezervari.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET - Statistici vânzări
router.get('/sales/:startDate/:endDate', authRequired, roleCheck('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.params;

        const comenzi = await Comanda.find({
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        const totalRevenue = comenzi.reduce((sum, cmd) => sum + (cmd.totalPret || 0), 0);
        const avgOrder = comenzi.length > 0 ? totalRevenue / comenzi.length : 0;
        const deliveryRevenue = comenzi.reduce((sum, cmd) => sum + (cmd.detaliiLivrare?.taxa || 0), 0);

        const methodBreakdown = {
            pickup: comenzi.filter(c => c.detaliiLivrare?.metoda === 'pickup').length,
            delivery: comenzi.filter(c => c.detaliiLivrare?.metoda === 'delivery').length,
            courier: comenzi.filter(c => c.detaliiLivrare?.metoda === 'courier').length
        };

        res.json({
            period: { startDate, endDate },
            totalOrders: comenzi.length,
            totalRevenue,
            averageOrder: avgOrder.toFixed(2),
            deliveryRevenue,
            deliveryMethodBreakdown: methodBreakdown,
            topProducts: getTopProducts(comenzi)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function getTopProducts(comenzi) {
    const products = {};
    comenzi.forEach(cmd => {
        cmd.items.forEach(item => {
            const name = item.numeCustom || item.tortId || 'Necunoscut';
            products[name] = (products[name] || 0) + item.cantitate;
        });
    });
    return Object.entries(products)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, qty]) => ({ product: name, quantity: qty }));
}

module.exports = router;