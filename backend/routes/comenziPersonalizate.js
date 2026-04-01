const express = require("express");
const router = express.Router();
const ComandaPersonalizata = require("../models/ComandaPersonalizata");
const Comanda = require("../models/Comanda");
const Rezervare = require("../models/Rezervare");
const CalendarPrestator = require("../models/CalendarPrestator");
const CalendarSlotEntry = require("../models/CalendarSlotEntry");
const { authRequired, roleCheck } = require("../middleware/auth");
const { resolveProviderForRequest } = require("../utils/providerDirectory");
const { notifyUser, notifyProviderById } = require("../utils/notifications");
const { recordAuditLog } = require("../utils/audit");

const LIVRARE_FEE = 100;
const CUSTOM_ORDER_STATUSES = new Set([
  "noua",
  "in_discutie",
  "aprobata",
  "comanda_generata",
  "respinsa",
]);

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeDeliveryMethod(value) {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "livrare" ? "livrare" : "ridicare";
}

function normalizeHandoffMethod(value) {
  return normalizeDeliveryMethod(value) === "livrare" ? "delivery" : "pickup";
}

function buildReservationTimeSlot(time = "") {
  const [h, m] = String(time || "00:00").split(":").map(Number);
  const endH = String((Number.isFinite(h) ? h : 0) + 1).padStart(2, "0");
  const endM = String(Number.isFinite(m) ? m : 0).padStart(2, "0");
  return `${String(time || "00:00")}-${endH}:${endM}`;
}

async function reserveSlot(prestatorId, date, time) {
  const entry = await CalendarSlotEntry.findOne({ prestatorId, date, time });
  if (entry) {
    const updated = await CalendarSlotEntry.updateOne(
      { _id: entry._id, used: { $lt: entry.capacity } },
      { $inc: { used: 1 } }
    );
    if (!updated?.modifiedCount) {
      throw Object.assign(new Error("Slotul selectat este deja ocupat."), { statusCode: 409 });
    }
    return { source: "entry", prestatorId, date, time };
  }

  const calendar = await CalendarPrestator.findOne({ prestatorId });
  if (!calendar) {
    throw Object.assign(new Error("Calendar inexistent pentru prestator."), { statusCode: 404 });
  }

  const index = (calendar.slots || []).findIndex((slot) => slot.date === date && slot.time === time);
  if (index === -1) {
    throw Object.assign(new Error("Slotul selectat nu exista in calendarul activ."), {
      statusCode: 404,
    });
  }

  const slot = calendar.slots[index];
  if (Number(slot.used || 0) >= Number(slot.capacity || 0)) {
    throw Object.assign(new Error("Slotul selectat este deja ocupat."), { statusCode: 409 });
  }

  calendar.slots[index].used = Number(slot.used || 0) + 1;
  await calendar.save();

  return { source: "legacy", prestatorId, date, time };
}

async function releaseSlot(reservation = {}) {
  const { source, prestatorId, date, time } = reservation || {};
  if (!prestatorId || !date || !time) return;

  if (source === "entry") {
    const entry = await CalendarSlotEntry.findOne({ prestatorId, date, time });
    if (entry && Number(entry.used || 0) > 0) {
      await CalendarSlotEntry.updateOne(
        { _id: entry._id, used: { $gt: 0 } },
        { $inc: { used: -1 } }
      );
      return;
    }
  }

  const calendar = await CalendarPrestator.findOne({ prestatorId });
  if (!calendar) return;

  const index = (calendar.slots || []).findIndex((slot) => slot.date === date && slot.time === time);
  if (index === -1) return;

  calendar.slots[index].used = Math.max(0, Number(calendar.slots[index].used || 0) - 1);
  await calendar.save();
}

