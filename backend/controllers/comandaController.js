// backend/controllers/comandaController.js
const Comanda = require("../models/Comanda");

function normalizeItems(payloadItems = [], payloadProduse = []) {
    const src = Array.isArray(payloadItems) && payloadItems.length ? payloadItems : payloadProduse;
    return (src || []).map((it) => {
        const productId = it.productId || it.id || it._id || null;
        const name = it.name || it.nume || it.title || "Produs";
        const qty = Number(it.qty ?? it.cantitate ?? it.quantity ?? 1);
        const price = Number(it.price ?? it.pret ?? it.unitPrice ?? 0);
        const lineTotal = +(qty * price).toFixed(2);
        return { productId, name, qty, price, lineTotal };
    });
}

exports.creeazaComanda = async (req, res) => {
    try {
        const {
            clientId,
            items,                       // preferat
            produse,                     // alias acceptat
            metodaLivrare,               // "ridicare" | "livrare"
            adresaLivrare,
            note,
        } = req.body;

        if (!clientId) return res.status(400).json({ message: "clientId required" });

        const normItems = normalizeItems(items, produse);
        if (!normItems.length) return res.status(400).json({ message: "Empty items" });

        const subtotal = +normItems.reduce((s, it) => s + it.lineTotal, 0).toFixed(2);
        const isDelivery = metodaLivrare === "livrare";
        const deliveryFee = isDelivery ? 100 : 0; // REGULA ta curentă
        const total = +(subtotal + deliveryFee).toFixed(2);

        if (isDelivery && !adresaLivrare) {
            return res.status(400).json({ message: "adresaLivrare required for livrare" });
        }

        const doc = await Comanda.create({
            clientId,
            items: normItems,
            subtotal,
            deliveryFee,
            total,
            metodaLivrare: isDelivery ? "livrare" : "ridicare",
            adresaLivrare: isDelivery ? adresaLivrare : undefined,
            status: "plasata",
            note: note || undefined,
        });

        res.status(201).json(doc);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

exports.getComenzi = async (_req, res) => {
    try {
        const list = await Comanda.find().sort({ createdAt: -1 }).lean();
        res.json(list);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

exports.getComenziClient = async (req, res) => {
    try {
        const { clientId } = req.params;
        const list = await Comanda.find({ clientId }).sort({ createdAt: -1 }).lean();
        // normalize la citire (în caz că ai comenzi vechi cu `produse`)
        const out = list.map((c) => ({
            ...c,
            items: (c.items && c.items.length) ? c.items : (c.produse ? normalizeItems([], c.produse) : []),
        }));
        res.json(out);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};
