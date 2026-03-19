const express = require("express");
const { Parser } = require("json2csv");

const Rezervare = require("../models/Rezervare");
const { authRequired, roleCheck } = require("../middleware/auth");
const {
  buildStringDateRange,
  buildUserMap,
  formatUserLabel,
  readNumber,
  summarizeOrderItems,
} = require("../utils/reporting");
const { applyScopedPrestatorFilter } = require("../utils/providerScope");

const router = express.Router();

function getReservationDescription(reservation) {
  const orderDescription = summarizeOrderItems(reservation.comandaId || {});
  if (orderDescription) return orderDescription;
  if (reservation.customDetails?.descriere) {
    return String(reservation.customDetails.descriere);
  }
  if (reservation.comandaId?.preferinte) {
    return String(reservation.comandaId.preferinte);
  }
  if (reservation.tortId) {
    return `Tort ${reservation.tortId}`;
  }
  return "";
}

// GET /api/rapoarte-rezervari/csv?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/csv", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = buildStringDateRange("date", from, to, {
      fromLabel: "from",
      toLabel: "to",
    });

    const rezervari = await Rezervare.find(applyScopedPrestatorFilter(req, filter))
      .populate({
        path: "comandaId",
        select: "items produse preferinte customDetails tortId",
      })
      .sort({ date: 1, timeSlot: 1, createdAt: 1 })
      .lean();

    const userMap = await buildUserMap(
      rezervari.map((reservation) => reservation.clientId)
    );

    const fields = [
      "ID",
      "Data",
      "Interval",
      "Client",
      "Email Client",
      "Telefon Client",
      "Metoda",
      "Adresa",
      "Descriere",
      "Subtotal",
      "Taxa Livrare",
      "Total",
      "Status Plata",
      "Status",
      "Creat la",
    ];
    const rows = rezervari.map((reservation) => {
      const user = userMap.get(String(reservation.clientId || ""));
      return {
        ID: reservation._id?.toString?.() || "",
        Data: reservation.date || "",
        Interval: reservation.timeSlot || "",
        Client: formatUserLabel(user, reservation.clientId),
        "Email Client": user?.email || "",
        "Telefon Client": user?.telefon || "",
        Metoda: reservation.handoffMethod || "",
        Adresa: reservation.deliveryAddress || "",
        Descriere: getReservationDescription(reservation),
        Subtotal: readNumber(reservation.subtotal, 0).toFixed(2),
        "Taxa Livrare": readNumber(reservation.deliveryFee, 0).toFixed(2),
        Total: readNumber(reservation.total, 0).toFixed(2),
        "Status Plata": reservation.paymentStatus || "unpaid",
        Status: reservation.status || "pending",
        "Creat la": reservation.createdAt
          ? new Date(reservation.createdAt).toISOString()
          : "",
      };
    });

    const csv = rows.length
      ? new Parser({ withBOM: true, fields }).parse(rows)
      : `\uFEFF${fields.join(",")}\n`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="raport-rezervari-${from || "ALL"}-${to || "ALL"}.csv"`
    );
    res.send(csv);
  } catch (err) {
    if (err.message.includes("YYYY-MM-DD") || err.message.includes("mai mica")) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Eroare /rapoarte-rezervari/csv:", err);
    res
      .status(500)
      .json({ message: "Eroare server la exportul raportului de rezervari." });
  }
});

module.exports = router;