async function syncReservationFromOrder(comanda) {
  const handoffMethod = normalizeHandoffMethod(comanda?.metodaLivrare);
  const update = {
    clientId: String(comanda?.clientId || ""),
    prestatorId: normalizeText(comanda?.prestatorId),
    comandaId: comanda?._id,
    customDetails: comanda?.customDetails || undefined,
    date: normalizeText(comanda?.dataLivrare),
    timeSlot: buildReservationTimeSlot(comanda?.oraLivrare),
    handoffMethod,
    deliveryFee: Number(comanda?.taxaLivrare || comanda?.deliveryFee || 0),
    deliveryAddress: handoffMethod === "delivery" ? normalizeText(comanda?.adresaLivrare) : "",
    deliveryInstructions: normalizeText(comanda?.deliveryInstructions),
    deliveryWindow: normalizeText(comanda?.deliveryWindow),
    subtotal: Number(comanda?.subtotal || 0),
    total: Number(comanda?.totalFinal ?? comanda?.total ?? 0),
    notes: normalizeText(comanda?.preferinte || comanda?.note),
    paymentStatus: normalizeText(comanda?.paymentStatus || comanda?.statusPlata || "unpaid"),
    status: "pending",
    handoffStatus: "scheduled",
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

// POST - Salvare comanda personalizata (client)
router.post("/", authRequired, async (req, res) => {
  try {
    const {
      clientId,
      numeClient,
      preferinte,
      imagine,
      imagineGenerata,
      designId,
      options,
      pretEstimat,
      timpPreparareOre,
      data,
      prestatorId: rawPrestatorId,
      comandaId,
    } = req.body || {};

    const ownerId = clientId || req.user._id;
    if (String(ownerId) !== String(req.user._id)) {
      return res.status(403).json({ mesaj: "clientId invalid" });
    }
    const prestatorId = await resolveProviderForRequest(req, rawPrestatorId || "");

    const comanda = new ComandaPersonalizata({
      clientId: ownerId,
      prestatorId,
      comandaId: comandaId || undefined,
      numeClient: numeClient || req.user.nume || "Client",
      preferinte: preferinte || "",
      imagine: imagine || imagineGenerata || "",
      designId,
      options: options || {},
      pretEstimat: Number(pretEstimat || 0),
      timpPreparareOre: Number(timpPreparareOre || 0),
      statusHistory: [
        {
          status: "noua",
          note: "Cerere noua trimisa din constructor.",
          at: new Date(),
        },
      ],
      data: data || new Date(),
    });

    await comanda.save();
    res.status(201).json({ mesaj: "Comanda salvata cu succes", comanda });
  } catch (err) {
    console.error("Eroare la salvarea comenzii:", err);
    res.status(500).json({ mesaj: "Eroare la salvarea comenzii" });
  }
});

// GET - Afisare comenzi personalizate
router.get("/", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.prestatorId) q.prestatorId = req.query.prestatorId;
    if (role === "admin" || role === "patiser") {
      if (req.query.clientId) q.clientId = req.query.clientId;
      if (role === "patiser") q.prestatorId = String(req.user._id);
    } else {
      q.clientId = req.user._id;
    }
    const comenzi = await ComandaPersonalizata.find(q)
      .populate("comandaId", "numeroComanda status total totalFinal paymentStatus dataLivrare oraLivrare metodaLivrare")
      .sort({ data: -1 });
    res.json(comenzi);
  } catch (err) {
    console.error("Eroare la obtinerea comenzilor:", err);
    res.status(500).json({ mesaj: "Eroare la obtinerea comenzilor" });
  }
});

