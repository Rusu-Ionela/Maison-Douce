// backend/routes/calendar.js
const express = require("express");
const router = express.Router();

const CalendarPrestator = require("../models/CalendarPrestator");
const CalendarSlotEntry = require("../models/CalendarSlotEntry");
const CalendarDayCapacity = require("../models/CalendarDayCapacity");
const Rezervare = require("../models/Rezervare");
const Comanda = require("../models/Comanda");
const { authRequired, roleCheck } = require("../middleware/auth");
const { notifyUser, notifyAdmins } = require("../utils/notifications");
const {
  applyScopedPrestatorFilter,
  getScopedPrestatorId,
  hasScopedPrestatorAccess,
} = require("../utils/providerScope");

let Utilizator = null;
try {
  Utilizator = require("../models/Utilizator");
} catch { }

const MIN_LEAD_HOURS = Number(process.env.MIN_LEAD_HOURS || 24);
const GENERIC_SERVER_MESSAGE = "Eroare server.";

function isStaffRole(role) {
  return ["admin", "patiser", "prestator"].includes(String(role || ""));
}

function normalizePrestatorId(value) {
  return String(value || "").trim();
}

function rejectOutsidePrestatorScope(req, res, prestatorId) {
  if (!hasScopedPrestatorAccess(req, prestatorId)) {
    res.status(403).json({ message: "Acces interzis pentru acest prestator." });
    return true;
  }
  return false;
}

function isValidDeliveryWindow(value) {
  const clean = String(value || "").trim();
  if (!clean) return true;

  const match = clean.match(/^(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?$/);
  if (!match) return false;
  if (!match[2]) return true;
  return match[2] > match[1];
}

function isBeforeMinLead(dateStr, timeStr) {
  if (!dateStr || !timeStr) return false;
  const [h, m] = String(timeStr).split(":").map(Number);
  const target = new Date(`${dateStr}T00:00:00`);
  target.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  const min = new Date();
  min.setHours(min.getHours() + MIN_LEAD_HOURS);
  return target < min;
}

async function getDayCapacityMap(prestatorId, from, to) {
  const q = { prestatorId };
  if (from && to) q.date = { $gte: from, $lte: to };
  else if (from) q.date = { $gte: from };
  else if (to) q.date = { $lte: to };
  const list = await CalendarDayCapacity.find(q).lean();
  const map = new Map();
  list.forEach((d) => map.set(d.date, Number(d.capacity || 0)));
  return map;
}

async function isDayCapacityFull(prestatorId, dateStr) {
  const dayCap = await CalendarDayCapacity.findOne({ prestatorId, date: dateStr }).lean();
  if (!dayCap || dayCap.capacity == null) return false;
  const usedAgg = await CalendarSlotEntry.aggregate([
    { $match: { prestatorId, date: dateStr } },
    { $group: { _id: null, used: { $sum: "$used" } } },
  ]);
  const used = usedAgg[0]?.used || 0;
  return used >= Number(dayCap.capacity || 0);
}

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
    const prestatorId = normalizePrestatorId(req.params?.prestatorId);
    const { from, to, hideFull } = req.query;
    if (!prestatorId) {
      return res.status(400).json({ message: "prestatorId este obligatoriu" });
    }

    // Query CalendarSlotEntry (after migration, this is the single source of truth)
    const query = { prestatorId };
    if (from && to) query.date = { $gte: from, $lte: to };
    else if (from) query.date = { $gte: from };
    else if (to) query.date = { $lte: to };

    const entries = await CalendarSlotEntry.find(query).lean();
    const dayCaps = await getDayCapacityMap(prestatorId, from, to);
    const usedByDate = new Map();
    entries.forEach((s) => {
      const used = Number(s.used || 0);
      usedByDate.set(s.date, (usedByDate.get(s.date) || 0) + used);
    });

    let mapped = entries.map((s) => {
      const capacity = Number(s.capacity || 0);
      const used = Number(s.used || 0);
      let free = Math.max(0, capacity - used);
      const dayCap = dayCaps.get(s.date);
      if (dayCap != null) {
        const usedDay = usedByDate.get(s.date) || 0;
        if (usedDay >= Number(dayCap || 0)) free = 0;
      }
      return {
        date: s.date,
        time: s.time,
        capacity,
        used,
        free,
      };
    });

    if (String(hideFull).toLowerCase() === "true") {
      mapped = mapped.filter(s => s.free > 0);
    }

    mapped.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    res.json({ slots: mapped });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: GENERIC_SERVER_MESSAGE });
  }
}

