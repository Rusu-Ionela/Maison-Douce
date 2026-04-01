import { inputs } from "../lib/tailwindComponents";

export default function ProviderSelector({
  providers = [],
  value = "",
  onChange,
  loading = false,
  disabled = false,
  label = "Atelier",
  helpText = "",
  hideIfSingleOption = false,
  singleOptionNote = "Selectat automat pentru acest flux",
}) {
  const normalizedProviders = Array.isArray(providers) ? providers.filter(Boolean) : [];
  const selectedProvider =
    normalizedProviders.find((provider) => String(provider?.id || "") === String(value || "")) ||
    (normalizedProviders.length === 1 ? normalizedProviders[0] : null);
  const showReadonlySingleOption =
    hideIfSingleOption && !loading && normalizedProviders.length === 1 && selectedProvider;

  if (showReadonlySingleOption) {
    return (
      <div className="block text-sm font-semibold text-[#4e453d]">
        <span className="flex items-center gap-2">
          {label}
          <span className="h-px flex-1 bg-gradient-to-r from-rose-200 to-transparent" />
        </span>
        <div className="mt-2 rounded-[22px] border border-rose-100 bg-white px-4 py-3 shadow-soft">
          <div className="text-base font-semibold text-ink">{selectedProvider.displayName}</div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">
            {singleOptionNote}
          </div>
        </div>
        {helpText ? <div className="mt-2 text-xs leading-5 text-[#7d746a]">{helpText}</div> : null}
      </div>
    );
  }

  return (
    <label className="block text-sm font-semibold text-[#4e453d]">
      <span className="flex items-center gap-2">
        {label}
        <span className="h-px flex-1 bg-gradient-to-r from-rose-200 to-transparent" />
      </span>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled || loading}
        className={`mt-2 ${inputs.default}`}
      >
        <option value="">
          {loading ? "Se incarca atelierele..." : "Selecteaza atelierul"}
        </option>
        {normalizedProviders.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.displayName}
          </option>
        ))}
      </select>
      {helpText ? <div className="mt-2 text-xs leading-5 text-[#7d746a]">{helpText}</div> : null}
    </label>
  );
}
