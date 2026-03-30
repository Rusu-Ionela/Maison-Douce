import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminShell, {
  AdminMetricGrid,
  AdminPanel,
} from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { getApiErrorMessage } from "../lib/serverState";
import { buttons, inputs } from "../lib/tailwindComponents";

const STATUS_OPTIONS = [
  { value: "", label: "Toate" },
  { value: "noua", label: "Noua" },
  { value: "in_revizie", label: "In revizie" },
  { value: "rezolvata", label: "Rezolvata" },
  { value: "ignorata", label: "Ignorata" },
];

const EMPTY_LIST = [];
const INITIAL_FORM = {
  status: "noua",
  notes: "",
  linkedKnowledgeEntryId: "",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO");
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "rezolvata":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ignorata":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "in_revizie":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-rose-200 bg-rose-50 text-pink-700";
  }
}

function fromItem(item) {
  return {
    status: item?.status || "noua",
    notes: item?.notes || "",
    linkedKnowledgeEntryId: item?.linkedKnowledgeEntry?.id || "",
  };
}

export default function AdminAssistantQuestions() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    limit: "50",
  });
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [feedback, setFeedback] = useState({ type: "info", message: "" });

  const questionsQuery = useQuery({
    queryKey: [
      "assistant-question-gaps",
      filters.status,
      filters.search,
      filters.limit,
    ],
    queryFn: async () => {
      const response = await api.get("/assistant/admin/questions", {
        params: {
          status: filters.status || "",
          search: filters.search || "",
          limit: Number(filters.limit || 50),
        },
      });
      return response.data?.items || EMPTY_LIST;
    },
  });

  const knowledgeQuery = useQuery({
    queryKey: ["assistant-knowledge-links"],
    queryFn: async () => {
      const response = await api.get("/assistant/admin");
      return response.data?.items || EMPTY_LIST;
    },
  });

  const items = questionsQuery.data || EMPTY_LIST;
  const knowledgeItems = knowledgeQuery.data || EMPTY_LIST;

  useEffect(() => {
    setSelectedId((current) => {
      if (current && items.some((item) => item.id === current || item._id === current)) {
        return current;
      }
      return items[0]?.id || items[0]?._id || "";
    });
  }, [items]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId || item._id === selectedId) || null,
    [items, selectedId]
  );

  useEffect(() => {
    if (!selectedItem) {
      setForm(INITIAL_FORM);
      return;
    }
    setForm(fromItem(selectedItem));
  }, [selectedItem]);

  const metrics = useMemo(() => {
    const openItems = items.filter(
      (item) => !["rezolvata", "ignorata"].includes(String(item.status || ""))
    ).length;
    const resolved = items.filter((item) => item.status === "rezolvata").length;
    const review = items.filter((item) => item.status === "in_revizie").length;
    const totalHits = items.reduce((sum, item) => sum + Number(item.hitCount || 0), 0);

    return [
      {
        label: "Deschise",
        value: openItems,
        hint: "Intrebari care cer inca actiune.",
        tone: "rose",
      },
      {
        label: "In revizie",
        value: review,
        hint: "Sunt analizate sau mapate spre raspuns.",
        tone: "gold",
      },
      {
        label: "Rezolvate",
        value: resolved,
        hint: "Marcaje inchise de echipa.",
        tone: "sage",
      },
      {
        label: "Aparitii totale",
        value: totalHits,
        hint: "De cate ori au ajuns in fallback.",
        tone: "slate",
      },
    ];
  }, [items]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) {
        throw new Error("Selecteaza mai intai o intrebare.");
      }

      const response = await api.patch(`/assistant/admin/questions/${selectedId}`, {
        status: form.status,
        notes: form.notes,
        linkedKnowledgeEntryId: form.linkedKnowledgeEntryId || "",
      });
      return response.data?.item || null;
    },
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: ["assistant-question-gaps"] });
      setFeedback({
        type: "success",
        message: "Intrebarea a fost actualizata.",
      });
      if (item?.id || item?._id) {
        setSelectedId(item.id || item._id);
      }
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Nu am putut actualiza intrebarile pentru review."
        ),
      });
    },
  });

  return (
    <AdminShell
      title="Inbox Intrebari AI"
      description="Aici apar intrebarile care au ajuns pe fallback in locul unui raspuns clar din knowledge base. Le poti marca, nota si lega de o intrare existenta."
      actions={
        <>
          <Link to="/admin/asistent-ai" className={buttons.outline}>
            Knowledge base
          </Link>
          <button
            type="button"
            onClick={() => questionsQuery.refetch()}
            className={buttons.outline}
          >
            Reincarca
          </button>
        </>
      }
    >
      <StatusBanner
        type="error"
        message={
          questionsQuery.error
            ? getApiErrorMessage(
                questionsQuery.error,
                "Nu am putut incarca intrebarile care necesita review."
              )
            : ""
        }
      />
      <StatusBanner
        type="error"
        message={
          knowledgeQuery.error
            ? getApiErrorMessage(
                knowledgeQuery.error,
                "Nu am putut incarca intrarile din knowledge base."
              )
            : ""
        }
      />
      <StatusBanner type={feedback.type} message={feedback.message} />
      <StatusBanner
        type="info"
        message={
          questionsQuery.isLoading
            ? "Se incarca intrebarile nerecunoscute..."
            : saveMutation.isPending
              ? "Se salveaza actualizarile..."
              : ""
        }
      />

      <AdminMetricGrid items={metrics} />

      <AdminPanel
        title="Filtre"
        description="Filtreaza dupa status, cauta dupa text si ajusteaza numarul de rezultate vizibile."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-gray-700">
            Status
            <select
              className={`${inputs.default} mt-1`}
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-700">
            Cauta
            <input
              className={`${inputs.default} mt-1`}
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="vegan, fara zahar, livrare rapida"
            />
          </label>

          <label className="text-sm text-gray-700">
            Limita
            <select
              className={`${inputs.default} mt-1`}
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
        </div>
      </AdminPanel>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <AdminPanel
          title="Intrebari detectate"
          description="Selecteaza o intrare pentru a vedea detaliile si a o marca drept rezolvata."
        >
          <div className="space-y-3">
            {items.map((item) => {
              const isSelected = (item.id || item._id) === selectedId;
              return (
                <article
                  key={item.id || item._id}
                  className={`rounded-[24px] border p-4 transition ${
                    isSelected
                      ? "border-pink-400 bg-rose-50"
                      : "border-rose-100 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-[75%]">
                      <div className="text-lg font-semibold text-gray-900">{item.query}</div>
                      <div className="mt-1 text-sm text-gray-600">
                        Ultima aparitie: {formatDateTime(item.lastAskedAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {item.hitCount} aparitii
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    {(item.pathnames || []).slice(0, 4).map((pathname) => (
                      <span
                        key={`${item.id}_${pathname}`}
                        className="rounded-full border border-rose-200 bg-white px-2.5 py-1"
                      >
                        {pathname}
                      </span>
                    ))}
                  </div>

                  {item.linkedKnowledgeEntry?.title ? (
                    <div className="mt-3 text-sm text-gray-700">
                      Legat de:{" "}
                      <span className="font-semibold text-gray-900">
                        {item.linkedKnowledgeEntry.title}
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id || item._id)}
                      className={buttons.outline}
                    >
                      Deschide
                    </button>
                  </div>
                </article>
              );
            })}

            {!questionsQuery.isLoading && items.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-5 text-sm text-gray-600">
                Nu exista intrebari pentru filtrul curent.
              </div>
            ) : null}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Review"
          description="Marcheaza statusul, lasa note interne si leaga intrebarea de o intrare din knowledge base cand ai rezolvat cazul."
        >
          {selectedItem ? (
            <div className="space-y-5">
              <div className="rounded-[24px] border border-rose-100 bg-rose-50/60 p-4">
                <div className="text-sm text-gray-500">Intrebare detectata</div>
                <div className="mt-2 text-xl font-semibold text-gray-900">
                  {selectedItem.query}
                </div>
                <div className="mt-3 grid gap-3 text-sm text-gray-700 md:grid-cols-2">
                  <div>
                    <div className="text-gray-500">Prima aparitie</div>
                    <div className="font-medium text-gray-900">
                      {formatDateTime(selectedItem.createdAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Ultima aparitie</div>
                    <div className="font-medium text-gray-900">
                      {formatDateTime(selectedItem.lastAskedAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Intent returnat</div>
                    <div className="font-medium text-gray-900">
                      {selectedItem.lastIntentId || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Rol utilizator</div>
                    <div className="font-medium text-gray-900">
                      {selectedItem.lastUserRole || "guest"}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-900">Formulari vazute</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedItem.sampleQueries || []).map((sample) => (
                    <span
                      key={sample}
                      className="rounded-full border border-rose-200 bg-white px-3 py-1 text-sm text-gray-700"
                    >
                      {sample}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-900">Pagini din care a venit</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedItem.pathnames || []).map((pathname) => (
                    <span
                      key={pathname}
                      className="rounded-full border border-rose-200 bg-white px-3 py-1 text-sm text-gray-700"
                    >
                      {pathname}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-gray-700">
                  Status
                  <select
                    className={`${inputs.default} mt-2`}
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    {STATUS_OPTIONS.filter((item) => item.value).map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-gray-700">
                  Lega la knowledge base
                  <select
                    className={`${inputs.default} mt-2`}
                    value={form.linkedKnowledgeEntryId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        linkedKnowledgeEntryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Fara legatura</option>
                    {knowledgeItems.map((item) => (
                      <option key={item.id || item._id} value={item.id || item._id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-sm font-semibold text-gray-700">
                Notite interne
                <textarea
                  className={`mt-2 min-h-[180px] ${inputs.default}`}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Ex: trebuie creat raspuns pentru alergii / tort vegan / termen minim de productie."
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className={buttons.primary}
                >
                  Salveaza review-ul
                </button>
                <Link to="/admin/asistent-ai" className={buttons.outline}>
                  Deschide knowledge base
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-5 text-sm text-gray-600">
              Selecteaza o intrebare din lista pentru a o analiza.
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
