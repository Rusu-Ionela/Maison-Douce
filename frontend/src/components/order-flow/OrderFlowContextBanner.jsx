import { Link } from "react-router-dom";
import OrderFlowProgress from "./OrderFlowProgress";
import { buildOrderFlowHref } from "../../lib/orderFlow";
import { buttons, cards } from "../../lib/tailwindComponents";

function SummaryChip({ label, value }) {
  if (!value) return null;
  return (
    <span className="rounded-full border border-rose-100 bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#6d625a]">
      {label}: {value}
    </span>
  );
}

export default function OrderFlowContextBanner({
  context,
  currentStep = "build",
  eyebrow = "Flux ghidat",
  title,
  description,
  primaryAction = null,
  secondaryActions = [],
}) {
  if (!context?.hasContext) return null;

  return (
    <section className={`${cards.tinted} space-y-5`}>
      <OrderFlowProgress currentStep={currentStep} />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-500">
            {eyebrow}
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-gray-900">{title}</h2>
          <p className="mt-3 text-base leading-7 text-[#665d54]">{description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <SummaryChip label="Persoane" value={context.persons} />
            <SummaryChip label="Estimare" value={context.estimatedKgLabel} />
            <SummaryChip label="Eveniment" value={context.eventLabel} />
            <SummaryChip label="Portii" value={context.portionStyleLabel} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {primaryAction ? (
            <Link
              to={buildOrderFlowHref(primaryAction.to, context, primaryAction.params)}
              className={buttons.primary}
            >
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryActions.map((action) => (
            <Link
              key={`${action.to}-${action.label}`}
              to={buildOrderFlowHref(action.to, context, action.params)}
              className={buttons.outline}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
