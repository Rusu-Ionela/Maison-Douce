// backend/routes/rapoarte.js
const express = require("express");
const router = express.Router();

const Comanda = require("../models/Comanda");
const CalendarSlot = require("../models/CalendarSlot");
const { authRequired, roleCheck } = require("../middleware/auth");

// json2csv este opțional – dacă nu e instalat, ruta CSV va anunța asta
let Json2CsvParser = null;
let hasJson2csv = false;
try {
  Json2CsvParser = require("json2csv").Parser;
  hasJson2csv = true;
} catch (e) {
  console.warn("json2csv nu este instalat. Exportul CSV nu va funcționa.");
}

/**
 * Helper: validează datele primite ca string (YYYY-MM-DD)
 */
function parseDateOrNull(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/rapoarte/reservari/:startDate/:endDate
 * Raport rezervări pe interval de timp
 */
router.get(
  "/reservari/:startDate/:endDate",
  authRequired,
  roleCheck("admin"),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.params;

      const start = parseDateOrNull(startDate);
      const end = parseDateOrNull(endDate);

      if (!start || !end) {
        return res
          .status(400)
          .json({ error: "startDate și endDate trebuie să fie date valide" });
      }

      const calendars = await CalendarSlot.find({
        date: { $gte: startDate, $lte: endDate },
      });

      let totalReservations = 0;
      const reservationDetails = [];
      const deliveryMethods = { pickup: 0, delivery: 0, courier: 0 };

      calendars.forEach((cal) => {
        (cal.slots || []).forEach((slot) => {
          (slot.orders || []).forEach((order) => {
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
              adresa: order.address || "-",
              status: order.status,
            });
          });
        });
      });

      res.json({
        period: { startDate, endDate },
        totalReservations,
        deliveryMethods,
        details: reservationDetails,
      });
    } catch (err) {
      console.error("Eroare /rapoarte/reservari:", err.message);
      res.status(500).json({ error: "Eroare server la raport rezervări" });
    }
  }
);

/**
 * GET /api/rapoarte/export/csv/:startDate/:endDate
 * Export rezervări CSV pe interval
 */
router.get(
  "/export/csv/:startDate/:endDate",
  authRequired,
  roleCheck("admin"),
  async (req, res) => {
    try {
      if (!hasJson2csv || !Json2CsvParser) {
        return res.status(400).json({ error: "json2csv nu este instalat" });
      }

      const { startDate, endDate } = req.params;

      const start = parseDateOrNull(startDate);
      const end = parseDateOrNull(endDate);

      if (!start || !end) {
        return res
          .status(400)
          .json({ error: "startDate și endDate trebuie să fie date valide" });
      }

      const calendars = await CalendarSlot.find({
        date: { $gte: startDate, $lte: endDate },
      });

      const data = [];

      calendars.forEach((cal) => {
        (cal.slots || []).forEach((slot) => {
          (slot.orders || []).forEach((order) => {
            data.push({
              Data: cal.date,
              Ora: slot.time,
              Client: order.clientName,
              Produs: order.tortName,
              Cantitate: order.quantity,
              "Metoda Livrare": order.deliveryMethod,
              Adresa: order.address || "-",
              Status: order.status,
            });
          });
        });
      });

      if (data.length === 0) {
        return res.json({ message: "Nu sunt date pentru export" });
      }

      const fields = Object.keys(data[0]);
      const parser = new Json2CsvParser({ fields });
      const csv = parser.parse(data);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=raport-rezervari.csv"
      );
      res.status(200).send(csv);
    } catch (err) {
      console.error("Eroare /rapoarte/export/csv:", err.message);
      res.status(500).json({ error: "Eroare server la export CSV" });
    }
  }
);

/**
 * GET /api/rapoarte/sales/:startDate/:endDate
 * Statistici vânzări pe interval
 */
router.get(
  "/sales/:startDate/:endDate",
  authRequired,
  roleCheck("admin"),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.params;

      const start = parseDateOrNull(startDate);
      const end = parseDateOrNull(endDate);

      if (!start || !end) {
        return res
          .status(400)
          .json({ error: "startDate și endDate trebuie să fie date valide" });
      }

      const comenzi = await Comanda.find({
        createdAt: { $gte: start, $lte: end },
      });

      const totalRevenue = comenzi.reduce(
        (sum, cmd) => sum + (cmd.totalPret || 0),
        0
      );

      const totalOrders = comenzi.length;
      const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const deliveryRevenue = comenzi.reduce(
        (sum, cmd) => sum + (cmd.detaliiLivrare?.taxa || 0),
        0
      );

      const methodBreakdown = {
        pickup: comenzi.filter(
          (c) => c.detaliiLivrare?.metoda === "pickup"
        ).length,
        delivery: comenzi.filter(
          (c) => c.detaliiLivrare?.metoda === "delivery"
        ).length,
        courier: comenzi.filter(
          (c) => c.detaliiLivrare?.metoda === "courier"
        ).length,
      };

      res.json({
        period: { startDate, endDate },
        totalOrders,
        totalRevenue,
        averageOrder: Number(avgOrder.toFixed(2)),
        deliveryRevenue,
        deliveryMethodBreakdown: methodBreakdown,
        topProducts: getTopProducts(comenzi),
      });
    } catch (err) {
      console.error("Eroare /rapoarte/sales:", err.message);
      res.status(500).json({ error: "Eroare server la raport vânzări" });
    }
  }
);

/**
 * Helper: top produse (cantitate vândută)
 */
function getTopProducts(comenzi) {
  const products = {};

  comenzi.forEach((cmd) => {
    (cmd.items || []).forEach((item) => {
      const name = item.numeCustom || item.tortId || "Necunoscut";
      products[name] = (products[name] || 0) + (item.cantitate || 0);
    });
  });

  return Object.entries(products)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([product, quantity]) => ({ product, quantity }));
}

module.exports = router;
