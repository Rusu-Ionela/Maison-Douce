import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import {
  fetchAdminCoupons,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";

const FILTERS = [
  { value: "", label: "Toate" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expired", label: "Expirate" },
];
const EMPTY_LIST = [];

const INITIAL_FORM = {
  cod: "",
  descriere: "",
  tipReducere: "percent",
  procentReducere: "10",
  valoareFixa: "0",
  valoareMinima: "0",
  usageLimit: "0",
  perUserLimit: "0",
  dataExpirare: "",
  allowedUserId: "",
  activ: true,
  notesAdmin: "",
};

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

function describeDiscount(coupon) {
  if (coupon.tipReducere === "fixed") {
    return `${formatMoney(coupon.valoareFixa)} fix`;
  }
  return `${Number(coupon.procentReducere || 0)}%`;
}

function createPayload(form) {
  return {
    cod: form.cod.trim().toUpperCase(),
    descriere: form.descriere.trim(),
    tipReducere: form.tipReducere,
    procentReducere: Number(form.procentReducere || 0),
    valoareFixa: Number(form.valoareFixa || 0),
    valoareMinima: Number(form.valoareMinima || 0),
    usageLimit: Number(form.usageLimit || 0),
    perUserLimit: Number(form.perUserLimit || 0),
    dataExpirare: form.dataExpirare || null,
    allowedUserId: form.allowedUserId.trim() || null,
    activ: Boolean(form.activ),
    notesAdmin: form.notesAdmin.trim(),
  };
}

function fillFormFromCoupon(coupon) {
  if (!coupon) return INITIAL_FORM;
  return {
    cod: coupon.cod || "",
    descriere: coupon.descriere || "",
    tipReducere: coupon.tipReducere || "percent",
    procentReducere: String(coupon.procentReducere || 0),
    valoareFixa: String(coupon.valoareFixa || 0),
    valoareMinima: String(coupon.valoareMinima || 0),
    usageLimit: String(coupon.usageLimit || 0),
    perUserLimit: String(coupon.perUserLimit || 0),
    dataExpirare: toInputDate(coupon.dataExpirare),
    allowedUserId:
      typeof coupon.allowedUserId === "object"
        ? coupon.allowedUserId?._id || ""
        : coupon.allowedUserId || "",
    activ: coupon.activ !== false,
    notesAdmin: coupon.notesAdmin || "",
  };
}

export default function AdminCupoane() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState({ type: "info", message: "" });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  const couponsQuery = useQuery({
    queryKey: queryKeys.adminCoupons({ search, status }),
    queryFn: () => fetchAdminCoupons({ search, status }),
  });

  const coupons = couponsQuery.data || EMPTY_LIST;
  const selectedCoupon = useMemo(
    () => coupons.find((coupon) => coupon._id === selectedCouponId) || null,
    [coupons, selectedCouponId]
  );

  useEffect(() => {
    if (!selectedCouponId) return;
    if (!selectedCoupon) {
      setSelectedCouponId("");
      setForm(INITIAL_FORM);
      return;
    }
    setForm(fillFormFromCoupon(selectedCoupon));
  }, [selectedCoupon, selectedCouponId]);

  const invalidateCoupons = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = createPayload(form);
      if (selectedCouponId) {
        return api.patch(`/coupon/admin/${selectedCouponId}`, payload);
      }
      return api.post("/coupon/admin", payload);
    },
    onSuccess: async (response) => {
      await invalidateCoupons();
      const savedCoupon = response?.data?.coupon || response?.data?.cuponNou || null;
      if (savedCoupon?._id) {
        setSelectedCouponId(savedCoupon._id);
      }
      setFeedback({
        type: "success",
        message: selectedCouponId
          ? "Cuponul a fost actualizat."
          : "Cuponul a fost creat.",
      });
      if (!selectedCouponId) {
        setForm(INITIAL_FORM);
      }
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut salva cuponul."),
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ couponId, activ }) =>
      api.patch(`/coupon/admin/${couponId}`, { activ }),
    onSuccess: async (_response, variables) => {
      await invalidateCoupons();
      setFeedback({
        type: variables.activ ? "success" : "warning",
        message: variables.activ
          ? "Cuponul a fost reactivat."
          : "Cuponul a fost dezactivat.",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut modifica statusul cuponului."),
      });
    },
  });

  const resetForm = () => {
    setSelectedCouponId("");
    setForm(INITIAL_FORM);
    setFeedback({ type: "info", message: "" });
  };

  const pending = saveMutation.isPending || toggleMutation.isPending;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupoane</h1>
          <p className="text-gray-600">
            Gestionare completa pentru promotii: creare, editare, expirare, limite si restrictii.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-xl border px-3 py-2" onClick={resetForm}>
            Cupon nou
          </button>
          <button
            type="button"
            className="rounded-xl border px-3 py-2"
            onClick={() => couponsQuery.refetch()}
          >
            Reincarca
          </button>
        </div>
      </header>

      <StatusBanner type={feedback.type} message={feedback.message} />
      <StatusBanner
        type="error"
        message={
          couponsQuery.error
            ? getApiErrorMessage(couponsQuery.error, "Nu am putut incarca lista de cupoane.")
            : ""
        }
      />
      <StatusBanner
        type="info"
        message={pending ? "Se salveaza modificarile..." : ""}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cauta dupa cod sau descriere"
              className="flex-1 rounded-xl border p-2"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border p-2"
            >
              {FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {coupons.map((coupon) => {
              const selected = coupon._id === selectedCouponId;
              const isAllowedUserObject = typeof coupon.allowedUserId === "object";
              return (
                <div
                  key={coupon._id}
                  className={`rounded-2xl border p-4 transition ${
                    selected
                      ? "border-rose-400 bg-rose-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{coupon.cod}</div>
                      <div className="text-sm text-gray-600">{coupon.descriere || "Fara descriere"}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        coupon.activ && !coupon.isExpired
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {coupon.isExpired ? "Expirat" : coupon.activ ? "Activ" : "Inactiv"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-2">
                    <div>Reducere: {describeDiscount(coupon)}</div>
                    <div>Total minim: {formatMoney(coupon.valoareMinima)}</div>
                    <div>Folosiri: {coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</div>
                    <div>Per user: {coupon.perUserLimit || "nelimitat"}</div>
                    <div>
                      Restrictie user:{" "}
                      {coupon.allowedUserId
                        ? isAllowedUserObject
                          ? coupon.allowedUserId.email || coupon.allowedUserId.nume || coupon.allowedUserId._id
                          : coupon.allowedUserId
                        : "oricine"}
                    </div>
                    <div>Expira: {coupon.dataExpirare ? toInputDate(coupon.dataExpirare) : "niciodata"}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCouponId(coupon._id);
                        setForm(fillFormFromCoupon(coupon));
                      }}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      Editeaza
                    </button>
                    <button
                      type="button"
                      disabled={toggleMutation.isPending}
                      onClick={() => {
                        toggleMutation.mutate({ couponId: coupon._id, activ: !coupon.activ });
                      }}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      {coupon.activ ? "Dezactiveaza" : "Reactiveaza"}
                    </button>
                  </div>
                </div>
              );
            })}

            {!couponsQuery.isLoading && coupons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
                Nu exista cupoane pentru filtrul curent.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedCouponId ? "Editeaza cuponul" : "Creeaza cupon nou"}
            </h2>
            <p className="text-sm text-gray-600">
              Poti seta discount procentual sau fix, prag minim si limite de utilizare.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-700">
              Cod
              <input
                className="mt-1 w-full rounded-xl border p-2"
                value={form.cod}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cod: event.target.value.toUpperCase() }))
                }
                placeholder="SAVE10"
              />
            </label>

            <label className="text-sm text-gray-700">
              Tip reducere
              <select
                className="mt-1 w-full rounded-xl border p-2"
                value={form.tipReducere}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tipReducere: event.target.value,
                    procentReducere:
                      event.target.value === "percent" ? current.procentReducere || "10" : "0",
                    valoareFixa:
                      event.target.value === "fixed" ? current.valoareFixa || "50" : "0",
                  }))
                }
              >
                <option value="percent">Procent</option>
                <option value="fixed">Valoare fixa</option>
              </select>
            </label>

            <label className="text-sm text-gray-700 md:col-span-2">
              Descriere
              <input
                className="mt-1 w-full rounded-xl border p-2"
                value={form.descriere}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descriere: event.target.value }))
                }
                placeholder="Campanie aniversara, clienti noi, Black Friday"
              />
            </label>

            <label className="text-sm text-gray-700">
              Procent reducere
              <input
                type="number"
                className="mt-1 w-full rounded-xl border p-2"
                value={form.procentReducere}
                disabled={form.tipReducere !== "percent"}
                onChange={(event) =>
                  setForm((current) => ({ ...current, procentReducere: event.target.value }))
                }
              />
            </label>

            <label className="text-sm text-gray-700">
              Valoare fixa
              <input
                type="number"
                className="mt-1 w-full rounded-xl border p-2"
                value={form.valoareFixa}
                disabled={form.tipReducere !== "fixed"}
                onChange={(event) =>
                  setForm((current) => ({ ...current, valoareFixa: event.target.value }))
                }
              />
            </label>

            <label className="text-sm text-gray-700">
              Total minim
              <input
                type="number"
                className="mt-1 w-full rounded-xl border p-2"
                value={form.valoareMinima}
                onChange={(event) =>
                  setForm((current) => ({ ...current, valoareMinima: event.target.value }))
                }
              />
            </label>

            <label className="text-sm text-gray-700">
              Expira la
              <input
                type="date"
                className="mt-1 w-full rounded-xl border p-2"
                value={form.dataExpirare}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dataExpirare: event.target.value }))
                }
              />
            </label>

            <label className="text-sm text-gray-700">
              Limita utilizari totale
              <input
                type="number"
                className="mt-1 w-full rounded-xl border p-2"
                value={form.usageLimit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, usageLimit: event.target.value }))
                }
              />
            </label>

            <label className="text-sm text-gray-700">
              Limita per utilizator
              <input
                type="number"
                className="mt-1 w-full rounded-xl border p-2"
                value={form.perUserLimit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, perUserLimit: event.target.value }))
                }
              />
            </label>

            <label className="text-sm text-gray-700 md:col-span-2">
              Restrictioneaza la userId (optional)
              <input
                className="mt-1 w-full rounded-xl border p-2"
                value={form.allowedUserId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, allowedUserId: event.target.value }))
                }
                placeholder="24-char user id"
              />
            </label>

            <label className="text-sm text-gray-700 md:col-span-2">
              Note admin
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-xl border p-2"
                value={form.notesAdmin}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notesAdmin: event.target.value }))
                }
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
              <input
                type="checkbox"
                checked={form.activ}
                onChange={(event) =>
                  setForm((current) => ({ ...current, activ: event.target.checked }))
                }
              />
              Activ
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="rounded-xl bg-rose-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selectedCouponId ? "Salveaza modificarile" : "Creeaza cupon"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border px-4 py-2"
            >
              Reseteaza formularul
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
