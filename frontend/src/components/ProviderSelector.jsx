import { inputs } from "../lib/tailwindComponents";

export default function ProviderSelector({
  providers = [],
  value = "",
  onChange,
  loading = false,
  disabled = false,
  label = "Prestator",
  helpText = "",
}) {
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
          {loading ? "Se incarca patiserii..." : "Selecteaza patiserul"}
        </option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.displayName}
          </option>
        ))}
      </select>
      {helpText ? <div className="mt-2 text-xs leading-5 text-[#7d746a]">{helpText}</div> : null}
    </label>
  );
}
