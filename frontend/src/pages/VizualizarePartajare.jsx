import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "/src/lib/api.js";

function VizualizarePartajare() {
  const { linkUnic } = useParams();
  const [partajare, setPartajare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPartajare = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/partajare/${linkUnic}`);
        setPartajare(res.data);
      } catch (err) {
        console.error("Eroare:", err);
        setError(err?.response?.data?.message || "Link invalid sau expirat.");
        setPartajare(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPartajare();
  }, [linkUnic]);

  if (loading) return <p>Se incarca...</p>;
  if (error) return <p>{error}</p>;
  if (!partajare) return <p>Nu exista fisiere partajate.</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Fisiere partajate</h2>
      <div className="grid grid-cols-2 gap-2">
        {partajare.fisiere.map((f, index) => (
          <img key={index} src={f} alt="Fisier" className="w-full h-32 object-cover" />
        ))}
      </div>
    </div>
  );
}

export default VizualizarePartajare;
