/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fffaf2",
        paper: "#f8f3e9",
        ink: "#2d2a26",
        blush: "#f7e6ea",
        sage: "#dce8d6",
        "sage-deep": "#c4d7c2",
        gold: "#c8b37c",
      },
      fontFamily: {
        serif: ["Playfair Display", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 42px rgba(120, 82, 80, 0.12)",
        card: "0 22px 48px rgba(140, 90, 90, 0.14)",
      },
    },
  },
  plugins: [],
};
