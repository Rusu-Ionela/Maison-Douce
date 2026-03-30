import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminShell, { AdminPanel } from "../components/AdminShell";
import StatusBanner from "../components/StatusBanner";
import api from "/src/lib/api.js";
import { getApiErrorMessage } from "../lib/serverState";
import { inputs } from "../lib/tailwindComponents";

const EMPTY_LIST = [];
const EMPTY_ACTION = {
  type: "route",
  label: "",
  to: "",
  href: "",
};
const INITIAL_FORM = {
  title: "",
  answer: "",
  keywordsText: "",
  priority: "100",
  active: true,
  actions: [EMPTY_ACTION],
};

function toPayload(form) {
  return {
    title: String(form.title || "").trim(),
    answer: String(form.answer || "").trim(),
    keywords: String(form.keywordsText || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    priority: Number(form.priority || 100),
    active: Boolean(form.active),
    actions: (Array.isArray(form.actions) ? form.actions : [])
      .map((action) => ({
        type: action.type === "href" ? "href" : "route",
        label: String(action.label || "").trim(),
        to: String(action.to || "").trim(),
        href: String(action.href || "").trim(),
      }))
      .filter(
        (action) =>
          action.label &&
          ((action.type === "route" && action.to) ||
            (action.type === "href" && action.href))
      ),
  };
}

function fromItem(item) {
  return {
    title: item?.title || "",
    answer: item?.answer || "",
    keywordsText: Array.isArray(item?.keywords) ? item.keywords.join(", ") : "",
    priority: String(item?.priority ?? 100),
    active: item?.active !== false,
    actions:
      Array.isArray(item?.actions) && item.actions.length > 0
        ? item.actions.map((action) => ({
            type: action?.type === "href" ? "href" : "route",
            label: action?.label || "",
            to: action?.to || "",
            href: action?.href || "",
          }))
        : [EMPTY_ACTION],
  };
}

function AssistantActionEditor({ action, index, onChange, onRemove, disableRemove }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-soft">
      <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr_1fr_auto]">
        <label className="text-sm text-gray-700">
          Tip
          <select
            className={`mt-1 ${inputs.default}`}
            value={action.type}
            onChange={(event) =>
              onChange(index, {
                ...action,
                type: event.target.value,
                to: event.target.value === "route" ? action.to : "",
                href: event.target.value === "href" ? action.href : "",
              })
            }
          >
            <option value="route">Ruta interna</option>
            <option value="href">Link extern</option>
          </select>
        </label>

        <label className="text-sm text-gray-700">
          Eticheta buton
          <input
            className={`mt-1 ${inputs.default}`}
            value={action.label}
            onChange={(event) => onChange(index, { ...action, label: event.target.value })}
            placeholder="Ex: Deschide constructorul"
          />
        </label>

        <label className="text-sm text-gray-700">
          {action.type === "href" ? "Href" : "Ruta"}
          <input
            className={`mt-1 ${inputs.default}`}
            value={action.type === "href" ? action.href : action.to}
            onChange={(event) =>
              onChange(
                index,
                action.type === "href"
                  ? { ...action, href: event.target.value }
                  : { ...action, to: event.target.value }
              )
            }
            placeholder={action.type === "href" ? "https://..." : "/constructor"}
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={disableRemove}
            className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sterge
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAssistantKnowledge() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [feedback, setFeedback] = useState({ type: "info", message: "" });
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  const knowledgeQuery = useQuery({
    queryKey: ["assistant-knowledge-admin"],
    queryFn: async () => {
      const response = await api.get("/assistant/admin");
      return response.data?.items || EMPTY_LIST;
    },
  });

  const items = knowledgeQuery.data || EMPTY_LIST;
  const filteredItems = useMemo(() => {
    const normalized = String(search || "").trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => {
      const haystack = `${item.title || ""} ${(item.keywords || []).join(" ")} ${
        item.answer || ""
      }`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [items, search]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId || item._id === selectedId) || null,
    [items, selectedId]
  );

  useEffect(() => {
    if (!selectedId || !selectedItem) return;
    setForm(fromItem(selectedItem));
  }, [selectedId, selectedItem]);

  const refreshKnowledge = async () => {
    await queryClient.invalidateQueries({ queryKey: ["assistant-knowledge-admin"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (selectedId) {
        const response = await api.patch(`/assistant/admin/${selectedId}`, payload);
        return response.data?.item || null;
      }
      const response = await api.post("/assistant/admin", payload);
      return response.data?.item || null;
    },
    onSuccess: async (item) => {
      await refreshKnowledge();
      if (item?.id || item?._id) {
        setSelectedId(item.id || item._id);
      }
      setFeedback({
        type: "success",
        message: selectedId
          ? "Intrarea asistentului a fost actualizata."
          : "Intrarea asistentului a fost creata.",
      });
      if (!selectedId) {
        setForm(INITIAL_FORM);
      }
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut salva intrarea din knowledge base."),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/assistant/admin/${id}`);
    },
    onSuccess: async () => {
      await refreshKnowledge();
      setSelectedId("");
      setForm(INITIAL_FORM);
      setFeedback({
        type: "warning",
        message: "Intrarea a fost stearsa.",
      });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut sterge intrarea."),
      });
    },
  });

  const pending = saveMutation.isPending || deleteMutation.isPending;

  const resetForm = () => {
    setSelectedId("");
    setForm(INITIAL_FORM);
    setFeedback({ type: "info", message: "" });
  };

  const updateAction = (index, nextAction) => {
    setForm((current) => ({
      ...current,
      actions: current.actions.map((action, actionIndex) =>
        actionIndex === index ? nextAction : action
      ),
    }));
  };

  const addAction = () => {
    setForm((current) => ({
      ...current,
      actions: [...current.actions, { ...EMPTY_ACTION }],
    }));
  };

  const removeAction = (index) => {
    setForm((current) => ({
      ...current,
      actions:
        current.actions.length <= 1
          ? [{ ...EMPTY_ACTION }]
          : current.actions.filter((_action, actionIndex) => actionIndex !== index),
    }));
  };

  return (
    <AdminShell
      title="Knowledge Base Asistent"
      description="Gestioneaza raspunsurile custom folosite de asistentul clientului. Intrarea cu potrivirea cea mai buna este servita direct din backend."
      actions={
        <>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-pink-700 shadow-soft hover:bg-rose-50"
          >
            Intrare noua
          </button>
          <button
            type="button"
            onClick={() => knowledgeQuery.refetch()}
            className="rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-pink-700"
          >
            Reincarca
          </button>
        </>
      }
    >
      <StatusBanner type={feedback.type} message={feedback.message} />
      <StatusBanner
        type="error"
        message={
          knowledgeQuery.error
            ? getApiErrorMessage(
                knowledgeQuery.error,
                "Nu am putut incarca knowledge base-ul asistentului."
              )
            : ""
        }
      />
      <StatusBanner
        type="info"
        message={pending ? "Se salveaza modificarile knowledge base..." : ""}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <AdminPanel
          title="Intrari existente"
          description="Cauta dupa titlu, keyword sau raspuns si selecteaza intrarea pe care vrei sa o modifici."
        >
          <div className="mb-4">
            <input
              className={inputs.default}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cauta constructor, livrare, plata..."
            />
          </div>

          <div className="space-y-3">
            {filteredItems.map((item) => {
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
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{item.title}</div>
                      <div className="mt-1 text-sm text-gray-600">
                        {(item.keywords || []).join(", ") || "fara keywords"}
                      </div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pink-700 shadow-soft">
                      {item.active ? `Activ | P${item.priority}` : `Inactiv | P${item.priority}`}
                    </div>
                  </div>

                  <div className="mt-3 text-sm leading-6 text-gray-600">
                    {String(item.answer || "").slice(0, 180)}
                    {String(item.answer || "").length > 180 ? "..." : ""}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id || item._id);
                        setForm(fromItem(item));
                      }}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-pink-700"
                    >
                      Editeaza
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(item.id || item._id)}
                      disabled={deleteMutation.isPending}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Sterge
                    </button>
                  </div>
                </article>
              );
            })}

            {!knowledgeQuery.isLoading && filteredItems.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-5 text-sm text-gray-600">
                Nu exista intrari pentru filtrul curent.
              </div>
            ) : null}
          </div>
        </AdminPanel>

        <AdminPanel
          title={selectedId ? "Editeaza intrarea" : "Intrare noua"}
          description="Completeaza titlul intrebarii, raspunsul si butoanele pe care asistentul trebuie sa le afiseze."
        >
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Titlu intrebare
              <input
                className={`mt-2 ${inputs.default}`}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ex: Cum aplic voucherul?"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700">
              Raspuns
              <textarea
                className={`mt-2 min-h-[180px] ${inputs.default}`}
                value={form.answer}
                onChange={(event) =>
                  setForm((current) => ({ ...current, answer: event.target.value }))
                }
                placeholder="Explica pe scurt si clar ce trebuie sa faca utilizatorul."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Keywords
                <input
                  className={`mt-2 ${inputs.default}`}
                  value={form.keywordsText}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, keywordsText: event.target.value }))
                  }
                  placeholder="voucher, puncte, fidelizare, reducere"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Prioritate
                <input
                  type="number"
                  className={`mt-2 ${inputs.default}`}
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, priority: event.target.value }))
                  }
                  placeholder="100"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
              />
              Activ in raspunsurile publice
            </label>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Actiuni rapide</div>
                  <div className="text-sm text-gray-600">
                    Butoane pe care asistentul le afiseaza dupa raspuns.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addAction}
                  className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-pink-700"
                >
                  Adauga buton
                </button>
              </div>

              {form.actions.map((action, index) => (
                <AssistantActionEditor
                  key={`assistant-action-${index}`}
                  action={action}
                  index={index}
                  onChange={updateAction}
                  onRemove={removeAction}
                  disableRemove={form.actions.length === 1}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded-full bg-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {selectedId ? "Salveaza modificarile" : "Creeaza intrarea"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-pink-700 shadow-soft hover:bg-rose-50"
              >
                Reseteaza formularul
              </button>
            </div>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
