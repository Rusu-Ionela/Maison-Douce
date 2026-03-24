const express = require("express");
const router = express.Router();
const AIImageRequest = require("../models/AIImageRequest");
const { authRequired } = require("../middleware/auth");
const { generateCakeImage } = require("../services/aiImages");
const { resolveProviderForRequest } = require("../utils/providerDirectory");
const { isStaffRole } = require("../utils/roles");
const { createLogger, serializeError } = require("../utils/log");

const logger = createLogger("ai_route");

function normalizeId(value) {
  return String(value || "").trim();
}

function promptPreview(prompt) {
  return String(prompt || "").trim().slice(0, 160);
}

async function persistHistoryEntry(payload, requestId) {
  try {
    const historyEntry = await AIImageRequest.create(payload);
    return { historyEntry, historyError: null };
  } catch (error) {
    const historyError = serializeError(error);
    logger.error("ai_history_persist_failed", {
      requestId,
      payload: {
        userId: normalizeId(payload?.userId),
        prestatorId: normalizeId(payload?.prestatorId),
        status: payload?.status,
        prompt: promptPreview(payload?.prompt),
      },
      error: historyError,
    });
    return { historyEntry: null, historyError };
  }
}

router.post("/generate-cake", authRequired, async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim() || "tort personalizat";
  const userId = normalizeId(req.user?._id || req.user?.id);
  const prestatorId = normalizeId(
    await resolveProviderForRequest(req, req.body?.prestatorId || "")
  );

  if (!prestatorId) {
    return res.status(400).json({
      message: "Selecteaza un prestator valid inainte de a genera imaginea.",
    });
  }

  try {
    const result = await generateCakeImage(prompt, {
      requestId: req.id,
      userId,
      prestatorId,
    });
    const status = result.fallback ? "fallback" : "success";
    const { historyEntry, historyError } = userId
      ? await persistHistoryEntry(
          {
            userId,
            prestatorId,
            prompt,
            imageUrl: result.imageUrl,
            source: result.source,
            status,
            errorMessage: result.providerError?.message || "",
          },
          req.id
        )
      : { historyEntry: null, historyError: null };

    return res.json({
      success: true,
      imageUrl: result.imageUrl,
      source: result.source,
      mode: result.mode,
      fallback: Boolean(result.fallback),
      provider: result.provider || null,
      providerRequestId: result.providerRequestId || null,
      providerError: result.providerError || null,
      historyEntry,
      historyError,
    });
  } catch (error) {
    const backendError = serializeError(error);
    logger.error("generate_cake_failed", {
      requestId: req.id,
      userId,
      prestatorId,
      prompt: promptPreview(prompt),
      error: backendError,
    });
    const errorMessage =
      String(error?.message || "").trim() ||
      "Nu am putut genera imaginea pe baza promptului.";
    const { historyEntry, historyError } = userId
      ? await persistHistoryEntry(
          {
            userId,
            prestatorId,
            prompt,
            status: "error",
            errorMessage,
          },
          req.id
        )
      : { historyEntry: null, historyError: null };

    return res.status(500).json({
      success: false,
      message: errorMessage,
      requestId: req.id,
      error: backendError,
      historyEntry,
      historyError,
    });
  }
});

router.get("/history", authRequired, async (req, res) => {
  try {
    const role = req.user?.rol || req.user?.role;
    const isStaff = isStaffRole(role);
    const userId = normalizeId(req.user?._id || req.user?.id);
    const requestedUserId = normalizeId(req.query?.userId);
    const requestedPrestatorId = normalizeId(req.query?.prestatorId);

    const filter = {};
    if (isStaff) {
      if (requestedUserId) filter.userId = requestedUserId;
      filter.prestatorId = requestedPrestatorId || userId;
    } else {
      filter.userId = userId;
      if (requestedPrestatorId) filter.prestatorId = requestedPrestatorId;
    }

    const items = await AIImageRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    res.json({ items });
  } catch (error) {
    logger.error("ai_history_failed", {
      requestId: req.id,
      userId: normalizeId(req.user?._id || req.user?.id),
      prestatorId: normalizeId(req.query?.prestatorId),
      error: serializeError(error),
    });
    res.status(500).json({
      success: false,
      message: "Nu am putut incarca istoricul AI.",
      requestId: req.id,
      error: serializeError(error),
    });
  }
});

module.exports = router;
