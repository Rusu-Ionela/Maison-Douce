const mongoose = require("mongoose");
const router = require("express").Router();
const { authRequired, roleCheck } = require("../middleware/auth");
const { adminMutationLimiter, adminReadLimiter } = require("../middleware/rateLimiters");
const { withValidation } = require("../middleware/validate");
const {
  readBoolean,
  readEnum,
  readMongoId,
  readNumber,
  readString,
} = require("../utils/validation");
const { recordAuditLog } = require("../utils/audit");
const Recenzie = require("../models/Recenzie");
const RecenzieComanda = require("../models/RecenzieComanda");
const RecenziePrestator = require("../models/RecenziePrestator");
const Comanda = require("../models/Comanda");
const Tort = require("../models/Tort");

const REVIEW_MODELS = {
  produs: Recenzie,
  comanda: RecenzieComanda,
  prestator: RecenziePrestator,
};

const REVIEW_FIELDS = {
  produs: {
    targetField: "tortId",
    authorField: "utilizator",
    ratingField: "stele",
    label: "recenzie produs",
  },
  comanda: {
    targetField: "comandaId",
    authorField: "clientId",
    ratingField: "nota",
    label: "recenzie comanda",
  },
  prestator: {
    targetField: "prestatorId",
    authorField: "utilizator",
    ratingField: "stele",
    label: "recenzie prestator",
  },
};

const MODERATION_STATUSES = ["pending", "approved", "hidden"];
const LEGACY_PUBLIC_MODERATION_FILTER = [
  { moderationStatus: "approved" },
  { moderationStatus: { $exists: false } },
  { moderationStatus: null },
  { moderationStatus: "" },
];

function getCurrentRole(req) {
  return String(req?.user?.rol || req?.user?.role || "");
}

function isStaff(req) {
  return ["admin", "patiser", "prestator"].includes(getCurrentRole(req));
}

function normalizeId(value) {
  return String(value || "");
}

function buildPublicFilter(extra = {}) {
  return {
    ...extra,
    $or: LEGACY_PUBLIC_MODERATION_FILTER,
  };
}

function buildReviewModel(reviewType) {
  return REVIEW_MODELS[reviewType] || null;
}

function buildReviewFields(reviewType) {
  return REVIEW_FIELDS[reviewType] || null;
}

function toObjectId(value) {
  const normalized = normalizeId(value);
  return mongoose.Types.ObjectId.isValid(normalized)
    ? new mongoose.Types.ObjectId(normalized)
    : null;
}

function buildOwnedOrdersQuery(authorId) {
  const normalizedAuthorId = normalizeId(authorId);
  const authorObjectId = toObjectId(normalizedAuthorId);
  const query = [{ clientId: normalizedAuthorId }];

  if (authorObjectId) {
    query.push({ clientId: authorObjectId });
    query.push({ utilizatorId: authorObjectId });
  }

  return { $or: query };
}

function isOwnedByUser(order, authorId) {
  const normalizedAuthorId = normalizeId(authorId);
  return (
    normalizeId(order?.clientId) === normalizedAuthorId ||
    normalizeId(order?.utilizatorId) === normalizedAuthorId
  );
}

function isCompletedOrder(order) {
  const status = String(order?.status || order?.statusComanda || "").trim().toLowerCase();
  const handoffStatus = String(order?.handoffStatus || "").trim().toLowerCase();

  return (
    ["completed", "livrata", "ridicata", "delivered", "picked_up", "ridicat_client"].includes(
      status
    ) ||
    ["delivered", "picked_up"].includes(handoffStatus)
  );
}

function orderContainsProduct(order, tortId) {
  const targetId = normalizeId(tortId);
  if (!targetId) return false;

  if (normalizeId(order?.tortId) === targetId) {
    return true;
  }

  return Array.isArray(order?.items)
    ? order.items.some(
        (item) =>
          normalizeId(item?.productId) === targetId || normalizeId(item?.tortId) === targetId
      )
    : false;
}

