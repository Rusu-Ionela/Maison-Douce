const express = require("express");
const router = express.Router();
const AIImageRequest = require("../models/AIImageRequest");
const { authOptional, authRequired } = require("../middleware/auth");
const { generateCakeImage, generateCakeImages } = require("../services/aiImages");
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

router.post("/generate-cake", authOptional, async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim() || "tort personalizat";
  const requestedVariantCount = Math.max(
    1,
    Math.min(3, Number.parseInt(req.body?.variants, 10) || 1)
  );
  const variantPrompts = Array.isArray(req.body?.variantPrompts)
    ? req.body.variantPrompts
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const prompts = variantPrompts.length
    ? variantPrompts
    : Array.from({ length: requestedVariantCount }, (_, index) =>
        index === 0 ? prompt : `${prompt} Varianta ${index + 1}, cu compozitie si styling usor diferite.`
      );
  const userId = normalizeId(req.user?._id || req.user?.id);
  const prestatorId = normalizeId(
    await resolveProviderForRequest(req, req.body?.prestatorId || "")
  );
  const referenceCount = Array.isArray(req.body?.referenceImages)
    ? req.body.referenceImages.filter(Boolean).length
    : 0;

  if (!prestatorId) {
    return res.status(400).json({
      message: "Selecteaza un prestator valid inainte de a genera imaginea.",
    });
  }

  try {
    const items =
      prompts.length > 1
        ? await generateCakeImages(prompts, {
            requestId: req.id,
            userId,
            prestatorId,
          })
        : [
            {
              ...(await generateCakeImage(prompt, {
                requestId: req.id,
                userId,
                prestatorId,
              })),
              prompt,
            },
          ];
    const primaryItem = items[0] || null;

    let historyEntries = [];
    let historyError = null;
    if (userId && items.length > 0) {
      const persisted = await Promise.all(
        items.map((item, index) =>
          persistHistoryEntry(
            {
              userId,
              prestatorId,
              prompt: item.prompt || prompt,
              imageUrl: item.imageUrl,
              source: item.source,
              variantIndex: index,
              referenceCount,
              status: item.fallback ? "fallback" : "success",
              errorMessage: item.providerError?.message || "",
            },
            req.id
          )
        )
      );

      historyEntries = persisted.map((item) => item.historyEntry).filter(Boolean);
      historyError =
        persisted.find((item) => item.historyError)?.historyError || null;
    }

    return res.json({
      success: true,
      imageUrl: primaryItem?.imageUrl || "",
      source: primaryItem?.source || "ai",
      mode: primaryItem?.mode || "remote",
      fallback: Boolean(primaryItem?.fallback),
      provider: primaryItem?.provider || null,
      providerRequestId: primaryItem?.providerRequestId || null,
      providerError: primaryItem?.providerError || null,
      items,
      historyEntries,
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
            variantIndex: 0,
            referenceCount,
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
