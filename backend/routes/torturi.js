const express = require("express");
const router = express.Router();
const Tort = require("../models/Tort");
const { authRequired, roleCheck } = require("../middleware/auth");
const { withValidation } = require("../middleware/validate");
const {
  readArray,
  readBoolean,
  readEnum,
  readMongoId,
  readNumber,
  readString,
} = require("../utils/validation");
const {
  cleanupUploadedFiles,
  createUploadMiddleware,
  toPublicUploadPath,
  withUpload,
} = require("../utils/multer");
const { recordAuditLog } = require("../utils/audit");

const upload = createUploadMiddleware({
  subdir: "torturi",
  profile: "images",
  maxFileSizeMb: 5,
});

const SORT_OPTIONS = ["price_asc", "price_desc", "rating", "popular"];

function maybeUpload(req, res, next) {
  if (req.is("multipart/form-data")) {
    return withUpload(upload.single("imagine"))(req, res, next);
  }
  return next();
}

function parseArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return val
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function parseStringList(value, field, maxItems = 20) {
  const list = readArray(value, {
    field,
    maxItems,
    defaultValue: [],
    parser: (item, index) =>
      readString(item, {
        field: `${field}[${index}]`,
        max: 120,
        defaultValue: "",
      }),
  });

  return list.filter(Boolean);
}