async function findEligibleCompletedOrder(reviewType, payload, authorId) {
  if (reviewType === "comanda") {
    const order = await Comanda.findById(payload.comandaId).lean();
    if (!order || !isOwnedByUser(order, authorId)) {
      return null;
    }
    return isCompletedOrder(order) ? order : null;
  }

  const query = buildOwnedOrdersQuery(authorId);
  if (reviewType === "prestator") {
    query.prestatorId = normalizeId(payload.prestatorId);
  }

  const orders = await Comanda.find(query).lean();
  return (
    orders.find((order) => {
      if (!isCompletedOrder(order)) return false;
      if (reviewType === "produs") {
        return orderContainsProduct(order, payload.tortId);
      }
      return true;
    }) || null
  );
}

async function ensureReviewEligibility(reviewType, payload, req) {
  const authorId = normalizeId(req.user?._id || req.user?.id);
  const eligibleOrder = await findEligibleCompletedOrder(reviewType, payload, authorId);

  if (eligibleOrder) {
    return null;
  }

  if (reviewType === "produs") {
    return {
      status: 409,
      body: {
        message:
          "Poti lasa o recenzie pentru produs doar dupa o comanda finalizata care include acest tort.",
      },
    };
  }

  if (reviewType === "prestator") {
    return {
      status: 409,
      body: {
        message:
          "Poti lasa o recenzie pentru prestator doar dupa o comanda finalizata cu acest atelier.",
      },
    };
  }

  return {
    status: 409,
    body: {
      message:
        "Recenzia pentru comanda devine disponibila doar dupa ce comanda a fost livrata sau ridicata.",
    },
  };
}

