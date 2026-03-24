// backend/models/Utilizator.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { normalizeUserRole, isProviderRole } = require("../utils/roles");

const PointsTxnSchema = new mongoose.Schema({
    type: { type: String, enum: ["earn", "spend", "adjust"], required: true },
    points: { type: Number, required: true },
    reason: String,
    refId: String,
    at: { type: Date, default: Date.now },
}, { _id: false });

const AddressSchema = new mongoose.Schema(
    {
        label: { type: String, default: "Acasa" },
        address: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
    },
    { _id: false }
);

const UtilizatorSchema = new mongoose.Schema({
    nume: String,
    prenume: String,
    email: { type: String, unique: true, lowercase: true, trim: true, required: true },
    rol: { type: String, enum: ["client", "admin", "patiser", "prestator"], default: "client" },
    activ: { type: Boolean, default: true },
    deactivatedAt: { type: Date, default: null },
    lastPasswordChangeAt: { type: Date, default: null },

    telefon: String,
    adresa: String,
    adreseSalvate: { type: [AddressSchema], default: [] },
    preferinte: {
        alergii: { type: [String], default: [] },
        evit: { type: [String], default: [] },
        note: { type: String, default: "" },
    },
    setariNotificari: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
    },
    providerProfile: {
        displayName: { type: String, default: "" },
        slug: { type: String, default: "" },
        bio: { type: String, default: "" },
        isPublic: { type: Boolean, default: true },
        isDefaultProvider: { type: Boolean, default: false },
        acceptsOrders: { type: Boolean, default: true },
    },

    // reset parola (token temporar)
    resetToken: { type: String, default: "" },
    resetTokenExp: { type: Date },

    // folosim doar parolaHash; ținem compat cu 'parola' dacă există deja
    parolaHash: { type: String, select: false },
    parola: { type: String, select: false }, // DOAR pt compat (va fi ștearsă la next-save)

    pointsBalance: { type: Number, default: 0 },
    pointsHistory: [PointsTxnSchema],
}, { timestamps: true });

UtilizatorSchema.methods.setPassword = async function setPassword(plain) {
    const salt = await bcrypt.genSalt(10);
    this.parolaHash = await bcrypt.hash(plain, salt);
    this.parola = undefined;
    this.lastPasswordChangeAt = new Date();
};

UtilizatorSchema.methods.comparePassword = async function comparePassword(plain) {
    const hash = this.parolaHash || this.parola;
    if (!hash) return false;
    return bcrypt.compare(plain, hash);
};

UtilizatorSchema.pre("validate", function normalizeRoleAndProviderProfile(next) {
    this.rol = normalizeUserRole(this.rol || this.role || "client");

    if (!isProviderRole(this.rol)) {
        if (this.providerProfile && typeof this.providerProfile === "object") {
            this.providerProfile.displayName = this.providerProfile.displayName || "";
            this.providerProfile.slug = this.providerProfile.slug || "";
            this.providerProfile.bio = this.providerProfile.bio || "";
            this.providerProfile.isDefaultProvider = false;
        }
        return next();
    }

    const displayName =
        String(this.providerProfile?.displayName || "").trim() ||
        [this.nume, this.prenume].filter(Boolean).join(" ").trim() ||
        String(this.email || "").trim();
    const slugSource = String(
        this.providerProfile?.slug ||
        displayName ||
        this.email ||
        this._id ||
        ""
    )
        .trim()
        .toLowerCase();

    this.providerProfile = {
        displayName,
        slug: slugSource
            .normalize("NFKD")
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-"),
        bio: String(this.providerProfile?.bio || "").trim(),
        isPublic: this.providerProfile?.isPublic !== false,
        isDefaultProvider: Boolean(this.providerProfile?.isDefaultProvider),
        acceptsOrders: this.providerProfile?.acceptsOrders !== false,
    };

    next();
});

module.exports = mongoose.models.Utilizator || mongoose.model("Utilizator", UtilizatorSchema);
