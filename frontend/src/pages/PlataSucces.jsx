import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import api from "/src/lib/api.js";
import { cards, containers } from "/src/lib/tailwindComponents.js";

function money(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

export default function PlataSucces() {
  const [sp] = useSearchParams();
  const comandaId = sp.get("comandaId");
  const paymentIntentId = sp.get("payment_intent");
  const sessionId = sp.get("session_id");
  const { user, loading: authLoading } = useAuth() || {};
  const userId = user?._id || user?.id;

  const [comanda, setComanda] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "success", message: "" });
  const [abonamentMsg, setAbonamentMsg] = useState("");

  useEffect(() => {
    if (authLoading || !comandaId || !userId) return;

    let cancelled = false;
    setLoading(true);
    setStatus({
      type: "success",
      message: "Plata este confirmata. Incarcam detaliile comenzii...",
    });

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
            const activation = await api.post(
              `/cutie-lunara/activate-from-order/${comandaId}`
            );
            if (activation?.data?.abonament?.activ && !cancelled) {
              setAbonamentMsg("Abonamentul lunar a fost activat.");
            }
          } catch (err) {
            if (!cancelled) {
              setAbonamentMsg(
                err?.response?.data?.message ||
                  "Plata este confirmata, dar activarea abonamentului trebuie verificata in profil."
              );
            }
          }
        } else if (!cancelled) {
          setAbonamentMsg("");
        }
      } catch (error) {
        if (!cancelled) {
          setComanda(null);
          setStatus({
            type: "error",
            message:
              error?.response?.data?.message ||
              "Nu am putut confirma sau incarca aceasta comanda.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, comandaId, paymentIntentId, sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      <div className={`${containers.pageMax} max-w-4xl space-y-6`}>
        <header className="space-y-2">
          <p className="font-semibold uppercase tracking-[0.2em] text-emerald-500">
            Payment complete
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Plata reusita</h1>
          <p className="text-gray-600">
            Multumim. Comanda ta a fost receptionata si confirmata.
          </p>
        </header>

        <StatusBanner type={status.type} message={status.message} />
        <StatusBanner
          type="warning"
          message={
            !authLoading && !userId
              ? "Autentifica-te pentru a vedea detaliile complete ale comenzii."
              : ""
          }
        />
        <StatusBanner type="info" message={abonamentMsg} />

        {loading && (
          <div className={cards.default}>
            <div className="text-sm text-gray-600">
              Se incarca rezumatul comenzii...
            </div>
          </div>
        )}

        {comanda && !loading && (
          <section className={`${cards.elevated} space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Numar comanda</div>
                <div className="text-xl font-semibold text-gray-900">
                  {comanda.numeroComanda || comanda._id}
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {comanda.paymentStatus === "paid" || comanda.statusPlata === "paid"
                  ? "Platita"
                  : "Confirmata"}
              </span>
            </div>

            <div className="grid gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm text-gray-700 md:grid-cols-2">
              <div>
                <div className="text-gray-500">Status comanda</div>
                <div className="font-semibold">{comanda.status || "plasata"}</div>
              </div>
              <div>
                <div className="text-gray-500">Total</div>
                <div className="font-semibold">
                  {money(comanda.totalFinal || comanda.total)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Livrare</div>
                <div className="font-semibold">
                  {comanda.dataLivrare || "-"} {comanda.oraLivrare || ""}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Metoda</div>
                <div className="font-semibold">
                  {comanda.metodaLivrare || "ridicare"}
                </div>
              </div>
              {comanda.adresaLivrare && (
                <div className="md:col-span-2">
                  <div className="text-gray-500">Adresa</div>
                  <div className="font-semibold">{comanda.adresaLivrare}</div>
                </div>
              )}
              {comanda.deliveryWindow && (
                <div className="md:col-span-2">
                  <div className="text-gray-500">Fereastra livrare</div>
                  <div className="font-semibold">{comanda.deliveryWindow}</div>
                </div>
              )}
              {comanda.deliveryInstructions && (
                <div className="md:col-span-2">
                  <div className="text-gray-500">Instructiuni</div>
                  <div className="font-semibold">{comanda.deliveryInstructions}</div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">Produse</h2>
              {(comanda.items || []).length === 0 ? (
                <div className="text-sm text-gray-600">Nu exista produse.</div>
              ) : (
                (comanda.items || []).map((item, index) => (
                  <div
                    key={`${item.productId || item._id || index}`}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        {item.name || item.nume || "Produs"}
                      </div>
                      <div className="text-sm text-gray-500">
                        x{item.qty || item.cantitate || 1}
                      </div>
                    </div>
                    <div className="font-semibold text-pink-600">
                      {money(item.price || item.pret || 0)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {Array.isArray(comanda.attachments) && comanda.attachments.length > 0 && (
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <h2 className="text-lg font-semibold text-gray-900">Atasamente</h2>
                <div className="space-y-1">
                  {comanda.attachments.map((file, index) => (
                    <a
                      key={`${file.url || index}`}
                      href={file.url}
                      className="block text-sm text-pink-600 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {file.name || `Fisier ${index + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="flex flex-wrap gap-4 text-sm">
          <Link to="/" className="text-pink-600 underline">
            Inapoi la magazin
          </Link>
          {comandaId && (
            <Link
              to={`/plata?comandaId=${encodeURIComponent(comandaId)}`}
              className="text-gray-700 underline"
            >
              Vezi pagina comenzii
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
