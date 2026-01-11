import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function PatiserDrawing() {
  const drawingRef = useRef(null);
  const { user } = useAuth() || {};
  const [msg, setMsg] = useState("");

  const salveazaImagine = async () => {
    if (!drawingRef.current) return;
    setMsg("");

    const canvas = await html2canvas(drawingRef.current);
    const ctx = canvas.getContext("2d");

    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    const clientName = user?.nume || user?.name || "Client";
    const patiserName = "Patiser";

    ctx.fillText(`TortApp - Client: ${clientName}`, 10, canvas.height - 30);
    ctx.fillText(`By ${patiserName}`, 10, canvas.height - 10);

    const dataURL = canvas.toDataURL("image/png");
    const userId = user?._id || user?.id;

    if (!userId) {
      downloadDataUrl(dataURL, "tort_patiser.png");
      setMsg("Imaginea a fost salvata local.");
      return;
    }

    try {
      await api.post("/personalizare", {
        forma: "rotund",
        culori: ["#fbcfe8"],
        mesaj: "Desen patiser",
        imageData: dataURL,
        status: "draft",
        note: "Desen patiser",
      });
      setMsg("Design salvat in cont.");
    } catch (err) {
      console.error("Eroare la salvarea designului:", err);
      setMsg("Nu s-a putut salva designul. Incearca din nou.");
    }
  };

  return (
    <div className="p-6">
      <div ref={drawingRef} className="w-64 h-64 bg-pink-200 relative rounded">
        <div className="absolute bottom-2 right-2 text-sm text-gray-600">
          Desen Tort
        </div>
      </div>
      <button
        onClick={salveazaImagine}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
      >
        Salveaza cu watermark
      </button>
      {msg && <div className="mt-3 text-sm text-gray-700">{msg}</div>}
    </div>
  );
}

export default PatiserDrawing;
