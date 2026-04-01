const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Tort = require("../models/Tort");
const Comanda = require("../models/Comanda");
const ComandaPersonalizata = require("../models/ComandaPersonalizata");
const Utilizator = require("../models/Utilizator");
const { authRequired, roleCheck } = require("../middleware/auth");
const { applyScopedPrestatorFilter, getScopedPrestatorId } = require("../utils/providerScope");

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDateInput(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function formatLocalTimeInput(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function buildLocalDayRange(dateValue) {
  const [year, month, day] = String(dateValue || "")
    .split("-")
    .map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return {
    start: new Date(year, month - 1, day, 0, 0, 0, 0),
    end: new Date(year, month - 1, day, 23, 59, 59, 999),
  };
}

function buildClientProfile(user = {}, fallbackName = "") {
  const fullName = [user.nume, user.prenume].filter(Boolean).join(" ").trim();
  return {
    clientName: fullName || String(fallbackName || "").trim(),
    clientEmail: String(user.email || "").trim(),
    clientPhone: String(user.telefon || "").trim(),
  };
}

function getLatestStatusNote(statusHistory = []) {
  if (!Array.isArray(statusHistory) || !statusHistory.length) {
    return "";
  }

  const latestEntry = [...statusHistory]
    .filter((entry) => entry && typeof entry === "object")
    .sort((left, right) => new Date(right.at || 0) - new Date(left.at || 0))[0];

  return String(latestEntry?.note || "").trim();
}

function isLikelyImageUrl(value) {
  const source = String(value || "").trim().toLowerCase();
  if (!source) return false;
  if (source.startsWith("data:image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(source);
}

function collectReferenceImages(values = []) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => {
          if (Array.isArray(value)) return value;
          return [value];
        })
        .map((value) => String(value || "").trim())
        .filter((value) => isLikelyImageUrl(value))
    )
  );
}

function collectCustomOrderImages(order) {
  const options = order?.options && typeof order.options === "object" ? order.options : {};
  const inspirationImages = Array.isArray(options.inspirationImages)
    ? options.inspirationImages.map((item) => item?.url)
    : [];
  const aiVariants = Array.isArray(options.aiPreviewVariants)
    ? options.aiPreviewVariants.map((item) => item?.imageUrl)
    : [];

  return collectReferenceImages([
    order?.imagine,
    options.aiPreviewUrl,
    inspirationImages,
    aiVariants,
  ]);
}

router.get(
  "/recipes",
  authRequired,
  roleCheck("admin", "patiser"),
  async (_req, res) => {
    try {
      const torturi = await Tort.find({ activ: true }).lean();
      res.json(torturi);
    } catch (e) {
      console.error("admin/recipes error:", e);
      res.status(500).json({ message: "Eroare la incarcarea retetelor." });
    }
  }
);

router.post(
  "/recipes",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const {
        nume,
        descriere,
        pret,
        imagine,
        retetaBaseKg,
        reteta,
        portii,
        categorie,
        ocazii,
      } = req.body || {};

      if (!nume || !String(nume).trim()) {
        return res.status(400).json({ message: "Numele tortului este obligatoriu." });
      }

      if (!Array.isArray(reteta) || !reteta.length) {
        return res.status(400).json({ message: "Reteta trebuie sa contina cel putin un ingredient." });
      }

      const tort = new Tort({
        nume: String(nume).trim(),
        descriere: String(descriere || "").trim(),
        pret: Number(pret || 0),
        imagine: String(imagine || "").trim(),
        retetaBaseKg: Number(retetaBaseKg || 1) || 1,
        reteta: reteta.map((item) => ({
          ingredient: String(item.ingredient || "").trim(),
          qty: Number(item.qty || 0),
          unit: String(item.unit || "g").trim(),
          note: String(item.note || "").trim(),
        })),
        portii: Number(portii || 0),
        categorie: categorie || "torturi",
        ocazii: Array.isArray(ocazii) ? ocazii : [],
        activ: true,
      });
      await tort.save();
      res.status(201).json({ ok: true, tort });
    } catch (e) {
      console.error("admin/recipes create error:", e);
      res.status(500).json({ message: "Eroare la crearea retetei." });
    }
  }
);

router.put(
  "/recipes/:id",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { retetaBaseKg, reteta } = req.body || {};
      if (!Array.isArray(reteta)) {
        return res.status(400).json({ message: "reteta trebuie sa fie array" });
      }
      const tort = await Tort.findById(id);
      if (!tort) return res.status(404).json({ message: "Tort inexistent" });
      tort.retetaBaseKg = Number(retetaBaseKg) || tort.retetaBaseKg || 1;
      tort.reteta = reteta.map((item) => ({
        ingredient: String(item.ingredient || "").trim(),
        qty: Number(item.qty || 0),
        unit: String(item.unit || "g").trim(),
        note: String(item.note || ""),
      }));
      await tort.save();
      res.json({ ok: true, tort });
    } catch (e) {
      console.error("admin/recipes update error:", e);
      res.status(500).json({ message: "Eroare la salvarea retetei." });
    }
  }
);

