import { ORDER_FLOW_STEPS, getStepIndex } from "../../lib/orderFlow";

function stepClass(state) {
  if (state === "done") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "current") {
    return "border-rose-200 bg-rose-50 text-pink-700";
  }
  return "border-stone-200 bg-white text-stone-500";
}

export default function OrderFlowProgress({
  currentStep = "estimate",
  className = "",
  compact = false,
}) {
  const activeIndex = getStepIndex(currentStep);
  const layoutClass = compact
    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5";

  return (
    <div className={`grid gap-3 ${layoutClass} ${className}`.trim()}>
      {ORDER_FLOW_STEPS.map((step, index) => {
        const state = index < activeIndex ? "done" : index === activeIndex ? "current" : "todo";

        return (
          <div
            key={step.id}
            className={`min-w-0 rounded-[22px] border px-4 py-3 shadow-soft ${stepClass(state)}`}
          >
            <div className="text-[11px] font-semibold uppercase leading-tight tracking-[0.18em]">
              {step.label}
            </div>
            <div className="mt-1 text-sm font-semibold leading-snug text-balance">{step.title}</div>
          </div>
        );
      })}
    </div>
  );
}
