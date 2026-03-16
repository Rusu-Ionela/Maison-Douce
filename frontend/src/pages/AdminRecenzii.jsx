import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import {
  fetchAdminReviews,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";

const TYPE_OPTIONS = [
  { value: "", label: "Toate tipurile" },
  { value: "produs", label: "Produs" },
  { value: "comanda", label: "Comanda" },
  { value: "prestator", label: "Prestator" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Toate statusurile" },
  { value: "pending", label: "In asteptare" },
  { value: "approved", label: "Aprobate" },
  { value: "hidden", label: "Ascunse" },
];

const STATUS_LABELS = {
  pending: "In asteptare",
  approved: "Aprobata",
  hidden: "Ascunsa",
};

const TYPE_LABELS = {
  produs: "Produs",
  comanda: "Comanda",
  prestator: "Prestator",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusBadgeClass(status) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "hidden") {
    return "bg-slate-200 text-slate-700";
  }
  return "bg-amber-100 text-amber-700";
}

export default function AdminRecenzii() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState({ type: "info", message: "" });
  const [filters, setFilters] = useState({
    reviewType: "",
    moderationStatus: "",
    reportedOnly: false,
    search: "",
    limit: "50",
  });
  const [moderationNote, setModerationNote] = useState({});

  const reviewsQuery = useQuery({
    queryKey: queryKeys.adminReviews(filters),
    queryFn: () => fetchAdminReviews(filters),
  });

  const invalidateReviews = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ reviewType, reviewId, moderationStatus, moderationNote: note }) =>
      api.patch(`/recenzii/admin/${reviewType}/${reviewId}`, {
        moderationStatus,
        moderationNote: note || "",
      }),
    onSuccess: async (_response, variables) => {
      await invalidateReviews();
      setFeedback({
        type: variables.moderationStatus === "approved" ? "success" : "warning",
        message:
          variables.moderationStatus === "approved"
            ? "Recenzia a fost aprobata."
            : "Recenzia a fost ascunsa.",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut actualiza recenzia."),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ reviewType, reviewId }) => api.delete(`/recenzii/admin/${reviewType}/${reviewId}`),
    onSuccess: async () => {
      await invalidateReviews();
      setFeedback({
        type: "success",
        message: "Recenzia a fost stearsa definitiv.",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut sterge recenzia."),
      });
    },
  });

  const reviews = reviewsQuery.data || [];
  const pending = updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderare recenzii</h1>
          <p className="text-gray-600">
            Aprobi, ascunzi sau stergi recenzii si vezi imediat cele raportate de clienti.
          </p>
        </div>
        <button
          type="button"
          onClick={() => reviewsQuery.refetch()}
          className="rounded-xl border px-3 py-2"
        >
          Reincarca
        </button>
      </header>

      <StatusBanner type={feedback.type} message={feedback.message} />
      <StatusBanner
        type="error"
        message={
          reviewsQuery.error
            ? getApiErrorMessage(reviewsQuery.error, "Nu am putut incarca recenziile.")
            : ""
        }
      />
      <StatusBanner
        type="info"
        message={pending ? "Se actualizeaza moderarea recenziilor..." : ""}
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm text-gray-700">
            Tip recenzie
            <select
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.reviewType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, reviewType: event.target.value }))
              }
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-700">
            Status moderare
            <select
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.moderationStatus}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  moderationStatus: event.target.value,
                }))
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-700">
            Cautare
            <input
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Comentariu, id, tip, motiv raportare"
            />
          </label>

          <label className="text-sm text-gray-700">
            Limita
            <select
              className="mt-1 w-full rounded-xl border p-2"
              value={filters.limit}
              onChange={(event) =>
                setFilters((current) => ({ ...current, limit: event.target.value }))
              }
            >
              {[25, 50, 100, 200].map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700 xl:pt-7">
            <input
              type="checkbox"
              checked={filters.reportedOnly}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  reportedOnly: event.target.checked,
                }))
              }
            />
            Doar recenzii raportate
          </label>
        </div>
      </section>

      {reviewsQuery.isLoading ? (
        <div className="rounded-2xl border bg-white p-5 text-sm text-gray-600">
          Se incarca recenziile pentru moderare...
        </div>
      ) : null}

      <div className="space-y-4">
        {reviews.map((review) => {
          const noteValue = moderationNote[review._id] || review.moderationNote || "";
          return (
            <article key={`${review.reviewType}-${review._id}`} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                      {TYPE_LABELS[review.reviewType] || review.reviewType}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                        review.moderationStatus
                      )}`}
                    >
                      {STATUS_LABELS[review.moderationStatus] || review.moderationStatus}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      Rating: {review.rating} / 5
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Target: {review.targetId || "-"} • Autor: {review.authorId || "-"}
                  </div>
                </div>
                <div className="text-sm text-gray-500">{formatDateTime(review.data)}</div>
              </div>

              <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-gray-800">
                {review.comentariu || "Fara comentariu"}
              </div>

              {review.foto ? (
                <div className="mt-3">
                  <img
                    src={review.foto}
                    alt="recenzie"
                    className="h-40 rounded-xl border object-cover"
                  />
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-gray-500">Raportari</div>
                  <div className="font-semibold text-gray-900">{review.reportCount || 0}</div>
                </div>
                <div>
                  <div className="text-gray-500">Ultimul motiv</div>
                  <div className="font-medium text-gray-900">
                    {review.lastReportReason || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Ultima moderare</div>
                  <div className="font-medium text-gray-900">
                    {formatDateTime(review.moderatedAt)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Moderator</div>
                  <div className="font-medium text-gray-900">
                    {review.moderatedByEmail || review.moderatedBy || "-"}
                  </div>
                </div>
              </div>

              <label className="mt-4 block text-sm text-gray-700">
                Nota de moderare
                <textarea
                  className="mt-1 min-h-[90px] w-full rounded-xl border p-2"
                  value={noteValue}
                  onChange={(event) =>
                    setModerationNote((current) => ({
                      ...current,
                      [review._id]: event.target.value,
                    }))
                  }
                  placeholder="Explica intern de ce aprobi, ascunzi sau stergi recenzia."
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    updateMutation.mutate({
                      reviewType: review.reviewType,
                      reviewId: review._id,
                      moderationStatus: "approved",
                      moderationNote: noteValue,
                    })
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
                >
                  Aproba
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    updateMutation.mutate({
                      reviewType: review.reviewType,
                      reviewId: review._id,
                      moderationStatus: "hidden",
                      moderationNote: noteValue,
                    })
                  }
                  className="rounded-xl bg-amber-500 px-4 py-2 text-white disabled:opacity-60"
                >
                  Ascunde
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    deleteMutation.mutate({
                      reviewType: review.reviewType,
                      reviewId: review._id,
                    })
                  }
                  className="rounded-xl border border-rose-300 px-4 py-2 text-rose-700 disabled:opacity-60"
                >
                  Sterge definitiv
                </button>
              </div>
            </article>
          );
        })}

        {!reviewsQuery.isLoading && reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
            Nu exista recenzii pentru filtrul curent.
          </div>
        ) : null}
      </div>
    </div>
  );
}
