// backend/routes/rapoarte.js
const express = require("express");
const router = express.Router();

const Comanda = require("../models/Comanda");
const ComandaPersonalizata = require("../models/ComandaPersonalizata");
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

function roundCurrency(value) {
  return Number(readNumber(value, 0).toFixed(2));
}

function roundHours(value) {
  return Number(readNumber(value, 0).toFixed(2));
}

function average(values = []) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + readNumber(value, 0), 0);
  return roundHours(total / values.length);
}

function normalizeReason(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function addReason(reasonMap, reason) {
  const normalized = normalizeReason(reason);
  if (!normalized) return;
  reasonMap.set(normalized, (reasonMap.get(normalized) || 0) + 1);
}

function toReasonList(reasonMap) {
  return Array.from(reasonMap.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));
}

function buildDateTime(value, time = "") {
  const dateValue = String(value || "").trim();
  if (!dateValue) return null;
  const timeValue = String(time || "").trim() || "00:00";
  const result = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(result.getTime())) return null;
  return result;
}

function hoursBetween(start, end) {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  if (!Number.isFinite(diff) || diff < 0) return null;
  return diff;
}

function pickEarliestDate(...values) {
  const dates = values
    .map((value) => (value instanceof Date ? value : new Date(value)))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  return dates[0] || null;
}

function getFirstCustomResponseAt(customOrder) {
  const history = Array.isArray(customOrder?.statusHistory) ? customOrder.statusHistory : [];
  return (
    history.find((entry) => normalizeReason(entry?.status) && normalizeReason(entry?.status) !== "noua")
      ?.at || null
  );
}

function getCustomRejectionReason(customOrder) {
  const history = Array.isArray(customOrder?.statusHistory) ? customOrder.statusHistory : [];
  const rejectionEntry = [...history]
    .reverse()
    .find((entry) => normalizeReason(entry?.status) === "respinsa");
  return rejectionEntry?.note || "";
}

function getOrderRejectionReason(order) {
  if (normalizeReason(order?.motivRefuz)) return order.motivRefuz;
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
  const rejectionEntry = [...history]
    .reverse()
    .find((entry) => ["anulata", "refuzata"].includes(normalizeReason(entry?.status)));
  if (normalizeReason(rejectionEntry?.note)) return rejectionEntry.note;
  if (["anulata", "refuzata"].includes(normalizeReason(order?.status)) && normalizeReason(order?.note)) {
    return order.note;
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
      const customOrders = await ComandaPersonalizata.find(filter)
        .populate("comandaId", "paymentStatus statusPlata total totalFinal")
        .lean();

      const methodBreakdown = { pickup: 0, delivery: 0, courier: 0 };
      const methodRevenueBreakdown = { pickup: 0, delivery: 0, courier: 0 };
      const paymentBreakdown = {};
      const statusBreakdown = {};
      const rejectionReasons = new Map();
      const scheduledLeadTimes = [];
      let cancelledOrders = 0;
      let unpaidOrders = 0;

      comenzi.forEach((comanda) => {
        const method = normalizeDeliveryMethod(
          comanda.metodaLivrare || comanda.handoffMethod
        );
        methodBreakdown[method] = (methodBreakdown[method] || 0) + 1;
        methodRevenueBreakdown[method] =
          (methodRevenueBreakdown[method] || 0) + getOrderTotal(comanda);

        const paymentStatus =
          comanda.paymentStatus || comanda.statusPlata || "unpaid";
        paymentBreakdown[paymentStatus] =
          (paymentBreakdown[paymentStatus] || 0) + 1;
        if (paymentStatus !== "paid") unpaidOrders += 1;

        const status = comanda.status || comanda.statusComanda || "plasata";
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

        if (["anulata", "refuzata"].includes(normalizeReason(status))) {
          cancelledOrders += 1;
          addReason(rejectionReasons, getOrderRejectionReason(comanda));
        }

        const scheduledAt = buildDateTime(
          comanda.dataLivrare || comanda.dataRezervare || comanda.calendarSlot?.date,
          comanda.oraLivrare || comanda.oraRezervare || comanda.calendarSlot?.time
        );
        const leadHours = hoursBetween(comanda.createdAt, scheduledAt);
        if (leadHours != null) scheduledLeadTimes.push(leadHours);
      });

      const customResponseTimes = [];
      let customRejected = 0;
      let customConverted = 0;
      let customPaid = 0;

      customOrders.forEach((customOrder) => {
        if (customOrder?.comandaId || normalizeReason(customOrder?.status) === "comanda_generata") {
          customConverted += 1;
        }

        const linkedPaymentStatus =
          customOrder?.comandaId?.paymentStatus || customOrder?.comandaId?.statusPlata || "";
        if (normalizeReason(linkedPaymentStatus) === "paid") {
          customPaid += 1;
        }

        if (normalizeReason(customOrder?.status) === "respinsa") {
          customRejected += 1;
          addReason(rejectionReasons, getCustomRejectionReason(customOrder));
        }

        const responseAt = getFirstCustomResponseAt(customOrder);
        const responseStart = pickEarliestDate(customOrder.createdAt, customOrder.data);
        const responseHours = hoursBetween(responseStart, responseAt);
        if (responseHours != null) customResponseTimes.push(responseHours);
      });

      const customTotal = customOrders.length;
      const totalLost = cancelledOrders + customRejected;

      res.json({
        period: { startDate, endDate },
        totalOrders,
        totalRevenue: roundCurrency(totalRevenue),
        averageOrder: roundCurrency(avgOrder),
        deliveryRevenue: roundCurrency(deliveryRevenue),
        deliveryMethodBreakdown: methodBreakdown,
        methodRevenueBreakdown: Object.fromEntries(
          Object.entries(methodRevenueBreakdown).map(([key, value]) => [key, roundCurrency(value)])
        ),
        paymentBreakdown,
        statusBreakdown,
        topProducts: getTopProducts(comenzi),
        unpaidOrders,
        lostOrderCounts: {
          standardCancelled: cancelledOrders,
          customRejected,
          totalLost,
        },
        topRejectionReasons: toReasonList(rejectionReasons),
        customFunnel: {
          totalRequests: customTotal,
          convertedOrders: customConverted,
          paidOrders: customPaid,
          rejectedRequests: customRejected,
          conversionRate: customTotal > 0 ? roundHours((customConverted / customTotal) * 100) : 0,
          paidRate: customTotal > 0 ? roundHours((customPaid / customTotal) * 100) : 0,
        },
        operationalTimings: {
          averageCustomResponseHours: average(customResponseTimes),
          averageScheduledLeadHours: average(scheduledLeadTimes),
        },
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
