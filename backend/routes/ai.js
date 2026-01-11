const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const AI_IMAGE_SIZE = process.env.AI_IMAGE_SIZE || "1024x1024";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg(prompt) {
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

async function generateWithOpenAI(prompt) {
  const response = await axios.post(
    "https://api.openai.com/v1/images/generations",
    {
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: AI_IMAGE_SIZE,
      response_format: "b64_json",
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

router.post("/generate-cake", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim() || "tort personalizat";
  const uploadsDir = path.join(__dirname, "..", "uploads", "ai");
  ensureDir(uploadsDir);

  if (OPENAI_API_KEY) {
    try {
      const data = await generateWithOpenAI(prompt);
      const b64 = data?.data?.[0]?.b64_json;
      const url = data?.data?.[0]?.url;
      if (b64) {
        const fileName = `ai_${Date.now()}.png`;
        fs.writeFileSync(path.join(uploadsDir, fileName), Buffer.from(b64, "base64"));
        return res.json({ imageUrl: `/uploads/ai/${fileName}`, source: "openai" });
      }
      if (url) {
        return res.json({ imageUrl: url, source: "openai" });
      }
    } catch (e) {
      console.warn("OpenAI image failed, fallback to local:", e?.message || e);
    }
  }

  const svg = buildSvg(prompt);
  const fileName = `ai_${Date.now()}.svg`;
  fs.writeFileSync(path.join(uploadsDir, fileName), svg, "utf8");
  return res.json({ imageUrl: `/uploads/ai/${fileName}`, source: "local" });
});

module.exports = router;