// ✅ ambele rute folosesc același handler
router.get("/availability/:prestatorId", availabilityHandler);
router.get("/disponibilitate/:prestatorId", availabilityHandler);

/* ================== DAY CAPACITY (ADMIN) ================== */
// GET /api/calendar/day-capacity/:prestatorId?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get(
  "/day-capacity/:prestatorId",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const { prestatorId } = req.params;
      if (rejectOutsidePrestatorScope(req, res, prestatorId)) {
        return;
      }
      const { from, to } = req.query;
      const q = { prestatorId };
      if (from && to) q.date = { $gte: from, $lte: to };
      else if (from) q.date = { $gte: from };
      else if (to) q.date = { $lte: to };
      const items = await CalendarDayCapacity.find(q).lean();
      res.json({ items });
    } catch (e) {
      res.status(500).json({ message: "Eroare la preluare capacitate." });
    }
  }
);

// POST /api/calendar/day-capacity/:prestatorId  Body: { date, capacity }
router.post(
  "/day-capacity/:prestatorId",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const { prestatorId } = req.params;
      if (rejectOutsidePrestatorScope(req, res, prestatorId)) {
        return;
      }
      const { date, capacity } = req.body || {};
      if (!date) {
        return res.status(400).json({ message: "date este obligatoriu" });
      }
      const cap = Number(capacity ?? 0);
      const doc = await CalendarDayCapacity.findOneAndUpdate(
        { prestatorId, date },
        { $set: { capacity: cap } },
        { new: true, upsert: true }
      );
      res.json({ ok: true, item: doc });
    } catch (e) {
      res.status(500).json({ message: "Eroare la salvare capacitate." });
    }
  }
);

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
    if (rejectOutsidePrestatorScope(req, res, prestatorId)) {
      return;
    }
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
      clientId: requestedClientId,
      prestatorId: rawPrestatorId,
      date,
      time,
      metoda = "ridicare",
      adresaLivrare = "",
      deliveryInstructions = "",
      deliveryWindow = "",
      subtotal = 0,
      descriere,
      notes = "",
      items = [],
      tortId,
      customDetails,
    } = req.body;
    const prestatorId = normalizePrestatorId(rawPrestatorId);

    const role = req.user?.rol || req.user?.role;
    const isStaff = isStaffRole(role);
    const authUserId = String(req.user?.id || req.user?._id || "");
    const effectiveClientId =
      isStaff && requestedClientId ? String(requestedClientId) : authUserId;

    if (!effectiveClientId) {
      return res.status(401).json({ message: "Utilizator neautentificat" });
    }
    if (!isStaff && requestedClientId && String(requestedClientId) !== authUserId) {
      return res.status(403).json({ message: "Nu poti face rezervari pentru alt client" });
    }
    if (!prestatorId) {
      return res.status(400).json({
        message: "prestatorId este obligatoriu pentru rezervari.",
      });
    }
    if (getScopedPrestatorId(req) && rejectOutsidePrestatorScope(req, res, prestatorId)) {
      return;
    }
    if (!["ridicare", "livrare"].includes(String(metoda || "").trim())) {
      return res.status(400).json({
        message: "metoda trebuie sa fie ridicare sau livrare.",
      });
    }
    if (metoda === "livrare" && !String(adresaLivrare || "").trim()) {
      return res.status(400).json({
        message: "Adresa de livrare este obligatorie pentru aceasta rezervare.",
      });
    }
    if (!isValidDeliveryWindow(deliveryWindow)) {
      return res.status(400).json({
        message:
          "Intervalul de livrare este invalid. Foloseste formatul HH:mm sau HH:mm-HH:mm.",
      });
    }
    if (!date || !time) {
      return res
        .status(400)
        .json({ message: "date și time sunt obligatorii" });
    }

    if (isBeforeMinLead(date, time)) {
      return res.status(400).json({
        message: `Alege un interval cu minim ${MIN_LEAD_HOURS} ore inainte.`,
      });
    }
    if (await isDayCapacityFull(prestatorId, date)) {
      return res.status(409).json({
        message: "Capacitatea zilei este atinsa. Alege alta data.",
      });
    }

    const estimatedBudget = Math.max(
      0,
      Number((req.body?.clientBudget ?? subtotal) || 0)
    );
    const pricingPendingNote =
      "Pretul final va fi confirmat de echipa dupa analiza cererii.";
    const safeRequestedItems = Array.isArray(items)
      ? items
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const qty = Math.max(1, Number(item.qty || item.cantitate || 1));
          const name = String(item.name || item.nume || "Produs").trim() || "Produs";
          return {
            productId: item.productId || undefined,
            tortId: item.tortId || item.productId || undefined,
            name,
            nume: name,
            qty,
            cantitate: qty,
            personalizari:
              item.personalizari && typeof item.personalizari === "object"
                ? item.personalizari
                : undefined,
            price: 0,
            pret: 0,
            lineTotal: 0,
          };
        })
      : [];
    const customRequestDetails =
      customDetails && typeof customDetails === "object"
        ? {
          ...customDetails,
          descriere: descriere || customDetails.descriere || undefined,
          clientBudget: estimatedBudget || undefined,
          requiresManualPricing: true,
        }
        : {
          descriere: descriere || undefined,
          clientBudget: estimatedBudget || undefined,
          requiresManualPricing: true,
        };
    const total = 0;

    // 1️⃣ Atomic reservation using CalendarSlotEntry (required after migration)
    const slotEntry = await CalendarSlotEntry.findOne({ prestatorId, date, time });
    if (!slotEntry) {
      return res.status(404).json({
        message: "Slot indisponibil. Calendarul nu este configurat pentru acest prestator.",
      });
    }

    if (slotEntry.used >= slotEntry.capacity) {
      return res.status(409).json({ message: "Slotul selectat este ocupat." });
    }

    // Atomic increment with condition: only if used < capacity
    const upd = await CalendarSlotEntry.updateOne(
      { _id: slotEntry._id, used: { $lt: slotEntry.capacity } },
      { $inc: { used: 1 } }
    );

    if (!upd || upd.modifiedCount === 0) {
      return res.status(409).json({
        message: "Slotul selectat nu mai este disponibil.",
      });
    }

    const incremented = { type: 'entry', id: slotEntry._id };

    // calculăm timeSlot "HH:mm-HH:mm+1h"
    const [h, m] = time.split(":").map(Number);
    const endH = String((h + 1) % 24).padStart(2, "0");
    const endM = String(m || 0).padStart(2, "0");
    const timeSlot = `${time}-${endH}:${endM}`;

    // 2️⃣ Creăm COMANDA
    const comandaPayload = {
      clientId: effectiveClientId,
      prestatorId,
      items: safeRequestedItems,
      subtotal: 0,
      taxaLivrare: 0,
      deliveryFee: 0,
      total,
      totalFinal: total,
      tip: "rezervare-calendar",
      statusPlata: "unpaid",
      status: "in_asteptare",
      statusComanda: "inregistrata",
      metodaLivrare: metoda,
      adresaLivrare: metoda === "livrare" ? adresaLivrare : "",
      deliveryInstructions: deliveryInstructions || "",
      deliveryWindow: deliveryWindow || "",
      notesClient: notes || "",
      notesAdmin: pricingPendingNote,
      dataRezervare: date,
      oraRezervare: time,
      tortId: tortId || null,
      customDetails: customRequestDetails,
      preferinte: descriere || undefined,
      statusHistory: [
        {
          status: "in_asteptare",
          note: "Rezervare creata - pret in asteptare",
        },
      ],
    };

    let comanda;
    let doc;
    try {
      comanda = await Comanda.create(comandaPayload);

      // 3️⃣ Creăm REZERVAREA
      doc = await Rezervare.create({
        clientId: effectiveClientId,
        prestatorId,
        comandaId: comanda._id,
        tortId: tortId || undefined,
        customDetails: customRequestDetails,
        date,
        timeSlot,
        handoffMethod: metoda === "livrare" ? "delivery" : "pickup",
        deliveryFee: 0,
        deliveryAddress: metoda === "livrare" ? adresaLivrare : undefined,
        deliveryInstructions: deliveryInstructions || "",
        deliveryWindow: deliveryWindow || "",
        subtotal: 0,
        total,
        paymentStatus: "unpaid",
        status: "pending",
        handoffStatus: "scheduled",
        notes: notes || pricingPendingNote,
      });
    } catch (e) {
      // dacă crearea comenzii sau rezervării eșuează, revenim (decrementăm used)
      try {
        await CalendarSlotEntry.updateOne(
          { _id: incremented.id, used: { $gt: 0 } },
          { $inc: { used: -1 } }
        );
        console.warn("[reserve rollback] slot increment reverted");
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

    await notifyUser(effectiveClientId, {
      titlu: "Rezervare creata",
      mesaj: `Rezervarea ta pentru ${date} ${time} a fost inregistrata. Pretul final va fi confirmat separat.`,
      tip: "rezervare",
      link: "/profil",
    });
    await notifyAdmins({
      titlu: "Rezervare noua",
      mesaj: `Rezervare noua pentru ${date} ${time}.`,
      tip: "rezervare",
      link: "/admin/calendar",
    });

    return res.json({
      ok: true,
      rezervareId: doc._id,
      comandaId: comanda._id,
      slot: slotInfo,
      fees: { delivery: 0 },
      total,
      clientBudget: estimatedBudget,
      requiresPriceConfirmation: true,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: GENERIC_SERVER_MESSAGE });
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
      Rezervare.find(applyScopedPrestatorFilter(req, { date }))
        .sort({ timeSlot: 1 })
        .populate("comandaId")
        .lean(),
      Comanda.find(
        applyScopedPrestatorFilter(req, {
          $or: [{ dataLivrare: date }, { dataRezervare: date }],
        })
      ).lean(),
    ]);

    // map users if model disponibil
    const userIds = new Set();
    rezervari.forEach((r) => r.clientId && userIds.add(String(r.clientId)));
    comenzi.forEach((c) => c.clientId && userIds.add(String(c.clientId)));

    const mapUsers = new Map();
    if (Utilizator && userIds.size) {
      const users = await Utilizator.find(
        { _id: { $in: Array.from(userIds) } },
        { nume: 1, name: 1, telefon: 1, email: 1 }
      ).lean();
      users.forEach((u) =>
        mapUsers.set(String(u._id), {
          name: u.nume || u.name || "Client",
          telefon: u.telefon || "",
          email: u.email || "",
        })
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
        clientName: mapUsers.get(String(r.clientId))?.name || "Client",
        clientPhone: mapUsers.get(String(r.clientId))?.telefon || "",
        clientEmail: mapUsers.get(String(r.clientId))?.email || "",
        handoffMethod: r.handoffMethod,
        handoffStatus: r.handoffStatus,
        deliveryAddress: r.deliveryAddress,
        deliveryInstructions: r.deliveryInstructions || "",
        deliveryWindow: r.deliveryWindow || "",
        subtotal: r.subtotal,
        deliveryFee: r.deliveryFee,
        total: r.total,
        status: r.status,
        paymentStatus: r.paymentStatus,
        itemsSummary: desc,
      };
    });

    // evita dublurile: rezervarile cu comandaId asociata au deja datele comenzii incluse
    const linkedComandaIds = new Set(
      rezervari
        .map((r) => r?.comandaId?._id || r?.comandaId)
        .filter(Boolean)
        .map((id) => String(id))
    );

    const mappedComenzi = comenzi
      .filter((c) => !linkedComandaIds.has(String(c._id)))
      .map((c) => {
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
        clientName: mapUsers.get(String(c.clientId))?.name || "Client",
        clientPhone: mapUsers.get(String(c.clientId))?.telefon || "",
        clientEmail: mapUsers.get(String(c.clientId))?.email || "",
        handoffMethod:
          c.metodaLivrare === "livrare" || c.metodaLivrare === "delivery"
            ? "delivery"
            : "pickup",
        handoffStatus: c.handoffStatus || "scheduled",
        deliveryAddress: c.adresaLivrare,
        deliveryInstructions: c.deliveryInstructions || "",
        deliveryWindow: c.deliveryWindow || "",
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
    res.status(500).json({ message: GENERIC_SERVER_MESSAGE });
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
    const rezervari = await Rezervare.find(applyScopedPrestatorFilter(req, { date }))
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
    res.status(500).json({ message: GENERIC_SERVER_MESSAGE });
  }
  }
);

module.exports = router;