router.get("/:id", authRequired, async (req, res) => {
  try {
    const role = String(req.user?.rol || req.user?.role || "").trim();
    const doc = await ComandaPersonalizata.findById(req.params.id)
      .populate(
        "comandaId",
        [
          "_id",
          "numeroComanda",
          "status",
          "statusComanda",
          "paymentStatus",
          "statusPlata",
          "subtotal",
          "taxaLivrare",
          "deliveryFee",
          "total",
          "totalFinal",
          "dataLivrare",
          "oraLivrare",
          "metodaLivrare",
          "adresaLivrare",
          "deliveryWindow",
          "deliveryInstructions",
          "createdAt",
        ].join(" ")
      )
      .lean();

    if (!doc) {
      return res.status(404).json({ mesaj: "Comanda personalizata inexistenta" });
    }

    const isStaff = role === "admin" || role === "patiser";
    const isOwner = String(doc.clientId || "") === String(req.user?._id || "");
    const isAssignedProvider = String(doc.prestatorId || "") === String(req.user?._id || "");

    if (!isOwner && !(isStaff && (role === "admin" || isAssignedProvider))) {
      return res.status(403).json({ mesaj: "Acces interzis" });
    }

    return res.json({
      ...doc,
      clientCanApprove:
        String(doc.status || "") === "aprobata" &&
        !doc.clientApprovedAt &&
        !doc.comandaId?._id,
      clientCanPay:
        Boolean(doc.comandaId?._id) &&
        String(doc.comandaId?.paymentStatus || doc.comandaId?.statusPlata || "").toLowerCase() !==
          "paid",
    });
  } catch (err) {
    console.error("Eroare la obtinerea comenzii personalizate:", err);
    res.status(500).json({ mesaj: "Eroare la obtinerea comenzii personalizate" });
  }
});

router.post("/:id/approve", authRequired, async (req, res) => {
  try {
    const doc = await ComandaPersonalizata.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ mesaj: "Comanda personalizata inexistenta" });
    }

    const isOwner = String(doc.clientId || "") === String(req.user?._id || "");
    if (!isOwner) {
      return res.status(403).json({ mesaj: "Acces interzis" });
    }

    if (String(doc.status || "") !== "aprobata") {
      return res.status(409).json({
        mesaj: "Oferta nu este pregatita pentru aprobare. Atelierul trebuie sa o marcheze mai intai ca oferta finala.",
      });
    }

    if (doc.clientApprovedAt) {
      return res.json({
        mesaj: "Oferta a fost deja aprobata.",
        alreadyApproved: true,
        comanda: doc,
      });
    }

    const approvalNote = normalizeText(req.body?.note);
    doc.clientApprovedAt = new Date();
    doc.clientApprovalNote = approvalNote;
    doc.statusHistory = Array.isArray(doc.statusHistory) ? doc.statusHistory : [];
    doc.statusHistory.push({
      status: "aprobata",
      note:
        approvalNote ||
        "Clientul a aprobat oferta finala si asteapta generarea comenzii pentru plata.",
      at: new Date(),
    });
    await doc.save();

    await notifyProviderById(doc.prestatorId, {
      titlu: "Oferta personalizata aprobata de client",
      mesaj: `Clientul a aprobat oferta pentru cererea #${String(doc._id).slice(-6)}.`,
      tip: "success",
      link: "/admin/comenzi-personalizate",
      prestatorId: doc.prestatorId,
      actorId: req.user?._id || req.user?.id,
      actorRole: String(req.user?.rol || req.user?.role || ""),
      meta: {
        customOrderId: String(doc._id),
      },
    });

    await recordAuditLog(req, {
      action: "custom-order.offer-approved",
      entityType: "comanda_personalizata",
      entityId: doc._id,
      summary: "Clientul a aprobat oferta personalizata",
      metadata: {
        prestatorId: normalizeText(doc.prestatorId),
        note: approvalNote,
      },
    });

    return res.json({
      mesaj: "Oferta a fost aprobata si atelierul poate genera comanda pentru plata.",
      comanda: doc,
    });
  } catch (err) {
    console.error("Eroare la aprobarea ofertei personalizate:", err);
    return res.status(500).json({ mesaj: "Eroare la aprobarea ofertei personalizate." });
  }
});

