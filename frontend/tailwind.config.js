/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // ── Token-driven text — adapts via CSS variables ──
        // Declared as CSS variables so .theme-light overrides them.
        ink: {
          DEFAULT: "var(--color-ink)",
          muted: "var(--color-ink-muted)",
          soft: "var(--color-ink-soft)",
        },

        // ── Dark text for use on white surfaces ──
        trust: {
          DEFAULT: "#2B264A",
          muted: "rgba(43, 38, 74, 0.65)",
          soft: "rgba(43, 38, 74, 0.42)",
        },

        // ── Brand / page background ──
        bg: "#1A1641",

        // ── Accents ──
        accent: {
          DEFAULT: "#AADC00",
          dark: "#8FBE00",
        },
        lavender: "#C6ADFF",
        highlight: "#D6FF1D",

        // ── Status ──
        success: "#1E5B28",
        warning: "#E0A800",
        danger: "#DC2626",

        // ── Borders ──
        border: "rgba(43, 38, 74, 0.12)",
        divider: "rgba(43, 38, 74, 0.08)",

        // ── Soft tinted chip backgrounds ──
        soft: {
          lime: "#E0FBCB",
          lavender: "#ECE4FF",
          aqua: "#E3F4F8",
          neutral: "#F2F2F2",
          warning: "#FFEFC2",
          danger: "#FFD9D9",
        },
      },

      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },

      boxShadow: {
        glass: "0 12px 30px rgba(0,0,0,0.18)",
        "glass-light": "0 8px 32px rgba(43,38,74,0.09)",
        hero: "0 14px 40px rgba(0,0,0,0.22)",
      },

      maxWidth: {
        app: "1180px",
      },
    },
  },
  plugins: [],
};
