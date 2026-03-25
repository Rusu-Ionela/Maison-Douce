import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { buttons } from "../lib/tailwindComponents";

function formatPriceExtra(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Maison-Douce";
  return `+${amount} MDL / kg`;
}

export default function CatalogFillingCard({
  filling,
  selected = false,
  recommended = false,
  flash = false,
}) {
  const pairingChip = filling?.pairing || "potrivita pentru torturi fine";
  const textureChip = filling?.textureLabel || "profil catifelat";
  const recommendation = filling?.recommendation || "Selectie premium Maison-Douce";
  const surfaceClass = selected
    ? "border-sage-deep/35 ring-2 ring-sage-deep/15 shadow-card"
    : recommended
      ? "border-[#d8c3a7] ring-2 ring-[#d8c3a7]/20 shadow-card"
      : "border-rose-100";
  const badgeClass = selected
    ? "border-sage-deep/20 bg-sage/35 text-sage-deep"
    : recommended
      ? "border-[#d8c3a7]/40 bg-[#fbf3e8] text-[#8a6848]"
      : "border-rose-100 bg-white/85 text-pink-700";
  const badgeText = selected
    ? "Selectia ta curenta"
    : recommended
      ? "Potrivita pentru acest tort"
      : recommendation;

  return (
    <article
      id={`filling-card-${filling.id}`}
      className={`group overflow-hidden rounded-[32px] border bg-[rgba(255,252,247,0.94)] p-3 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-card ${surfaceClass} ${
        flash ? "ring-4 ring-sage-deep/15" : ""
      }`}
    >
      <ProductCard
        image={filling.image}
        category={String(filling.category || "Maison-Douce").toUpperCase()}
        price={formatPriceExtra(filling.priceExtra)}
        name={filling.name}
        description={filling.shortDescription}
        aromaticProfile={filling.aromaticProfile}
        meta={[textureChip, pairingChip, formatPriceExtra(filling.priceExtra)]}
        className="h-[30rem]"
      />

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d775c]">
            Umplutura preferata pentru torturi Maison-Douce
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${badgeClass}`}>
            {badgeText}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-medium text-[#786f66]">
            {filling.category}
          </span>
          <span className="rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-medium text-[#786f66]">
            {textureChip}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <a href="#catalog-torturi" className={buttons.outline}>
            Vezi detalii
          </a>
          <Link
            to={`/constructor?umplutura=${encodeURIComponent(filling.name)}`}
            className={buttons.primary}
          >
            Alege umplutura
          </Link>
        </div>
      </div>
    </article>
  );
}
