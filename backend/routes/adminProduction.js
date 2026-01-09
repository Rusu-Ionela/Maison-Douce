const express = require("express");
const router = express.Router();
const Tort = require("../models/Tort");
const Comanda = require("../models/Comanda");
const ComandaPersonalizata = require("../models/ComandaPersonalizata");
const { authRequired, roleCheck } = require("../middleware/auth");

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
      const date =
        req.query.date || new Date().toISOString().slice(0, 10);
      const conditions = [
        { dataLivrare: date },
        { dataRezervare: date },
      ];
      const orders = await Comanda.find({ $or: conditions })
        .sort({ oraLivrare: 1, oraRezervare: 1 })
        .lean();
      const startOfDay = new Date(`${date}T00:00:00Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      const customOrders = await ComandaPersonalizata.find({
        data: { $gte: startOfDay, $lt: endOfDay },
      }).lean();

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
        const weightVal = items.reduce((sum, item) => {
          const base =
            Number(item.cantitate || item.qty || 0) || 0;
          return sum + base;
        }, 0);
        const image =
          order.imagineGenerata ||
          (items[0]?.personalizari?.imagini?.[0] || "") ||
          "";

        return {
          orderId: order._id,
          numeroComanda: order.numeroComanda,
          clientId: order.clientId,
          data: order.dataLivrare || order.dataRezervare,
          time,
          method: order.metodaLivrare,
          status: order.status || order.statusComanda,
          payment: order.paymentStatus || order.statusPlata,
          weightKg: weightVal,
          total: order.totalFinal || order.total || 0,
          notes: order.notesAdmin || order.notesClient || "",
          items: items.map((item) => ({
            name: item.name || item.nume || "Produs",
            qty: item.qty || item.cantitate || 0,
            personalizari: item.personalizari || {},
          })),
          image,
        };
      });

      const customBoard = customOrders.map((order) => {
        const orderDate = order.data ? new Date(order.data) : startOfDay;
        const formattedDate = orderDate.toISOString().slice(0, 10);
        const formattedTime = orderDate.toISOString().slice(11, 16);
        const weightFromOptions =
          Number(order.options?.kg || order.options?.cantitate || order.options?.greutate || 0) || 0;
        return {
          orderId: order._id,
          numeroComanda: order._id,
          clientId: order.clientId || order.numeClient,
          data: formattedDate,
          time: formattedTime,
          method: "personalizat",
          status: order.status,
          payment: "estimare",
          weightKg: weightFromOptions,
          total: order.pretEstimat || 0,
          notes: order.preferinte || "",
          items: [
            {
              name: "Design personalizat",
              qty: 1,
              personalizari: order.options || {},
            },
          ],
          image: order.imagine || "",
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
