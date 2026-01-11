import { useState } from "react";

const PALETTE = ["#f7c9d4", "#f6e3cc", "#d9e7c6", "#e6d8f5", "#f2d4e7"];

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPreviewSvg(prompt) {
  const accent = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  const text = escapeXml(String(prompt || "tort personalizat").slice(0, 80));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="480" height="320" fill="#fffaf7"/>
      <rect x="90" y="70" width="300" height="60" rx="18" fill="url(#g1)" stroke="#e7c2cf"/>
      <rect x="110" y="140" width="260" height="50" rx="16" fill="#f7e7f0" stroke="#e7c2cf"/>
      <rect x="130" y="195" width="220" height="45" rx="14" fill="${accent}" stroke="#e7c2cf"/>
      <circle cx="240" cy="55" r="18" fill="${accent}" stroke="#e7c2cf"/>
      <text x="240" y="290" text-anchor="middle" font-size="14" fill="#6b7280" font-family="Georgia, serif">
        ${text}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function DesignerAI() {
  const [prompt, setPrompt] = useState(
    "tort 2 etaje, crema vanilie, decor trandafiri roz"
  );
  const [img, setImg] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    const next = buildPreviewSvg(prompt);
    setImg(next);
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl mb-2">Designer AI - preview tort</h1>
      <textarea
        className="border w-full p-2 h-24"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button onClick={generate} className="border px-4 py-2 rounded mt-2">
        {loading ? "Generez..." : "Genereaza"}
      </button>
      {img && (
        <img
          src={img}
          alt="previzualizare tort"
          className="mt-4 rounded shadow"
        />
      )}
    </div>
  );
}
