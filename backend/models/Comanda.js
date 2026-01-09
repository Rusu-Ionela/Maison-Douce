const mongoose = require("mongoose");

/**
 * Schema flexibilă pentru a acoperi atât comenzile clasice cât și cele din calendar
 * (vedeți backend/routes/comenzi.js și backend/routes/calendar.js).
 */
const ItemSchema = new mongoose.Schema(
  {
    productId: mongoose.Schema.Types.Mixed, // poate fi ObjectId sau string
    tortId: mongoose.Schema.Types.Mixed,
    name: String,
    nume: String, // compat vechi
    qty: Number,
    cantitate: Number, // compat vechi
    price: Number,
    pret: Number, // compat vechi
    lineTotal: Number,
    personalizari: {
      blat: String,
      crema: String,
      decor: String,
      mesaj: String,
    },
  },
  { _id: false }
);

const ComandaSchema = new mongoose.Schema(
  {
    // Identificare / relații
    clientId: { type: mongoose.Schema.Types.Mixed }, // poate fi string sau ObjectId
    utilizatorId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilizator" },
    prestatorId: { type: String, default: "default" },
    numeroComanda: { type: String, unique: true, sparse: true },

    // Produse
    items: [ItemSchema],
    produse: [ItemSchema], // compat vechi

    // Sume
    subtotal: { type: Number, default: 0 },
    taxaLivrare: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 }, // alias pentru calendar
    total: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    discountFidelizare: { type: Number, default: 0 },
    voucherCode: { type: String, default: "" },
    pointsUsed: { type: Number, default: 0 },
    totalFinal: { type: Number, default: 0 },

    // Livrare / ridicare
    metodaLivrare: {
      type: String,
      enum: ["ridicare", "livrare", "pickup", "delivery", "courier"],
      default: "ridicare",
    },
    adresaLivrare: String,
    handoffStatus: String, // compat calendar
    handoffMethod: String, // compat calendar

    // Date/ore
    dataLivrare: String,
    oraLivrare: String,
    dataRezervare: String,
    oraRezervare: String,
    calendarSlot: {
      date: String,
      time: String,
    },

    // Statusuri
    status: { type: String, default: "plasata" },
    statusComanda: { type: String, default: "inregistrata" },
    statusPlata: { type: String, default: "unpaid" },
    paymentStatus: { type: String, default: "unpaid" },
    motivRefuz: { type: String, default: "" },
    statusHistory: [{
      status: String,
      at: { type: Date, default: Date.now },
      note: String,
    }],

    // Stripe / plată
    metodaPlata: { type: String, default: "card" },
    stripePaymentId: String,

    // Alte câmpuri utilizate în rute
    tip: String,
    note: String,
    preferinte: String,
    imagineGenerata: String,
    customDetails: mongoose.Schema.Types.Mixed,
    tortId: mongoose.Schema.Types.Mixed,

    // Observații / administrativ
    notesClient: String,
    notesAdmin: String,
  },
  { timestamps: true }
);

function generateNumeroComanda() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CMD-${now}-${rand}`;
}

ComandaSchema.pre("validate", function (next) {
  if (!this.numeroComanda) this.numeroComanda = generateNumeroComanda();
  next();
});

ComandaSchema.pre("insertMany", function (next, docs) {
  if (Array.isArray(docs)) {
    docs.forEach((doc) => {
      if (doc && !doc.numeroComanda) doc.numeroComanda = generateNumeroComanda();
    });
  }
  next();
});

ComandaSchema.index({ prestatorId: 1, dataLivrare: 1, oraLivrare: 1 });
ComandaSchema.index({ prestatorId: 1, dataRezervare: 1, oraRezervare: 1 });

module.exports =
  mongoose.models.Comanda || mongoose.model("Comanda", ComandaSchema);
