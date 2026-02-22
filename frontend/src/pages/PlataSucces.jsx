import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "/src/lib/api.js";

export default function PlataSucces() {
  const [sp] = useSearchParams();
  const comandaId = sp.get("comandaId");
  const paymentIntentId = sp.get("payment_intent");
  const sessionId = sp.get("session_id");
  const [comanda, setComanda] = useState(null);
  const [abonamentMsg, setAbonamentMsg] = useState("");

  useEffect(() => {
    if (!comandaId) return undefined;

    let cancelled = false;

    (async () => {
      try {
        if (paymentIntentId) {
          await api.post("/stripe/confirm-payment", { paymentIntentId, comandaId });
        }
        if (sessionId) {
          await api.post("/stripe/confirm-session", { sessionId, comandaId });
        }

        const { data } = await api.get(`/comenzi/${comandaId}`);
        if (cancelled) return;
        setComanda(data);

        const isAbonament = data?.tip === "abonament_cutie";
        const paid = data?.paymentStatus === "paid" || data?.statusPlata === "paid";

        if (isAbonament && paid) {
          try {
            const activation = await api.post(`/cutie-lunara/activate-from-order/${comandaId}`);
            if (activation?.data?.abonament?.activ) {
              setAbonamentMsg("Abonamentul lunar a fost activat.");
            }
          } catch (err) {
            setAbonamentMsg(
              err?.response?.data?.message ||
                "Plata este confirmata, dar activarea abonamentului trebuie verificata in profil."
            );
          }
        } else {
          setAbonamentMsg("");
        }
      } catch {
        if (!cancelled) setComanda(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [comandaId, paymentIntentId, sessionId]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Plata reusita</h1>
      <p className="text-gray-700 mb-4">Multumim! Comanda ta a fost confirmata.</p>
      {abonamentMsg && <p className="text-sm text-emerald-700 mb-4">{abonamentMsg}</p>}

      {comanda && (
        <div className="border rounded-lg p-4 bg-white space-y-2">
          <div className="font-semibold">Numar comanda: {comanda.numeroComanda || comanda._id}</div>
          <div>Status initial: {comanda.status || "plasata"}</div>
          <div>Total: {comanda.totalFinal || comanda.total} MDL</div>
          <div>
            Livrare: {comanda.dataLivrare || "-"} {comanda.oraLivrare || ""}
          </div>
          <div>Metoda: {comanda.metodaLivrare || "ridicare"}</div>
          {comanda.adresaLivrare && <div>Adresa: {comanda.adresaLivrare}</div>}
          {comanda.deliveryWindow && <div>Fereastra: {comanda.deliveryWindow}</div>}
          {comanda.deliveryInstructions && <div>Instructiuni: {comanda.deliveryInstructions}</div>}
          {comanda.notesClient && <div>Note client: {comanda.notesClient}</div>}

          <div className="pt-2 border-t">
            <div className="font-semibold mb-1">Produse</div>
            {(comanda.items || []).length === 0 && <div className="text-sm text-gray-600">Nu exista produse.</div>}
            <ul className="text-sm text-gray-700 space-y-1">
              {(comanda.items || []).map((it, idx) => (
                <li key={`${it.productId || it._id || idx}`}>
                  {it.name || it.nume || "Produs"} x{it.qty || it.cantitate || 1} ({it.price || it.pret || 0} MDL)
                </li>
              ))}
            </ul>
          </div>

          {Array.isArray(comanda.attachments) && comanda.attachments.length > 0 && (
            <div className="pt-2 border-t">
              <div className="font-semibold mb-1">Atasamente</div>
              <div className="space-y-1">
                {comanda.attachments.map((f, idx) => (
                  <a
                    key={`${f.url || idx}`}
                    href={f.url}
                    className="text-pink-600 underline text-sm block"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {f.name || `Fisier ${idx + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <Link to="/" className="text-pink-600 underline">
          Inapoi la magazin
        </Link>
      </div>
    </div>
  );
}
