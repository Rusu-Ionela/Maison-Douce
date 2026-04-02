import {
  ORDER_EVENT_OPTIONS,
  ORDER_PORTION_STYLE_OPTIONS,
} from "../../lib/orderFlow";
import { buttons, cards, inputs } from "../../lib/tailwindComponents";

const QUICK_PERSON_PRESETS = [12, 20, 35];

function ChoiceCard({ label, description, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border px-4 py-4 text-left shadow-soft transition ${
        active
          ? "border-sage-deep/35 bg-charcoal text-white"
          : "border-rose-100 bg-white/85 text-[#5f564d] hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white"
      }`}
    >
      <div className="font-semibold">{label}</div>
      <div className={`mt-2 text-sm leading-6 ${active ? "text-rose-100" : "text-[#6d625a]"}`}>
        {description}
      </div>
    </button>
  );
}

export default function OrderFlowIntakeCalculator({
  draft,
  result,
  onChange,
  onContinue,
}) {
  const personsValue = String(draft?.persons || "");

  return (
    <section className={`${cards.elevated} space-y-6`}>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-500">
              Pasul 1
            </div>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">
              Estimeaza simplu de cate kg ai nevoie
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#665d54]">
              Nu trebuie sa stii de la inceput exact ce tort vrei. Spune-ne pentru cate persoane
              este, ce fel de eveniment ai si cat de generoase vrei sa fie portiile, iar noi iti
              dam un reper clar pentru urmatorul pas.
            </p>
          </div>

          <label className="block text-sm font-semibold text-[#4f463e]">
            Pentru cate persoane este tortul?
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={personsValue}
              onChange={(event) => onChange("persons", event.target.value)}
              className={`mt-2 ${inputs.default}`}
              placeholder="Ex: 24"
            />
          </label>

          <div className="flex flex-wrap gap-2.5">
            {QUICK_PERSON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange("persons", preset)}
                className={Number(draft?.persons || 0) === preset ? buttons.primary : buttons.outline}
              >
                {preset} persoane
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#4f463e]">Eveniment</div>
            <div className="grid gap-3 md:grid-cols-2">
              {ORDER_EVENT_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.id}
                  label={option.label}
                  description={option.summary}
                  active={draft?.eventType === option.id}
                  onClick={() => onChange("eventType", option.id)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#4f463e]">Dimensiunea portiilor</div>
            <div className="grid gap-3 md:grid-cols-2">
              {ORDER_PORTION_STYLE_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.id}
                  label={option.label}
                  description={option.summary}
                  active={draft?.portionStyle === option.id}
                  onClick={() => onChange("portionStyle", option.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <article className="rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,252,247,0.98),_rgba(244,237,227,0.94))] p-6 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-500">
              Recomandarea ta
            </div>
            {result?.persons ? (
              <>
                <p className="mt-4 text-lg leading-8 text-[#4f463e]">
                  Pentru <span className="font-semibold text-gray-900">{result.persons}</span>{" "}
                  persoane, recomandarea estimativa este de{" "}
                  <span className="font-semibold text-gray-900">{result.estimatedKgLabel}</span>.
                </p>
                <p className="mt-3 text-sm leading-6 text-[#655c53]">{result.explanation}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-rose-100 bg-white/85 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[#8d775c]">
                      Portii
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      {result.persons}
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-rose-100 bg-white/85 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[#8d775c]">
                      Greutate
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      {result.estimatedKgLabel}
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-rose-100 bg-white/85 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[#8d775c]">
                      Recomandare
                    </div>
                    <div className="mt-2 text-xl font-semibold text-gray-900">
                      {result.tierSuggestion}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[#655c53]">
                Completeaza datele din stanga si vei primi imediat o recomandare clara, ca sa stii
                de unde sa incepi.
              </p>
            )}
          </article>

          <article className="rounded-[28px] border border-rose-100 bg-white/88 p-6 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-500">
              Cum folosesti estimarea
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[#655c53]">
              <div>Este un reper orientativ, nu te obliga la o configuratie finala.</div>
              <div>Te ajuta sa alegi mai repede intre catalog, constructor si generatorul de idei.</div>
              <div>Poti ajusta ulterior designul, decorul si chiar marimea exacta impreuna cu atelierul.</div>
            </div>
            <div className="mt-5">
              <button
                type="button"
                className={buttons.primary}
                disabled={!result?.persons}
                onClick={onContinue}
              >
                Continua catre alegerea tipului de comanda
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
