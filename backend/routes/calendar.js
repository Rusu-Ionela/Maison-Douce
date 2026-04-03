// backend/routes/calendar.js
const express = require("express");
const router = express.Router();

const CalendarSlotEntry = require("../models/CalendarSlotEntry");
const CalendarDayCapacity = require("../models/CalendarDayCapacity");
const Rezervare = require("../models/Rezervare");
const Comanda = require("../models/Comanda");
const { authRequired, roleCheck } = require("../middleware/auth");
const {
  notifyUser,
  notifyAdmins,
  notifyProviderById,
} = require("../utils/notifications");
const {
  applyScopedPrestatorFilter,
  getScopedPrestatorId,
  hasScopedPrestatorAccess,
} = require("../utils/providerScope");
const {
  findProviderById,
  resolveProviderForRequest,
} = require("../utils/providerDirectory");
const { isStaffRole } = require("../utils/roles");
const {
  buildAvailabilityMonth,
  buildAvailabilityRange,
  buildDefaultRange,
  ensureSchedulableSlot,
  getMonthRange,
  normalizeMonthString,
  normalizePrestatorId,
} = require("../services/calendarAvailability");

let Utilizator = null;
try {
  Utilizator = require("../models/Utilizator");
} catch { }

const MIN_LEAD_HOURS = Number(process.env.MIN_LEAD_HOURS || 24);
const DELIVERY_FEE = 100;
const GENERIC_SERVER_MESSAGE = "Eroare server.";

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

function getAvailabilityRangeFromQuery(query = {}) {
  const month = normalizeMonthString(query.month);
  if (month) {
    return getMonthRange(month);
  }

  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();
  if (from || to) {
    return {
      from: from || to,
      to: to || from,
      month:
        from &&
        to &&
        from.slice(0, 7) === to.slice(0, 7) &&
        normalizeMonthString(from.slice(0, 7))
          ? from.slice(0, 7)
          : "",
    };
  }

  return buildDefaultRange();
}

function sendCalendarError(res, error, fallbackMessage = GENERIC_SERVER_MESSAGE) {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  const exactMessage =
    String(error?.message || "").trim() || String(fallbackMessage || GENERIC_SERVER_MESSAGE).trim();

  console.error("[calendar]", fallbackMessage, error);
  res.status(statusCode).json({
    ok: false,
    message: exactMessage,
    error: exactMessage,
    code: String(error?.code || "calendar_error"),
  });
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
    if (!prestatorId) {
      return res.status(400).json({ message: "prestatorId este obligatoriu" });
    }
    if (!(await findProviderById(prestatorId))) {
      return res.status(404).json({
        ok: false,
        message: "Prestatorul selectat nu exista.",
        error: "Prestatorul selectat nu exista.",
      });
    }

    console.log("Provider ID:", prestatorId);

    const range = getAvailabilityRangeFromQuery(req.query);
    const data = await buildAvailabilityRange({
      prestatorId,
      from: range.from,
      to: range.to,
      hideFull: req.query?.hideFull,
    });

    console.log("Availability result:", data);
    res.json(data);
  } catch (e) {
    sendCalendarError(res, e, "Nu am putut incarca disponibilitatea prestatorului.");
  }
}