router.get(
  "/board",
  authRequired,
  roleCheck("admin", "patiser"),
  async (req, res) => {
    try {
      const date = req.query.date || formatLocalDateInput(new Date());
      const conditions = [
        { dataLivrare: date },
        { dataRezervare: date },
      ];
      const orders = await Comanda.find(
        applyScopedPrestatorFilter(req, { $or: conditions })
      )
        .sort({ oraLivrare: 1, oraRezervare: 1 })
        .lean();
      const dayRange = buildLocalDayRange(date);
      const startOfDay = dayRange?.start || new Date(`${date}T00:00:00`);
      const endOfDay = dayRange?.end || new Date(`${date}T23:59:59.999`);
      const scopedPrestatorId = getScopedPrestatorId(req);
      const customConditions = {
        data: { $gte: startOfDay, $lt: endOfDay },
        $or: [{ comandaId: null }, { comandaId: { $exists: false } }],
      };
      if (scopedPrestatorId) {
        customConditions.prestatorId = scopedPrestatorId;
      }
      const customOrders = await ComandaPersonalizata.find(customConditions).lean();

      const clientIds = new Set();
      orders.forEach((order) => {
        const value = String(order.clientId || "").trim();
        if (mongoose.Types.ObjectId.isValid(value)) {
          clientIds.add(value);
        }
      });
      customOrders.forEach((order) => {
        const value = String(order.clientId || "").trim();
        if (mongoose.Types.ObjectId.isValid(value)) {
          clientIds.add(value);
        }
      });

      const users = clientIds.size
        ? await Utilizator.find(
            { _id: { $in: Array.from(clientIds) } },
            { nume: 1, prenume: 1, email: 1, telefon: 1 }
          ).lean()
        : [];
      const userMap = new Map(users.map((user) => [String(user._id), user]));

      const mappedOrders = orders.map((order) => {
        const time =
          order.oraLivrare ||
          order.oraRezervare ||
          order.calendarSlot?.time ||
          "";
        const items = Array.isArray(order.items)
          ? order.items
          : Array.isArray(order.produse)
            ? order.produse
            : [];
        const clientProfile = buildClientProfile(
          userMap.get(String(order.clientId || "").trim()) || {},
          order.clientId
        );
        const weightVal = items.reduce((sum, item) => {
          const base =
            Number(item.cantitate || item.qty || 0) || 0;
          return sum + base;
        }, 0);
        const referenceImages = collectReferenceImages([
          order.imagineGenerata,
          Array.isArray(order.attachments)
            ? order.attachments
                .map((attachment) => attachment?.url)
                .filter(Boolean)
            : [],
          items.map((item) => item?.personalizari?.imagini?.[0] || ""),
        ]);
        const latestStatusNote = getLatestStatusNote(order.statusHistory);

        return {
          orderId: order._id,
          numeroComanda: order.numeroComanda,
          clientId: order.clientId,
          clientName: clientProfile.clientName,
          clientEmail: clientProfile.clientEmail,
          clientPhone: clientProfile.clientPhone,
          data: order.dataLivrare || order.dataRezervare,
          time,
          method: order.metodaLivrare,
          status: order.status || order.statusComanda,
          payment: order.paymentStatus || order.statusPlata,
          weightKg: weightVal,
          total: order.totalFinal || order.total || 0,
          notes: order.notesAdmin || order.notesClient || "",
          notesClient: order.notesClient || "",
          notesAdmin: order.notesAdmin || "",
          latestStatusNote,
          customDescription:
            String(order.customDetails?.descriere || order.preferinte || "").trim(),
          address: String(order.adresaLivrare || "").trim(),
          deliveryWindow: String(order.deliveryWindow || "").trim(),
          deliveryInstructions: String(order.deliveryInstructions || "").trim(),
          attachments: Array.isArray(order.attachments) ? order.attachments : [],
          items: items.map((item) => ({
            name: item.name || item.nume || "Produs",
            qty: item.qty || item.cantitate || 0,
            personalizari: item.personalizari || {},
          })),
          image: referenceImages[0] || "",
          referenceImages,
        };
      });

      const customBoard = customOrders.map((order) => {
        const orderDate = order.data ? new Date(order.data) : startOfDay;
        const formattedDate = formatLocalDateInput(orderDate);
        const formattedTime = formatLocalTimeInput(orderDate);
        const weightFromOptions =
          Number(order.options?.kg || order.options?.cantitate || order.options?.greutate || 0) || 0;
        const clientProfile = buildClientProfile(
          userMap.get(String(order.clientId || "").trim()) || {},
          order.numeClient || order.clientId
        );
        const referenceImages = collectCustomOrderImages(order);
        return {
          orderId: order._id,
          numeroComanda: order._id,
          clientId: order.clientId || order.numeClient,
          clientName: clientProfile.clientName,
          clientEmail: clientProfile.clientEmail,
          clientPhone: clientProfile.clientPhone,
          data: formattedDate,
          time: formattedTime,
          method: "personalizat",
          status: order.status,
          payment: "estimare",
          weightKg: weightFromOptions,
          total: order.pretEstimat || 0,
          notes: order.preferinte || "",
          notesClient: order.preferinte || "",
          notesAdmin: "",
          latestStatusNote: getLatestStatusNote(order.statusHistory),
          customDescription: String(order.preferinte || "").trim(),
          address: "",
          deliveryWindow: "",
          deliveryInstructions: "",
          attachments: [],
          items: [
            {
              name: "Design personalizat",
              qty: 1,
              personalizari: order.options || {},
            },
          ],
          image: referenceImages[0] || "",
          referenceImages,
          source: "personalizata",
        };
      });

      const combined = [...mappedOrders, ...customBoard];
      combined.sort((a, b) => {
        const keyA = `${a.data || ""}-${a.time || ""}`;
        const keyB = `${b.data || ""}-${b.time || ""}`;
        return keyA.localeCompare(keyB);
      });

      res.json({ date, board: combined });
    } catch (e) {
      console.error("admin/board error:", e);
      res.status(500).json({ message: "Eroare la incarcarea boardului." });
    }
  }
);

module.exports = router;
