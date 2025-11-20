const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { Parser } = require("json2csv");

// MODELE
const Comanda = require("../models/Comanda");
const Rezervare = require("../models/Rezervare");
const CalendarPrestator = require("../models/CalendarPrestator");
// const Utilizator = require("../models/Utilizator"); // folosește dacă vrei populate

const LIVRARE_FEE = 100;

/* ---------------------- Helpers Comanda ---------------------- */
function calcSubtotal(items = []) {
    return items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0);
}
function normalizeItems(rawItems = [], produse = []) {
    if (Array.isArray(rawItems) && rawItems.length) return rawItems;
    if (Array.isArray(produse) && produse.length) {
        return produse.map((p) => ({
            productId: p.productId || p._id || p.tortId,
            name: p.name || p.nume || p.numeProdus || "Produs",
            qty: Number(p.qty || p.cantitate || 1),
            price: Number(p.price || p.pret || 0),
        }));
    }
    return [];
}

/* ---------------------- Helpers Rezervare -> Admin view ---------------------- */
function startHour(ts = "") {
    const [start] = String(ts).split("-");
    return start || "";
}
function mapRezervareToComanda(r) {
    return {
        _id: r._id,
        // pentru AdminCalendar, coloana "Client" — poți popula ulterior numele
        clientId: r.clientId,
        dataLivrare: r.date,
        oraLivrare: startHour(r.timeSlot),
        metodaLivrare: r.handoffMethod === "delivery" ? "livrare" : "ridicare" /* align cu Comanda */,
        adresaLivrare: r.deliveryAddress || "",
        items: [], // poți pune rezumat produse dacă le salvezi pe Rezervare
        status: r.status,              // "pending" | "confirmed" | "cancelled"
        handoffStatus: r.handoffStatus, // "scheduled" | "to_courier" | "to_pickup" | "delivered" | "picked_up"
        subtotal: r.subtotal,
        taxaLivrare: r.deliveryFee || 0,
        total: r.total,
        _source: "rezervare",
    };
}
function mapComandaToAdmin(c) {
    return {
        _id: c._id,
        clientId: c.clientId,
        dataLivrare: c.dataLivrare,
        oraLivrare: c.oraLivrare,
        metodaLivrare: c.metodaLivrare, // "livrare" | "ridicare"
        adresaLivrare: c.adresaLivrare || "",
        items: c.items || [],
        status: c.status,
        handoffStatus: c.handoffStatus, // dacă ai în model
        subtotal: c.subtotal,
        taxaLivrare: c.taxaLivrare || 0,
        total: c.total,
        _source: "comanda",
    };
}

/* ===================== 1) COMENZI — CREARE SIMPLĂ ===================== */
/**
 * POST /api/comenzi
 */
router.post("/", async (req, res) => {
    try {
        const {
            clientId,
            items: rawItems,
            produse,
            metodaLivrare = "ridicare",
            adresaLivrare,
            dataLivrare,
            oraLivrare,
            prestatorId = "default",
            note,
            preferinte,
            imagineGenerata,
        } = req.body;

        if (!clientId) return res.status(400).json({ message: "clientId este obligatoriu." });

        const items = normalizeItems(rawItems, produse);
        const subtotal = calcSubtotal(items);
        const taxaLivrare = metodaLivrare === "livrare" ? LIVRARE_FEE : 0;

        const comanda = await Comanda.create({
            clientId,
            items,
            subtotal,
            taxaLivrare,
            total: subtotal + taxaLivrare,
            metodaLivrare,
            adresaLivrare: metodaLivrare === "livrare" ? adresaLivrare : undefined,
            dataLivrare,
            oraLivrare,
            prestatorId,
            note,
            preferinte,
            imagineGenerata,
            status: "plasata",
        });

        res.status(201).json(comanda);
    } catch (e) {
        console.error("Eroare creare comanda:", e);
        res.status(500).json({ message: e.message || "Eroare server." });
    }
});

