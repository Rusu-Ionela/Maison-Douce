import { ORDER_TYPE_OPTIONS } from "../../lib/orderFlow";
import { buttons, cards } from "../../lib/tailwindComponents";

export default function OrderTypeChoice({ context, onSelect }) {
  if (!context?.hasContext) return null;

  return (
    <section className={`${cards.elevated} space-y-5`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-500">
            Pasul 2
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-gray-900">
            Alege directia potrivita pentru comanda ta
          </h2>
          <p className="mt-3 text-base leading-7 text-[#665d54]">
            Pentru {context.persons} persoane recomandarea de pornire este{" "}
            <span className="font-semibold text-gray-900">{context.estimatedKgLabel}</span>.
            Acum poti merge pe varianta rapida, pe personalizare completa sau pe generare de idei.
          </p>
        </div>
        <div className="rounded-[22px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm text-[#655c53] shadow-soft">
          {context.eventLabel ? `${context.eventLabel} | ` : ""}
          {context.portionStyleLabel} | {context.sizeBand}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {ORDER_TYPE_OPTIONS.map((option) => (
          <article
            key={option.id}
            className="rounded-[28px] border border-rose-100 bg-white/92 p-5 shadow-soft"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
              {option.shortLabel}
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-gray-900">{option.label}</h3>
            <p className="mt-3 text-sm font-semibold text-[#4f463e]">{option.summary}</p>
            <p className="mt-2 text-sm leading-6 text-[#665d54]">{option.detail}</p>
            <div className="mt-5">
              <button
                type="button"
                className={option.id === "custom" ? buttons.primary : buttons.outline}
                onClick={() => onSelect(option.id)}
              >
                {option.ctaLabel}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
