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
        background: "#ffffff",
        foreground: "#1a1a3e",
        accent: "#c0522b",
        border: "#e5e7eb",
        card: "#ffffff",
        muted: "#6b7280",
        brand: {
          navy: "#1a1a3e",
          coral: "#c0522b",
          maroon: "#6b2d50",
          indigo: "#3730a3",
        },
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 8% -8%, rgba(192,82,43,0.08), transparent 36%), radial-gradient(circle at 92% 0%, rgba(55,48,163,0.08), transparent 32%), linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
      },
      boxShadow: {
        panel: "0 8px 24px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [animate],
};

export default config;
