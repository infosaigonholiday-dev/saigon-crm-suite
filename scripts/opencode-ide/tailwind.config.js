/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // Antigravity-style deep dark palette
        bg: {
          base: "#0b0f17",
          surface: "#0e1421",
          raised: "#131a2a",
          hover: "#1a2236",
        },
        border: {
          subtle: "#1e2738",
          DEFAULT: "#1e2738",
          strong: "#2a3650",
        },
        fg: {
          DEFAULT: "#e2e8f0",
          muted: "#94a3b8",
          subtle: "#64748b",
          dim: "#475569",
        },
        brand: {
          DEFAULT: "#a5b4fc",
          strong: "#818cf8",
          glow: "#22c55e",
        },
        accent: {
          blue: "#60a5fa",
          purple: "#a78bfa",
          green: "#4ade80",
          amber: "#fbbf24",
          red: "#f87171",
        },
      },
      borderRadius: {
        lg: "10px",
        md: "6px",
        sm: "4px",
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
