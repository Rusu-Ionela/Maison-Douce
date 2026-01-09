// backend/routes/calendar.js
const express = require("express");
const router = express.Router();

const CalendarPrestator = require("../models/CalendarPrestator");
const CalendarSlotEntry = require("../models/CalendarSlotEntry");
const Rezervare = require("../models/Rezervare");
const Comanda = require("../models/Comanda");
const { authRequired, roleCheck } = require("../middleware/auth");
const Notificare = require("../models/Notificare");

let Utilizator = null;
try {
  Utilizator = require("../models/Utilizator");
} catch { }

/* ================== GET disponibilitate (client) ================== */
/*
  GET /api/calendar/availability/:prestatorId
  GET /api/calendar/disponibilitate/:prestatorId   (alias)

  Query:
    from=YYYY-MM-DD (optional)
    to=YYYY-MM-DD   (optional)
    hideFull=true   (optional)
*/
async function availabilityHandler(req, res) {
  try {
    const { prestatorId } = req.params;
    const { from, to, hideFull } = req.query;

    // Query CalendarSlotEntry (after migration, this is the single source of truth)
    const query = { prestatorId };
    if (from && to) query.date = { $gte: from, $lte: to };
    else if (from) query.date = { $gte: from };
    else if (to) query.date = { $lte: to };

    const entries = await CalendarSlotEntry.find(query).lean();
    let mapped = entries.map((s) => ({
      date: s.date,
      time: s.time,
      capacity: Number(s.capacity || 0),
      used: Number(s.used || 0),
      free: Math.max(0, Number((s.capacity || 0)) - Number((s.used || 0)))
    }));

    if (String(hideFull).toLowerCase() === "true") {
      mapped = mapped.filter(s => s.free > 0);
    }

    mapped.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    res.json({ slots: mapped });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
}

// ✅ ambele rute folosesc același handler
router.get("/availability/:prestatorId", availabilityHandler);
router.get("/disponibilitate/:prestatorId", availabilityHandler);

/* ================== POST upsert sloturi (ADMIN) ================== */
/*
  POST /api/calendar/availability/:prestatorId
  Body: { slots: [{ date, time, capacity }] }
  Note: After migration, creates CalendarSlotEntry docs exclusively.
*/
router.post(
  "/availability/:prestatorId",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
  try {
    const { prestatorId } = req.params;
    const { slots } = req.body;

    if (!Array.isArray(slots)) {
      return res.status(400).json({ message: "slots trebuie să fie array" });
    }

    let upsertedCount = 0;

    // Upsert each slot as CalendarSlotEntry document
    for (const s of slots) {
      if (!s?.date || !s?.time) continue;

      await CalendarSlotEntry.updateOne(
        { prestatorId, date: s.date, time: s.time },
        {
          $set: { capacity: Number(s.capacity || 1) },
          $setOnInsert: { used: 0 }
        },
        { upsert: true }
      );
      upsertedCount++;
    }

    res.json({ ok: true, count: upsertedCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
}
);

/* ================== POST rezervare (CLIENT) ================== */
/*
  POST /api/calendar/reserve
  Body:
    {
      clientId,
      prestatorId = "default",
      date,
      time,
      metoda: "ridicare" | "livrare",
      adresaLivrare?,
      subtotal?,
      tortId?,
      customDetails?
    }
*/
router.post("/reserve", authRequired, async (req, res) => {
  try {
    const {
      clientId,
      prestatorId = "default",
      date,
      time,
      metoda = "ridicare",
      adresaLivrare = "",
      subtotal = 0,
      descriere,
      items = [],
      tortId,
      customDetails,
    } = req.body;

    if (!clientId) {
      return res.status(400).json({ message: "clientId este obligatoriu" });
    }
    if (!date || !time) {
      return res
        .status(400)
        .json({ message: "date și time sunt obligatorii" });
    }

    const LIVRARE_FEE = 100;
    const deliveryFee = metoda === "livrare" ? LIVRARE_FEE : 0;
    const sb = Number(subtotal || 0);
    const total = sb + deliveryFee;

    // 1️⃣ Atomic reservation using CalendarSlotEntry (required after migration)
    const slotEntry = await CalendarSlotEntry.findOne({ prestatorId, date, time });
    if (!slotEntry) {
      return res.status(404).json({ message: 'Slot not found. Ensure calendar is set up for this prestator.' });
    }

    if (slotEntry.used >= slotEntry.capacity) {
      return res.status(409).json({ message: 'Slot is full' });
    }

    // Atomic increment with condition: only if used < capacity
    const upd = await CalendarSlotEntry.updateOne(
      { _id: slotEntry._id, used: { $lt: slotEntry.capacity } },
      { $inc: { used: 1 } }
    );

    if (!upd || upd.modifiedCount === 0) {
      return res.status(409).json({ message: 'Slot unavailable or occupied' });
    }

    const incremented = { type: 'entry', id: slotEntry._id };

    // calculăm timeSlot "HH:mm-HH:mm+1h"
    const [h, m] = time.split(":").map(Number);
    const endH = String((h + 1) % 24).padStart(2, "0");
    const endM = String(m || 0).padStart(2, "0");
    const timeSlot = `${time}-${endH}:${endM}`;

    // 2️⃣ Creăm COMANDA
    const comandaPayload = {
      clientId,
      items: Array.isArray(items) ? items : [],
      subtotal: sb,
      deliveryFee,
      total,
      tip: "rezervare-calendar",
      statusPlata: "unpaid",
      statusComanda: "inregistrata",
      metodaLivrare: metoda,
      adresaLivrare: metoda === "livrare" ? adresaLivrare : "",
      dataRezervare: date,
      oraRezervare: time,
      tortId: tortId || null,
      customDetails: customDetails || (descriere ? { descriere } : null),
      preferinte: descriere || undefined,
    };

    let comanda;
    let doc;
    try {
      comanda = await Comanda.create(comandaPayload);

      // 3️⃣ Creăm REZERVAREA
      doc = await Rezervare.create({
        clientId,
        prestatorId,
        comandaId: comanda._id,
        tortId: tortId || undefined,
        customDetails: customDetails || (descriere ? { descriere } : undefined),
        date,
        timeSlot,
        handoffMethod: metoda === "livrare" ? "delivery" : "pickup",
        deliveryFee,
        deliveryAddress: metoda === "livrare" ? adresaLivrare : undefined,
        subtotal: sb,
        total,
        paymentStatus: "unpaid",
        status: "pending",
        handoffStatus: "scheduled",
      });
    } catch (e) {
      // dacă crearea comenzii sau rezervării eșuează, revenim (decrementăm used)
      try {
        await CalendarSlotEntry.updateOne(
          { _id: incremented.id, used: { $gt: 0 } },
          { $inc: { used: -1 } }
        );
        console.log('[reserve rollback] ✓ Rolled back slot increment');
      } catch (re) {
        console.error("Rollback failed for slot used decrement:", re);
      }
      throw e;
    }

    // read slot info for response
    let slotInfo = null;
    try {
      slotInfo = await CalendarSlotEntry.findById(incremented.id).lean();
    } catch (e) {
      console.warn('Could not read slot info for response', e.message || e);
    }

    try {
      await Notificare.create({
        userId: clientId,
        titlu: "Rezervare creata",
        mesaj: `Rezervarea ta pentru ${date} ${time} a fost inregistrata.`,
        tip: "rezervare",
        link: `/plata?comandaId=${comanda._id}`,
      });
    } catch (e) {
      console.warn("Notificare rezervare failed:", e.message);
    }

    return res.json({
      ok: true,
      rezervareId: doc._id,
      comandaId: comanda._id,
      slot: slotInfo,
      fees: { delivery: deliveryFee },
      total,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

/* ================== GET rezervări admin pe o dată ================== */
/*
  GET /api/calendar/admin/:date
*/
router.get(
  "/admin/:date",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({ message: "Data lipsă" });
    }

    const [rezervari, comenzi] = await Promise.all([
      Rezervare.find({ date }).sort({ timeSlot: 1 }).populate("comandaId").lean(),
      Comanda.find({
        $or: [{ dataLivrare: date }, { dataRezervare: date }],
      }).lean(),
    ]);

    // map users if model disponibil
    const userIds = new Set();
    rezervari.forEach((r) => r.clientId && userIds.add(String(r.clientId)));
    comenzi.forEach((c) => c.clientId && userIds.add(String(c.clientId)));

    const mapUsers = new Map();
    if (Utilizator && userIds.size) {
      const users = await Utilizator.find(
        { _id: { $in: Array.from(userIds) } },
        { nume: 1, name: 1 }
      ).lean();
      users.forEach((u) =>
        mapUsers.set(String(u._id), u.nume || u.name || "Client")
      );
    }

    const mappedRezervari = rezervari.map((r) => {
      const c = r.comandaId || {};
      const start = (r.timeSlot || "").split("-")[0] || r.timeSlot;
      let desc = "";
      if (Array.isArray(c.items) && c.items.length > 0) {
        desc =
          "Produse: " +
          c.items
            .map((it) => it.nume || it.name || it.tortName || "Produs")
            .join(", ");
      } else if (c.preferinte) {
        desc = "Preferințe: " + c.preferinte;
      } else if (r.customDetails?.descriere) {
        desc = r.customDetails.descriere;
      }

      return {
        _id: r._id,
        type: "rezervare",
        timeSlot: r.timeSlot,
        startTime: start,
        clientId: r.clientId,
        clientName: mapUsers.get(String(r.clientId)) || "Client",
        handoffMethod: r.handoffMethod,
        handoffStatus: r.handoffStatus,
        deliveryAddress: r.deliveryAddress,
        subtotal: r.subtotal,
        deliveryFee: r.deliveryFee,
        total: r.total,
        status: r.status,
        paymentStatus: r.paymentStatus,
        itemsSummary: desc,
      };
    });

    const mappedComenzi = comenzi.map((c) => {
      const start = c.oraLivrare || c.oraRezervare || c.calendarSlot?.time || "";
      let desc = "";
      if (Array.isArray(c.items) && c.items.length > 0) {
        desc =
          "Produse: " +
          c.items
            .map((it) => it.nume || it.name || it.tortName || "Produs")
            .join(", ");
      } else if (c.preferinte) {
        desc = "Preferințe: " + c.preferinte;
      } else if (c.customDetails?.descriere) {
        desc = c.customDetails.descriere;
      }

      return {
        _id: c._id,
        type: "comanda",
        timeSlot: start || "",
        startTime: start,
        clientId: c.clientId,
        clientName: mapUsers.get(String(c.clientId)) || "Client",
        handoffMethod:
          c.metodaLivrare === "livrare" || c.metodaLivrare === "delivery"
            ? "delivery"
            : "pickup",
        handoffStatus: c.handoffStatus || "scheduled",
        deliveryAddress: c.adresaLivrare,
        subtotal: c.subtotal,
        deliveryFee: c.taxaLivrare || c.deliveryFee || 0,
        total: c.total,
        status: c.status,
        paymentStatus: c.paymentStatus || c.statusPlata,
        itemsSummary: desc,
      };
    });

    const combinat = [...mappedRezervari, ...mappedComenzi].sort((a, b) =>
      String(a.startTime || "").localeCompare(String(b.startTime || ""))
    );

    res.json({ rezervari: combinat });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
}
);

/* ================== Export CSV pentru o dată ================== */
/*
  GET /api/calendar/admin/:date/export
*/
router.get(
  "/admin/:date/export",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
  try {
    const { date } = req.params;
    const rezervari = await Rezervare.find({ date })
      .sort({ timeSlot: 1 })
      .lean();

    const rows = [
      [
        "timeSlot",
        "clientId",
        "clientName",
        "handoffMethod",
        "deliveryAddress",
        "subtotal",
        "deliveryFee",
        "total",
        "paymentStatus",
        "status",
      ].join(","),
    ];

    for (const r of rezervari) {
      const clientName = r.clientName || "";
      const addr = (r.deliveryAddress || "").replaceAll(",", " ");
      rows.push(
        [
          r.timeSlot,
          r.clientId,
          JSON.stringify(clientName),
          r.handoffMethod,
          JSON.stringify(addr),
          r.subtotal,
          r.deliveryFee,
          r.total,
          r.paymentStatus,
          r.status,
        ].join(",")
      );
    }

    const csv = rows.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rezervari_${date}.csv"`
    );
    res.send(csv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
  }
);

module.exports = router;
