import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        foreground: "#e2e8f0",
        accent: "#6366f1",
        border: "#334155",
        card: "#111c34",
        muted: "#94a3b8",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top, rgba(99,102,241,0.18), transparent 40%), linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,1))",
      },
      boxShadow: {
        panel: "0 20px 50px rgba(2, 6, 23, 0.45)",
      },
    },
  },
  plugins: [animate],
};

export default config;
