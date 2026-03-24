const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { Parser } = require("json2csv");
const { authRequired, roleCheck } = require("../middleware/auth");

// MODELE
const Comanda = require("../models/Comanda");
const Rezervare = require("../models/Rezervare");
const CalendarPrestator = require("../models/CalendarPrestator");
const CalendarDayCapacity = require("../models/CalendarDayCapacity");
const Tort = require("../models/Tort");
const {
    notifyUser,
    notifyAdmins,
    notifyProviderById,
} = require("../utils/notifications");
const { recordAuditLog } = require("../utils/audit");
const { adminMutationLimiter } = require("../middleware/rateLimiters");
const Utilizator = require("../models/Utilizator");
const {
    applyScopedPrestatorFilter,
    getScopedPrestatorId,
    hasScopedPrestatorAccess,
} = require("../utils/providerScope");
const { resolveProviderForRequest } = require("../utils/providerDirectory");
const { isStaffRole, normalizeUserRole } = require("../utils/roles");
// const Utilizator = require("../models/Utilizator"); // folosește dacă vrei populate

const LIVRARE_FEE = 100;
const MIN_LEAD_HOURS = Number(process.env.MIN_LEAD_HOURS || 24);
const GENERIC_SERVER_MESSAGE = "Eroare server.";

function getAuthUserId(req) {
    return String(req.user?.id || req.user?._id || "");
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

function normalizeAttachments(attachments) {
    if (!Array.isArray(attachments)) return [];

    return attachments
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
            url: String(item.url || "").trim(),
            name: String(item.name || "").trim().slice(0, 255),
        }))
        .filter((item) => item.url)
        .slice(0, 5);
}

function getPublicOrderError(error) {
    const message = String(error?.message || "").trim();
    const safePatterns = [
        /^Utilizator neautentificat/i,
        /^dataLivrare/i,
        /^Alege un interval/i,
        /^Capacitatea zilei/i,
        /^Slot /i,
        /^Calendar inexistent/i,
        /^Comanda trebuie/i,
        /^Unul sau mai multe produse/i,
        /^Produsele selectate apartin/i,
        /^Comanda trebuie sa contina produse de la un singur prestator/i,
        /^Nu am putut determina prestatorul/i,
    ];

    if (safePatterns.some((pattern) => pattern.test(message))) {
        return { status: 400, message };
    }

    return { status: 500, message: GENERIC_SERVER_MESSAGE };
}

function buildReservationTimeSlot(time = "") {
    const [h, m] = String(time || "00:00").split(":").map(Number);
    const endH = String((Number.isFinite(h) ? h : 0) + 1).padStart(2, "0");
    const endM = String(Number.isFinite(m) ? m : 0).padStart(2, "0");
    return `${String(time || "00:00")}-${endH}:${endM}`;
}

function normalizeHandoffMethod(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "livrare" || normalized === "delivery" || normalized === "courier") {
        return "delivery";
    }
    return "pickup";
}

function mapOrderStatusToReservationStatus(status) {
    const normalized = String(status || "").trim().toLowerCase();
    if (["anulata", "cancelled", "canceled", "refuzata"].includes(normalized)) {
        return "canceled";
    }
    if (["livrata", "ridicata", "ridicat_client", "completed"].includes(normalized)) {
        return "completed";
    }
    if (
        [
            "acceptata",
            "confirmata",
            "in_lucru",
            "gata",
            "confirmed",
            "processing",
        ].includes(normalized)
    ) {
        return "confirmed";
    }
    return "pending";
}

function mapOrderToHandoffStatus(comanda) {
    const direct = String(comanda?.handoffStatus || "").trim();
    if (direct) return direct;

    const normalizedStatus = String(comanda?.status || "").trim().toLowerCase();
    const handoffMethod = normalizeHandoffMethod(comanda?.metodaLivrare);

    if (["anulata", "cancelled", "canceled", "refuzata"].includes(normalizedStatus)) {
        return "canceled";
    }
    if (normalizedStatus === "predat_curierului") {
        return "out_for_delivery";
    }
    if (["livrata", "delivered"].includes(normalizedStatus)) {
        return "delivered";
    }
    if (
        ["ridicata", "ridicat_client", "picked_up"].includes(normalizedStatus) &&
        handoffMethod === "pickup"
    ) {
        return "picked_up";
    }
    return "scheduled";
}

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

function isBeforeMinLead(dateStr, timeStr, requiredLeadHours = MIN_LEAD_HOURS) {
    if (!dateStr || !timeStr) return false;
    const [h, m] = String(timeStr).split(":").map(Number);
    const target = new Date(`${dateStr}T00:00:00`);
    target.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    const min = new Date();
    min.setHours(min.getHours() + Number(requiredLeadHours || MIN_LEAD_HOURS));
    return target < min;
}

