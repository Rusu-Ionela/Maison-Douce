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

function DesenTort() {
  const canvasRef = useRef(null);
  const { user } = useAuth() || {};
  const [msg, setMsg] = useState("");

  const salveazaImagine = async () => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    setMsg("");

    const canvasImage = await html2canvas(canvasElement);
    const ctx = canvasImage.getContext("2d");
    ctx.font = "20px Arial";
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.textAlign = "right";
    ctx.fillText("TortApp", canvasImage.width - 10, canvasImage.height - 10);

    const dataURL = canvasImage.toDataURL("image/png");
    const userId = user?._id || user?.id;

    if (!userId) {
      downloadDataUrl(dataURL, "tort_design.png");
      setMsg("Imaginea a fost salvata local.");
      return;
    }

    try {
      await api.post("/personalizare", {
        forma: "rotund",
        culori: ["#fbcfe8"],
        mesaj: "Design desenat manual",
        imageData: dataURL,
        status: "draft",
        note: "Desen manual",
      });
      setMsg("Design salvat in cont.");
    } catch (err) {
      console.error("Eroare la salvarea designului:", err);
      setMsg("Nu s-a putut salva designul. Incearca din nou.");
    }
  };

  return (
    <div className="p-6">
      <div
        ref={canvasRef}
        className="w-64 h-64 bg-pink-200 rounded-full mx-auto mb-4"
      >
        <div className="w-32 h-32 bg-white rounded-full mx-auto mt-8 shadow-inner"></div>
      </div>
      <button
        onClick={salveazaImagine}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Salveaza tort ca imagine
      </button>
      {msg && <div className="mt-3 text-sm text-gray-700">{msg}</div>}
    </div>
  );
}

export default DesenTort;