async function refreshTortRating(tortId) {
  if (!tortId || !mongoose.Types.ObjectId.isValid(String(tortId))) {
    return;
  }

  const matchId = new mongoose.Types.ObjectId(String(tortId));
  const agg = await Recenzie.aggregate([
    { $match: buildPublicFilter({ tortId: matchId }) },
    {
      $group: {
        _id: "$tortId",
        avg: { $avg: "$stele" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (agg[0]) {
    await Tort.findByIdAndUpdate(matchId, {
      ratingAvg: Number(agg[0].avg || 0),
      ratingCount: Number(agg[0].count || 0),
    });
    return;
  }

  await Tort.findByIdAndUpdate(matchId, {
    ratingAvg: 0,
    ratingCount: 0,
  });
}

function normalizeModerationStatus(value) {
  const status = String(value || "").trim();
  return MODERATION_STATUSES.includes(status) ? status : "approved";
}

function normalizeReview(reviewType, item) {
  const fields = buildReviewFields(reviewType);
  const ratingField = fields?.ratingField || "nota";
  const targetField = fields?.targetField || "targetId";
  const authorField = fields?.authorField || "authorId";

  return {
    _id: normalizeId(item?._id),
    reviewType,
    targetId: normalizeId(item?.[targetField]),
    authorId: normalizeId(item?.[authorField]),
    rating: Number(item?.[ratingField] || 0),
    comentariu: String(item?.comentariu || ""),
    foto: String(item?.foto || ""),
    data: item?.data || null,
    moderationStatus: normalizeModerationStatus(item?.moderationStatus),
    moderationNote: String(item?.moderationNote || ""),
    reportCount: Number(item?.reportCount || 0),
    reportedAt: item?.reportedAt || null,
    lastReportReason: String(item?.lastReportReason || ""),
    lastReportBy: String(item?.lastReportBy || ""),
    moderatedAt: item?.moderatedAt || null,
    moderatedBy: String(item?.moderatedBy || ""),
    moderatedByEmail: String(item?.moderatedByEmail || ""),
  };
}

function matchesAdminSearch(item, search) {
  if (!search) {
    return true;
  }

  const needle = String(search).trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return [
    item.reviewType,
    item.targetId,
    item.authorId,
    item.comentariu,
    item.moderationStatus,
    item.moderationNote,
    item.lastReportReason,
  ].some((value) => String(value || "").toLowerCase().includes(needle));
}

async function findExistingReview(reviewType, targetId, authorId) {
  const Model = buildReviewModel(reviewType);
  const fields = buildReviewFields(reviewType);
  if (!Model || !fields) {
    return null;
  }

  return Model.findOne({
    [fields.targetField]: targetId,
    [fields.authorField]: authorId,
  }).lean();
}

async function createReview(reviewType, payload, req) {
  const Model = buildReviewModel(reviewType);
  const fields = buildReviewFields(reviewType);
  if (!Model || !fields) {
    throw new Error("Unsupported review type.");
  }

  const authorId = normalizeId(req.user?._id || req.user?.id);
  const targetId = payload[fields.targetField];
  const eligibilityResult = await ensureReviewEligibility(reviewType, payload, req);
  if (eligibilityResult) {
    return eligibilityResult;
  }
  const existing = await findExistingReview(reviewType, targetId, authorId);
  if (existing) {
    return {
      status: 409,
      body: {
        message:
          "Exista deja o recenzie pentru aceasta resursa. Revino in panoul de moderare daca trebuie actualizata.",
      },
    };
  }

  const created = await Model.create({
    ...payload,
    [fields.authorField]: authorId,
    moderationStatus: "pending",
  });

  if (reviewType === "produs") {
    await refreshTortRating(targetId);
  }

  return {
    status: 201,
    body: {
      ok: true,
      message: "Recenzia a fost trimisa spre moderare.",
      review: created,
    },
  };
}

async function reportReview(reviewType, reviewId, req, reason) {
  const Model = buildReviewModel(reviewType);
  const fields = buildReviewFields(reviewType);
  if (!Model || !fields) {
    return null;
  }

  const item = await Model.findById(reviewId);
  if (!item) {
    return { status: 404, body: { message: "Recenzia nu exista." } };
  }

  const currentUserId = normalizeId(req.user?._id || req.user?.id);
  if (normalizeId(item[fields.authorField]) === currentUserId) {
    return {
      status: 400,
      body: { message: "Nu iti poti raporta propria recenzie." },
    };
  }

  const reporterIds = Array.isArray(item.reporterIds) ? item.reporterIds.map(normalizeId) : [];
  if (reporterIds.includes(currentUserId)) {
    return {
      status: 409,
      body: { message: "Ai raportat deja aceasta recenzie." },
    };
  }

  item.reporterIds = [...reporterIds, currentUserId];
  item.reportCount = Number(item.reportCount || 0) + 1;
  item.reportedAt = new Date();
  item.lastReportReason = reason;
  item.lastReportBy = currentUserId;
  await item.save();

  return {
    status: 202,
    body: {
      ok: true,
      message: "Raportarea a fost inregistrata.",
      review: normalizeReview(reviewType, item.toObject()),
    },
  };
}

function buildProductReviewInput(req) {
  const body = req.body || {};
  return {
    tortId: readMongoId(body.tortId, { field: "tortId", required: true }),
    stele: readNumber(body.stele, {
      field: "stele",
      required: true,
      integer: true,
      min: 1,
      max: 5,
    }),
    comentariu: readString(body.comentariu, {
      field: "comentariu",
      required: true,
      min: 3,
      max: 1200,
    }),
    foto: readString(body.foto, {
      field: "foto",
      max: 2048,
      defaultValue: "",
    }),
  };
}

function buildOrderReviewInput(req) {
  const body = req.body || {};
  return {
    comandaId: readMongoId(body.comandaId, { field: "comandaId", required: true }),
    nota: readNumber(body.nota, {
      field: "nota",
      required: true,
      integer: true,
      min: 1,
      max: 5,
    }),
    comentariu: readString(body.comentariu, {
      field: "comentariu",
      required: true,
      min: 3,
      max: 1200,
    }),
    foto: readString(body.foto, {
      field: "foto",
      max: 2048,
      defaultValue: "",
    }),
  };
}

function buildProviderReviewInput(req) {
  const body = req.body || {};
  return {
    prestatorId: readMongoId(body.prestatorId, {
      field: "prestatorId",
      required: true,
    }),
    stele: readNumber(body.stele, {
      field: "stele",
      required: true,
      integer: true,
      min: 1,
      max: 5,
    }),
    comentariu: readString(body.comentariu, {
      field: "comentariu",
      required: true,
      min: 3,
      max: 1200,
    }),
    foto: readString(body.foto, {
      field: "foto",
      max: 2048,
      defaultValue: "",
    }),
  };
}

function buildAdminReviewListInput(req) {
  const query = req.query || {};
  return {
    reviewType: readEnum(query.reviewType, ["", "produs", "comanda", "prestator"], {
      field: "reviewType",
      defaultValue: "",
    }),
    moderationStatus: readEnum(query.moderationStatus, ["", ...MODERATION_STATUSES], {
      field: "moderationStatus",
      defaultValue: "",
    }),
    reportedOnly: readBoolean(query.reportedOnly, {
      field: "reportedOnly",
      defaultValue: false,
    }),
    search: readString(query.search, {
      field: "search",
      max: 120,
      defaultValue: "",
    }),
    limit: readNumber(query.limit, {
      field: "limit",
      integer: true,
      min: 1,
      max: 200,
      defaultValue: 50,
    }),
  };
}

function buildAdminReviewActionInput(req) {
  const body = req.body || {};
  return {
    reviewType: readEnum(req.params.reviewType, ["produs", "comanda", "prestator"], {
      field: "reviewType",
      required: true,
    }),
    reviewId: readMongoId(req.params.reviewId, {
      field: "reviewId",
      required: true,
    }),
    moderationStatus: readEnum(body.moderationStatus, MODERATION_STATUSES, {
      field: "moderationStatus",
      required: true,
    }),
    moderationNote: readString(body.moderationNote, {
      field: "moderationNote",
      max: 500,
      defaultValue: "",
    }),
  };
}

function buildDeleteReviewInput(req) {
  return {
    reviewType: readEnum(req.params.reviewType, ["produs", "comanda", "prestator"], {
      field: "reviewType",
      required: true,
    }),
    reviewId: readMongoId(req.params.reviewId, {
      field: "reviewId",
      required: true,
    }),
  };
}

function buildReportInput(req) {
  const body = req.body || {};
  return {
    reviewType: readEnum(req.params.reviewType, ["produs", "prestator"], {
      field: "reviewType",
      required: true,
    }),
    reviewId: readMongoId(req.params.reviewId, {
      field: "reviewId",
      required: true,
    }),
    reason: readString(body.reason, {
      field: "reason",
      min: 3,
      max: 300,
      defaultValue: "Raportat de utilizator",
    }),
  };
}

// Recent reviews for homepage.
router.get(
  "/recent",
  withValidation(
    (req) => ({
      limit: readNumber(req.query?.limit, {
        field: "limit",
        integer: true,
        min: 1,
        max: 24,
        defaultValue: 6,
      }),
    }),
    async (req, res) => {
      const list = await Recenzie.find(buildPublicFilter())
        .sort({ data: -1 })
        .limit(req.validated.limit)
        .lean();
      res.json(list);
    }
  )
);

// Produs
router.post(
  "/produs",
  authRequired,
  withValidation(buildProductReviewInput, async (req, res) => {
    const result = await createReview("produs", req.validated, req);
    res.status(result.status).json(result.body);
  })
);

router.get(
  "/produs/:tortId",
  withValidation(
    (req) => ({
      tortId: readMongoId(req.params.tortId, { field: "tortId", required: true }),
    }),
    async (req, res) => {
      const list = await Recenzie.find(
        buildPublicFilter({ tortId: req.validated.tortId })
      )
        .sort({ data: -1 })
        .lean();
      res.json(list);
    }
  )
);

// Comanda
router.post(
  "/comanda",
  authRequired,
  withValidation(buildOrderReviewInput, async (req, res) => {
    const result = await createReview("comanda", req.validated, req);
    res.status(result.status).json(result.body);
  })
);

router.get(
  "/comanda/:comandaId",
  authRequired,
  withValidation(
    (req) => ({
      comandaId: readMongoId(req.params.comandaId, {
        field: "comandaId",
        required: true,
      }),
    }),
    async (req, res) => {
      const query = { comandaId: req.validated.comandaId };
      if (!isStaff(req)) {
        query.clientId = req.user._id;
      }

      const item = await RecenzieComanda.findOne(query).sort({ data: -1 }).lean();
      res.json(item || null);
    }
  )
);

// Prestator
router.post(
  "/prestator",
  authRequired,
  withValidation(buildProviderReviewInput, async (req, res) => {
    const result = await createReview("prestator", req.validated, req);
    res.status(result.status).json(result.body);
  })
);

router.get(
  "/prestator/:prestatorId",
  withValidation(
    (req) => ({
      prestatorId: readMongoId(req.params.prestatorId, {
        field: "prestatorId",
        required: true,
      }),
    }),
    async (req, res) => {
      const list = await RecenziePrestator.find(
        buildPublicFilter({ prestatorId: req.validated.prestatorId })
      )
        .sort({ data: -1 })
        .lean();
      res.json(list);
    }
  )
);

router.post(
  "/:reviewType/:reviewId/report",
  authRequired,
  withValidation(buildReportInput, async (req, res) => {
    const result = await reportReview(
      req.validated.reviewType,
      req.validated.reviewId,
      req,
      req.validated.reason
    );
    res.status(result.status).json(result.body);
  })
);

router.get(
  "/admin",
  authRequired,
  roleCheck("admin"),
  adminReadLimiter,
  withValidation(buildAdminReviewListInput, async (req, res) => {
    const reviewTypes = req.validated.reviewType
      ? [req.validated.reviewType]
      : ["produs", "comanda", "prestator"];

    const lists = await Promise.all(
      reviewTypes.map(async (reviewType) => {
        const Model = buildReviewModel(reviewType);
        const query = {};
        if (req.validated.moderationStatus === "approved") {
          query.$or = LEGACY_PUBLIC_MODERATION_FILTER;
        } else if (req.validated.moderationStatus) {
          query.moderationStatus = req.validated.moderationStatus;
        }
        if (req.validated.reportedOnly) {
          query.reportCount = { $gt: 0 };
        }

        const items = await Model.find(query)
          .sort({ data: -1 })
          .limit(req.validated.limit)
          .lean();

        return items.map((item) => normalizeReview(reviewType, item));
      })
    );

    const items = lists
      .flat()
      .filter((item) => matchesAdminSearch(item, req.validated.search))
      .sort((left, right) => {
        const leftTime = new Date(left.data || 0).getTime();
        const rightTime = new Date(right.data || 0).getTime();
        return rightTime - leftTime;
      })
      .slice(0, req.validated.limit);

    res.json({ items });
  })
);

router.patch(
  "/admin/:reviewType/:reviewId",
  authRequired,
  roleCheck("admin"),
  adminMutationLimiter,
  withValidation(buildAdminReviewActionInput, async (req, res) => {
    const Model = buildReviewModel(req.validated.reviewType);
    const fields = buildReviewFields(req.validated.reviewType);
    const item = await Model.findById(req.validated.reviewId);

    if (!item) {
      return res.status(404).json({ message: "Recenzia nu exista." });
    }

    item.moderationStatus = req.validated.moderationStatus;
    item.moderationNote = req.validated.moderationNote;
    item.moderatedAt = new Date();
    item.moderatedBy = normalizeId(req.user?._id || req.user?.id);
    item.moderatedByEmail = String(req.user?.email || "");
    await item.save();

    if (req.validated.reviewType === "produs") {
      await refreshTortRating(item[fields.targetField]);
    }

    await recordAuditLog(req, {
      action: "review.moderation.updated",
      entityType: "recenzie",
      entityId: item._id,
      summary: `${fields.label} setata la ${req.validated.moderationStatus}`,
      metadata: {
        reviewType: req.validated.reviewType,
        moderationStatus: req.validated.moderationStatus,
        moderationNote: req.validated.moderationNote,
        targetId: normalizeId(item[fields.targetField]),
      },
    });

    return res.json({
      ok: true,
      review: normalizeReview(req.validated.reviewType, item.toObject()),
    });
  })
);

router.delete(
  "/admin/:reviewType/:reviewId",
  authRequired,
  roleCheck("admin"),
  adminMutationLimiter,
  withValidation(buildDeleteReviewInput, async (req, res) => {
    const Model = buildReviewModel(req.validated.reviewType);
    const fields = buildReviewFields(req.validated.reviewType);
    const item = await Model.findById(req.validated.reviewId).lean();

    if (!item) {
      return res.status(404).json({ message: "Recenzia nu exista." });
    }

    await Model.deleteOne({ _id: req.validated.reviewId });

    if (req.validated.reviewType === "produs") {
      await refreshTortRating(item[fields.targetField]);
    }

    await recordAuditLog(req, {
      action: "review.deleted",
      entityType: "recenzie",
      entityId: req.validated.reviewId,
      summary: `${fields.label} stearsa din moderare`,
      metadata: {
        reviewType: req.validated.reviewType,
        targetId: normalizeId(item[fields.targetField]),
      },
    });

    return res.json({ ok: true });
  })
);

module.exports = router;
