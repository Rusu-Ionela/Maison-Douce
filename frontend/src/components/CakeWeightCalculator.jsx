import { useMemo, useRef, useState } from "react";
import { buttons, cards, inputs } from "../lib/tailwindComponents";

const QUICK_PRESETS = [10, 20, 30];
const GRAMS_PER_PERSON = 200;

function formatKilograms(value) {
  if (!Number.isFinite(value)) return "0";

  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("ro-RO", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
}

function getCakeSizeLabel(persons) {
  if (persons <= 10) return "tort mic";
  if (persons <= 20) return "tort mediu";
  return "tort mare";
}

export default function CakeWeightCalculator() {
  const [personsInput, setPersonsInput] = useState("10");
  const recommendationRef = useRef(null);

  const persons = useMemo(() => {
    const parsed = Number.parseInt(String(personsInput || ""), 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 0;
  }, [personsInput]);

  const recommendation = useMemo(() => {
    const grams = persons * GRAMS_PER_PERSON;
    const kilograms = grams / 1000;
    const sizeLabel = getCakeSizeLabel(persons || 1);

    return {
      grams,
      kilograms,
      kilogramsLabel: formatKilograms(kilograms),
      sizeLabel,
    };
  }, [persons]);

  const handleInputChange = (event) => {
    const raw = event.target.value;

    if (raw === "") {
      setPersonsInput("");
      return;
    }

    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (!digitsOnly) {
      setPersonsInput("");
      return;
    }

    const nextValue = Math.max(1, Number.parseInt(digitsOnly, 10));
    setPersonsInput(String(nextValue));
  };

  const setPreset = (value) => {
    setPersonsInput(String(value));
  };

  const handleShowRecommendation = () => {
    recommendationRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <section className={`${cards.elevated} mt-8 overflow-hidden`}>
      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="space-y-5">
          <div>
            <div className="eyebrow">Calculator greutate tort</div>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-ink md:text-4xl">
              Afla rapid ce greutate este recomandata pentru numarul de persoane.
            </h2>
          </div>

          <label className="block text-sm font-semibold text-[#4f463e]">
            Numar persoane
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={personsInput}
              onChange={handleInputChange}
              className={`mt-2 ${inputs.default}`}
              placeholder="Ex: 10"
            />
          </label>

          <div className="flex flex-wrap gap-2.5">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPreset(preset)}
                className={
                  Number(personsInput || 0) === preset ? buttons.primary : buttons.outline
                }
              >
                {preset} persoane
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleShowRecommendation}
            className={`${buttons.secondary} w-full sm:w-auto`}
          >
            Vezi cate kg ar trebui sa aiba tortul
          </button>

          <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm leading-7 text-[#655c53]">
            Calculul este orientativ si poate varia in functie de tipul tortului si de portiile dorite.
          </div>
        </div>

        <div className="grid gap-4">
          <article
            ref={recommendationRef}
            className="rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,252,247,0.96),_rgba(246,239,228,0.92))] p-6 shadow-soft"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-600">
              Recomandare Maison-Douce
            </div>
            {persons > 0 ? (
              <>
                <p className="mt-4 text-lg leading-8 text-[#4f463e]">
                  Pentru <span className="font-semibold text-ink">{persons}</span> persoane,
                  recomandarea este aproximativ{" "}
                  <span className="font-semibold text-ink">{recommendation.grams} g</span> (
                  <span className="font-semibold text-ink">
                    {recommendation.kilogramsLabel} kg
                  </span>
                  ).
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-rose-100 bg-white/80 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#8d775c]">
                      Gramaj
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {recommendation.grams} g
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-rose-100 bg-white/80 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#8d775c]">
                      Kilograme
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {recommendation.kilogramsLabel} kg
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-rose-100 bg-white/80 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#8d775c]">
                      Interpretare
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-ink">
                      {recommendation.sizeLabel}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[#655c53]">
                Introdu un numar de persoane pentru a vedea recomandarea in grame si kilograme.
              </p>
            )}
          </article>

          <article className="rounded-[28px] border border-rose-100 bg-white/85 p-6 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-600">
              Ghid rapid
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4">
                <div className="text-sm font-semibold text-ink">1-10 persoane</div>
                <div className="mt-2 text-sm text-[#655c53]">tort mic</div>
              </div>
              <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4">
                <div className="text-sm font-semibold text-ink">11-20 persoane</div>
                <div className="mt-2 text-sm text-[#655c53]">tort mediu</div>
              </div>
              <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-4">
                <div className="text-sm font-semibold text-ink">21+ persoane</div>
                <div className="mt-2 text-sm text-[#655c53]">tort mare</div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
