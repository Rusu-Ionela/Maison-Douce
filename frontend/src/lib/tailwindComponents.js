export const colors = {
  primary: "bg-charcoal text-white hover:bg-pink-700",
  secondary: "bg-sage/80 text-ink hover:bg-sage-deep/90",
  danger: "bg-red-700 text-white hover:bg-red-800",
  success: "bg-emerald-700 text-white hover:bg-emerald-800",
  neutral: "bg-stone-700 text-white hover:bg-stone-800",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50";

export const buttons = {
  primary: `${buttonBase} ${colors.primary} shadow-soft`,
  secondary: `${buttonBase} ${colors.secondary} border border-sage-deep/40 shadow-soft`,
  success: `${buttonBase} ${colors.success} shadow-soft`,
  outline:
    `${buttonBase} border border-rose-200 bg-ivory/90 text-pink-700 shadow-soft hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white`,
  ghost:
    `${buttonBase} bg-transparent text-pink-700 hover:bg-rose-50`,
  small:
    "inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-3 py-1.5 text-xs font-semibold text-white shadow-soft",
};

export const cards = {
  default:
    "rounded-[28px] border border-rose-100 bg-[rgba(255,252,247,0.92)] p-6 shadow-soft backdrop-blur-sm",
  bordered:
    "rounded-[28px] border border-rose-200 bg-[rgba(255,253,248,0.96)] p-6 shadow-soft",
  elevated:
    "rounded-[32px] border border-rose-100 bg-[rgba(255,251,245,0.9)] p-6 shadow-card backdrop-blur-md",
  tinted:
    "rounded-[32px] border border-sage-deep/20 bg-[linear-gradient(180deg,_rgba(255,252,247,0.96),_rgba(239,243,235,0.88))] p-6 shadow-card",
};

export const inputs = {
  default:
    "w-full rounded-[22px] border border-rose-200 bg-[rgba(255,253,249,0.96)] px-4 py-3 text-ink outline-none shadow-sm focus:border-pink-400 focus:ring-4 focus:ring-sage/30",
  error:
    "w-full rounded-[22px] border border-red-300 bg-white px-4 py-3 text-ink outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100",
};

export const containers = {
  pageMax: "mx-auto max-w-editorial px-4 py-8 md:px-6 md:py-10",
  section: "px-4 py-8 md:px-6 md:py-10",
};

export const typography = {
  h1: "font-serif text-4xl font-semibold tracking-[-0.03em] text-ink md:text-5xl",
  h2: "font-serif text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl",
  h3: "font-serif text-2xl font-semibold tracking-[-0.02em] text-ink",
  body: "leading-7 text-[#665d54]",
  small: "text-sm leading-6 text-[#8a8178]",
  eyebrow: "text-xs font-semibold uppercase tracking-[0.28em] text-pink-600",
};

export const grids = {
  columns2: "grid grid-cols-1 gap-6 md:grid-cols-2",
  columns3: "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3",
  columns4: "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4",
};

export const badges = {
  success:
    "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700",
  warning:
    "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800",
  error:
    "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700",
  info:
    "inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-semibold text-pink-700",
  premium:
    "inline-flex items-center rounded-full border border-[rgba(184,155,103,0.28)] bg-[rgba(184,155,103,0.12)] px-3 py-1 text-sm font-semibold text-[#7a5b2f]",
};
