export const colors = {
  primary: "bg-pink-600 hover:bg-pink-700",
  secondary: "bg-sage text-ink hover:bg-sage-deep",
  danger: "bg-red-600 hover:bg-red-700",
  success: "bg-emerald-600 hover:bg-emerald-700",
  neutral: "bg-stone-600 hover:bg-stone-700",
};

export const buttons = {
  primary:
    `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white ${colors.primary} shadow-soft disabled:cursor-not-allowed disabled:opacity-50`,
  secondary:
    `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${colors.secondary} shadow-soft disabled:cursor-not-allowed disabled:opacity-50`,
  success:
    `inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white ${colors.success} shadow-soft disabled:cursor-not-allowed disabled:opacity-50`,
  outline:
    "inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-pink-700 shadow-soft hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50",
  small:
    `inline-flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white ${colors.primary} shadow-soft`,
};

export const cards = {
  default:
    "rounded-[24px] border border-rose-100 bg-white/90 p-6 shadow-soft backdrop-blur-sm",
  bordered: "rounded-[24px] border border-rose-200 bg-white p-6 shadow-soft",
  elevated: "rounded-[28px] border border-rose-100 bg-white p-6 shadow-card",
};

export const inputs = {
  default:
    "w-full rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-gray-800 outline-none focus:border-pink-400 focus:ring-4 focus:ring-rose-100",
  error:
    "w-full rounded-2xl border border-red-300 bg-white px-4 py-2.5 text-gray-800 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100",
};

export const containers = {
  pageMax: "mx-auto max-w-6xl px-4 py-8 md:px-6",
  section: "px-4 py-8 md:px-6",
};

export const typography = {
  h1: "mb-4 font-serif text-4xl font-bold text-ink",
  h2: "mb-3 font-serif text-3xl font-bold text-ink",
  h3: "mb-2 text-2xl font-semibold text-gray-800",
  body: "leading-relaxed text-gray-700",
  small: "text-sm text-gray-500",
};

export const grids = {
  columns2: "grid grid-cols-1 gap-6 md:grid-cols-2",
  columns3: "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
  columns4: "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4",
};

export const badges = {
  success:
    "inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700",
  warning:
    "inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700",
  error:
    "inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700",
  info:
    "inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-pink-700",
};
