import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { OrdersAPI } from "../api/orders";
import { getAvailability } from "../api/calendar";
import SlotPicker from "../components/SlotPicker";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { buttons, cards, inputs, containers } from "/src/lib/tailwindComponents.js";

function buildStatus(type, message, title = "") {
  return { type, message, title };
}

export default function Cart() {
  const { items, updateQty, remove, clear, subtotal } = useCart();
  const { user } = useAuth() || {};
  const nav = useNavigate();

  const [metodaLivrare, setMetodaLivrare] = useState("ridicare");
  const [adresa, setAdresa] = useState("");
  const [addressMode, setAddressMode] = useState("saved");
  const [selectedAddressIdx, setSelectedAddressIdx] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notes, setNotes] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState(buildStatus("", "", ""));

  const LIVRARE_FEE = 100;
  const prestatorId = import.meta.env.VITE_PRESTATOR_ID || "default";

  const addressOptions = useMemo(() => {
    const options = [];
    if (user?.adresa) {
      const hasDefault = (user?.adreseSalvate || []).some((a) => a?.isDefault);
      options.push({
        label: "Adresa principala",
        address: user.adresa,
        isDefault: !hasDefault,
      });
    }
    (user?.adreseSalvate || []).forEach((a, idx) => {
      if (!a?.address) return;
      options.push({
        label: a.label || `Adresa ${idx + 1}`,
        address: a.address,
        isDefault: !!a.isDefault,
      });
    });
    return options;
  }, [user]);

  const defaultAddressIdx = useMemo(() => {
    const idx = addressOptions.findIndex((a) => a.isDefault);
    if (idx >= 0) return String(idx);
    return addressOptions.length ? "0" : "";
  }, [addressOptions]);

  useEffect(() => {
    if (metodaLivrare !== "livrare") return;
    if (!addressOptions.length) {
      setAddressMode("custom");
      return;
    }
    if (!selectedAddressIdx) {
      setSelectedAddressIdx(defaultAddressIdx);
    }
  }, [metodaLivrare, addressOptions, defaultAddressIdx, selectedAddressIdx]);

  useEffect(() => {
    if (addressMode !== "saved") return;
    const idx = Number(selectedAddressIdx);
    if (Number.isNaN(idx) || !addressOptions[idx]) return;
    setAdresa(addressOptions[idx].address);
  }, [addressMode, selectedAddressIdx, addressOptions]);

  const leadHours = useMemo(() => {
    const maxPrep = items.reduce(
      (max, it) => Math.max(max, Number(it.prepHours || 0)),
      0
    );
    return Math.max(24, maxPrep || 0);
  }, [items]);

  const total = subtotal + (metodaLivrare === "livrare" ? LIVRARE_FEE : 0);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    getAvailability(prestatorId, { from: date, to: date, hideFull: true })
      .then((data) => setSlots(data))
      .catch(() => setSlots(null))
      .finally(() => setLoadingSlots(false));
  }, [date, prestatorId]);

  const minDate = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() + leadHours);
    return now.toISOString().slice(0, 10);
  }, [leadHours]);

  const slotIsValid = () => {
    if (!date || !time) return false;
    const [h, m] = time.split(":").map(Number);
    const dt = new Date(date);
    dt.setHours(h || 0, m || 0, 0, 0);
    const min = new Date();
    min.setHours(min.getHours() + leadHours);
    return dt >= min;
  };

  const buildDeliveryWindow = () => {
    if (!windowStart && !windowEnd) return "";
    if (windowStart && windowEnd) return `${windowStart}-${windowEnd}`;
    return windowStart || windowEnd || "";
  };

  const resetDraftState = () => {
    setAttachments([]);
    setNotes("");
    setDeliveryInstructions("");
    setWindowStart("");
    setWindowEnd("");
    setCheckoutStatus(buildStatus("", "", ""));
  };

  const uploadAttachments = async () => {
    if (!attachments.length) return [];
    const uploaded = [];
    for (const file of attachments) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/upload", fd);
      const url = res.data?.url;
      if (!url) throw new Error("Upload failed");
      uploaded.push({ url, name: file.name });
    }
    return uploaded;
  };

  const validateCheckout = () => {
    if (!user?._id) {
      setCheckoutStatus(
        buildStatus(
          "warning",
          "Autentifica-te inainte de a continua.",
          "Autentificare necesara"
        )
      );
      nav("/login");
      return false;
    }
    if (items.length === 0) {
      setCheckoutStatus(buildStatus("warning", "Cosul este gol."));
      return false;
    }
    if (!date || !time) {
      setCheckoutStatus(
        buildStatus("warning", "Selecteaza data si ora pentru comanda.")
      );
      return false;
    }
    if (!slotIsValid()) {
      setCheckoutStatus(
        buildStatus("warning", `Alege un slot cu minim ${leadHours}h inainte.`)
      );
      return false;
    }
    if (metodaLivrare === "livrare" && !adresa.trim()) {
      setCheckoutStatus(buildStatus("warning", "Completeaza adresa de livrare."));
      return false;
    }
    return true;
  };

  async function checkout() {
    if (submitting) return;
    if (!validateCheckout()) return;

    setSubmitting(true);
    setCheckoutStatus(buildStatus("info", "Se creeaza comanda si se incarca atasamentele..."));

    let uploaded = [];
    try {
      uploaded = await uploadAttachments();
    } catch (e) {
      setSubmitting(false);
      setCheckoutStatus(
        buildStatus(
          "error",
          e?.response?.data?.message ||
            "Nu am putut incarca atasamentele. Incearca din nou."
        )
      );
      return;
    }

    const payload = {
      clientId: user._id,
      items: items.map((it) => ({
        productId: it.id,
        name: it.name,
        qty: it.qty,
        price: it.price,
        personalizari: it.options || undefined,
      })),
      metodaLivrare: metodaLivrare === "livrare" ? "livrare" : "ridicare",
      adresaLivrare: metodaLivrare === "livrare" ? adresa.trim() : undefined,
      deliveryInstructions:
        metodaLivrare === "livrare" ? deliveryInstructions.trim() : "",
      deliveryWindow: metodaLivrare === "livrare" ? buildDeliveryWindow() : "",
      attachments: uploaded,
      dataLivrare: date,
      oraLivrare: time,
      prestatorId,
      note: notes || undefined,
    };

    try {
      const comanda = await OrdersAPI.create(payload);
      clear();
      resetDraftState();
      nav(`/plata?comandaId=${comanda._id}`);
    } catch (e) {
      setCheckoutStatus(
        buildStatus(
          "error",
          e?.response?.data?.message || "Eroare la creare comanda."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      <div className={`${containers.pageMax} space-y-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-pink-500 font-semibold uppercase tracking-wide">
              Checkout
            </p>
            <h1 className="text-3xl font-bold text-gray-900">Cos</h1>
          </div>
          <span className="text-gray-600">{items.length} produse</span>
        </div>

        <StatusBanner
          type={checkoutStatus.type || "info"}
          title={checkoutStatus.title}
          message={checkoutStatus.message}
        />

        {!items.length && (
          <div className={cards.bordered}>
            <p className="text-gray-700 mb-3">Cosul este gol.</p>
            <button className={buttons.outline} onClick={() => nav("/catalog")}>
              Mergi la catalog
            </button>
          </div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {items.map((it) => (
                <div
                  key={`${it.id}_${it.variantKey || ""}`}
                  className={`${cards.default} flex items-center gap-4`}
                >
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-rose-50">
                    <img
                      src={it.image || "/images/placeholder.png"}
                      alt={it.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{it.name}</div>
                    {it.options && Object.keys(it.options).length > 0 && (
                      <div className="text-xs text-gray-500">
                        {Object.entries(it.options)
                          .filter(([, value]) => value)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" | ")}
                      </div>
                    )}
                    <div className="font-bold text-pink-600">{it.price} MDL</div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) =>
                      updateQty(
                        it.id,
                        parseInt(e.target.value || 1, 10),
                        it.variantKey
                      )
                    }
                    className={`${inputs.default} w-24`}
                    disabled={submitting}
                  />
                  <button
                    className={buttons.outline}
                    onClick={() => remove(it.id, it.variantKey)}
                    disabled={submitting}
                  >
                    Sterge
                  </button>
                </div>
              ))}
            </div>

            <aside className={cards.elevated}>
              <h3 className="mb-3 text-xl font-semibold text-gray-900">Rezumat</h3>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Data livrare
              </label>
              <input
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime("");
                  setCheckoutStatus(buildStatus("", "", ""));
                }}
                className={`${inputs.default} mb-3`}
                disabled={submitting}
              />

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Ora livrare
              </label>
              <div className="mb-3">
                {loadingSlots && (
                  <div className="text-sm text-gray-500">
                    Se incarca intervalele...
                  </div>
                )}
                {!loadingSlots && slots && (
                  <SlotPicker
                    slots={slots}
                    date={date}
                    value={time}
                    onChange={(value) => {
                      setTime(value);
                      setCheckoutStatus(buildStatus("", "", ""));
                    }}
                  />
                )}
                {!loadingSlots && date && !slots && (
                  <div className="text-sm text-amber-700">
                    Nu am putut incarca intervalele pentru ziua selectata.
                  </div>
                )}
              </div>
              <div className="mb-3 text-xs text-gray-500">
                Timp minim de pregatire: {leadHours}h.
              </div>

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Metoda predarii
              </label>
              <select
                value={metodaLivrare}
                onChange={(e) => setMetodaLivrare(e.target.value)}
                className={`${inputs.default} mb-3`}
                disabled={submitting}
              >
                <option value="ridicare">Ridicare de la patiserie</option>
                <option value="livrare">Livrare (+100 MDL)</option>
              </select>

              {metodaLivrare === "livrare" && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Adresa livrare
                    </label>
                    {addressOptions.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        <select
                          value={addressMode}
                          onChange={(e) => setAddressMode(e.target.value)}
                          className={`${inputs.default} flex-1`}
                          disabled={submitting}
                        >
                          <option value="saved">Adrese salvate</option>
                          <option value="custom">Adresa noua</option>
                        </select>
                        {addressMode === "saved" && (
                          <select
                            value={selectedAddressIdx}
                            onChange={(e) => setSelectedAddressIdx(e.target.value)}
                            className={`${inputs.default} flex-1`}
                            disabled={submitting}
                          >
                            {addressOptions.map((opt, idx) => (
                              <option key={`${opt.label}_${idx}`} value={String(idx)}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                    {addressMode === "saved" && selectedAddressIdx !== "" ? (
                      <div className="rounded-lg border bg-gray-50 p-2 text-sm text-gray-600">
                        {adresa || "Selecteaza o adresa salvata."}
                      </div>
                    ) : (
                      <input
                        className={inputs.default}
                        placeholder="Adresa livrare"
                        value={adresa}
                        onChange={(e) => setAdresa(e.target.value)}
                        disabled={submitting}
                      />
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Fereastra livrare (optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={windowStart}
                        onChange={(e) => setWindowStart(e.target.value)}
                        className={inputs.default}
                        disabled={submitting}
                      />
                      <input
                        type="time"
                        value={windowEnd}
                        onChange={(e) => setWindowEnd(e.target.value)}
                        className={inputs.default}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Instructiuni curier
                    </label>
                    <textarea
                      className={`${inputs.default} min-h-[80px]`}
                      placeholder="Etaj, interfon, indicatii speciale..."
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              )}

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Note comanda
              </label>
              <textarea
                className={`${inputs.default} mb-4 min-h-[90px]`}
                placeholder="Preferinte, alergii, mesaj pe tort..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />

              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Atasamente (optional)
              </label>
              <input
                type="file"
                multiple
                onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                className={`${inputs.default} mb-2`}
                disabled={submitting}
              />
              {attachments.length > 0 && (
                <div className="mb-3 text-xs text-gray-600">
                  Fisiere: {attachments.map((file) => file.name).join(", ")}
                </div>
              )}

              <div className="space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">{subtotal.toFixed(2)} MDL</span>
                </div>
                {metodaLivrare === "livrare" && (
                  <div className="flex justify-between">
                    <span>Taxa livrare</span>
                    <span className="font-semibold">{LIVRARE_FEE} MDL</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-lg">
                  <span>Total</span>
                  <span className="font-bold text-gray-900">{total.toFixed(2)} MDL</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className={buttons.outline}
                  onClick={() => {
                    clear();
                    resetDraftState();
                  }}
                  disabled={submitting}
                >
                  Goleste cosul
                </button>
                <button
                  className={buttons.primary}
                  onClick={checkout}
                  disabled={submitting}
                >
                  {submitting ? "Se proceseaza..." : "Continua la plata"}
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
