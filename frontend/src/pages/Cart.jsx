import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { OrdersAPI } from "../api/orders";
import { ProductsAPI } from "../api/products";
import { getAvailability } from "../api/calendar";
import ClientOrderFlowGuide from "../components/ClientOrderFlowGuide";
import SlotPicker from "../components/SlotPicker";
import StatusBanner from "../components/StatusBanner";
import ProviderSelector from "../components/ProviderSelector";
import api from "/src/lib/api.js";
import { buttons, cards, inputs, containers } from "/src/lib/tailwindComponents.js";
import { formatDateInput, parseDateInput } from "../lib/date";
import { buildCheckoutNotes } from "../lib/checkoutNotes";
import { useProviderDirectory } from "../lib/providers";

function buildStatus(type, message, title = "") {
  return { type, message, title };
}

function itemNeedsQuote(item) {
  return (
    item?.requiresQuote === true ||
    item?.requiresManualQuote === true ||
    item?.sourceType === "local-fallback" ||
    String(item?.id || "").startsWith("curated-")
  );
}

export default function Cart() {
  const { items, add, updateQty, remove, clear, subtotal } = useCart();
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
  const [cakeMessage, setCakeMessage] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState(buildStatus("", "", ""));
  const [upsells, setUpsells] = useState([]);
  const [loadingUpsells, setLoadingUpsells] = useState(false);

  const LIVRARE_FEE = 100;
  const providerState = useProviderDirectory({ user });
  const prestatorId = providerState.activeProviderId;

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
  const hasQuoteOnlyItems = useMemo(() => items.some((item) => itemNeedsQuote(item)), [items]);
  const clientNote = useMemo(
    () =>
      buildCheckoutNotes({
        cakeMessage,
        dietaryNotes,
        orderNotes,
      }),
    [cakeMessage, dietaryNotes, orderNotes]
  );
  const suggestedUpsells = useMemo(() => {
    const existingIds = new Set(items.map((item) => String(item.id || "")));
    return upsells
      .filter((item) => !existingIds.has(String(item?._id || "")))
      .slice(0, 3);
  }, [items, upsells]);

  useEffect(() => {
    if (!date || !prestatorId) {
      setSlots(null);
      return;
    }
    setLoadingSlots(true);
    getAvailability(prestatorId, { from: date, to: date, hideFull: true })
      .then((data) => setSlots(Array.isArray(data?.slots) ? data.slots : []))
      .catch(() => setSlots(null))
      .finally(() => setLoadingSlots(false));
  }, [date, prestatorId]);

  useEffect(() => {
    if (!prestatorId) {
      setUpsells([]);
      return;
    }

    let cancelled = false;
    setLoadingUpsells(true);

    ProductsAPI.list({
      categorie: "prajituri",
      activ: true,
      limit: 6,
      prestatorId,
    })
      .then((data) => {
        if (!cancelled) {
          setUpsells(Array.isArray(data?.items) ? data.items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUpsells([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingUpsells(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [prestatorId]);

  const minDate = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() + leadHours);
    return formatDateInput(now);
  }, [leadHours]);

  const slotIsValid = () => {
    if (!date || !time) return false;
    const [h, m] = time.split(":").map(Number);
    const dt = parseDateInput(date, {
      hours: h || 0,
      minutes: m || 0,
    });
    if (!dt) return false;
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
    setCakeMessage("");
    setDietaryNotes("");
    setOrderNotes("");
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
    if (items.some((item) => Number(item.price || 0) <= 0)) {
      setCheckoutStatus(
        buildStatus(
          "warning",
          "Cosul contine produse care necesita confirmare manuala de pret. Elimina-le din cos si foloseste cererea de oferta."
        )
      );
      return false;
    }
    if (items.some((item) => itemNeedsQuote(item))) {
      setCheckoutStatus(
        buildStatus(
          "warning",
          "Cosul contine modele de inspiratie sau produse fara publicare comerciala completa. Elimina-le din cos si continua prin cererea de oferta."
        )
      );
      return false;
    }
    if (items.some((item) => String(item.name || "").trim() === "Tort personalizat")) {
      setCheckoutStatus(
        buildStatus(
          "warning",
          "Designurile personalizate se confirma manual si nu pot fi finalizate prin checkout-ul standard."
        )
      );
      return false;
    }
    if (!prestatorId) {
      setCheckoutStatus(
        buildStatus(
          "error",
          providerState.error ||
            "Alege un atelier valid inainte de a continua plata standard.",
          "Atelier lipsa"
        )
      );
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
    if (
      !Array.isArray(slots) ||
      !slots.some(
        (slot) =>
          slot?.date === date &&
          slot?.time === time &&
          Number(slot?.free ?? 0) > 0
      )
    ) {
      setCheckoutStatus(
        buildStatus("warning", "Slotul selectat nu mai este disponibil. Alege alt interval.")
      );
      return false;
    }
    if (metodaLivrare === "livrare" && !adresa.trim()) {
      setCheckoutStatus(buildStatus("warning", "Completeaza adresa de livrare."));
      return false;
    }
    if (
      metodaLivrare === "livrare" &&
      windowStart &&
      windowEnd &&
      windowEnd <= windowStart
    ) {
      setCheckoutStatus(
        buildStatus(
          "warning",
          "Intervalul de livrare este invalid. Ora de final trebuie sa fie dupa ora de inceput."
        )
      );
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
      note: clientNote || undefined,
      preferinte: dietaryNotes.trim() || undefined,
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

  const deliveryWindowLabel = buildDeliveryWindow() || "Fara interval suplimentar";
  const deliveryMethodLabel =
    metodaLivrare === "livrare" ? "Livrare la domiciliu" : "Ridicare din atelier";
  const activeProviderLabel =
    providerState.activeProvider?.displayName ||
    (providerState.loading
      ? "Se incarca..."
      : providerState.hasMultipleProviders
        ? "Selecteaza atelierul"
        : "Atelier indisponibil");

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} space-y-6`}>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <p className="text-pink-500 font-semibold uppercase tracking-wide">
                Comanda standard
              </p>
              <h1 className="text-3xl font-bold text-gray-900">Cos si plata</h1>
              <p className="text-sm leading-7 text-gray-600">
                Acest flux este doar pentru produsele cu pret fix publicate in catalogul live. Daca
                vrei un tort creat special pentru evenimentul tau, foloseste constructorul. Daca
                vrei doar sa blochezi data si ora, foloseste calendarul.
              </p>
            </div>
            <span className="text-gray-600">{items.length} produse</span>
          </div>
          <ClientOrderFlowGuide activeFlow="checkout" />
        </div>

        <StatusBanner
          type={checkoutStatus.type || "info"}
          title={checkoutStatus.title}
          message={checkoutStatus.message}
        />
        <StatusBanner
          type="warning"
          title="Produse doar pentru oferta"
          message={
            hasQuoteOnlyItems
              ? "In cos exista modele de inspiratie sau produse fara pret comercial final. Acestea nu pot merge direct in plata."
              : ""
          }
        />
        <StatusBanner
          type="error"
          title="Atelier indisponibil"
          message={
            !providerState.loading && !prestatorId
              ? providerState.error || "Nu exista ateliere publice disponibile pentru plata standard."
              : ""
          }
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
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-[rgba(255,249,242,0.88)]">
                    <img
                      src={it.image || "/images/placeholder.svg"}
                      alt={it.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{it.name}</div>
                    {itemNeedsQuote(it) ? (
                      <div className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                        Cerere de oferta
                      </div>
                    ) : null}
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

              <div className={cards.default}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-pink-500">
                      Extra potrivite
                    </div>
                    <div className="mt-2 text-lg font-semibold text-gray-900">
                      Ce mai merge langa comanda ta
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Sugestiile vin din catalogul atelierului selectat si pot fi adaugate direct in cos.
                    </div>
                  </div>
                  {loadingUpsells ? (
                    <div className="text-sm text-gray-500">Se incarca...</div>
                  ) : null}
                </div>

                {suggestedUpsells.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {suggestedUpsells.map((item) => (
                      <article
                        key={item._id}
                        className="rounded-[22px] border border-rose-100 bg-white px-4 py-4 shadow-soft"
                      >
                        <div className="overflow-hidden rounded-2xl bg-[rgba(255,249,242,0.88)]">
                          <img
                            src={item.imagine || "/images/placeholder.svg"}
                            alt={item.nume || "Extra"}
                            className="h-36 w-full object-cover"
                          />
                        </div>
                        <div className="mt-3 font-semibold text-gray-900">{item.nume}</div>
                        <div className="mt-1 text-sm text-gray-500">
                          {item.descriere || "Extra potrivit pentru tort sau candy bar."}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="font-semibold text-pink-600">
                            {Number(item.pret || 0).toFixed(2)} MDL
                          </div>
                          <button
                            type="button"
                            className={buttons.outline}
                            onClick={() =>
                              add({
                                id: item._id,
                                name: item.nume,
                                price: item.pret,
                                image: item.imagine,
                                qty: 1,
                                prepHours: item.timpPreparareOre || 0,
                              })
                            }
                          >
                            Adauga
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : !loadingUpsells ? (
                  <div className="mt-4 rounded-[20px] border border-dashed border-rose-200 bg-white/80 px-4 py-4 text-sm text-gray-500">
                    Nu exista extra-uri disponibile pentru atelierul selectat sau le ai deja in cos.
                  </div>
                ) : null}
              </div>
            </div>

            <aside className={`${cards.elevated} space-y-5 lg:sticky lg:top-24`}>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Checkout standard</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Platesti doar produsele standard cu pret fix. Daca mesajul, decorul sau formatul
                  schimba semnificativ executia, fluxul corect ramane constructorul sau cererea de
                  oferta.
                </p>
              </div>

              <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4 text-sm leading-7 text-gray-700">
                Preturile din acest checkout raman cele standard. Campurile de mai jos clarifica
                livrarea si executia, dar nu schimba automat dimensiunea, portiile sau designul
                produselor din cos.
              </div>

              <section className="space-y-3 border-t border-rose-100 pt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                  1. Programare
                </div>
                <ProviderSelector
                  providers={providerState.providers}
                  value={prestatorId}
                  onChange={(nextProviderId) => {
                    providerState.setSelectedProviderId(nextProviderId);
                    setTime("");
                    setCheckoutStatus(buildStatus("", "", ""));
                  }}
                  loading={providerState.loading}
                  disabled={!providerState.canChooseProvider}
                  hideIfSingleOption
                  helpText={
                    providerState.activeProvider
                      ? `Comanda se programeaza pentru ${providerState.activeProvider.displayName}.`
                      : providerState.hasMultipleProviders
                        ? "Selecteaza atelierul pentru care vrei sa vezi sloturile."
                        : "Atelierul disponibil se selecteaza automat pentru acest flux."
                  }
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Data predarii
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
                    className={inputs.default}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Ora predarii
                  </label>
                  {loadingSlots && (
                    <div className="text-sm text-gray-500">Se incarca intervalele...</div>
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
                  <div className="mt-3 text-xs text-gray-500">
                    Timp minim de pregatire pentru cosul curent: {leadHours}h.
                  </div>
                </div>
              </section>

              <section className="space-y-3 border-t border-rose-100 pt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                  2. Predare
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Metoda predarii
                  </label>
                  <select
                    value={metodaLivrare}
                    onChange={(e) => setMetodaLivrare(e.target.value)}
                    className={inputs.default}
                    disabled={submitting}
                  >
                    <option value="ridicare">Ridicare din atelier</option>
                    <option value="livrare">Livrare (+100 MDL)</option>
                  </select>
                </div>

                {metodaLivrare === "livrare" && (
                  <div className="space-y-3">
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
                        <div className="rounded-lg border border-rose-100 bg-[rgba(255,249,242,0.88)] p-3 text-sm text-gray-600">
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
              </section>

              <section className="space-y-3 border-t border-rose-100 pt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                  3. Observatii
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Mesaj pe tort (optional)
                  </label>
                  <input
                    className={inputs.default}
                    placeholder="Ex: La multi ani, Mara!"
                    value={cakeMessage}
                    onChange={(e) => setCakeMessage(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Alergii sau restrictii (optional)
                  </label>
                  <textarea
                    className={`${inputs.default} min-h-[80px]`}
                    placeholder="Ex: fara alune, fara alcool, fara coloranti puternici..."
                    value={dietaryNotes}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Observatii comanda (optional)
                  </label>
                  <textarea
                    className={`${inputs.default} min-h-[90px]`}
                    placeholder="Preferinte de ambalare, sunati inainte de livrare, mentiuni logistice..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Atasamente (optional)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv"
                    onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                    className={inputs.default}
                    disabled={submitting}
                  />
                  {attachments.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      Fisiere: {attachments.map((file) => file.name).join(", ")}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3 border-t border-rose-100 pt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                  4. Rezumat final
                </div>
                <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4 text-sm text-gray-700">
                  <div className="grid gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Atelier</span>
                      <span className="text-right font-semibold text-gray-900">{activeProviderLabel}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Programare</span>
                      <span className="text-right font-semibold text-gray-900">
                        {date && time ? `${date} | ${time}` : "Selecteaza data si ora"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Predare</span>
                      <span className="text-right font-semibold text-gray-900">{deliveryMethodLabel}</span>
                    </div>
                    {metodaLivrare === "livrare" ? (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-gray-500">Adresa</span>
                          <span className="text-right font-semibold text-gray-900">
                            {adresa.trim() || "Completeaza adresa de livrare"}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-gray-500">Fereastra</span>
                          <span className="text-right font-semibold text-gray-900">{deliveryWindowLabel}</span>
                        </div>
                      </>
                    ) : null}
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Observatii client</span>
                      <span className="text-right font-semibold text-gray-900">
                        {clientNote ? "Adaugate" : "Nu exista"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Produse</span>
                      <span className="text-right font-semibold text-gray-900">{items.length}</span>
                    </div>
                  </div>
                </div>

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
              </section>

              <div className="flex gap-2">
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
                  disabled={submitting || !prestatorId}
                >
                  {submitting ? "Se creeaza comanda..." : "Creeaza comanda si mergi la plata"}
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
