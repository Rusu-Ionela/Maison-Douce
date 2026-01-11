import React, { useMemo, useState } from "react";

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPreviewSvg({ forma, culoare, decor, umplutura, niveluri }) {
  const levels = Math.max(1, Math.min(5, Number(niveluri) || 1));
  const baseWidth = 260;
  const tierHeight = 42;
  const width = 480;
  const height = 320;
  const tierSvg = [];

  for (let i = 0; i < levels; i += 1) {
    const w = baseWidth - i * 30;
    const x = (width - w) / 2;
    const y = height - (i + 1) * tierHeight - 50;
    const rx = forma === "rotund" ? tierHeight / 2 : 6;
    tierSvg.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${tierHeight}" rx="${rx}" fill="${culoare}" stroke="#d7b4c4"/>`
    );
  }

  const label = escapeXml(`${decor} + ${umplutura}`);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#fffaf7"/>
      ${tierSvg.join("\n")}
      <circle cx="${width / 2}" cy="60" r="18" fill="${culoare}" stroke="#d7b4c4"/>
      <text x="${width / 2}" y="${height - 16}" text-anchor="middle" font-size="14" fill="#6b7280" font-family="Georgia, serif">
        ${label}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function TortDesigner() {
  const [forma, setForma] = useState("rotund");
  const [culoare, setCuloare] = useState("#FFC0CB");
  const [decor, setDecor] = useState("flori");
  const [umplutura, setUmplutura] = useState("ciocolata");
  const [niveluri, setNiveluri] = useState(1);
  const [imagine, setImagine] = useState("");

  const previewSvg = useMemo(
    () => buildPreviewSvg({ forma, culoare, decor, umplutura, niveluri }),
    [forma, culoare, decor, umplutura, niveluri]
  );

  const genereazaImagine = () => {
    setImagine(previewSvg);
  };

  return (
    <div className="text-center mt-10">
      <h2 className="text-2xl font-bold mb-4">Designer tort avansat</h2>

      <div className="mb-4">
        <label>Forma:</label>
        <select value={forma} onChange={(e) => setForma(e.target.value)}>
          <option value="rotund">Rotund</option>
          <option value="patrat">Patrat</option>
        </select>
      </div>

      <div className="mb-4">
        <label>Culoare:</label>
        <input
          type="color"
          value={culoare}
          onChange={(e) => setCuloare(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label>Decor:</label>
        <select value={decor} onChange={(e) => setDecor(e.target.value)}>
          <option value="flori">Flori</option>
          <option value="fructe">Fructe</option>
          <option value="macarons">Macarons</option>
        </select>
      </div>

      <div className="mb-4">
        <label>Umplutura:</label>
        <select value={umplutura} onChange={(e) => setUmplutura(e.target.value)}>
          <option value="ciocolata">Ciocolata</option>
          <option value="vanilie">Vanilie</option>
          <option value="capsuni">Capsuni</option>
        </select>
      </div>

      <div className="mb-4">
        <label>Numar niveluri:</label>
        <input
          type="number"
          value={niveluri}
          onChange={(e) => setNiveluri(e.target.value)}
          min="1"
          max="5"
        />
      </div>

      <div className="mt-6">
        <h3 className="font-bold">Previzualizare 2D</h3>
        {[...Array(parseInt(niveluri, 10))].map((_, index) => (
          <div
            key={index}
            style={{
              width: `${200 - index * 20}px`,
              height: "100px",
              borderRadius: forma === "rotund" ? "50%" : "0",
              backgroundColor: culoare,
              margin: "auto",
              marginTop: "10px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                color: "white",
                fontSize: "0.8rem",
              }}
            >
              {decor} + {umplutura}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={genereazaImagine}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
      >
        Genereaza imagine
      </button>

      {imagine && (
        <div className="mt-4">
          <h3 className="font-bold">Previzualizare</h3>
          <img src={imagine} alt="Tort generat" className="mx-auto rounded" />
        </div>
      )}
    </div>
  );
}

export default TortDesigner;
