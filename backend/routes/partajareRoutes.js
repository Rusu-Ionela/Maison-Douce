const express = require("express");
const router = express.Router();
const Partajare = require("../models/Partajare");
const crypto = require("crypto");
const { authRequired } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const { cleanupUploadedFiles } = require("../utils/multer");
const { readMongoId } = require("../utils/validation");
const {
  createUploadMiddleware,
  toPublicUploadPath,
  withUpload,
} = require("../utils/multer");
const { resolveProviderForRequest } = require("../utils/providerDirectory");

const upload = createUploadMiddleware({
  subdir: "shared",
  profile: "shared",
  maxFileSizeMb: 10,
});

function createLink() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

router.post(
  "/creare",
  authRequired,
  withUpload(upload.array("fisiere", 10)),
  withValidation((req) => ({
    utilizatorId: readMongoId(req.body?.utilizatorId, {
      field: "utilizatorId",
      defaultValue: "",
    }),
  }), async (req, res) => {
    try {
      const role = req.user?.rol || req.user?.role;
      const ownerId =
        role === "admin" || role === "patiser"
          ? req.validated.utilizatorId || req.user._id
          : req.user._id;
      const prestatorId = await resolveProviderForRequest(
        req,
        req.body?.prestatorId || req.body?.providerId || ""
      );

      const fisiere = (req.files || []).map((file) =>
        toPublicUploadPath("shared", file.filename)
      );
      if (!fisiere.length) {
        return res.status(400).json({ message: "Nu exista fisiere incarcate" });
      }

      const linkUnic = createLink();
      const partajare = new Partajare({
        utilizatorId: ownerId,
        prestatorId,
        fisiere,
        linkUnic,
      });
      await partajare.save();

      const baseUrl = process.env.BASE_CLIENT_URL || "http://localhost:5173";
      res.json({ link: `${baseUrl.replace(/\/$/, "")}/partajare/${linkUnic}` });
    } catch (err) {
      cleanupUploadedFiles(req);
      throw err;
    }
  })
);

router.get("/:linkUnic", async (req, res) => {
  const partajare = await Partajare.findOne({ linkUnic: req.params.linkUnic });
  if (partajare) {
    res.json(partajare);
  } else {
    res.status(404).json({ message: "Link invalid" });
  }
});

module.exports = router;
