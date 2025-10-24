// backend/routes/calendar.js
const express = require("express");
const router = express.Router();
const CalendarPrestator = require("../models/CalendarPrestator");
const Rezervare = require("../models/Rezervare");

// ---- GET disponibilitate prestator (interval) ----
// GET /api/calendar/availability/:prestatorId?from=YYYY-MM-DD&to=YYYY-MM-DD&hideFull=true
router.get("/availability/:prestatorId", async (req, res) => {
  try {
    const { prestatorId } = req.params;
    const { from, to, hideFull } = req.query;

    const cal = await CalendarPrestator.findOne({ prestatorId });
    if (!cal) return res.json({ slots: [] });

    let slots = cal.slots || [];
    if (from) slots = slots.filter((s) => s.date >= from);
    if (to) slots = slots.filter((s) => s.date <= to);

    const mapped = slots.map((s) => {
      const capacity = Number(s.capacity || 0);
      const used = Number(s.used || 0);
      return {
        date: s.date,
        time: s.time,
        capacity,
        used,
        free: Math.max(0, capacity - used),
      };
    });

    const final =
      String(hideFull).toLowerCase() === "true"
        ? mapped.filter((s) => s.free > 0)
        : mapped;

    final.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    res.json({ slots: final });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

// ---- POST upsert sloturi (ADMIN) ----
// POST /api/calendar/availability/:prestatorId
// Body: { slots: [{date, time, capacity}] }  -> NU resetează "used"
router.post("/availability/:prestatorId", async (req, res) => {
  try {
    const { prestatorId } = req.params;
    const { slots } = req.body;
    if (!Array.isArray(slots)) {
      return res.status(400).json({ message: "slots trebuie să fie array" });
    }

    let cal = await CalendarPrestator.findOne({ prestatorId });
    if (!cal) cal = new CalendarPrestator({ prestatorId, slots: [] });

    const map = new Map(cal.slots.map((s) => [`${s.date}|${s.time}`, s]));
    for (const s of slots) {
      const key = `${s.date}|${s.time}`;
      const existing = map.get(key);
      if (existing) {
        if (typeof s.capacity === "number") {
          existing.capacity = s.capacity;
          if (existing.used > existing.capacity) existing.used = existing.capacity;
        }
      } else {
        map.set(key, {
          date: s.date,
          time: s.time,
          capacity: Number(s.capacity || 1),
          used: 0,
        });
      }
    }

    cal.slots = Array.from(map.values()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    await cal.save();

    res.json({ ok: true, count: cal.slots.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

// ---- POST rezervare (client) ----
// POST /api/calendar/reserve
// Body: { clientId, prestatorId, date, time, metoda: 'ridicare'|'livrare', adresaLivrare?, subtotal? }
router.post("/reserve", async (req, res) => {
  try {
    const {
      clientId,
      prestatorId = "default",
      date,
      time, // "HH:mm"
      metoda = "ridicare",
      adresaLivrare = "",
      subtotal = 0,
      tortId,
      customDetails,
    } = req.body;

    if (!clientId) return res.status(400).json({ message: "clientId este obligatoriu" });
    if (!date || !time) return res.status(400).json({ message: "date și time sunt obligatorii" });

    const LIVRARE_FEE = 100;
    const deliveryFee = metoda === "livrare" ? LIVRARE_FEE : 0;
    const sb = Number(subtotal || 0);
    const total = sb + deliveryFee;

    // 1) găsește & consumă slotul
    const cal = await CalendarPrestator.findOne({ prestatorId });
    if (!cal) return res.status(404).json({ message: "Calendar inexistent" });

    const idx = (cal.slots || []).findIndex((s) => s.date === date && s.time === time);
    if (idx === -1) return res.status(404).json({ message: "Slot inexistent" });

    const slot = cal.slots[idx];
    const cap = Number(slot.capacity || 0);
    const used = Number(slot.used || 0);
    if (used >= cap) {
      return res.status(409).json({ message: "Slot indisponibil (ocupat)" });
    }

    cal.slots[idx].used = used + 1;
    await cal.save();

    // 2) calculează timeSlot de 1h
    const [h, m] = time.split(":").map(Number);
    const endH = String((h + 1) % 24).padStart(2, "0");
    const endM = String(m || 0).padStart(2, "0");
    const timeSlot = `${time}-${endH}:${endM}`;

    // 3) creează Rezervare
    const doc = await Rezervare.create({
      clientId,
      prestatorId,
      tortId: tortId || undefined,
      customDetails: customDetails || undefined,

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

    res.json({
      ok: true,
      rezervareId: doc._id,
      slot: cal.slots[idx],
      fees: { delivery: deliveryFee },
      total,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
