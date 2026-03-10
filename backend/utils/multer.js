const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

const FILE_PROFILES = {
  images: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  },
  shared: {
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    extensions: [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".gif",
      ".pdf",
      ".txt",
      ".csv",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
    ],
  },
};

function ensureUploadDir(subdir = "") {
  const dir = path.join(UPLOADS_ROOT, subdir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function safeUnlink(filePath) {
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function buildUniqueFilename(originalName = "") {
  const ext = path.extname(originalName || "").toLowerCase();
  const unique = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${unique}${ext}`;
}

function createUploadMiddleware(options = {}) {
  const {
    subdir = "",
    profile = "shared",
    maxFileSizeMb = 5,
  } = options;

  const profileConfig = FILE_PROFILES[profile] || FILE_PROFILES.shared;
  const destination = ensureUploadDir(subdir);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => cb(null, buildUniqueFilename(file.originalname)),
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const mimeOk = profileConfig.mimeTypes.includes(file.mimetype);
      const extOk = profileConfig.extensions.includes(ext);

      if (!mimeOk || !extOk) {
        return cb(
          new Error(
            `Fisierul ${file.originalname || "upload"} nu este permis pentru upload.`
          )
        );
      }

      return cb(null, true);
    },
  });
}

function formatUploadError(err) {
  if (!err) return null;
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return "Fisierul depaseste dimensiunea maxima permisa.";
    }
    return `Eroare upload: ${err.message}`;
  }
  return err.message || "Upload invalid.";
}

function withUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: formatUploadError(err) });
      }
      return next();
    });
  };
}

function cleanupUploadedFiles(req) {
  const files = [];

  if (req?.file?.path) {
    files.push(req.file.path);
  }

  if (Array.isArray(req?.files)) {
    req.files.forEach((file) => {
      if (file?.path) files.push(file.path);
    });
  } else if (req?.files && typeof req.files === "object") {
    Object.values(req.files).forEach((group) => {
      if (Array.isArray(group)) {
        group.forEach((file) => {
          if (file?.path) files.push(file.path);
        });
      }
    });
  }

  files.forEach(safeUnlink);
}

function toPublicUploadPath(subdir = "", filename = "") {
  const normalizedSubdir = String(subdir || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalizedSubdir) return `/uploads/${filename}`;
  return `/uploads/${normalizedSubdir}/${filename}`;
}

module.exports = {
  FILE_PROFILES,
  UPLOADS_ROOT,
  cleanupUploadedFiles,
  createUploadMiddleware,
  ensureUploadDir,
  formatUploadError,
  toPublicUploadPath,
  withUpload,
};