async function buildPricedOrder(items = [], options = {}) {
    const { allowManualPricing = false } = options;
    if (!Array.isArray(items) || items.length === 0) {
        return { items: [], subtotal: 0, leadHours: MIN_LEAD_HOURS };
    }

    const normalized = items.map((item) => ({
        ...item,
        productId: String(item?.productId || item?.tortId || "").trim(),
        qty: Math.max(1, Number(item?.qty || item?.cantitate || 1)),
    }));

    const ids = normalized
        .map((item) => item.productId)
        .filter((value) => mongoose.Types.ObjectId.isValid(value));
    const torts = ids.length
        ? await Tort.find(
            { _id: { $in: ids }, activ: { $ne: false } },
            { nume: 1, pret: 1, timpPreparareOre: 1, prestatorId: 1 }
        ).lean()
        : [];
    const tortMap = new Map(torts.map((item) => [String(item._id), item]));

    const pricedItems = normalized.map((item) => {
        const tort = tortMap.get(item.productId);
        if (!tort && !allowManualPricing) {
            return null;
        }

        const fallbackPrice = Math.max(0, Number(item.price || item.pret || 0));
        const price = tort ? Math.max(0, Number(tort.pret || 0)) : fallbackPrice;
        const prepHours = tort ? Math.max(0, Number(tort.timpPreparareOre || 0)) : 0;
        const name = tort?.nume || item.name || item.nume || "Produs";
        const providerId = normalizePrestatorId(
            tort?.prestatorId || item.prestatorId || item.providerId || ""
        );

        return {
            productId: item.productId || undefined,
            tortId: item.tortId || item.productId || undefined,
            prestatorId: providerId || undefined,
            name,
            nume: name,
            qty: item.qty,
            cantitate: item.qty,
            price,
            pret: price,
            lineTotal: price * item.qty,
            personalizari:
                item.personalizari && typeof item.personalizari === "object"
                    ? item.personalizari
                    : undefined,
            prepHours,
        };
    });

    if (!allowManualPricing && pricedItems.some((item) => !item)) {
        throw new Error("Unul sau mai multe produse nu mai sunt disponibile.");
    }

    const sanitizedItems = pricedItems.filter(Boolean);
    if (!allowManualPricing && sanitizedItems.some((item) => Number(item.price || 0) <= 0)) {
        throw new Error("Unul sau mai multe produse necesita confirmare manuala de pret.");
    }

    return {
        items: sanitizedItems,
        subtotal: sanitizedItems.reduce(
            (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
            0
        ),
        leadHours: Math.max(
            MIN_LEAD_HOURS,
            ...sanitizedItems.map((item) => Number(item.prepHours || 0))
        ),
        providerIds: Array.from(
            new Set(
                sanitizedItems
                    .map((item) => normalizePrestatorId(item.prestatorId))
                    .filter(Boolean)
            )
        ),
    };
}

async function resolveOrderPrestatorId(req, rawPrestatorId, pricedOrder) {
    const explicitPrestatorId = normalizePrestatorId(rawPrestatorId);
    const providerIds = Array.isArray(pricedOrder?.providerIds)
        ? pricedOrder.providerIds.filter(Boolean)
        : [];

    if (providerIds.length > 1) {
        throw new Error("Comanda trebuie sa contina produse de la un singur prestator.");
    }

    let prestatorId = explicitPrestatorId
        ? normalizePrestatorId(await resolveProviderForRequest(req, explicitPrestatorId))
        : "";
    const itemsPrestatorId = providerIds[0] || "";

    if (prestatorId && itemsPrestatorId && prestatorId !== itemsPrestatorId) {
        throw new Error("Produsele selectate apartin altui prestator.");
    }

    if (!prestatorId) {
        prestatorId = itemsPrestatorId;
    }

    if (!prestatorId) {
        prestatorId = normalizePrestatorId(await resolveProviderForRequest(req, rawPrestatorId));
    }

    return prestatorId;
}

async function isDayCapacityFull(prestatorId, dateStr) {
    const dayCap = await CalendarDayCapacity.findOne({ prestatorId, date: dateStr }).lean();
    if (!dayCap || dayCap.capacity == null) return false;
    const CalendarSlotEntry = require("../models/CalendarSlotEntry");
    const usedAgg = await CalendarSlotEntry.aggregate([
        { $match: { prestatorId, date: dateStr } },
        { $group: { _id: null, used: { $sum: "$used" } } },
    ]);
    const used = usedAgg[0]?.used || 0;
    return used >= Number(dayCap.capacity || 0);
}

let supportsMongoTransactionsCache = null;

async function supportsMongoTransactions() {
    if (supportsMongoTransactionsCache != null) {
        return supportsMongoTransactionsCache;
    }

    try {
        const client = mongoose.connection.getClient
            ? mongoose.connection.getClient()
            : mongoose.connection.client;

        if (!client) {
            supportsMongoTransactionsCache = false;
            return supportsMongoTransactionsCache;
        }

        const hello = await client.db().admin().command({ hello: 1 });
        supportsMongoTransactionsCache = Boolean(
            hello?.setName || hello?.msg === "isdbgrid"
        );
    } catch {
        supportsMongoTransactionsCache = false;
    }

    return supportsMongoTransactionsCache;
}

function applySession(query, session) {
    return session ? query.session(session) : query;
}

async function reserveSlotForOrder({ prestatorId, dataLivrare, oraLivrare, session }) {
    const CalendarSlotEntry = require("../models/CalendarSlotEntry");
    const entry = await applySession(
        CalendarSlotEntry.findOne({
            prestatorId,
            date: dataLivrare,
            time: oraLivrare,
        }),
        session
    );

    if (entry) {
        const upd = await applySession(
            CalendarSlotEntry.updateOne(
                { _id: entry._id, used: { $lt: entry.capacity } },
                { $inc: { used: 1 } }
            ),
            session
        );

        if (!upd || upd.modifiedCount === 0) {
            throw new Error("Slot indisponibil.");
        }

        return {
            source: "entry",
            prestatorId,
            dataLivrare,
            oraLivrare,
        };
    }

    const cal = await applySession(
        CalendarPrestator.findOne({ prestatorId }),
        session
    );
    if (!cal) throw new Error("Calendar inexistent pentru prestator.");

    const idx = (cal.slots || []).findIndex(
        (slot) => slot.date === dataLivrare && slot.time === oraLivrare
    );
    if (idx === -1) throw new Error("Slot indisponibil.");

    const slot = cal.slots[idx];
    if (Number(slot.used || 0) >= Number(slot.capacity || 0)) {
        throw new Error("Slot epuizat.");
    }

    cal.slots[idx].used = Number(slot.used || 0) + 1;
    await cal.save(session ? { session } : undefined);

    return {
        source: "legacy",
        prestatorId,
        dataLivrare,
        oraLivrare,
    };
}

async function releaseReservedSlot({ source, prestatorId, dataLivrare, oraLivrare }) {
    if (source === "entry") {
        const CalendarSlotEntry = require("../models/CalendarSlotEntry");
        const entry = await CalendarSlotEntry.findOne({
            prestatorId,
            date: dataLivrare,
            time: oraLivrare,
        });

        if (entry && entry.used > 0) {
            await CalendarSlotEntry.updateOne(
                { _id: entry._id, used: { $gt: 0 } },
                { $inc: { used: -1 } }
            );
            return;
        }
    }

    const cal = await CalendarPrestator.findOne({ prestatorId });
    if (!cal) return;

    const idx = (cal.slots || []).findIndex(
        (slot) => slot.date === dataLivrare && slot.time === oraLivrare
    );
    if (idx === -1) return;

    cal.slots[idx].used = Math.max(0, Number(cal.slots[idx].used || 0) - 1);
    await cal.save();
}

async function syncReservationFromOrder(comanda) {
    if (!comanda?._id) return null;

    const prestatorId = normalizePrestatorId(comanda.prestatorId);
    const date = String(comanda.dataLivrare || comanda.dataRezervare || "").trim();
    const time = String(
        comanda.oraLivrare || comanda.oraRezervare || comanda.calendarSlot?.time || ""
    ).trim();

    if (!prestatorId || !date || !time) {
        await Rezervare.deleteOne({ comandaId: comanda._id });
        return null;
    }

    const handoffMethod = normalizeHandoffMethod(comanda.metodaLivrare);
    const update = {
        clientId: String(comanda.clientId || ""),
        prestatorId,
        comandaId: comanda._id,
        tortId: comanda.tortId || undefined,
        customDetails: comanda.customDetails || undefined,
        date,
        timeSlot: buildReservationTimeSlot(time),
        handoffMethod,
        deliveryFee: Number(comanda.taxaLivrare || comanda.deliveryFee || 0),
        deliveryAddress:
            handoffMethod === "delivery" ? String(comanda.adresaLivrare || "").trim() : "",
        deliveryInstructions: String(comanda.deliveryInstructions || "").trim(),
        deliveryWindow: String(comanda.deliveryWindow || "").trim(),
        subtotal: Number(comanda.subtotal || 0),
        total: Number(comanda.totalFinal ?? comanda.total ?? 0),
        paymentStatus: String(comanda.paymentStatus || comanda.statusPlata || "unpaid"),
        status: mapOrderStatusToReservationStatus(comanda.status),
        handoffStatus: mapOrderToHandoffStatus(comanda),
        notes:
            String(comanda.notesClient || comanda.preferinte || "").trim() ||
            String(comanda.notesAdmin || "").trim(),
    };

    return Rezervare.findOneAndUpdate(
        { comandaId: comanda._id },
        { $set: update },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
}

/* ---------------------- Helpers Rezervare -> Admin view ---------------------- */
function startHour(ts = "") {
    const [start] = String(ts).split("-");
    return start || "";
}
function mapRezervareToComanda(r, userMap = new Map()) {
    const user = userMap.get(String(r.clientId)) || {};
    return {
        _id: r._id,
        numeroComanda: r.numeroComanda,
        // pentru AdminCalendar, coloana "Client" — poți popula ulterior numele
        clientId: r.clientId,
        clientName: user.name || user.nume || "",
        clientEmail: user.email || "",
        clientTelefon: user.telefon || "",
        dataLivrare: r.date,
        oraLivrare: startHour(r.timeSlot),
        metodaLivrare: r.handoffMethod === "delivery" ? "livrare" : "ridicare" /* align cu Comanda */,
        adresaLivrare: r.deliveryAddress || "",
        deliveryInstructions: r.deliveryInstructions || "",
        deliveryWindow: r.deliveryWindow || "",
        items: [], // poți pune rezumat produse dacă le salvezi pe Rezervare
        status: r.status,              // "pending" | "confirmed" | "cancelled"
        handoffStatus: r.handoffStatus, // "scheduled" | "to_courier" | "to_pickup" | "delivered" | "picked_up"
        subtotal: r.subtotal,
        taxaLivrare: r.deliveryFee || 0,
        total: r.total,
        notesClient: r.notes || "",
        paymentStatus: r.paymentStatus || "",
        _source: "rezervare",
    };
}
function mapComandaToAdmin(c, userMap = new Map()) {
    const user = userMap.get(String(c.clientId)) || {};
    return {
        _id: c._id,
        clientId: c.clientId,
        clientName: user.name || user.nume || "",
        clientEmail: user.email || "",
        clientTelefon: user.telefon || "",
        numeroComanda: c.numeroComanda,
        dataLivrare: c.dataLivrare,
        oraLivrare: c.oraLivrare,
        metodaLivrare: c.metodaLivrare, // "livrare" | "ridicare"
        adresaLivrare: c.adresaLivrare || "",
        deliveryInstructions: c.deliveryInstructions || "",
        deliveryWindow: c.deliveryWindow || "",
        attachments: Array.isArray(c.attachments) ? c.attachments : [],
        items: c.items || [],
        status: c.status,
        handoffStatus: c.handoffStatus, // dacă ai în model
        subtotal: c.subtotal,
        taxaLivrare: c.taxaLivrare || 0,
        total: c.total,
        totalFinal: c.totalFinal,
        preferinte: c.preferinte || "",
        customDetails: c.customDetails || null,
        notesClient: c.notesClient || "",
        notesAdmin: c.notesAdmin || "",
        paymentStatus: c.paymentStatus || "",
        statusPlata: c.statusPlata || "",
        _source: "comanda",
    };
}

/* ===================== 1) COMENZI — CREARE SIMPLĂ ===================== */
/**
 * POST /api/comenzi
 */
router.post("/", authRequired, async (req, res) => {
    try {
        const {
            clientId: requestedClientId,
            items: rawItems,
            produse,
            metodaLivrare = "ridicare",
            adresaLivrare,
            dataLivrare,
            oraLivrare,
            prestatorId: rawPrestatorId,
            note,
            preferinte,
            imagineGenerata,
            deliveryInstructions,
            deliveryWindow,
            attachments,
        } = req.body;
        let prestatorId = "";

        const role = req.user?.rol || req.user?.role;
        const isStaff = isStaffRole(role);
        const authUserId = getAuthUserId(req);
        const scopedPrestatorId = getScopedPrestatorId(req);
        const effectiveClientId =
            isStaff && requestedClientId ? String(requestedClientId) : authUserId;

        if (!effectiveClientId) {
            return res.status(401).json({ message: "Utilizator neautentificat." });
        }
        if (!isStaff && requestedClientId && String(requestedClientId) !== authUserId) {
            return res.status(403).json({ message: "Nu poti crea comenzi pentru alt client." });
        }
        if (!["ridicare", "livrare"].includes(String(metodaLivrare || "").trim())) {
            return res.status(400).json({
                message: "metodaLivrare trebuie sa fie ridicare sau livrare.",
            });
        }
        if (metodaLivrare === "livrare" && !String(adresaLivrare || "").trim()) {
            return res.status(400).json({
                message: "Adresa de livrare este obligatorie pentru aceasta comanda.",
            });
        }
        if (!isValidDeliveryWindow(deliveryWindow)) {
            return res.status(400).json({
                message:
                    "Intervalul de livrare este invalid. Foloseste formatul HH:mm sau HH:mm-HH:mm.",
            });
        }
        const items = normalizeItems(rawItems, produse);
        if (!items.length) {
            return res.status(400).json({ message: "Comanda trebuie sa contina cel putin un produs." });
        }
        const pricedOrder = await buildPricedOrder(items, {
            allowManualPricing: isStaff,
        });
        prestatorId = await resolveOrderPrestatorId(req, rawPrestatorId, pricedOrder);
        if (scopedPrestatorId) {
            if (prestatorId && prestatorId !== scopedPrestatorId) {
                return res.status(403).json({ message: "Acces interzis pentru acest prestator." });
            }
            prestatorId = prestatorId || scopedPrestatorId;
        }
        if ((dataLivrare || oraLivrare) && !prestatorId) {
            return res.status(400).json({
                message: "Nu am putut determina prestatorul pentru comanda programata.",
            });
        }
        if (
            dataLivrare &&
            oraLivrare &&
            isBeforeMinLead(dataLivrare, oraLivrare, pricedOrder.leadHours)
        ) {
            return res.status(400).json({
                message: `Alege un interval cu minim ${pricedOrder.leadHours} ore inainte.`,
            });
        }

        const subtotal = pricedOrder.subtotal;
        const taxaLivrare = metodaLivrare === "livrare" ? LIVRARE_FEE : 0;
        const safeAttachments = normalizeAttachments(attachments);

        const comanda = await Comanda.create({
            clientId: effectiveClientId,
            items: pricedOrder.items,
            subtotal,
            taxaLivrare,
            deliveryFee: taxaLivrare,
            total: subtotal + taxaLivrare,
            totalFinal: subtotal + taxaLivrare,
            metodaLivrare,
            adresaLivrare: metodaLivrare === "livrare" ? adresaLivrare : undefined,
            deliveryInstructions: deliveryInstructions || "",
            deliveryWindow: deliveryWindow || "",
            attachments: safeAttachments,
            dataLivrare,
            oraLivrare,
            prestatorId: prestatorId || undefined,
            note,
            preferinte,
            imagineGenerata,
            handoffMethod: normalizeHandoffMethod(metodaLivrare),
            handoffStatus: "scheduled",
            notesClient: note || "",
            status: "plasata",
            statusHistory: [{ status: "plasata", note: "Comanda creata" }],
        });
        await syncReservationFromOrder(comanda);

        await notifyUser(effectiveClientId, {
            titlu: "Comanda primita",
            mesaj: `Comanda #${comanda.numeroComanda || comanda._id} a fost inregistrata.`,
            tip: "comanda",
            link: `/plata?comandaId=${comanda._id}`,
            prestatorId,
            actorId: prestatorId,
            actorRole: "patiser",
            meta: { comandaId: String(comanda._id) },
        });
        await notifyProviderById(prestatorId, {
            titlu: "Comanda noua",
            mesaj: `Ai primit comanda #${comanda.numeroComanda || comanda._id}.`,
            tip: "comanda",
            link: "/admin/comenzi",
            prestatorId,
            actorId: effectiveClientId,
            actorRole: normalizeUserRole(role),
            meta: { comandaId: String(comanda._id) },
        });
        await notifyAdmins({
            titlu: "Comanda noua",
            mesaj: `Comanda #${comanda.numeroComanda || comanda._id} a fost plasata.`,
            tip: "comanda",
            link: "/admin/comenzi",
            prestatorId,
            actorId: effectiveClientId,
            actorRole: normalizeUserRole(role),
            meta: { comandaId: String(comanda._id) },
        });

        res.status(201).json(comanda);
    } catch (e) {
        console.error("Eroare creare comanda:", e);
        const publicError = getPublicOrderError(e);
        res.status(publicError.status).json({ message: publicError.message });
    }
});

/* ===================== 2) COMENZI — CREARE CU SLOT ===================== */
/**
 * POST /api/comenzi/creeaza-cu-slot
 * Body: { clientId, items|produse, metodaLivrare, adresaLivrare?, dataLivrare, oraLivrare, prestatorId }
 */
router.post("/creeaza-cu-slot", authRequired, async (req, res) => {
    let session = null;
    let transactionStarted = false;
    let reservedSlot = null;
    try {
        const {
            clientId: requestedClientId,
            items: rawItems,
            produse,
            metodaLivrare = "ridicare",
            adresaLivrare,
            dataLivrare,
            oraLivrare,
            prestatorId: rawPrestatorId,
            note,
            preferinte,
            imagineGenerata,
            deliveryInstructions,
            deliveryWindow,
            attachments,
        } = req.body;
        let prestatorId = "";

        const role = req.user?.rol || req.user?.role;
        const isStaff = isStaffRole(role);
        const authUserId = getAuthUserId(req);
        const scopedPrestatorId = getScopedPrestatorId(req);
        const effectiveClientId =
            isStaff && requestedClientId ? String(requestedClientId) : authUserId;

        if (!effectiveClientId) throw new Error("Utilizator neautentificat.");
        if (!isStaff && requestedClientId && String(requestedClientId) !== authUserId) {
            return res.status(403).json({ message: "Nu poti crea comenzi pentru alt client." });
        }
        if (!dataLivrare || !oraLivrare) throw new Error("dataLivrare și oraLivrare sunt obligatorii.");
        if (!["ridicare", "livrare"].includes(String(metodaLivrare || "").trim())) {
            return res.status(400).json({
                message: "metodaLivrare trebuie sa fie ridicare sau livrare.",
            });
        }
        if (metodaLivrare === "livrare" && !String(adresaLivrare || "").trim()) {
            return res.status(400).json({
                message: "Adresa de livrare este obligatorie pentru aceasta comanda.",
            });
        }
        if (!isValidDeliveryWindow(deliveryWindow)) {
            return res.status(400).json({
                message:
                    "Intervalul de livrare este invalid. Foloseste formatul HH:mm sau HH:mm-HH:mm.",
            });
        }
        const items = normalizeItems(rawItems, produse);
        if (!items.length) {
            return res.status(400).json({ message: "Comanda trebuie sa contina cel putin un produs." });
        }
        const pricedOrder = await buildPricedOrder(items, {
            allowManualPricing: isStaff,
        });
        prestatorId = await resolveOrderPrestatorId(req, rawPrestatorId, pricedOrder);
        if (scopedPrestatorId) {
            if (prestatorId && prestatorId !== scopedPrestatorId) {
                return res.status(403).json({ message: "Acces interzis pentru acest prestator." });
            }
            prestatorId = prestatorId || scopedPrestatorId;
        }
        if (!prestatorId) {
            return res.status(400).json({
                message: "Nu am putut determina prestatorul pentru comanda cu slot.",
            });
        }
        if (isBeforeMinLead(dataLivrare, oraLivrare, pricedOrder.leadHours)) {
            throw new Error(`Alege un interval cu minim ${pricedOrder.leadHours} ore inainte.`);
        }
        if (await isDayCapacityFull(prestatorId, dataLivrare)) {
            throw new Error("Capacitatea zilei este atinsa. Alege alta data.");
        }

        // 1) Blochează slotul — preferăm CalendarSlotEntry (atomic), fallback la CalendarPrestator
        if (await supportsMongoTransactions()) {
            session = await mongoose.startSession();
            session.startTransaction();
            transactionStarted = true;
        }

        // Checkout-ul din cos trebuie sa functioneze si pe Mongo standalone.
        reservedSlot = await reserveSlotForOrder({
            prestatorId,
            dataLivrare,
            oraLivrare,
            session,
        });

        // 2) Totaluri
        const subtotal = pricedOrder.subtotal;
        const taxaLivrare = metodaLivrare === "livrare" ? LIVRARE_FEE : 0;
        const safeAttachments = normalizeAttachments(attachments);

        // 3) Creează comanda
        const comandaPayload = {
            clientId: effectiveClientId,
            items: pricedOrder.items,
            subtotal,
            taxaLivrare,
            deliveryFee: taxaLivrare,
            total: subtotal + taxaLivrare,
            totalFinal: subtotal + taxaLivrare,
            metodaLivrare,
            adresaLivrare: metodaLivrare === "livrare" ? adresaLivrare : undefined,
            deliveryInstructions: deliveryInstructions || "",
            deliveryWindow: deliveryWindow || "",
            attachments: safeAttachments,
            dataLivrare,
            oraLivrare,
            prestatorId,
            note,
            preferinte,
            imagineGenerata,
            handoffMethod: normalizeHandoffMethod(metodaLivrare),
            handoffStatus: "scheduled",
            notesClient: note || "",
            status: "in_asteptare",
            statusHistory: [{ status: "in_asteptare", note: "Comanda creata cu slot" }],
        };

        let comanda;
        if (session) {
            [comanda] = await Comanda.create([comandaPayload], { session });
            await session.commitTransaction();
        } else {
            comanda = await Comanda.create(comandaPayload);
        }

        reservedSlot = null;
        await syncReservationFromOrder(comanda);
        await notifyUser(effectiveClientId, {
            titlu: "Comanda primita",
            mesaj: `Comanda #${comanda.numeroComanda || comanda._id} a fost inregistrata.`,
            tip: "comanda",
            link: `/plata?comandaId=${comanda._id}`,
            prestatorId,
            actorId: prestatorId,
            actorRole: "patiser",
            meta: { comandaId: String(comanda._id) },
        });
        await notifyProviderById(prestatorId, {
            titlu: "Comanda noua",
            mesaj: `Ai primit comanda #${comanda.numeroComanda || comanda._id}.`,
            tip: "comanda",
            link: "/admin/comenzi",
            prestatorId,
            actorId: effectiveClientId,
            actorRole: normalizeUserRole(role),
            meta: { comandaId: String(comanda._id) },
        });
        await notifyAdmins({
            titlu: "Comanda noua",
            mesaj: `Comanda #${comanda.numeroComanda || comanda._id} a fost plasata.`,
            tip: "comanda",
            link: "/admin/comenzi",
            prestatorId,
            actorId: effectiveClientId,
            actorRole: normalizeUserRole(role),
            meta: { comandaId: String(comanda._id) },
        });
        res.status(201).json(comanda);
    } catch (e) {
        if (transactionStarted && session) {
            try {
                await session.abortTransaction();
            } catch {
                // ignore abort errors during cleanup
            }
        } else if (reservedSlot) {
            try {
                await releaseReservedSlot(reservedSlot);
            } catch (rollbackErr) {
                console.warn("creeaza-cu-slot rollback warning:", rollbackErr?.message || rollbackErr);
            }
        }
        console.error("creeaza-cu-slot error:", e);
        const publicError = getPublicOrderError(e);
        res.status(publicError.status).json({ message: publicError.message });
    } finally {
        if (session) {
            session.endSession();
        }
    }
});

/* ===================== 3) LISTĂRI ===================== */
/**
 * GET /api/comenzi
 * — întoarce ÎMPREUNĂ Comanda + Rezervare în format comun pentru AdminCalendar.jsx
 */
router.get("/", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
    try {
        const scopedFilter = applyScopedPrestatorFilter(req);
        const [comenzi, rezervari] = await Promise.all([
            Comanda.find(scopedFilter).lean(),
            Rezervare.find(scopedFilter).lean(),
        ]);

        const userIds = new Set();
        comenzi.forEach((c) => c.clientId && userIds.add(String(c.clientId)));
        rezervari.forEach((r) => r.clientId && userIds.add(String(r.clientId)));

        const userMap = new Map();
        if (userIds.size) {
            const users = await Utilizator.find(
                { _id: { $in: Array.from(userIds) } },
                { nume: 1, name: 1, email: 1, telefon: 1 }
            ).lean();
            users.forEach((u) =>
                userMap.set(String(u._id), {
                    name: u.nume || u.name || "Client",
                    email: u.email || "",
                    telefon: u.telefon || "",
                })
            );
        }

        const mapped = [
            ...comenzi.map((c) => mapComandaToAdmin(c, userMap)),
            ...rezervari.map((r) => mapRezervareToComanda(r, userMap)),
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
router.get("/client/:clientId", authRequired, async (req, res) => {
    try {
        const role = req.user?.rol || req.user?.role;
        const isStaff = isStaffRole(role);
        const authUserId = getAuthUserId(req);
        const requestedClientId = String(req.params.clientId || "");

        if (!isStaff && requestedClientId !== authUserId) {
            return res.status(403).json({ message: "Acces interzis la comenzile altui client." });
        }

        const clientId = isStaff ? requestedClientId : authUserId;
        const comenzi = await Comanda.find(
            applyScopedPrestatorFilter(req, { clientId })
        ).sort({ createdAt: -1 });
        res.json(comenzi.map((c) => ({
            _id: c._id,
            prestatorId: c.prestatorId || "",
            dataLivrare: c.dataLivrare,
            oraLivrare: c.oraLivrare,
            items: c.items,
            metodaLivrare: c.metodaLivrare,
            adresaLivrare: c.adresaLivrare,
            status: c.status,
            paymentStatus: c.paymentStatus || c.statusPlata || "",
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
router.get("/admin", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
    try {
        const { date } = req.query;
        const filter = applyScopedPrestatorFilter(req, date ? { dataLivrare: date } : {});
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
router.patch("/:id/status", authRequired, roleCheck("admin", "patiser"), adminMutationLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const nou = req.body?.status;
        if (!nou) return res.status(400).json({ message: "Câmpul 'status' este obligatoriu." });

        // încearcă Comanda
        let doc = await Comanda.findById(id);
        if (doc) {
            if (rejectOutsidePrestatorScope(req, res, doc.prestatorId)) {
                return;
            }
            const previousStatus = doc.status;
            const paid = doc.paymentStatus === "paid" || doc.statusPlata === "paid";
            const requiresPaid = ["acceptata", "in_lucru", "gata", "livrata", "ridicata", "confirmata"];
            if (!paid && requiresPaid.includes(nou)) {
                return res.status(409).json({ message: "Comanda poate fi confirmata doar dupa plata." });
            }
            doc.status = nou;
            doc.statusHistory = Array.isArray(doc.statusHistory)
                ? [...doc.statusHistory, { status: nou, note: req.body?.note || "" }]
                : [{ status: nou, note: req.body?.note || "" }];
            await doc.save();
            if (["anulata", "cancelled", "canceled", "refuzata"].includes(String(nou || "").toLowerCase())) {
                await releaseReservedSlot({
                    source: "entry",
                    prestatorId: doc.prestatorId,
                    dataLivrare: doc.dataLivrare || doc.dataRezervare,
                    oraLivrare: doc.oraLivrare || doc.oraRezervare,
                });
            }
            await syncReservationFromOrder(doc);

            await notifyUser(doc.clientId, {
                titlu: "Status comanda actualizat",
                mesaj: `Comanda #${doc.numeroComanda || doc._id} este acum: ${nou}.`,
                tip: "status",
                link: `/plata?comandaId=${doc._id}`,
                prestatorId: doc.prestatorId,
                actorId: req.user?._id || req.user?.id,
                actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
                meta: {
                    comandaId: String(doc._id),
                    previousStatus,
                    nextStatus: nou,
                },
            });
            await notifyProviderById(doc.prestatorId, {
                titlu: "Status comanda modificat",
                mesaj: `Comanda #${doc.numeroComanda || doc._id} este acum: ${nou}.`,
                tip: "status",
                link: "/admin/comenzi",
                prestatorId: doc.prestatorId,
                actorId: req.user?._id || req.user?.id,
                actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
                meta: {
                    comandaId: String(doc._id),
                    previousStatus,
                    nextStatus: nou,
                },
            });

            await recordAuditLog(req, {
                action: "order.status.updated",
                entityType: "comanda",
                entityId: doc._id,
                summary: `Status comanda actualizat la ${nou}`,
                metadata: {
                    previousStatus,
                    nextStatus: nou,
                    note: req.body?.note || "",
                },
            });

            return res.json({ ok: true, _source: "comanda" });
        }

        // încearcă Rezervare
        const update = {};
        switch (nou) {
            case "predat_curierului":
                update.handoffStatus = "out_for_delivery";
                update.status = "confirmed";
                break;
            case "ridicat_client":
                update.handoffStatus = "picked_up";
                update.status = "completed";
                break;
            case "livrata":
                update.handoffStatus = "delivered";
                update.status = "completed";
                break;
            case "anulata":
                update.handoffStatus = "canceled";
                update.status = "canceled";
                break;
            case "confirmata":
                update.status = "confirmed";
                break;
            default:
                // pentru orice alt text setăm doar status (compatibil cu Rezervare)
                update.status = nou;
                break;
        }

        doc = await Rezervare.findById(id);
        if (!doc) return res.status(404).json({ message: "Comanda/Rezervarea nu a fost găsită." });

        if (rejectOutsidePrestatorScope(req, res, doc.prestatorId)) {
            return;
        }
        doc.set(update);
        await doc.save();

        if (doc.comandaId) {
            const comanda = await Comanda.findById(doc.comandaId);
            if (comanda) {
                comanda.handoffStatus = update.handoffStatus || comanda.handoffStatus;
                comanda.status = nou;
                comanda.statusHistory = Array.isArray(comanda.statusHistory)
                    ? [...comanda.statusHistory, { status: nou, note: req.body?.note || "" }]
                    : [{ status: nou, note: req.body?.note || "" }];
                await comanda.save();
            }
        }

        await notifyUser(doc.clientId, {
            titlu: "Rezervare actualizata",
            mesaj: `Rezervarea ta este acum: ${update.status || nou}.`,
            tip: "rezervare",
            link: "/profil",
            prestatorId: doc.prestatorId,
            actorId: req.user?._id || req.user?.id,
            actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
            meta: {
                rezervareId: String(doc._id),
                comandaId: doc.comandaId ? String(doc.comandaId) : "",
                nextStatus: update.status || nou,
            },
        });

        await recordAuditLog(req, {
            action: "reservation.status.updated",
            entityType: "rezervare",
            entityId: doc._id,
            summary: `Status rezervare actualizat la ${nou}`,
            metadata: {
                nextStatus: update.status || nou,
                handoffStatus: update.handoffStatus || "",
            },
        });

        res.json({ ok: true, _source: "rezervare" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Eroare la actualizare status." });
    }
});

// PATCH /api/comenzi/:id/price
// Body: { subtotal?, taxaLivrare?, deliveryFee?, total?, totalFinal?, discountTotal?, notesAdmin?, note? }
router.patch("/:id/price", authRequired, roleCheck("admin", "patiser"), adminMutationLimiter, async (req, res) => {
    try {
        const {
            subtotal,
            taxaLivrare,
            deliveryFee,
            total,
            totalFinal,
            discountTotal,
            notesAdmin,
            note,
        } = req.body || {};

        const comanda = await Comanda.findById(req.params.id);
        if (comanda && rejectOutsidePrestatorScope(req, res, comanda.prestatorId)) {
            return;
        }
        if (!comanda) return res.status(404).json({ message: "Comanda inexistentŽŸ." });

        const updates = {};
        if (subtotal != null) updates.subtotal = Number(subtotal || 0);
        if (taxaLivrare != null) updates.taxaLivrare = Number(taxaLivrare || 0);
        if (deliveryFee != null && updates.taxaLivrare == null) {
            updates.taxaLivrare = Number(deliveryFee || 0);
        }
        if (updates.taxaLivrare != null) updates.deliveryFee = updates.taxaLivrare;
        if (discountTotal != null) updates.discountTotal = Number(discountTotal || 0);
        if (total != null) updates.total = Number(total || 0);
        if (totalFinal != null) updates.totalFinal = Number(totalFinal || 0);
        if (notesAdmin != null) updates.notesAdmin = String(notesAdmin);

        const nextSubtotal = updates.subtotal ?? comanda.subtotal ?? 0;
        const nextTaxa = updates.taxaLivrare ?? comanda.taxaLivrare ?? 0;
        if (updates.total == null && (updates.subtotal != null || updates.taxaLivrare != null)) {
            updates.total = Number(nextSubtotal || 0) + Number(nextTaxa || 0);
        }
        if (updates.totalFinal == null && updates.total != null) {
            updates.totalFinal = updates.total;
        }

        Object.assign(comanda, updates);
        const noteText = note || "Pret actualizat";
        comanda.statusHistory = Array.isArray(comanda.statusHistory)
            ? [...comanda.statusHistory, { status: "pret_actualizat", note: noteText }]
            : [{ status: "pret_actualizat", note: noteText }];
        await comanda.save();
        await syncReservationFromOrder(comanda);

        await notifyUser(comanda.clientId, {
            titlu: "Comanda actualizata",
            mesaj: `Pret nou pentru comanda #${comanda.numeroComanda || comanda._id}: ${comanda.totalFinal || comanda.total} MDL.`,
            tip: "update",
            link: `/plata?comandaId=${comanda._id}`,
            prestatorId: comanda.prestatorId,
            actorId: req.user?._id || req.user?.id,
            actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
            meta: {
                comandaId: String(comanda._id),
                totalFinal: Number(comanda.totalFinal || comanda.total || 0),
            },
        });
        await notifyProviderById(comanda.prestatorId, {
            titlu: "Pret comanda actualizat",
            mesaj: `Comanda #${comanda.numeroComanda || comanda._id} are acum totalul ${comanda.totalFinal || comanda.total} MDL.`,
            tip: "update",
            link: "/admin/comenzi",
            prestatorId: comanda.prestatorId,
            actorId: req.user?._id || req.user?.id,
            actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
            meta: {
                comandaId: String(comanda._id),
                totalFinal: Number(comanda.totalFinal || comanda.total || 0),
            },
        });

        await recordAuditLog(req, {
            action: "order.price.updated",
            entityType: "comanda",
            entityId: comanda._id,
            summary: "Pret comanda actualizat",
            metadata: {
                updates,
                note: noteText,
            },
        });

        res.json({ ok: true, comanda });
    } catch (e) {
        console.error("price update error:", e);
        res.status(500).json({ message: "Eroare la actualizare pret." });
    }
});

// PATCH /api/comenzi/:id/schedule
// Body: { dataLivrare, oraLivrare }
router.patch("/:id/schedule", authRequired, roleCheck("admin", "patiser"), adminMutationLimiter, async (req, res) => {
    try {
        const { dataLivrare, oraLivrare } = req.body || {};
        if (!dataLivrare || !oraLivrare) {
            return res.status(400).json({ message: "dataLivrare si oraLivrare sunt obligatorii." });
        }

        const comanda = await Comanda.findById(req.params.id);
        if (comanda && rejectOutsidePrestatorScope(req, res, comanda.prestatorId)) {
            return;
        }
        if (!comanda) return res.status(404).json({ message: "Comanda inexistentă." });

        const CalendarSlotEntry = require("../models/CalendarSlotEntry");
        const prestatorId = normalizePrestatorId(comanda.prestatorId);
        if (!prestatorId) {
            return res.status(400).json({ message: "Comanda nu are prestator configurat." });
        }

        const prevDate = comanda.dataLivrare;
        const prevTime = comanda.oraLivrare;
        const isSameDay = prevDate && prevDate === dataLivrare;
        let requiredLeadHours = MIN_LEAD_HOURS;

        try {
            const repriced = await buildPricedOrder(comanda.items || [], {
                allowManualPricing: true,
            });
            requiredLeadHours = Math.max(
                MIN_LEAD_HOURS,
                Number(repriced.leadHours || MIN_LEAD_HOURS)
            );
        } catch {
            requiredLeadHours = MIN_LEAD_HOURS;
        }

        if (isBeforeMinLead(dataLivrare, oraLivrare, requiredLeadHours)) {
            return res.status(400).json({
                message: `Alege un interval cu minim ${requiredLeadHours} ore inainte.`,
            });
        }
        if (!isSameDay && (await isDayCapacityFull(prestatorId, dataLivrare))) {
            return res.status(409).json({
                message: "Capacitatea zilei este atinsa. Alege alta data.",
            });
        }

        if (prevDate && prevTime) {
            try {
                const prev = await CalendarSlotEntry.findOne({ prestatorId, date: prevDate, time: prevTime });
                if (prev && prev.used > 0) {
                    await CalendarSlotEntry.updateOne({ _id: prev._id, used: { $gt: 0 } }, { $inc: { used: -1 } });
                }
            } catch (e) {
                console.warn("Schedule rollback warning:", e.message);
            }
        }

        const next = await CalendarSlotEntry.findOne({ prestatorId, date: dataLivrare, time: oraLivrare });
        if (!next) return res.status(404).json({ message: "Slot indisponibil pentru noua data/ora." });
        if (next.used >= next.capacity) return res.status(409).json({ message: "Slotul selectat este ocupat." });

        const upd = await CalendarSlotEntry.updateOne(
            { _id: next._id, used: { $lt: next.capacity } },
            { $inc: { used: 1 } }
        );
        if (!upd || upd.modifiedCount === 0) {
            return res.status(409).json({ message: "Slot indisponibil." });
        }

        comanda.dataLivrare = dataLivrare;
        comanda.oraLivrare = oraLivrare;
        comanda.statusHistory = Array.isArray(comanda.statusHistory)
            ? [...comanda.statusHistory, { status: "reprogramata", note: "Data/ora modificata" }]
            : [{ status: "reprogramata", note: "Data/ora modificata" }];
        await comanda.save();
        await syncReservationFromOrder(comanda);
        await notifyUser(comanda.clientId, {
            titlu: "Comanda reprogramata",
            mesaj: `Comanda #${comanda.numeroComanda || comanda._id} a fost reprogramata la ${dataLivrare} ${oraLivrare}.`,
            tip: "update",
            link: `/plata?comandaId=${comanda._id}`,
            prestatorId: comanda.prestatorId,
            actorId: req.user?._id || req.user?.id,
            actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
            meta: {
                comandaId: String(comanda._id),
                previousSchedule: {
                    dataLivrare: prevDate || "",
                    oraLivrare: prevTime || "",
                },
                nextSchedule: {
                    dataLivrare,
                    oraLivrare,
                },
            },
        });
        await notifyProviderById(comanda.prestatorId, {
            titlu: "Programare actualizata",
            mesaj: `Comanda #${comanda.numeroComanda || comanda._id} a fost mutata la ${dataLivrare} ${oraLivrare}.`,
            tip: "update",
            link: "/admin/calendar",
            prestatorId: comanda.prestatorId,
            actorId: req.user?._id || req.user?.id,
            actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
            meta: {
                comandaId: String(comanda._id),
                previousSchedule: {
                    dataLivrare: prevDate || "",
                    oraLivrare: prevTime || "",
                },
                nextSchedule: {
                    dataLivrare,
                    oraLivrare,
                },
            },
        });
        await recordAuditLog(req, {
            action: "order.schedule.updated",
            entityType: "comanda",
            entityId: comanda._id,
            summary: "Comanda reprogramata",
            metadata: {
                previousSchedule: {
                    dataLivrare: prevDate || "",
                    oraLivrare: prevTime || "",
                },
                nextSchedule: {
                    dataLivrare,
                    oraLivrare,
                },
            },
        });
        res.json({ ok: true });
    } catch (e) {
        console.error("schedule update error:", e);
        res.status(500).json({ message: "Eroare la reprogramare." });
    }
});

// PATCH /api/comenzi/:id/refuza
// Body: { motiv }
router.patch("/:id/refuza", authRequired, roleCheck("admin", "patiser"), adminMutationLimiter, async (req, res) => {
    try {
        const { motiv } = req.body || {};
        const comanda = await Comanda.findById(req.params.id);
        if (comanda && rejectOutsidePrestatorScope(req, res, comanda.prestatorId)) {
            return;
        }
        if (!comanda) return res.status(404).json({ message: "Comanda inexistentă." });

        comanda.status = "refuzata";
        comanda.motivRefuz = motiv || "Refuzata de prestator.";
        comanda.statusHistory = Array.isArray(comanda.statusHistory)
            ? [...comanda.statusHistory, { status: "refuzata", note: comanda.motivRefuz }]
            : [{ status: "refuzata", note: comanda.motivRefuz }];
        await comanda.save();
        await releaseReservedSlot({
            source: "entry",
            prestatorId: comanda.prestatorId,
            dataLivrare: comanda.dataLivrare || comanda.dataRezervare,
            oraLivrare: comanda.oraLivrare || comanda.oraRezervare,
        });
        await syncReservationFromOrder(comanda);
        await notifyUser(comanda.clientId, {
            titlu: "Comanda refuzata",
            mesaj: comanda.motivRefuz,
            tip: "warning",
            link: `/plata?comandaId=${comanda._id}`,
            prestatorId: comanda.prestatorId,
            actorId: req.user?._id || req.user?.id,
            actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
            meta: {
                comandaId: String(comanda._id),
                motiv: comanda.motivRefuz,
            },
        });
        await notifyProviderById(comanda.prestatorId, {
            titlu: "Comanda refuzata",
            mesaj: `Comanda #${comanda.numeroComanda || comanda._id} a fost marcata ca refuzata.`,
            tip: "warning",
            link: "/admin/comenzi",
            prestatorId: comanda.prestatorId,
            actorId: req.user?._id || req.user?.id,
            actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
            meta: {
                comandaId: String(comanda._id),
                motiv: comanda.motivRefuz,
            },
        });
        await recordAuditLog(req, {
            action: "order.rejected",
            entityType: "comanda",
            entityId: comanda._id,
            summary: "Comanda refuzata",
            metadata: {
                motiv: comanda.motivRefuz,
            },
        });
        res.json({ ok: true });
    } catch (e) {
        console.error("refuza error:", e);
        res.status(500).json({ message: "Eroare la refuzare." });
    }
});

// alias compatibil vechiului format
router.patch("/:comandaId/status", authRequired, roleCheck("admin", "patiser"), adminMutationLimiter, async (req, res, next) => {
    req.params.id = req.params.comandaId;
    return router.handle(req, res, next);
});
// în backend/routes/comenzi.js (unde ai celelalte rute)
router.get("/:id", authRequired, async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return next();
        }
        const c = await Comanda.findById(req.params.id).lean();
        if (!c) return res.status(404).json({ message: "Comandă inexistentă" });

        const role = req.user?.rol || req.user?.role;
        const isStaff = isStaffRole(role);
        const authUserId = getAuthUserId(req);
        if (!isStaff && String(c.clientId || "") !== authUserId) {
            return res.status(403).json({ message: "Acces interzis la aceasta comanda." });
        }
        if (isStaff && rejectOutsidePrestatorScope(req, res, c.prestatorId)) {
            return;
        }

        if (isStaff) {
            return res.json(c);
        }

        const clientSafeOrder = { ...c };
        delete clientSafeOrder.notesAdmin;
        delete clientSafeOrder.statusHistory;
        delete clientSafeOrder.stripePaymentId;
        delete clientSafeOrder.utilizatorId;

        return res.json(clientSafeOrder);
    } catch (e) {
        res.status(500).json({ message: GENERIC_SERVER_MESSAGE });
    }
});

/* ===================== 5) EXPORT CSV (din Comanda) ===================== */
/**
 * GET /api/comenzi/export/csv?from=YYYY-MM-DD&to=YYYY-MM-DD&status=...
 */
router.get("/export/csv", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
    try {
        const { from, to, status } = req.query;
        const q = applyScopedPrestatorFilter(req);
        if (from || to) {
            q.dataLivrare = {};
            if (from) q.dataLivrare.$gte = from;
            if (to) q.dataLivrare.$lte = to;
        }
        if (status) q.status = status;

        const comenzi = await Comanda.find(q)
            // .populate("clientId", "nume prenume email telefon") // activează dacă ai model
            .lean();

        const fields = [
            "ID Comandă",
            "Data Livrare",
            "Ora Livrare",
            "Client",
            "Email Client",
            "Telefon Client",
            "Metoda Livrare",
            "Adresa Livrare",
            "Status",
            "Produse",
            "Subtotal",
            "Taxă Livrare",
            "Total",
            "Creat la",
        ];

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

        const csv = rows.length
            ? new Parser({ withBOM: true, fields }).parse(rows)
            : `\uFEFF${fields.join(",")}\n`;

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
router.patch("/:id/cancel", authRequired, async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await Comanda.findById(id);
        if (!doc) return res.status(404).json({ message: "Comanda nu există" });

        const role = req.user?.rol || req.user?.role;
        const isStaff = isStaffRole(role);
        const authUserId = getAuthUserId(req);
        if (!isStaff && String(doc.clientId || "") !== authUserId) {
            return res.status(403).json({ message: "Nu poti anula comanda altui client." });
        }
        if (isStaff && rejectOutsidePrestatorScope(req, res, doc.prestatorId)) {
            return;
        }

        // dacă deja anulată, returnează
        if (doc.status === "anulata" || doc.status === "cancelled") {
            return res.json({ ok: true, status: doc.status });
        }

        // marchează anulată
        doc.status = "anulata";
        await doc.save();
        await syncReservationFromOrder(doc);

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

        await recordAuditLog(req, {
            action: "order.cancelled",
            entityType: "comanda",
            entityId: doc._id,
            summary: "Comanda anulata",
            metadata: {
                actorIsStaff: isStaff,
                clientId: String(doc.clientId || ""),
            },
        });

        await notifyUser(doc.clientId, {
            titlu: "Comanda anulata",
            mesaj: `Comanda #${doc.numeroComanda || doc._id} a fost anulata.`,
            tip: "warning",
            link: "/profil",
            prestatorId: doc.prestatorId,
            actorId: req.user?._id || req.user?.id,
            actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
            meta: { comandaId: String(doc._id) },
        });
        await notifyProviderById(doc.prestatorId, {
            titlu: "Comanda anulata",
            mesaj: `Comanda #${doc.numeroComanda || doc._id} a fost anulata.`,
            tip: "warning",
            link: "/admin/comenzi",
            prestatorId: doc.prestatorId,
            actorId: req.user?._id || req.user?.id,
            actorRole: normalizeUserRole(req.user?.rol || req.user?.role),
            meta: { comandaId: String(doc._id) },
        });

        res.json({ ok: true, status: doc.status });
    } catch (e) {
        console.error("cancel comanda error:", e);
        res.status(500).json({ message: GENERIC_SERVER_MESSAGE });
    }
});

module.exports = router;




