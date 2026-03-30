const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const { createLogger, serializeError } = require("../utils/log");

const logger = createLogger("ai_images");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const AI_IMAGE_SIZE = String(process.env.AI_IMAGE_SIZE || "1024x1024").trim();
const AI_IMAGE_QUALITY = String(process.env.AI_IMAGE_QUALITY || "auto").trim();
const AI_IMAGE_BACKGROUND = String(process.env.AI_IMAGE_BACKGROUND || "auto").trim();
const AI_IMAGE_OUTPUT_FORMAT = String(process.env.AI_IMAGE_OUTPUT_FORMAT || "png").trim();

const openaiClient = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
    })
  : null;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function pickAllowedValue(value, allowed, fallback) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeGptImageSize(value) {
  return pickAllowedValue(
    value,
    ["auto", "1024x1024", "1536x1024", "1024x1536"],
    "1024x1024"
  );
}

function normalizeDallEImageSize(value) {
  return pickAllowedValue(
    value,
    ["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"],
    "1024x1024"
  );
}

function normalizeImageQuality(value, isGptImageModel) {
  return isGptImageModel
    ? pickAllowedValue(value, ["auto", "low", "medium", "high"], "auto")
    : pickAllowedValue(value, ["standard", "hd"], "standard");
}

function normalizeImageBackground(value) {
  return pickAllowedValue(value, ["auto", "transparent", "opaque"], "auto");
}

function normalizeOutputFormat(value) {
  return pickAllowedValue(value, ["png", "jpeg", "webp"], "png");
}

function normalizeFileExtension(value) {
  return value === "jpeg" ? "jpg" : normalizeOutputFormat(value);
}

function promptPreview(prompt) {
  return String(prompt || "").trim().slice(0, 160);
}

function isGptImageModel(model) {
  return (
    model === "chatgpt-image-latest" ||
    String(model || "")
      .trim()
      .toLowerCase()
      .startsWith("gpt-image-")
  );
}

function readHeader(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(String(name || "").toLowerCase()) || null;
  }
  return headers[name] || headers[String(name || "").toLowerCase()] || null;
}

