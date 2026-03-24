// backend/routes/rapoarte.js
const express = require("express");
const router = express.Router();

const Comanda = require("../models/Comanda");
const Rezervare = require("../models/Rezervare");
const { authRequired, roleCheck } = require("../middleware/auth");
const {
  buildCreatedAtRange,
  buildStringDateRange,
  buildUserMap,
  formatUserLabel,
  getItemName,
  getItemQty,
  getOrderDeliveryFee,
  getOrderItemQuantity,
  getOrderItems,
  getOrderTotal,
  normalizeDeliveryMethod,
  readNumber,
  summarizeOrderItems,
} = require("../utils/reporting");

let Json2CsvParser = null;
let hasJson2csv = false;
try {
  Json2CsvParser = require("json2csv").Parser;
  hasJson2csv = true;
} catch {
  console.warn("json2csv nu este instalat. Exportul CSV nu va functiona.");
}

function describeReservation(reservation) {
  const order = reservation.comandaId || {};
  const orderDescription = summarizeOrderItems(order);
  if (orderDescription) return orderDescription;
  if (reservation.customDetails?.descriere) {
    return String(reservation.customDetails.descriere);
  }
  if (reservation.tortId) {
    return `Tort ${reservation.tortId}`;
  }
  return "";
}

function getReservationQuantity(reservation) {
  const order = reservation.comandaId || {};
  const qty = getOrderItemQuantity(order);
  if (qty > 0) return qty;
  return reservation.tortId || reservation.customDetails ? 1 : 0;
}

function mapReservationDetails(reservation, userMap) {
  const order = reservation.comandaId || {};
  const client = userMap.get(String(reservation.clientId || ""));
  const handoffMethod = normalizeDeliveryMethod(reservation.handoffMethod);
  const paymentStatus =
    reservation.paymentStatus ||
    order.paymentStatus ||
    order.statusPlata ||
    "unpaid";

  return {
    id: reservation._id?.toString?.() || "",
    comandaId: order?._id?.toString?.() || "",
    createdAt: reservation.createdAt
      ? new Date(reservation.createdAt).toISOString()
      : "",
    data: reservation.date || "",
    ora: reservation.timeSlot || "",
    clientId: String(reservation.clientId || ""),
    client: formatUserLabel(client, reservation.clientId),
    emailClient: client?.email || "",
    telefonClient: client?.telefon || "",
    tort: describeReservation(reservation) || "-",
    cantitate: getReservationQuantity(reservation),
    livrare: handoffMethod,
    handoffMethod,
    adresa: reservation.deliveryAddress || "",
    instructiuniLivrare: reservation.deliveryInstructions || "",
    intervalLivrare: reservation.deliveryWindow || "",
    subtotal: readNumber(reservation.subtotal, 0),
    taxaLivrare: readNumber(reservation.deliveryFee, 0),
    total: readNumber(reservation.total, 0),
    statusPlata: paymentStatus,
    paymentStatus,
    status: reservation.status || "pending",
  };
}

async function loadReservationDetails(startDate, endDate) {
  const filter = buildStringDateRange("date", startDate, endDate, {
    required: true,
    fromLabel: "startDate",
    toLabel: "endDate",
  });

  const reservations = await Rezervare.find(filter)
    .populate({
      path: "comandaId",
      select:
        "items produse preferinte customDetails tortId clientId subtotal taxaLivrare deliveryFee total totalFinal paymentStatus statusPlata",
    })
    .sort({ date: 1, timeSlot: 1, createdAt: 1 })
    .lean();

  const userMap = await buildUserMap(
    reservations.map((reservation) => reservation.clientId)
  );

  return reservations.map((reservation) =>
    mapReservationDetails(reservation, userMap)
  );
}