router.get("/availability", async (req, res) => {
  try {
    const providerId = normalizePrestatorId(
      req.query?.providerId || req.query?.prestatorId
    );
    const month = normalizeMonthString(req.query?.month);

    if (!providerId) {
      return res.status(400).json({
        ok: false,
        message: "providerId este obligatoriu.",
        error: "providerId este obligatoriu.",
      });
    }

    if (!month) {
      return res.status(400).json({
        ok: false,
        message: "Parametrul month trebuie sa fie in format YYYY-MM.",
        error: "Parametrul month trebuie sa fie in format YYYY-MM.",
      });
    }
    if (!(await findProviderById(providerId))) {
      return res.status(404).json({
        ok: false,
        message: "Prestatorul selectat nu exista.",
        error: "Prestatorul selectat nu exista.",
      });
    }

    console.log("Provider ID:", providerId);
    const data = await buildAvailabilityMonth({
      prestatorId: providerId,
      month,
      hideFull: req.query?.hideFull ?? true,
    });
    console.log("Availability result:", data);
    res.json(data);
  } catch (error) {
    sendCalendarError(res, error, "Nu am putut incarca disponibilitatea lunara.");
  }
});

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
      sendCalendarError(res, e, "Eroare la preluare capacitate.");
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
      sendCalendarError(res, e, "Eroare la salvare capacitate.");
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
    sendCalendarError(res, e, "Eroare la salvarea sloturilor.");
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
async function reserveHandler(req, res) {
  try {
    const {
      clientId: requestedClientId,
      providerId: rawProviderId,
      prestatorId: rawPrestatorId,
      date,
      time,
      metoda = "",
      deliveryMethod = "",
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
    const selectedMethod = String(metoda || deliveryMethod || "ridicare").trim();
    if (
      rawProviderId &&
      rawPrestatorId &&
      normalizePrestatorId(rawProviderId) !== normalizePrestatorId(rawPrestatorId)
    ) {
      return res.status(400).json({
        message: "providerId si prestatorId trebuie sa indice acelasi prestator.",
      });
    }
    const prestatorId = normalizePrestatorId(
      await resolveProviderForRequest(req, rawProviderId || rawPrestatorId)
    );

    console.log("Provider ID:", prestatorId);

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
        message: "Nu exista niciun prestator configurat pentru rezervari.",
      });
    }
    const provider = await findProviderById(prestatorId);
    if (!provider || provider.providerProfile?.acceptsOrders === false) {
      return res.status(400).json({
        message: "Prestatorul selectat nu poate primi rezervari in acest moment.",
      });
    }
    if (getScopedPrestatorId(req) && rejectOutsidePrestatorScope(req, res, prestatorId)) {
      return;
    }
    if (!["ridicare", "livrare"].includes(selectedMethod)) {
      return res.status(400).json({
        message: "metoda trebuie sa fie ridicare sau livrare.",
      });
    }
    if (selectedMethod === "livrare" && !String(adresaLivrare || "").trim()) {
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
    const deliveryFee = selectedMethod === "livrare" ? DELIVERY_FEE : 0;
    const subtotalValue = estimatedBudget;
    const total = subtotalValue + deliveryFee;

    // Atomic reservation using CalendarSlotEntry. Materialize a generated slot when needed.
    const { slotEntry } = await ensureSchedulableSlot({ prestatorId, date, time });
    if (!slotEntry) {
      return res.status(404).json({
        message: "Slot indisponibil. Calendarul nu este configurat pentru acest prestator.",
      });
    }

    if (Number(slotEntry.capacity || 0) <= 0) {
      return res.status(409).json({ message: "Slotul selectat nu este disponibil." });
    }

    if (slotEntry.used >= slotEntry.capacity) {
      return res.status(409).json({ message: "Slotul selectat este ocupat." });
    }

    // Atomic increment with condition: only if used < capacity
    const upd = await CalendarSlotEntry.updateOne(
      {
        _id: slotEntry._id,
        capacity: { $gt: 0 },
        used: { $lt: slotEntry.capacity },
      },
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
      subtotal: subtotalValue,
      taxaLivrare: deliveryFee,
      deliveryFee,
      total,
      totalFinal: total,
      tip: "rezervare-calendar",
      statusPlata: "unpaid",
      status: "in_asteptare",
      statusComanda: "inregistrata",
      metodaLivrare: selectedMethod,
      adresaLivrare: selectedMethod === "livrare" ? adresaLivrare : "",
      deliveryInstructions: deliveryInstructions || "",
      deliveryWindow: deliveryWindow || "",
      notesClient: notes || "",
      notesAdmin: pricingPendingNote,
      handoffMethod: selectedMethod === "livrare" ? "delivery" : "pickup",
      handoffStatus: "scheduled",
      dataLivrare: date,
      oraLivrare: time,
      dataRezervare: date,
      oraRezervare: time,
      calendarSlot: { date, time },
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
        handoffMethod: selectedMethod === "livrare" ? "delivery" : "pickup",
        deliveryFee,
        deliveryAddress: selectedMethod === "livrare" ? adresaLivrare : undefined,
        deliveryInstructions: deliveryInstructions || "",
        deliveryWindow: deliveryWindow || "",
        subtotal: subtotalValue,
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
      prestatorId,
      actorId: prestatorId,
      actorRole: "patiser",
      meta: {
        rezervareId: String(doc._id),
        comandaId: String(comanda._id),
        handoffMethod: selectedMethod === "livrare" ? "delivery" : "pickup",
        deliveryFee,
      },
    });
    await notifyProviderById(prestatorId, {
      titlu: "Rezervare noua",
      mesaj: `Ai primit o rezervare noua pentru ${date} ${time}.`,
      tip: "rezervare",
      link: "/admin/calendar",
      prestatorId,
      actorId: effectiveClientId,
      actorRole: "client",
      meta: {
        rezervareId: String(doc._id),
        comandaId: String(comanda._id),
        handoffMethod: selectedMethod === "livrare" ? "delivery" : "pickup",
        deliveryFee,
      },
    });
    await notifyAdmins({
      titlu: "Rezervare noua",
      mesaj: `Rezervare noua pentru ${date} ${time}.`,
      tip: "rezervare",
      link: "/admin/calendar",
      prestatorId,
      actorId: effectiveClientId,
      actorRole: "client",
      meta: {
        rezervareId: String(doc._id),
        comandaId: String(comanda._id),
      },
    });

    return res.json({
      ok: true,
      providerId: prestatorId,
      rezervareId: doc._id,
      comandaId: comanda._id,
      deliveryMethod: selectedMethod,
      slot: slotInfo,
      fees: { delivery: deliveryFee },
      total,
      clientBudget: estimatedBudget,
      requiresPriceConfirmation: true,
      reservationSummary: {
        date,
        time,
        metoda: selectedMethod,
        adresaLivrare: selectedMethod === "livrare" ? String(adresaLivrare || "").trim() : "",
        deliveryWindow: selectedMethod === "livrare" ? String(deliveryWindow || "").trim() : "",
      },
    });
  } catch (e) {
    sendCalendarError(res, e, "Rezervarea calendarului a esuat.");
  }
}