router.get(
  "/",
  withValidation((req) => ({
    q: readString(req.query?.q, {
      field: "q",
      max: 120,
      defaultValue: "",
    }),
    categorie: readEnum(req.query?.categorie, ["torturi", "prajituri"], {
      field: "categorie",
      defaultValue: "",
    }),
    activ:
      req.query?.activ == null
        ? undefined
        : readBoolean(req.query?.activ, {
            field: "activ",
            required: true,
          }),
    page: readNumber(req.query?.page, {
      field: "page",
      min: 1,
      max: 1000,
      integer: true,
      defaultValue: 1,
    }),
    limit: readNumber(req.query?.limit, {
      field: "limit",
      min: 1,
      max: 48,
      integer: true,
      defaultValue: 12,
    }),
    ocazie: parseStringList(req.query?.ocazie, "ocazie", 12),
    stil: readString(req.query?.stil, {
      field: "stil",
      max: 80,
      defaultValue: "",
    }),
    marime: readString(req.query?.marime, {
      field: "marime",
      max: 80,
      defaultValue: "",
    }),
    pretMin: readNumber(req.query?.pretMin, {
      field: "pretMin",
      min: 0,
      defaultValue: undefined,
    }),
    pretMax: readNumber(req.query?.pretMax, {
      field: "pretMax",
      min: 0,
      defaultValue: undefined,
    }),
    portiiMin: readNumber(req.query?.portiiMin, {
      field: "portiiMin",
      min: 0,
      integer: true,
      defaultValue: undefined,
    }),
    portiiMax: readNumber(req.query?.portiiMax, {
      field: "portiiMax",
      min: 0,
      integer: true,
      defaultValue: undefined,
    }),
    ratingMin: readNumber(req.query?.ratingMin, {
      field: "ratingMin",
      min: 0,
      max: 5,
      defaultValue: undefined,
    }),
    promo:
      req.query?.promo == null
        ? undefined
        : readBoolean(req.query?.promo, {
            field: "promo",
            required: true,
          }),
    sort: readEnum(req.query?.sort, SORT_OPTIONS, {
      field: "sort",
      defaultValue: "",
    }),
    excludeIngrediente: parseStringList(
      req.query?.excludeIngrediente,
      "excludeIngrediente",
      30
    ),
    excludeAlergeni: parseStringList(
      req.query?.excludeAlergeni,
      "excludeAlergeni",
      30
    ),
  }), async (req, res) => {
    try {
      const {
        q,
        categorie,
        activ,
        page,
        limit,
        ocazie,
        stil,
        marime,
        pretMin,
        pretMax,
        portiiMin,
        portiiMax,
        ratingMin,
        promo,
        sort,
        excludeIngrediente,
        excludeAlergeni,
      } = req.validated;

      const filter = {};
      if (categorie) filter.categorie = categorie;
      if (activ !== undefined) filter.activ = activ;
      if (stil) filter.stil = stil;
      if (marime) filter.marime = marime;
      if (promo !== undefined) filter.promo = promo;
      if (ocazie.length) {
        filter.ocazii = { $in: ocazie };
      }
      if (pretMin != null || pretMax != null) {
        filter.pret = {};
        if (pretMin != null) filter.pret.$gte = pretMin;
        if (pretMax != null) filter.pret.$lte = pretMax;
      }
      if (portiiMin != null || portiiMax != null) {
        filter.portii = {};
        if (portiiMin != null) filter.portii.$gte = portiiMin;
        if (portiiMax != null) filter.portii.$lte = portiiMax;
      }
      if (ratingMin != null) filter.ratingAvg = { $gte: ratingMin };
      if (excludeIngrediente.length) {
        filter.ingrediente = { $nin: excludeIngrediente };
      }
      if (excludeAlergeni.length) {
        filter.alergeniFolositi = { $nin: excludeAlergeni };
      }
      if (q) {
        filter.$or = [
          { nume: { $regex: q, $options: "i" } },
          { descriere: { $regex: q, $options: "i" } },
        ];
      }

      let sortBy = { createdAt: -1 };
      if (sort === "price_asc") sortBy = { pret: 1 };
      if (sort === "price_desc") sortBy = { pret: -1 };
      if (sort === "rating") sortBy = { ratingAvg: -1, ratingCount: -1 };
      if (sort === "popular") sortBy = { ratingCount: -1, ratingAvg: -1 };

      const [items, total] = await Promise.all([
        Tort.find(filter)
          .sort(sortBy)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Tort.countDocuments(filter),
      ]);

      res.json({
        items,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  })
);

router.post(
  "/",
  authRequired,
  roleCheck("admin", "patiser"),
  maybeUpload,
  async (req, res) => {
    try {
      const ingredienteList = parseArray(req.body.ingrediente);
      const galerieList = parseArray(req.body.galerie);
      const aromeList = parseArray(req.body.arome);
      const ocaziiList = parseArray(req.body.ocazii || req.body.ocazie);
      const alergeniList = parseArray(req.body.alergeniFolositi || req.body.alergeni);

      const data = {
        ...req.body,
        ingrediente: ingredienteList,
        galerie: galerieList,
        arome: aromeList,
        ocazii: ocaziiList,
        alergeniFolositi: alergeniList,
        imagine: req.file ? toPublicUploadPath("torturi", req.file.filename) : undefined,
        pret: Number(req.body.pret || 0),
        costEstim: Number(req.body.costEstim || 0),
        pretVechi: Number(req.body.pretVechi || 0),
        stoc: Number(req.body.stoc || 0),
        portii: Number(req.body.portii || 0),
        timpPreparareOre: Number(req.body.timpPreparareOre || 0),
        activ: req.body.activ !== "false",
      };

      const tort = await Tort.create(data);
      await recordAuditLog(req, {
        action: "catalog.cake.created",
        entityType: "tort",
        entityId: tort._id,
        summary: `Tort creat: ${tort.nume || tort._id}`,
        metadata: {
          nume: tort.nume || "",
          categorie: tort.categorie || "",
        },
      });
      res.status(201).json(tort);
    } catch (err) {
      cleanupUploadedFiles(req);
      res.status(400).json({ message: err.message });
    }
  }
);

router.get(
  "/:id",
  withValidation((req) => ({
    id: readMongoId(req.params?.id, {
      field: "id",
      required: true,
    }),
  }), async (req, res) => {
    try {
      const tort = await Tort.findById(req.validated.id);
      if (!tort) return res.status(404).json({ message: "Tort negasit" });
      res.json(tort);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  })
);

router.put(
  "/:id",
  authRequired,
  roleCheck("admin", "patiser"),
  maybeUpload,
  withValidation((req) => ({
    id: readMongoId(req.params?.id, {
      field: "id",
      required: true,
    }),
  }), async (req, res) => {
    try {
      const ingredienteList = parseArray(req.body.ingrediente);
      const galerieList = parseArray(req.body.galerie);
      const aromeList = parseArray(req.body.arome);
      const ocaziiList = parseArray(req.body.ocazii || req.body.ocazie);
      const alergeniList = parseArray(req.body.alergeniFolositi || req.body.alergeni);

      const data = {
        ...req.body,
        ingrediente: ingredienteList.length ? ingredienteList : undefined,
        galerie: galerieList.length ? galerieList : undefined,
        arome: aromeList.length ? aromeList : undefined,
        ocazii: ocaziiList.length ? ocaziiList : undefined,
        alergeniFolositi: alergeniList.length ? alergeniList : undefined,
        pret: Number(req.body.pret || 0),
        costEstim: Number(req.body.costEstim || 0),
        pretVechi: Number(req.body.pretVechi || 0),
        stoc: Number(req.body.stoc || 0),
      };
      if (req.body.portii != null) data.portii = Number(req.body.portii || 0);
      if (req.body.timpPreparareOre != null) {
        data.timpPreparareOre = Number(req.body.timpPreparareOre || 0);
      }
      if (req.body.promo != null) data.promo = String(req.body.promo) === "true";
      if (req.body.stil != null) data.stil = req.body.stil;
      if (req.body.marime != null) data.marime = req.body.marime;

      if (req.file) {
        data.imagine = toPublicUploadPath("torturi", req.file.filename);
      }

      const tort = await Tort.findByIdAndUpdate(req.validated.id, data, {
        new: true,
        runValidators: true,
      });

      if (!tort) return res.status(404).json({ message: "Tort negasit" });
      await recordAuditLog(req, {
        action: "catalog.cake.updated",
        entityType: "tort",
        entityId: tort._id,
        summary: `Tort actualizat: ${tort.nume || tort._id}`,
        metadata: {
          nume: tort.nume || "",
        },
      });
      res.json(tort);
    } catch (err) {
      cleanupUploadedFiles(req);
      res.status(400).json({ message: err.message });
    }
  })
);

router.delete(
  "/:id",
  authRequired,
  roleCheck("admin", "patiser"),
  withValidation((req) => ({
    id: readMongoId(req.params?.id, {
      field: "id",
      required: true,
    }),
  }), async (req, res) => {
    try {
      const tort = await Tort.findByIdAndDelete(req.validated.id);
      if (!tort) return res.status(404).json({ message: "Tort negasit" });
      await recordAuditLog(req, {
        action: "catalog.cake.deleted",
        entityType: "tort",
        entityId: tort._id,
        summary: `Tort sters: ${tort.nume || tort._id}`,
        metadata: {
          nume: tort.nume || "",
        },
      });
      res.json({ message: "Tort sters cu succes" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  })
);

module.exports = router;
