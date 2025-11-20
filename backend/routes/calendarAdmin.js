// backend/routes/calendarAdmin.js
const router = require("express").Router();
const { Parser } = require("json2csv");
const Comanda = require("../models/Comanda");
const Rezervare = require("../models/Rezervare");

// GET /api/calendar-admin?date=YYYY-MM-DD
router.get("/", async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res
                .status(400)
                .json({ message: "Parametrul 'date' e obligatoriu (YYYY-MM-DD)" });
        }

        const [comenzi, rezervari] = await Promise.all([
            Comanda.find({ dataLivrare: date }).lean(),
            Rezervare.find({ date }).lean(),
        ]);

        const agenda = [];
        for (const c of comenzi) {
            agenda.push({
                hour: c.oraLivrare || "00:00",
                type: "order",
                item: c,
            });
        }
        for (const r of rezervari) {
            agenda.push({
                hour: (r.timeSlot || "00:00").split("-")[0],
                type: "booking",
                item: r,
            });
        }
        agenda.sort((a, b) => a.hour.localeCompare(b.hour));

        res.json({ date, agenda });
    } catch (e) {
        console.error("calendar-admin GET error:", e);
        res.status(500).json({ message: e.message || "Eroare server" });
    }
});

// GET /api/calendar-admin/export/csv?date=YYYY-MM-DD
router.get("/export/csv", async (req, res) => {
    try {
        const { date } = req.query;
        const filter = date ? { dataLivrare: date } : {};
        const comenzi = await Comanda.find(filter).lean();

        const rows = comenzi.map((c) => ({
            id: c._id?.toString(),
            data: c.dataLivrare || "",
            ora: c.oraLivrare || "",
            metoda: c.metodaLivrare || "",
            total: c.total || 0,
            status: c.status || "",
        }));

        const parser = new Parser({ withBOM: true });
        const csv = parser.parse(rows);

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="agenda_${date || "all"}.csv"`
        );
        res.status(200).send(csv);
    } catch (e) {
        console.error("calendar-admin CSV error:", e);
        res.status(500).json({ message: e.message || "Eroare export CSV" });
    }
});

module.exports = router;
