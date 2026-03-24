/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f7f1e6",
        paper: "#fbf7ef",
        ivory: "#fffdf8",
        ink: "#2f2924",
        charcoal: "#2e2824",
        sage: "#cdd8c7",
        "sage-deep": "#9daa98",
        burgundy: "#6e3f49",
        gold: "#b89b67",
        mist: "#ebe4d8",
        rose: {
          50: "#f7f1e6",
          100: "#ece1d2",
          200: "#dfcfbb",
          300: "#cdb59b",
          400: "#b18f79",
          500: "#946a57",
          600: "#785040",
          700: "#5e3d33",
          800: "#473029",
          900: "#31211d",
        },
        pink: {
          50: "#f8f0f2",
          100: "#efdde1",
          200: "#dfc0c7",
          300: "#c99ba7",
          400: "#aa7281",
          500: "#8d5566",
          600: "#6e3f49",
          700: "#57303a",
          800: "#42252d",
          900: "#2f1a21",
        },
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        script: ["Allura", "cursive"],
      },
      boxShadow: {
        soft: "0 16px 40px rgba(78, 58, 46, 0.08)",
        card: "0 28px 64px rgba(64, 49, 39, 0.12)",
        floating: "0 34px 80px rgba(58, 42, 34, 0.16)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      maxWidth: {
        editorial: "84rem",
      },
      backgroundImage: {
        "brand-wash":
          "radial-gradient(circle at top left, rgba(255,255,255,0.95), rgba(250,245,236,0.92) 32%, rgba(236,241,232,0.84) 100%)",
        "brand-panel":
          "linear-gradient(180deg, rgba(255,252,247,0.97), rgba(246,239,228,0.93))",
      },
    },
  },
  plugins: [],
};