router.post("/book", authRequired, reserveHandler);
router.post("/reserve", authRequired, reserveHandler);

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
    const requestedPrestatorId = normalizePrestatorId(req.query?.prestatorId);
    if (!date) {
      return res.status(400).json({ message: "Data lipsă" });
    }

    if (!date) {
      return res.status(400).json({ message: "Data lipsa" });
    }
    if (requestedPrestatorId && rejectOutsidePrestatorScope(req, res, requestedPrestatorId)) {
      return;
    }

    const [rezervari, comenzi] = await Promise.all([
      Rezervare.find(
        applyScopedPrestatorFilter(
          req,
          requestedPrestatorId ? { date, prestatorId: requestedPrestatorId } : { date }
        )
      )
        .sort({ timeSlot: 1 })
        .populate("comandaId")
        .lean(),
      Comanda.find(
        applyScopedPrestatorFilter(
          req,
          requestedPrestatorId
            ? {
                prestatorId: requestedPrestatorId,
                $or: [{ dataLivrare: date }, { dataRezervare: date }],
              }
            : {
                $or: [{ dataLivrare: date }, { dataRezervare: date }],
              }
        )
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
    sendCalendarError(res, e, "Eroare la incarcarea rezervarilor din calendar.");
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
    const requestedPrestatorId = normalizePrestatorId(req.query?.prestatorId);
    if (requestedPrestatorId && rejectOutsidePrestatorScope(req, res, requestedPrestatorId)) {
      return;
    }
    const rezervari = await Rezervare.find(
      applyScopedPrestatorFilter(
        req,
        requestedPrestatorId ? { date, prestatorId: requestedPrestatorId } : { date }
      )
    )
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
    sendCalendarError(res, e, "Eroare la exportul calendarului.");
  }
  }
);

module.exports = router;

