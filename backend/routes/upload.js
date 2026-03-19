const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { authRequired, roleCheck } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const { readString } = require("../utils/validation");
const {
  createUploadMiddleware,
  ensureUploadDir,
  toPublicUploadPath,
  withUpload,
} = require("../utils/multer");

const UPLOAD_SUBDIR = "misc";
const uploadDir = ensureUploadDir(UPLOAD_SUBDIR);
const upload = createUploadMiddleware({
  subdir: UPLOAD_SUBDIR,
  profile: "shared",
  maxFileSizeMb: 10,
});

router.post(
  "/",
  authRequired,
  withUpload(upload.single("file")),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Fisierul este obligatoriu." });
    }

    res.json({
      filename: req.file.filename,
      url: toPublicUploadPath(UPLOAD_SUBDIR, req.file.filename),
    });
  }
);

router.get("/", authRequired, roleCheck("admin"), (_req, res) => {
  const files = fs.readdirSync(uploadDir).map((name) => ({
    name,
    url: toPublicUploadPath(UPLOAD_SUBDIR, name),
  }));
  res.json(files);
});

router.delete(
  "/",
  authRequired,
  roleCheck("admin"),
  withValidation((req) => ({
    name: readString(req.body?.name, {
      field: "name",
      required: true,
      max: 255,
      pattern: /^[\w.-]+$/,
    }),
  }), (req, res) => {
    const filePath = path.join(uploadDir, req.validated.name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ ok: true });
  })
);

module.exports = router;
