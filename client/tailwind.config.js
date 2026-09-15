/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { serif: ["Fraunces", "Georgia", "serif"] },
      colors: { ink: "#282239", cream: "#f5efe2", grape: "#7657ff", rose: "#ff6d9f", mint: "#8de1d1", sun: "#ffcb55" },
    },
  },
  plugins: [],
};