/* ===================== 2) COMENZI — CREARE CU SLOT ===================== */
/**
 * POST /api/comenzi/creeaza-cu-slot
 * Body: { clientId, items|produse, metodaLivrare, adresaLivrare?, dataLivrare, oraLivrare, prestatorId }
 */
router.post("/creeaza-cu-slot", async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const {
            clientId,
            items: rawItems,
            produse,
            metodaLivrare = "ridicare",
            adresaLivrare,
            dataLivrare,
            oraLivrare,
            prestatorId = "default",
            note,
            preferinte,
            imagineGenerata,
        } = req.body;

        if (!clientId) throw new Error("clientId obligatoriu.");
        if (!dataLivrare || !oraLivrare) throw new Error("dataLivrare și oraLivrare sunt obligatorii.");

        // 1) Blochează slotul — preferăm CalendarSlotEntry (atomic), fallback la CalendarPrestator
        const CalendarSlotEntry = require('../models/CalendarSlotEntry');
        // try to increment entry atomically within the session
        let entryUpdated = false;
        try {
            const entry = await CalendarSlotEntry.findOne({ prestatorId, date: dataLivrare, time: oraLivrare }).session(session);
            if (entry) {
                const upd = await CalendarSlotEntry.updateOne({ _id: entry._id, used: { $lt: entry.capacity } }, { $inc: { used: 1 } }).session(session);
                if (!upd || upd.modifiedCount === 0) throw new Error('Slot indisponibil.');
                entryUpdated = true;
            }
        } catch (err) {
            // if entry exists but cannot be incremented, abort
            if (err.message && err.message.includes('Slot indisponibil')) throw err;
        }

        if (!entryUpdated) {
            // fallback to legacy CalendarPrestator array
            const cal = await CalendarPrestator.findOne({ prestatorId }).session(session);
            if (!cal) throw new Error('Calendar inexistent pentru prestator.');
            const idx = (cal.slots || []).findIndex((s) => s.date === dataLivrare && s.time === oraLivrare);
            if (idx === -1) throw new Error('Slot indisponibil.');
            const slot = cal.slots[idx];
            if (Number(slot.used || 0) >= Number(slot.capacity || 0)) throw new Error('Slot epuizat.');

            cal.slots[idx].used = Number(slot.used || 0) + 1;
            await cal.save({ session });
        }

        // 2) Totaluri
        const items = normalizeItems(rawItems, produse);
        const subtotal = calcSubtotal(items);
        const taxaLivrare = metodaLivrare === "livrare" ? LIVRARE_FEE : 0;

        // 3) Creează comanda
        const [comanda] = await Comanda.create(
            [{
                clientId,
                items,
                subtotal,
                taxaLivrare,
                total: subtotal + taxaLivrare,
                metodaLivrare,
                adresaLivrare: metodaLivrare === "livrare" ? adresaLivrare : undefined,
                dataLivrare,
                oraLivrare,
                prestatorId,
                note,
                preferinte,
                imagineGenerata,
                status: "in_asteptare",
            }],
            { session }
        );

        await session.commitTransaction();
        res.status(201).json(comanda);
    } catch (e) {
        await session.abortTransaction();
        console.error("creeaza-cu-slot error:", e);
        res.status(400).json({ message: e.message });
    } finally {
        session.endSession();
    }
});

/* ===================== 3) LISTĂRI ===================== */
/**
 * GET /api/comenzi
 * — întoarce ÎMPREUNĂ Comanda + Rezervare în format comun pentru AdminCalendar.jsx
 */
router.get("/", async (_req, res) => {
    try {
        const [comenzi, rezervari] = await Promise.all([
            Comanda.find({}).lean(),
            Rezervare.find({}).lean(),
        ]);

        const mapped = [
            ...comenzi.map(mapComandaToAdmin),
            ...rezervari.map(mapRezervareToComanda),
        ];

        mapped.sort((a, b) => {
            const ka = String(a.dataLivrare || "") + String(a.oraLivrare || "");
            const kb = String(b.dataLivrare || "") + String(b.oraLivrare || "");
            return ka.localeCompare(kb);
        });

        res.json(mapped);
    } catch (e) {
        console.error("Listare comenzi:", e);
        res.status(500).json({ message: e.message });
    }
});

