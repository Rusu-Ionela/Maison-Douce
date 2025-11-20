// backend/controllers/rezervariController.js
const Rezervare = require("../models/Rezervare");
const { getWorkingHours, generateTimeSlots } = require("../utils/timeSlots");
const axios = require("axios");

/* ---------------- Helpers ---------------- */

function addMinutes(hhmm, minutes = 60) {
    // hhmm = "HH:mm"
    const [H, M] = hhmm.split(":").map(Number);
    const d = new Date(2000, 0, 1, H, M, 0, 0);
    d.setMinutes(d.getMinutes() + minutes);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

function toStartEnd(timeSlot) {
    // Acceptă "HH:mm" sau "HH:mm-HH:mm"
    if (typeof timeSlot === "string" && timeSlot.includes("-")) {
        const [startTime, endTime] = timeSlot.split("-");
        return { startTime, endTime };
    }
    const startTime = timeSlot;
    const endTime = addMinutes(timeSlot, 60); // slot implicit de 60 min
    return { startTime, endTime };
}

/* ---------------- Controllers ---------------- */

/**
 * GET /api/rezervari/availability?prestatorId=&date=YYYY-MM-DD
 * Returnează sloturi disponibile pentru data dată (din programul de lucru).
 */
async function getAvailability(req, res) {
    try {
        const { prestatorId, date } = req.query;
        if (!prestatorId || !date) {
            return res.status(400).json({ error: "Missing prestatorId or date" });
        }

        const wh = getWorkingHours();         // { start: "09:00", end: "18:00", step: 60 } de ex.
        const allSlots = generateTimeSlots(wh); // ["09:00","10:00",...]

        // rezervările deja făcute (non-cancelled)
        const booked = await Rezervare.find(
            { prestatorId, date, status: { $ne: "cancelled" } },
            "timeSlot"
        ).lean();

        const bookedSet = new Set(booked.map((r) => r.timeSlot));
        const freeSlots = allSlots.filter((s) => !bookedSet.has(s));

        res.json({ date, freeSlots, workingHours: wh });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

/**
 * POST /api/rezervari
 * Body: {
 *   clientId, prestatorId, tortId?, customDetails?,
 *   date (YYYY-MM-DD), timeSlot ("HH:mm" sau "HH:mm-HH:mm"),
 *   handoffMethod ("pickup" | "delivery"),
 *   deliveryAddress? (obligatoriu dacă handoffMethod = "delivery"),
 *   subtotal (număr)
 * }
 */
async function createRezervare(req, res) {
    try {
        const {
            clientId, prestatorId, tortId, customDetails,
            date, timeSlot, handoffMethod, deliveryAddress,
            subtotal
        } = req.body;

        if (!clientId || !prestatorId || !date || !timeSlot || !handoffMethod || subtotal == null) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const deliveryFee = handoffMethod === "delivery" ? 100 : 0;
        if (handoffMethod === "delivery" && !deliveryAddress) {
            return res.status(400).json({ error: "deliveryAddress required for delivery" });
        }

        const total = Number(subtotal) + Number(deliveryFee);

        // 💾 Creează rezervarea
        const rezervare = await Rezervare.create({
            clientId, prestatorId, tortId, customDetails,
            date, timeSlot,
            handoffMethod,
            deliveryFee,
            deliveryAddress: handoffMethod === "delivery" ? deliveryAddress : undefined,
            subtotal: Number(subtotal),
            total,
            status: "pending",
            handoffStatus: "scheduled",
            paymentStatus: "unpaid"
        });

        // ✅ Marchează slotul în CalendarSlotEntry (atomic) sau fallback la CalendarPrestator
        try {
            const CalendarSlotEntry = require('../models/CalendarSlotEntry');
            // try atomic increment on per-slot entry
            const start = toStartEnd(timeSlot).startTime || timeSlot;
            const entry = await CalendarSlotEntry.findOne({ prestatorId, date, time: start });
            if (entry) {
                const upd = await CalendarSlotEntry.updateOne({ _id: entry._id, used: { $lt: entry.capacity } }, { $inc: { used: 1 } });
                if (!upd || upd.modifiedCount === 0) {
                    console.warn('[calendar/book] slot full or could not increment entry');
                }
            } else {
                // fallback to legacy calendar array
                try {
                    const CalendarPrestator = require('../models/CalendarPrestator');
                    const cal = await CalendarPrestator.findOne({ prestatorId });
                    if (cal && Array.isArray(cal.slots)) {
                        const idx = cal.slots.findIndex(s => s.date === date && s.time === start);
                        if (idx !== -1) {
                            cal.slots[idx].used = Number(cal.slots[idx].used || 0) + 1;
                            await cal.save();
                        }
                    }
                } catch (inner) {
                    console.warn('[calendar/book] fallback warning:', inner?.message || inner);
                }
            }
        } catch (patchErr) {
            console.warn('[calendar/book] warning:', patchErr?.message || patchErr);
        }

        res.status(201).json(rezervare);
    } catch (e) {
        if (e?.code === 11000) {
            return res.status(409).json({ error: "Slot already booked" });
        }
        res.status(500).json({ error: e.message });
    }
}

/**
 * GET /api/rezervari
 * Optional: ?clientId= — "rezervările mele"
 */
async function listByClient(req, res) {
    try {
        const { clientId } = req.query;
        if (!clientId) return res.status(400).json({ error: "Missing clientId" });

        const list = await Rezervare.find({ clientId })
            .sort({ date: -1, timeSlot: -1 })
            .lean();

        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

/**
 * GET /api/rezervari/admin?prestatorId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returnează rezervările din interval (pt calendar admin).
 */
async function getAdminRange(req, res) {
    try {
        const { prestatorId, from, to } = req.query;
        if (!prestatorId || !from || !to) {
            return res.status(400).json({ error: "Missing params" });
        }

        const list = await Rezervare.find({
            prestatorId,
            date: { $gte: from, $lte: to }
        })
            .populate("clientId", "nume email")
            .populate("tortId", "nume")
            .lean();

        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

/**
 * PATCH /api/rezervari/:id/handoff
 * Body: { handoffStatus } // "to_courier" | "to_pickup" | "delivered" | "picked_up"
 */
async function updateHandoffStatus(req, res) {
    try {
        const { id } = req.params;
        const { handoffStatus } = req.body;
        const allowed = ["to_courier", "to_pickup", "delivered", "picked_up"];

        if (!allowed.includes(handoffStatus)) {
            return res.status(400).json({ error: "Invalid handoffStatus" });
        }

        const doc = await Rezervare.findByIdAndUpdate(
            id,
            { handoffStatus },
            { new: true }
        );

        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

/**
 * PATCH /api/rezervari/:id/status
 * Body: { status } // "pending" | "confirmed" | "cancelled"
 */
// backend/controllers/rezervariController.js (doar funcția updateRezervareStatus)
async function updateRezervareStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const allowed = ["pending", "confirmed", "cancelled"];

        if (!allowed.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const doc = await Rezervare.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!doc) return res.status(404).json({ error: "Not found" });

        // dacă NOUL status e "cancelled" => eliberăm slotul în CalendarSlotEntry sau legacy CalendarPrestator
        if (status === "cancelled" && doc.prestatorId && doc.date && doc.timeSlot) {
            try {
                const CalendarSlotEntry = require('../models/CalendarSlotEntry');
                const startHour = (ts = "") => String(ts).split("-")[0] || "";
                const start = startHour(doc.timeSlot);
                const entry = await CalendarSlotEntry.findOne({ prestatorId: doc.prestatorId, date: doc.date, time: start });
                if (entry) {
                    await CalendarSlotEntry.updateOne({ _id: entry._id, used: { $gt: 0 } }, { $inc: { used: -1 } });
                } else {
                    try {
                        const CalendarPrestator = require('../models/CalendarPrestator');
                        const cal = await CalendarPrestator.findOne({ prestatorId: doc.prestatorId });
                        if (cal && Array.isArray(cal.slots)) {
                            const idx = cal.slots.findIndex(
                                s => s.date === doc.date && s.time === start
                            );
                            if (idx !== -1) {
                                cal.slots[idx].used = Math.max(0, Number(cal.slots[idx].used || 0) - 1);
                                await cal.save();
                            }
                        }
                    } catch (err) {
                        console.warn('[rezervare cancel] legacy eliberare slot warning:', err?.message || err);
                    }
                }
            } catch (err) {
                console.warn('[rezervare cancel] eliberare slot warning:', err?.message || err);
            }
        }

        res.json(doc);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}


module.exports = {
    getAvailability,
    createRezervare,
    listByClient,
    getAdminRange,
    updateHandoffStatus,
    updateRezervareStatus,
};