router.get(
  "/reservari/:startDate/:endDate",
  authRequired,
  roleCheck("admin"),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.params;
      const details = await loadReservationDetails(startDate, endDate);
      const deliveryMethods = { pickup: 0, delivery: 0, courier: 0 };
      const paymentStatuses = {};
      const statusBreakdown = {};
      let totalRevenue = 0;

      details.forEach((detail) => {
        deliveryMethods[detail.handoffMethod] =
          (deliveryMethods[detail.handoffMethod] || 0) + 1;
        paymentStatuses[detail.paymentStatus] =
          (paymentStatuses[detail.paymentStatus] || 0) + 1;
        statusBreakdown[detail.status] =
          (statusBreakdown[detail.status] || 0) + 1;
        totalRevenue += readNumber(detail.total, 0);
      });

      res.json({
        period: { startDate, endDate },
        totalReservations: details.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        deliveryMethods,
        paymentStatuses,
        statusBreakdown,
        details,
      });
    } catch (err) {
      console.error("Eroare /rapoarte/reservari:", err.message);
      if (
        err.message.includes("YYYY-MM-DD") ||
        err.message.includes("obligatorii") ||
        err.message.includes("mai mica")
      ) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Eroare server la raport rezervari" });
    }
  }
);

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
      const details = await loadReservationDetails(startDate, endDate);
      const fields = [
        "Data",
        "Interval",
        "Client",
        "Email Client",
        "Telefon Client",
        "Descriere",
        "Cantitate",
        "Metoda Livrare",
        "Adresa",
        "Subtotal",
        "Taxa Livrare",
        "Total",
        "Status Plata",
        "Status",
        "Creat la",
      ];
      const rows = details.map((detail) => ({
        Data: detail.data,
        Interval: detail.ora,
        Client: detail.client,
        "Email Client": detail.emailClient,
        "Telefon Client": detail.telefonClient,
        Descriere: detail.tort,
        Cantitate: detail.cantitate,
        "Metoda Livrare": detail.handoffMethod,
        Adresa: detail.adresa || "",
        Subtotal: Number(detail.subtotal || 0).toFixed(2),
        "Taxa Livrare": Number(detail.taxaLivrare || 0).toFixed(2),
        Total: Number(detail.total || 0).toFixed(2),
        "Status Plata": detail.paymentStatus,
        Status: detail.status,
        "Creat la": detail.createdAt,
      }));

      const csv = rows.length
        ? new Json2CsvParser({ withBOM: true, fields }).parse(rows)
        : `\uFEFF${fields.join(",")}\n`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="raport-rezervari_${startDate}_${endDate}.csv"`
      );
      res.status(200).send(csv);
    } catch (err) {
      console.error("Eroare /rapoarte/export/csv:", err.message);
      if (
        err.message.includes("YYYY-MM-DD") ||
        err.message.includes("obligatorii") ||
        err.message.includes("mai mica")
      ) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Eroare server la export CSV" });
    }
  }
);

router.get(
  "/sales/:startDate/:endDate",
  authRequired,
  roleCheck("admin"),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.params;
      const filter = buildCreatedAtRange("createdAt", startDate, endDate, {
        required: true,
        fromLabel: "startDate",
        toLabel: "endDate",
      });
      const comenzi = await Comanda.find(filter).lean();

      const totalRevenue = comenzi.reduce((sum, cmd) => sum + getOrderTotal(cmd), 0);
      const totalOrders = comenzi.length;
      const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const deliveryRevenue = comenzi.reduce(
        (sum, cmd) => sum + getOrderDeliveryFee(cmd),
        0
      );

      const methodBreakdown = { pickup: 0, delivery: 0, courier: 0 };
      const paymentBreakdown = {};
      const statusBreakdown = {};

      comenzi.forEach((comanda) => {
        const method = normalizeDeliveryMethod(
          comanda.metodaLivrare || comanda.handoffMethod
        );
        methodBreakdown[method] = (methodBreakdown[method] || 0) + 1;

        const paymentStatus =
          comanda.paymentStatus || comanda.statusPlata || "unpaid";
        paymentBreakdown[paymentStatus] =
          (paymentBreakdown[paymentStatus] || 0) + 1;

        const status = comanda.status || comanda.statusComanda || "plasata";
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });

      res.json({
        period: { startDate, endDate },
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        averageOrder: Number(avgOrder.toFixed(2)),
        deliveryRevenue: Number(deliveryRevenue.toFixed(2)),
        deliveryMethodBreakdown: methodBreakdown,
        paymentBreakdown,
        statusBreakdown,
        topProducts: getTopProducts(comenzi),
      });
    } catch (err) {
      console.error("Eroare /rapoarte/sales:", err.message);
      if (
        err.message.includes("YYYY-MM-DD") ||
        err.message.includes("obligatorii") ||
        err.message.includes("mai mica")
      ) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Eroare server la raport vanzari" });
    }
  }
);

function getTopProducts(comenzi) {
  const products = new Map();

  comenzi.forEach((cmd) => {
    const items = getOrderItems(cmd);
    if (items.length === 0) {
      const fallbackName =
        cmd.customDetails?.descriere || cmd.preferinte || cmd.tortId || "";
      if (!fallbackName) return;
      const entry = products.get(fallbackName) || { quantity: 0, revenue: 0 };
      entry.quantity += 1;
      entry.revenue += getOrderTotal(cmd);
      products.set(fallbackName, entry);
      return;
    }

    items.forEach((item) => {
      const name = getItemName(item);
      const quantity = getItemQty(item, 1);
      const revenue =
        item.lineTotal != null
          ? readNumber(item.lineTotal, 0)
          : quantity * readNumber(item.price ?? item.pret, 0);

      const entry = products.get(name) || { quantity: 0, revenue: 0 };
      entry.quantity += quantity;
      entry.revenue += revenue;
      products.set(name, entry);
    });
  });

  return [...products.entries()]
    .sort((a, b) => {
      if (b[1].quantity !== a[1].quantity) {
        return b[1].quantity - a[1].quantity;
      }
      return b[1].revenue - a[1].revenue;
    })
    .slice(0, 5)
    .map(([product, stats]) => ({
      product,
      quantity: stats.quantity,
      revenue: Number(stats.revenue.toFixed(2)),
    }));
}

module.exports = router;
