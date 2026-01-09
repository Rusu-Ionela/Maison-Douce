const express = require("express");
const router = express.Router();
const Partajare = require("../models/Partajare");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const { authRequired } = require("../middleware/auth");

// Configurare Multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

function createLink() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

// Creare partajare fisiere
router.post("/creare", authRequired, upload.array("fisiere", 10), async (req, res) => {
  const { utilizatorId } = req.body || {};
  const role = req.user?.rol || req.user?.role;
  const ownerId = role === "admin" || role === "patiser" ? (utilizatorId || req.user._id) : req.user._id;

  const fisiere = (req.files || []).map((f) => `/uploads/${f.filename}`);
  if (!fisiere.length) {
    return res.status(400).json({ message: "Nu exista fisiere incarcate" });
  }

  const linkUnic = createLink();
  const partajare = new Partajare({ utilizatorId: ownerId, fisiere, linkUnic });
  await partajare.save();

  const baseUrl = process.env.BASE_CLIENT_URL || "http://localhost:5173";
  res.json({ link: `${baseUrl.replace(/\/$/, "")}/partajare/${linkUnic}` });
});

// Obtine partajarea dupa link
router.get("/:linkUnic", async (req, res) => {
  const partajare = await Partajare.findOne({ linkUnic: req.params.linkUnic });
  if (partajare) {
    res.json(partajare);
  } else {
    res.status(404).json({ message: "Link invalid" });
  }
});

module.exports = router;