/**
 * GET /api/comenzi/client/:clientId (doar din Comanda, cum aveai)
 */
router.get("/client/:clientId", async (req, res) => {
    try {
        const comenzi = await Comanda.find({ clientId: req.params.clientId }).sort({ createdAt: -1 });
        res.json(comenzi.map((c) => ({
            _id: c._id,
            dataLivrare: c.dataLivrare,
            oraLivrare: c.oraLivrare,
            items: c.items,
            metodaLivrare: c.metodaLivrare,
            adresaLivrare: c.adresaLivrare,
            status: c.status,
            subtotal: c.subtotal,
            taxaLivrare: c.taxaLivrare,
            total: c.total,
        })));
    } catch (err) {
        console.error("Eroare la preluarea comenzilor clientului:", err);
        res.status(500).json({ message: "Eroare server." });
    }
});

/**
 * GET /api/comenzi/admin?date=YYYY-MM-DD  (rămâne pe Comanda)
 */
router.get("/admin", async (req, res) => {
    try {
        const { date } = req.query;
        const filter = date ? { dataLivrare: date } : {};
        const comenzi = await Comanda.find(filter).lean();
        res.json(comenzi);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/* ===================== 4) STATUS UPDATE (ID HIBRID) ===================== */
/**
 * PATCH /api/comenzi/:id/status
 * Body: { status: "predat_curierului"|"ridicat_client"|"livrata"|"anulata"|... }
 * — pentru Comanda: setează direct `status`
 * — pentru Rezervare: mapează la `handoffStatus` + `status`
 */
router.patch("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const nou = req.body?.status;
        if (!nou) return res.status(400).json({ message: "Câmpul 'status' este obligatoriu." });

        // încearcă Comanda
        let doc = await Comanda.findById(id);
        if (doc) {
            doc.status = nou;
            await doc.save();
            return res.json({ ok: true, _source: "comanda" });
        }

        // încearcă Rezervare
        const update = {};
        switch (nou) {
            case "predat_curierului":
                update.handoffStatus = "to_courier";
                update.status = "confirmed";
                break;
            case "ridicat_client":
                update.handoffStatus = "picked_up";
                update.status = "confirmed";
                break;
            case "livrata":
                update.handoffStatus = "delivered";
                update.status = "confirmed";
                break;
            case "anulata":
                update.status = "cancelled";
                break;
            default:
                // pentru orice alt text setăm doar status (compatibil cu Rezervare)
                update.status = nou;
                break;
        }

        doc = await Rezervare.findByIdAndUpdate(id, { $set: update }, { new: true });
        if (!doc) return res.status(404).json({ message: "Comanda/Rezervarea nu a fost găsită." });

        res.json({ ok: true, _source: "rezervare" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Eroare la actualizare status." });
    }
});

// alias compatibil vechiului format
router.patch("/:comandaId/status", async (req, res, next) => {
    req.params.id = req.params.comandaId;
    return router.handle(req, res, next);
});
// în backend/routes/comenzi.js (unde ai celelalte rute)
router.get("/:id", async (req, res) => {
    try {
        const c = await Comanda.findById(req.params.id).lean();
        if (!c) return res.status(404).json({ message: "Comandă inexistentă" });
        res.json(c);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

/* ===================== 5) EXPORT CSV (din Comanda) ===================== */
/**
 * GET /api/comenzi/export/csv?from=YYYY-MM-DD&to=YYYY-MM-DD&status=...
 */
router.get("/export/csv", async (req, res) => {
    try {
        const { from, to, status } = req.query;
        const q = {};
        if (from || to) {
            q.dataLivrare = {};
            if (from) q.dataLivrare.$gte = from;
            if (to) q.dataLivrare.$lte = to;
        }
        if (status) q.status = status;

        const comenzi = await Comanda.find(q)
            // .populate("clientId", "nume prenume email telefon") // activează dacă ai model
            .lean();

        const rows = comenzi.map((c) => ({
            "ID Comandă": c._id?.toString(),
            "Data Livrare": c.dataLivrare || "",
            "Ora Livrare": c.oraLivrare || "",
            "Client": c.clientId?.toString?.() || c.clientId || "",
            "Email Client": c.clientEmail || "",
            "Telefon Client": c.clientTelefon || "",
            "Metoda Livrare": c.metodaLivrare || "",
            "Adresa Livrare": c.adresaLivrare || "",
            "Status": c.status || "",
            "Produse": (c.items || []).map((p) => `${p.name} x${p.qty || 1}`).join(" | "),
            "Subtotal": Number(c.subtotal || 0).toFixed(2),
            "Taxă Livrare": Number(c.taxaLivrare || 0).toFixed(2),
            "Total": Number(c.total || 0).toFixed(2),
            "Creat la": c.createdAt ? new Date(c.createdAt).toISOString() : "",
        }));

        const parser = new Parser({ withBOM: true });
        const csv = parser.parse(rows);

        const fileName = `comenzi_${from || "all"}_${to || "all"}${status ? "_" + status : ""}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.status(200).send(csv);
    } catch (err) {
        console.error("Eroare la export CSV:", err);
        res.status(500).json({ message: "Eroare server la export CSV." });
    }
});
// PATCH /api/comenzi/:id/cancel – anulează comanda și eliberează slotul (used−1) din CalendarSlotEntry + fallback legacy
router.patch("/:id/cancel", async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await Comanda.findById(id);
        if (!doc) return res.status(404).json({ message: "Comanda nu există" });

        // dacă deja anulată, returnează
        if (doc.status === "anulata" || doc.status === "cancelled") {
            return res.json({ ok: true, status: doc.status });
        }

        // marchează anulată
        doc.status = "anulata";
        await doc.save();

        // dacă are data/ora și prestator => decrementăm used în CalendarSlotEntry (preferred) sau legacy CalendarPrestator
        if (doc.dataLivrare && doc.oraLivrare && doc.prestatorId) {
            try {
                // Încearcă CalendarSlotEntry (preferred)
                const CalendarSlotEntry = require("../models/CalendarSlotEntry");
                const entry = await CalendarSlotEntry.findOne({
                    prestatorId: doc.prestatorId,
                    date: doc.dataLivrare,
                    time: doc.oraLivrare
                });
                if (entry && entry.used > 0) {
                    await CalendarSlotEntry.updateOne(
                        { _id: entry._id, used: { $gt: 0 } },
                        { $inc: { used: -1 } }
                    );
                } else {
                    // Fallback: legacy CalendarPrestator array
                    try {
                        const CalendarPrestator = require("../models/CalendarPrestator");
                        const cal = await CalendarPrestator.findOne({ prestatorId: doc.prestatorId });
                        if (cal && Array.isArray(cal.slots)) {
                            const idx = cal.slots.findIndex(
                                s => s.date === doc.dataLivrare && s.time === doc.oraLivrare
                            );
                            if (idx !== -1) {
                                cal.slots[idx].used = Math.max(0, Number(cal.slots[idx].used || 0) - 1);
                                await cal.save();
                            }
                        }
                    } catch (legacyErr) {
                        console.warn('[comanda cancel] legacy eliberare slot warning:', legacyErr?.message || legacyErr);
                    }
                }
            } catch (err) {
                console.warn('[comanda cancel] eliberare slot warning:', err?.message || err);
            }
        }

        res.json({ ok: true, status: doc.status });
    } catch (e) {
        console.error("cancel comanda error:", e);
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;