function serializeProviderError(error) {
  return {
    name: error?.name || "OpenAIError",
    message: String(error?.message || "OpenAI image generation failed."),
    status: Number(error?.status || error?.statusCode || 0) || null,
    code: error?.code || null,
    type: error?.type || null,
    param: error?.param || null,
    requestId:
      error?._request_id ||
      error?.request_id ||
      readHeader(error?.headers, "x-request-id") ||
      readHeader(error?.response?.headers, "x-request-id") ||
      null,
  };
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildFallbackSvg(prompt) {
  const text = escapeXml(String(prompt || "tort personalizat").slice(0, 80));
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7c9d4" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="480" height="320" fill="#fffaf7"/>
      <rect x="90" y="70" width="300" height="60" rx="18" fill="url(#g1)" stroke="#e7c2cf"/>
      <rect x="110" y="140" width="260" height="50" rx="16" fill="#f7e7f0" stroke="#e7c2cf"/>
      <rect x="130" y="195" width="220" height="45" rx="14" fill="#f7c9d4" stroke="#e7c2cf"/>
      <circle cx="240" cy="55" r="18" fill="#f7c9d4" stroke="#e7c2cf"/>
      <text x="240" y="290" text-anchor="middle" font-size="14" fill="#6b7280" font-family="Georgia, serif">
        ${text}
      </text>
    </svg>
  `;
}

function buildFallbackImage(prompt, details = {}) {
  const uploadsDir = path.join(__dirname, "..", "uploads", "ai");
  ensureDir(uploadsDir);

  const svg = buildFallbackSvg(prompt);
  const fileName = `ai_${Date.now()}.svg`;
  fs.writeFileSync(path.join(uploadsDir, fileName), svg, "utf8");
  return {
    imageUrl: `/uploads/ai/${fileName}`,
    source: "local",
    mode: "mock",
    fallback: true,
    provider: "openai",
    providerRequestId: details.providerRequestId || null,
    providerError: details.providerError || null,
  };
}

function buildOpenAIPayload(prompt, options = {}) {
  const model = String(OPENAI_IMAGE_MODEL || "gpt-image-1").trim() || "gpt-image-1";
  const gptImageModel = isGptImageModel(model);
  const payload = {
    model,
    prompt,
    n: 1,
    size: gptImageModel
      ? normalizeGptImageSize(AI_IMAGE_SIZE)
      : normalizeDallEImageSize(AI_IMAGE_SIZE),
  };

  if (options.userId) {
    payload.user = options.userId;
  }

  if (gptImageModel) {
    payload.quality = normalizeImageQuality(AI_IMAGE_QUALITY, true);
    payload.background = normalizeImageBackground(AI_IMAGE_BACKGROUND);
    payload.output_format = normalizeOutputFormat(AI_IMAGE_OUTPUT_FORMAT);
    return payload;
  }

  payload.quality = normalizeImageQuality(AI_IMAGE_QUALITY, false);
  payload.response_format = "b64_json";
  return payload;
}

async function generateWithOpenAI(prompt, options = {}) {
  const uploadsDir = path.join(__dirname, "..", "uploads", "ai");
  ensureDir(uploadsDir);

  const payload = buildOpenAIPayload(prompt, options);
  logger.info("openai_image_request_started", {
    requestId: options.requestId,
    prompt: promptPreview(prompt),
    payload: {
      model: payload.model,
      size: payload.size,
      quality: payload.quality,
      background: payload.background || null,
      outputFormat: payload.output_format || null,
      responseFormat: payload.response_format || null,
      n: payload.n,
      user: payload.user || null,
    },
  });

  const result = await openaiClient.images.generate(payload);
  const base64Image = result?.data?.[0]?.b64_json;
  const remoteUrl = result?.data?.[0]?.url;

  logger.info("openai_image_request_succeeded", {
    requestId: options.requestId,
    providerRequestId: result?._request_id || null,
    model: payload.model,
    outputFormat: result?.output_format || payload.output_format || null,
    usage: result?.usage || null,
  });

  if (base64Image) {
    const outputFormat = normalizeOutputFormat(
      result?.output_format || payload.output_format || "png"
    );
    const fileName = `ai_${Date.now()}.${normalizeFileExtension(outputFormat)}`;
    fs.writeFileSync(
      path.join(uploadsDir, fileName),
      Buffer.from(base64Image, "base64")
    );
    return {
      imageUrl: `/uploads/ai/${fileName}`,
      source: "openai",
      mode: "remote",
      fallback: false,
      provider: "openai",
      providerRequestId: result?._request_id || null,
      providerError: null,
    };
  }

  if (remoteUrl) {
    return {
      imageUrl: remoteUrl,
      source: "openai",
      mode: "remote",
      fallback: false,
      provider: "openai",
      providerRequestId: result?._request_id || null,
      providerError: null,
    };
  }

  throw new Error("OpenAI did not return usable image data.");
}

async function generateCakeImage(prompt, options = {}) {
  if (!openaiClient) {
    const providerError = {
      message: "OpenAI image generation is not configured. Missing OPENAI_API_KEY.",
      status: null,
      code: "missing_api_key",
      type: "configuration_error",
      param: null,
      requestId: null,
    };
    logger.warn("openai_image_not_configured", {
      requestId: options.requestId,
      prompt: promptPreview(prompt),
      providerError,
    });
    return buildFallbackImage(prompt, { providerError });
  }

  try {
    return await generateWithOpenAI(prompt, options);
  } catch (error) {
    const providerError = serializeProviderError(error);
    logger.warn("openai_image_failed_fallback_used", {
      requestId: options.requestId,
      prompt: promptPreview(prompt),
      model: OPENAI_IMAGE_MODEL,
      error: serializeError(error),
      providerError,
    });
    return buildFallbackImage(prompt, {
      providerRequestId: providerError.requestId,
      providerError,
    });
  }
}

async function generateCakeImages(prompts = [], options = {}) {
  const list = Array.isArray(prompts)
    ? prompts.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  if (!list.length) {
    return [];
  }

  const items = [];
  for (const prompt of list) {
    // Keep generation deterministic and easy to audit: one provider request per variant.
    // This also works with the local fallback mode when the remote model is unavailable.
    // eslint-disable-next-line no-await-in-loop
    const result = await generateCakeImage(prompt, options);
    items.push({
      ...result,
      prompt,
    });
  }

  return items;
}

module.exports = {
  generateCakeImage,
  generateCakeImages,
  buildOpenAIPayload,
};