router.post("/:id/convert", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  let reservedSlot = null;
  let createdOrderId = "";

  try {
    const {
      dataLivrare,
      oraLivrare,
      metodaLivrare,
      adresaLivrare,
      deliveryInstructions,
      deliveryWindow,
      statusNote,
    } = req.body || {};

    const doc = await ComandaPersonalizata.findById(req.params.id);
    if (!doc) return res.status(404).json({ mesaj: "Comanda personalizata inexistenta" });

    if (
      String(req.user?.rol || req.user?.role || "") === "patiser" &&
      String(doc.prestatorId || "") !== String(req.user._id)
    ) {
      return res.status(403).json({ mesaj: "Acces interzis" });
    }

    const linkedOrder = doc.comandaId ? await Comanda.findById(doc.comandaId) : null;
    if (linkedOrder) {
      return res.json({
        mesaj: "Cererea are deja o comanda generata.",
        alreadyConverted: true,
        comanda: linkedOrder,
      });
    }

    const subtotal = Number(doc.pretEstimat || 0);
    if (subtotal <= 0) {
      return res.status(400).json({ mesaj: "Seteaza mai intai un pret estimat valid." });
    }
    if (!normalizeText(doc.clientId) || !normalizeText(doc.prestatorId)) {
      return res.status(400).json({ mesaj: "Cererea nu are client sau prestator configurat." });
    }
    if (!doc.clientApprovedAt) {
      return res.status(409).json({
        mesaj: "Clientul trebuie sa aprobe oferta finala inainte sa generezi comanda pentru plata.",
      });
    }
    if (!normalizeText(dataLivrare) || !normalizeText(oraLivrare)) {
      return res.status(400).json({ mesaj: "Data si ora sunt obligatorii pentru conversie." });
    }

    const normalizedMethod = normalizeDeliveryMethod(metodaLivrare);
    const deliveryAddress = normalizedMethod === "livrare" ? normalizeText(adresaLivrare) : "";
    if (normalizedMethod === "livrare" && !deliveryAddress) {
      return res.status(400).json({ mesaj: "Adresa de livrare este obligatorie." });
    }

    reservedSlot = await reserveSlot(doc.prestatorId, normalizeText(dataLivrare), normalizeText(oraLivrare));

    const deliveryFee = normalizedMethod === "livrare" ? LIVRARE_FEE : 0;
    const total = subtotal + deliveryFee;
    const itemName =
      normalizeText(doc?.options?.aiDecorRequest) ||
      normalizeText(doc.preferinte) ||
      "Tort personalizat";

    const comanda = await Comanda.create({
      clientId: doc.clientId,
      prestatorId: doc.prestatorId,
      items: [
        {
          name: "Tort personalizat",
          nume: "Tort personalizat",
          qty: 1,
          cantitate: 1,
          price: subtotal,
          pret: subtotal,
          lineTotal: subtotal,
          personalizari: {
            mesaj: itemName.slice(0, 160),
          },
        },
      ],
      subtotal,
      taxaLivrare: deliveryFee,
      deliveryFee,
      total,
      totalFinal: total,
      metodaLivrare: normalizedMethod,
      adresaLivrare: deliveryAddress || undefined,
      deliveryInstructions: normalizeText(deliveryInstructions),
      deliveryWindow: normalizeText(deliveryWindow),
      dataLivrare: normalizeText(dataLivrare),
      oraLivrare: normalizeText(oraLivrare),
      dataRezervare: normalizeText(dataLivrare),
      oraRezervare: normalizeText(oraLivrare),
      calendarSlot: {
        date: normalizeText(dataLivrare),
        time: normalizeText(oraLivrare),
      },
      status: "in_asteptare",
      statusComanda: "inregistrata",
      statusPlata: "unpaid",
      paymentStatus: "unpaid",
      tip: "personalizata",
      preferinte: normalizeText(doc.preferinte),
      imagineGenerata: normalizeText(doc.imagine),
      customDetails: {
        customOrderId: String(doc._id),
        designId: doc.designId || undefined,
        options: doc.options || {},
      },
      note: normalizeText(statusNote),
      statusHistory: [
        {
          status: "in_asteptare",
          note: "Comanda generata din cererea personalizata.",
          at: new Date(),
        },
      ],
    });
    createdOrderId = String(comanda._id || "");

    await syncReservationFromOrder(comanda);

    doc.comandaId = comanda._id;
    doc.status = "comanda_generata";
    doc.statusHistory = Array.isArray(doc.statusHistory) ? doc.statusHistory : [];
    doc.statusHistory.push({
      status: "comanda_generata",
      note: normalizeText(statusNote) || "Cererea a fost convertita intr-o comanda platibila.",
      at: new Date(),
    });
    await doc.save();

    await notifyUser(doc.clientId, {
      titlu: "Cererea personalizata este gata de plata",
      mesaj: `Atelierul a generat comanda pentru cererea ta personalizata. Totalul actual este ${total} MDL.`,
      tip: "success",
      link: `/plata?comandaId=${comanda._id}`,
      prestatorId: doc.prestatorId,
      actorId: req.user?._id || req.user?.id,
      actorRole: String(req.user?.rol || req.user?.role || ""),
      meta: {
        comandaId: String(comanda._id),
        customOrderId: String(doc._id),
      },
    });
    await notifyProviderById(doc.prestatorId, {
      titlu: "Comanda personalizata convertita",
      mesaj: `Cererea #${String(doc._id).slice(-6)} a fost convertita intr-o comanda platibila.`,
      tip: "info",
      link: "/admin/comenzi-personalizate",
      prestatorId: doc.prestatorId,
      actorId: req.user?._id || req.user?.id,
      actorRole: String(req.user?.rol || req.user?.role || ""),
      meta: {
        comandaId: String(comanda._id),
        customOrderId: String(doc._id),
      },
    });

    await recordAuditLog(req, {
      action: "custom-order.converted",
      entityType: "comanda_personalizata",
      entityId: doc._id,
      summary: "Cerere personalizata convertita in comanda",
      metadata: {
        comandaId: String(comanda._id),
        dataLivrare: normalizeText(dataLivrare),
        oraLivrare: normalizeText(oraLivrare),
        metodaLivrare: normalizedMethod,
        total,
      },
    });

    res.status(201).json({
      mesaj: "Comanda a fost generata cu succes din cererea personalizata.",
      comanda,
      customOrderId: doc._id,
    });
  } catch (err) {
    if (createdOrderId) {
      try {
        await Rezervare.deleteOne({ comandaId: createdOrderId });
        await Comanda.findByIdAndDelete(createdOrderId);
      } catch (cleanupError) {
        console.warn(
          "Nu am putut curata comanda generata dupa eroare:",
          cleanupError?.message || cleanupError
        );
      }
    }
    if (reservedSlot) {
      try {
        await releaseSlot(reservedSlot);
      } catch (releaseError) {
        console.warn("Nu am putut elibera slotul dupa eroare:", releaseError?.message || releaseError);
      }
    }
    console.error("Eroare la conversia comenzii personalizate:", err);
    res
      .status(Number(err?.statusCode || 500))
      .json({ mesaj: err?.message || "Eroare la conversia cererii personalizate." });
  }
});

