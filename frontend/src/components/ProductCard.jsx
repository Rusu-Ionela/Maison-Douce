import { useEffect, useState } from "react";

function useCanHover() {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(media.matches);

    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return canHover;
}

export default function ProductCard({
  image,
  category = "ZI DE NASTERE",
  price = "650 MDL",
  name = "Tort Vanilie si Fructe de Padure",
  description = "Blat de vanilie, crema mascarpone si fructe de padure intr-un finisaj delicat, de inspiratie pariziana.",
  aromaticProfile = "Blat fin de vanilie, crema catifelata si insert fructat pentru un profil proaspat, luminos si echilibrat.",
  meta = ["gata in 24h", "12 portii", "18 cm / 1.8 kg"],
  className = "",
}) {
  const canHover = useCanHover();
  const [isHovered, setIsHovered] = useState(false);
  const [isFlippedMobile, setIsFlippedMobile] = useState(false);

  const isFlipped = canHover ? isHovered : isFlippedMobile;

  const handleClick = () => {
    if (canHover) return;
    setIsFlippedMobile((current) => !current);
  };

  const handleMouseEnter = () => {
    if (canHover) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (canHover) setIsHovered(false);
  };

  const handleFocus = () => {
    if (canHover) setIsHovered(true);
  };

  const handleBlur = () => {
    if (canHover) setIsHovered(false);
  };

  const transform = canHover
    ? isFlipped
      ? "rotateY(180deg) scale(1.02)"
      : "rotateY(0deg) scale(1)"
    : isFlipped
      ? "rotateY(180deg)"
      : "rotateY(0deg)";

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={
        canHover
          ? `${name}, card interactiv cu detalii la hover`
          : `${name}, apasa pentru a vedea detaliile`
      }
      aria-pressed={!canHover ? isFlipped : undefined}
      className={[
        "flip-perspective group relative block h-[32rem] w-full rounded-[20px] bg-[#FEFBF4] text-left text-[#232722] outline-none",
        className,
      ].join(" ")}
    >
      <div
        className="flip-3d relative h-full w-full transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform }}
      >
        <div className="flip-face absolute inset-0 overflow-hidden rounded-[20px] border border-[#E6D9C7] bg-[#F5F1EB] shadow-[0_22px_55px_rgba(75,62,45,0.12)]">
          <div className="relative h-[72%] overflow-hidden rounded-[20px]">
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#232722]/72 via-[#232722]/10 to-transparent" />

            <span className="absolute left-4 top-4 rounded-full border border-white/45 bg-white/14 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-md">
              {category}
            </span>

            <div className="absolute bottom-4 left-4">
              <div className="text-[1.8rem] font-semibold tracking-[-0.02em] text-white md:text-[2rem]">
                {price}
              </div>
            </div>
          </div>

          <div className="flex h-[28%] flex-col justify-center px-5 py-4">
            <h3 className="font-serif text-[1.9rem] font-semibold leading-none text-[#232722]">
              {name}
            </h3>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6C6F6A]">
              {description}
            </p>
          </div>
        </div>

        <div className="flip-face flip-face-back absolute inset-0 overflow-hidden rounded-[20px] border border-[#E6D9C7] bg-[#F5F1EB] shadow-[0_22px_55px_rgba(75,62,45,0.12)]">
          <div className="flex h-full flex-col justify-between p-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B4895F]">
                Maison-Douce
              </div>
              <h3 className="mt-4 font-serif text-[1.95rem] font-semibold leading-none text-[#232722]">
                {name}
              </h3>
              <div className="mt-5 h-px w-full bg-gradient-to-r from-[#B4895F]/80 via-[#DCC6AE] to-transparent" />
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B4895F]">
                  UMPLUTURA SI PROFIL AROMATIC
                </div>
                <p className="mt-3 text-sm leading-7 text-[#545851]">
                  {aromaticProfile}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {meta.map((item) => (
                  <span
                    key={`${name}-${item}`}
                    className="rounded-full border border-[#DCC6AE] bg-[#FEFBF4] px-3 py-1.5 text-xs font-medium text-[#232722]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {!canHover ? (
              <div className="pt-4 text-xs font-medium uppercase tracking-[0.18em] text-[#8D775C]">
                {isFlipped ? "Atinge pentru fata cardului" : "Atinge pentru detalii"}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
