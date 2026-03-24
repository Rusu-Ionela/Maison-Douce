const variants = {
  success: "border-emerald-200 bg-emerald-50/95 text-emerald-800",
  error: "border-red-200 bg-red-50/95 text-red-800",
  warning: "border-amber-200 bg-amber-50/95 text-amber-800",
  info: "border-rose-200 bg-rose-50/95 text-pink-700",
};

export default function StatusBanner({
  type = "info",
  title = "",
  message,
  className = "",
}) {
  if (!message) return null;

  const variant = variants[type] || variants.info;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`rounded-[24px] border px-4 py-3 text-sm shadow-soft ${variant} ${className}`.trim()}
    >
      {title ? <div className="mb-1 font-semibold tracking-[0.02em]">{title}</div> : null}
      <div className="leading-6">{message}</div>
    </div>
  );
}