// PATCH - Actualizare status/pret (admin/patiser)
router.patch("/:id/status", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const { status, pretEstimat, statusNote } = req.body || {};
    const update = {};
    const normalizedStatus = normalizeText(status);
    const normalizedNote = normalizeText(statusNote);

    if (normalizedStatus) {
      if (!CUSTOM_ORDER_STATUSES.has(normalizedStatus)) {
        return res.status(400).json({ mesaj: "Status invalid pentru cererea personalizata." });
      }
      if (normalizedStatus === "respinsa" && !normalizedNote) {
        return res.status(400).json({ mesaj: "Motivul este obligatoriu pentru respingere." });
      }
      update.status = normalizedStatus;
    }

    let nextPrice = null;
    if (pretEstimat != null) {
      const numericPrice = Number(pretEstimat);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ mesaj: "Pretul estimat trebuie sa fie un numar valid." });
      }
      nextPrice = numericPrice;
      update.pretEstimat = numericPrice;
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ mesaj: "Nu exista modificari valide pentru actualizare." });
    }

    const doc = await ComandaPersonalizata.findById(req.params.id);
    if (!doc) return res.status(404).json({ mesaj: "Comanda inexistenta" });
    if (String(req.user?.rol || req.user?.role || "") === "patiser" && String(doc.prestatorId || "") !== String(req.user._id)) {
      return res.status(403).json({ mesaj: "Acces interzis" });
    }
    const priceChanged = nextPrice != null && nextPrice !== Number(doc.pretEstimat || 0);
    Object.assign(doc, update);
    const resetsClientApproval =
      Boolean(doc.clientApprovedAt) &&
      (priceChanged || (normalizedStatus && normalizedStatus !== "comanda_generata"));
    if (resetsClientApproval) {
      doc.clientApprovedAt = null;
      doc.clientApprovalNote = "";
    }
    if (normalizedStatus) {
      doc.statusHistory = Array.isArray(doc.statusHistory) ? doc.statusHistory : [];
      doc.statusHistory.push({
        status: normalizedStatus,
        note: normalizedNote,
        at: new Date(),
      });
    }
    await doc.save();

    if (normalizedStatus === "aprobata") {
      await notifyUser(doc.clientId, {
        titlu: "Oferta personalizata este pregatita",
        mesaj:
          Number(doc.pretEstimat || 0) > 0
            ? `Atelierul a pregatit oferta finala pentru cererea ta. Pretul actual este ${Number(
                doc.pretEstimat || 0
              )} MDL.`
            : "Atelierul a pregatit oferta finala pentru cererea ta si asteapta confirmarea ta.",
        tip: "info",
        link: `/personalizari/oferta/${doc._id}`,
        prestatorId: doc.prestatorId,
        actorId: req.user?._id || req.user?.id,
        actorRole: String(req.user?.rol || req.user?.role || ""),
        meta: {
          customOrderId: String(doc._id),
          status: normalizedStatus,
        },
      });
    }

    if (resetsClientApproval) {
      await notifyUser(doc.clientId, {
        titlu: "Oferta personalizata a fost actualizata",
        mesaj:
          "Atelierul a modificat oferta dupa aprobarea initiala. Revizuieste din nou pretul si detaliile inainte de confirmare.",
        tip: "warning",
        link: `/personalizari/oferta/${doc._id}`,
        prestatorId: doc.prestatorId,
        actorId: req.user?._id || req.user?.id,
        actorRole: String(req.user?.rol || req.user?.role || ""),
        meta: {
          customOrderId: String(doc._id),
          status: normalizedStatus || doc.status,
        },
      });
    }

    if (normalizedStatus === "respinsa") {
      await notifyUser(doc.clientId, {
        titlu: "Cererea personalizata a fost oprita",
        mesaj:
          normalizedNote ||
          "Atelierul nu poate continua aceasta varianta. Deschide cererea pentru detaliile complete.",
        tip: "warning",
        link: `/personalizari/oferta/${doc._id}`,
        prestatorId: doc.prestatorId,
        actorId: req.user?._id || req.user?.id,
        actorRole: String(req.user?.rol || req.user?.role || ""),
        meta: {
          customOrderId: String(doc._id),
          status: normalizedStatus,
        },
      });
    }

    res.json(doc);
  } catch (err) {
    console.error("Eroare la actualizarea comenzii:", err);
    res.status(500).json({ mesaj: "Eroare la actualizarea comenzii" });
  }
});

// Rapoarte pentru client - numar comenzi (statistica profil client)
router.get("/count/:userId", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    if (role !== "admin" && role !== "patiser" && String(req.user._id) !== String(req.params.userId)) {
      return res.status(403).json({ message: "Acces interzis" });
    }
    const count = await Comanda.countDocuments({ clientId: req.params.userId });
    res.json({ count });
  } catch (err) {
    console.error("Eroare la numarare comenzi:", err);
    res.status(500).send("Eroare la numarare comenzi");
  }
});

module.exports = router;
