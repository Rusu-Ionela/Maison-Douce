import { useEffect, useMemo, useState } from "react";
import api from "/src/lib/api.js";
import ProviderSelector from "../components/ProviderSelector";
import { useAuth } from "../context/AuthContext";
import { useProviderDirectory } from "../lib/providers";
import { buttons, cards, inputs } from "../lib/tailwindComponents";

const PROMPT_EXAMPLES = [
  "tort elegant cu doua etaje, flori albe si accente aurii",
  "mini deserturi pastel pentru candy bar de botez",
  "tort modern cu capsuni, crema vanilie si macarons roz",
];

function formatDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DesignerAI() {
  const { user, isAuthenticated } = useAuth() || {};
  const providerState = useProviderDirectory({ user });
  const [prompt, setPrompt] = useState(
    "tort 2 etaje, crema vanilie, decor trandafiri roz"
  );
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  const activeProviderId = providerState.activeProviderId;
  const activeProviderName =
    providerState.activeProvider?.displayName || "atelierul selectat";

  useEffect(() => {
    if (!isAuthenticated || !activeProviderId) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);

    api
      .get("/ai/history", {
        params: { prestatorId: activeProviderId },
      })
      .then((response) => {
        if (cancelled) return;
        setHistory(Array.isArray(response.data?.items) ? response.data.items : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setNotice({
          type: "error",
          message:
            error?.response?.data?.message || "Nu am putut incarca istoricul AI.",
        });
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProviderId, isAuthenticated]);

  const metrics = useMemo(
    () => [
      {
        label: "Atelier activ",
        value: providerState.activeProvider ? activeProviderName : "-",
        hint: "Preview-ul si istoricul sunt legate de atelierul selectat.",
      },
      {
        label: "Istoric AI",
        value: history.length,
        hint: "Ultimele generari salvate pentru utilizatorul conectat.",
      },
      {
        label: "Stare",
        value: loading ? "Generez..." : result?.mode === "mock" ? "Mock local" : "Pregatit",
        hint: result?.source ? `Ultima sursa: ${result.source}` : "Genereaza primul preview.",
      },
    ],
    [activeProviderName, history.length, loading, providerState.activeProvider, result]
  );

  const generate = async () => {
    if (!prompt.trim()) {
      setNotice({ type: "error", message: "Introdu un prompt inainte de generare." });
      return;
    }
    if (!activeProviderId) {
      setNotice({
        type: "error",
        message:
          providerState.error ||
          "Selecteaza un atelier valid inainte de a genera imaginea.",
      });
      return;
    }

    setLoading(true);
    setNotice({ type: "", message: "" });

    try {
      const res = await api.post("/ai/generate-cake", {
        prompt: prompt.trim(),
        prestatorId: activeProviderId,
      });
      const payload = {
        prompt: prompt.trim(),
        imageUrl: res?.data?.imageUrl || "",
        source: res?.data?.source || "",
        mode: res?.data?.mode || "",
        createdAt: res?.data?.historyEntry?.createdAt || new Date().toISOString(),
      };
      setResult(payload);

      if (res?.data?.historyEntry) {
        setHistory((current) => [res.data.historyEntry, ...current].slice(0, 25));
      }

      setNotice({
        type: "success",
        message:
          payload.mode === "mock"
            ? "A fost generat un preview local. Configureaza cheia AI pentru imagini reale."
            : "Imaginea a fost generata cu succes.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Nu am putut genera imaginea pe baza promptului introdus.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-editorial space-y-6 px-4 py-8 sm:px-6">
      <section className={`${cards.tinted} space-y-5`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">
              Preview AI
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold text-gray-900">
              Designer AI pentru concepte de tort
            </h1>
            <p className="mt-3 text-base leading-7 text-gray-600">
              Scrie promptul clientului, genereaza un preview si verifica rapid cum
              arata conceptul pentru {activeProviderName}.
            </p>
          </div>
          <div className="min-w-[280px]">
            <ProviderSelector
              providers={providerState.providers}
              value={activeProviderId}
              onChange={providerState.setSelectedProviderId}
              loading={providerState.loading}
              disabled={!providerState.canChooseProvider}
              hideIfSingleOption
              label="Atelier activ"
              helpText={
                providerState.activeProvider
                  ? `Imaginile se salveaza in istoricul pentru ${activeProviderName}.`
                  : providerState.hasMultipleProviders
                    ? "Selecteaza atelierul pentru care vrei sa generezi preview-ul."
                    : "Atelierul disponibil se selecteaza automat pentru generare."
              }
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((item) => (
            <article
              key={item.label}
              className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft"
            >
              <div className="text-sm font-medium text-pink-700">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</div>
              <div className="mt-2 text-sm text-[#655c53]">{item.hint}</div>
            </article>
          ))}
        </div>

        {!activeProviderId && !providerState.loading ? (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {providerState.error ||
              "Nu exista niciun atelier disponibil pentru generarea imaginilor."}
          </div>
        ) : null}

        {notice.message ? (
          <div
            className={`rounded-[24px] border px-4 py-3 text-sm shadow-soft ${
              notice.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-pink-700"
            }`}
          >
            {notice.message}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className={`${cards.elevated} space-y-4`}>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Prompt nou</h2>
            <p className="mt-1 text-sm text-gray-600">
              Foloseste descrieri clare despre stil, culori, etaje, flori, toppere sau
              tipul de desert.
            </p>
          </div>

          <textarea
            className={`${inputs.default} min-h-[180px] resize-y`}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Exemplu: tort elegant cu 2 etaje, crema vanilie, flori pastel si accente aurii"
          />

          <div className="flex flex-wrap gap-2">
            {PROMPT_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className={buttons.outline}
                onClick={() => setPrompt(example)}
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={generate}
              className={buttons.primary}
              disabled={loading || !prompt.trim() || !activeProviderId}
            >
              {loading ? "Generez preview..." : "Genereaza imagine"}
            </button>
            <button
              type="button"
              className={buttons.outline}
              onClick={() => {
                setPrompt("");
                setResult(null);
                setNotice({ type: "", message: "" });
              }}
            >
              Reseteaza
            </button>
          </div>
        </section>

        <section className={`${cards.elevated} space-y-4`}>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Preview generat</h2>
            <p className="mt-1 text-sm text-gray-600">
              Rezultatul foloseste integrarea AI disponibila sau fallback-ul local din backend.
            </p>
          </div>

          {result?.imageUrl ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-3">
                <img
                  src={result.imageUrl}
                  alt={`Preview generat pentru promptul: ${result.prompt}`}
                  className="w-full rounded-[18px] object-cover shadow-soft"
                />
              </div>
              <div className="grid gap-3 rounded-[24px] border border-rose-100 bg-white/80 p-4 text-sm text-gray-700">
                <div>
                  <span className="font-semibold text-gray-900">Prompt:</span> {result.prompt}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Sursa:</span>{" "}
                  {result.source === "openai" ? "OpenAI" : result.source || result.mode || "-"}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Generat:</span>{" "}
                  {formatDateTime(result.createdAt)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[24px] border border-dashed border-rose-200 bg-white/70 px-6 text-center text-sm text-gray-500">
              <div className="font-semibold text-gray-900">Nu exista preview generat.</div>
              <div className="mt-2">
                Introdu un prompt si genereaza prima imagine pentru a verifica fluxul AI.
              </div>
            </div>
          )}
        </section>
      </div>

      <section className={`${cards.elevated} space-y-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Istoric generari</h2>
            <p className="mt-1 text-sm text-gray-600">
              Ultimele prompturi salvate pentru utilizatorul conectat si atelierul activ.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {providerState.activeProvider
              ? activeProviderName
              : "Fara atelier selectat"}
          </div>
        </div>

        {historyLoading ? (
          <div className="rounded-[24px] border border-dashed border-rose-200 bg-white/70 px-4 py-10 text-sm text-gray-500">
            Se incarca istoricul AI...
          </div>
        ) : history.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {history.map((item) => (
              <article
                key={item._id}
                className="rounded-[24px] border border-rose-100 bg-white/92 p-4 shadow-soft"
              >
                <div className="overflow-hidden rounded-[18px] border border-rose-100 bg-[rgba(255,249,242,0.88)]">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`Istoric AI pentru promptul: ${item.prompt}`}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                      Imagine indisponibila
                    </div>
                  )}
                </div>
                <div className="mt-3 text-sm font-semibold text-gray-900">
                  {item.prompt}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {formatDateTime(item.createdAt)} | {item.source || item.status || "-"}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={buttons.outline}
                    onClick={() => {
                      setPrompt(item.prompt || "");
                      setResult({
                        prompt: item.prompt || "",
                        imageUrl: item.imageUrl || "",
                        source: item.source || "",
                        mode: item.status || "",
                        createdAt: item.createdAt,
                      });
                    }}
                  >
                    Refoloseste
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-rose-200 bg-white/70 px-4 py-10 text-sm text-gray-500">
            Nu exista inca generari salvate pentru atelierul selectat.
          </div>
        )}
      </section>
    </div>
  );
}
