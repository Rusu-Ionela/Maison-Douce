import { Link } from "react-router-dom";
import { buttons } from "../../lib/tailwindComponents";

export default function OrderOnlineCta({
  to = "/comanda-online",
  label = "Comanda online",
  description = "",
  className = "",
  variant = "primary",
}) {
  const buttonClass = variant === "outline" ? buttons.outline : buttons.primary;

  return (
    <Link to={to} className={`${buttonClass} ${className}`.trim()}>
      <span>{label}</span>
      {description ? (
        <span className="hidden text-xs font-medium opacity-80 sm:inline">
          {description}
        </span>
      ) : null}
    </Link>
  );
}
