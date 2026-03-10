const variants = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
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
      className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${variant} ${className}`.trim()}
    >
      {title ? <div className="font-semibold">{title}</div> : null}
      <div>{message}</div>
    </div>
  );
}
