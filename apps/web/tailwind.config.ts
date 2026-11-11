import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "360px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        canvas: "#F5F2EA", // Warm off-white background
        ink: {
          DEFAULT: "#16150F", // Near-black ink
          light: "#2B2921",
        },
        accent: {
          DEFAULT: "#B8341A", // Single Swiss editorial vermillion accent
          hover: "#9C2B14",
          light: "#FDF1EE",
          subtle: "rgba(184, 52, 26, 0.08)",
        },
        editorial: {
          muted: "#5A574D", // Muted secondary text
          border: "#D8D3C4", // Standard 1px warm border
          line: "#E4DFD2", // Subtle inner row divider
          surface: "#FBF9F4", // Card / input surface
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "Space Grotesk", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "0px",
      },
      borderWidth: {
        DEFAULT: "1px",
        "1": "1px",
        "2": "2px",
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "14": "56px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        "32": "128px",
      },
      // Motion: every entrance ends on `transform: none`, so no lasting transform is left behind
      // (a leftover transform would break position: fixed dialogs inside the element).
      // prefers-reduced-motion users get these at ~0s via globals.css.
      keyframes: {
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "alert-in": {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to: { opacity: "1", transform: "none" },
        },
        shake: {
          "0%, 100%": { transform: "none" },
          "15%, 55%": { transform: "translateX(-6px)" },
          "35%, 75%": { transform: "translateX(6px)" },
        },
        "alert-pop": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "60%": { opacity: "1", transform: "scale(1.01)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "loader-bar": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
        "node-blink": { "0%, 100%": { opacity: "0.25" }, "40%": { opacity: "1" } },
        "hub-pulse": {
          "0%, 100%": { transform: "scale(0.85)" },
          "50%": { transform: "scale(1.05)" },
        },
      },
      animation: {
        reveal: "reveal-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "page-in": "reveal-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        // Step-to-step transitions in multi-step forms (e.g. the internship application)
        fadeIn: "reveal-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "alert-in": "alert-in 0.28s ease-out both",
        "alert-shake": "alert-in 0.28s ease-out both, shake 0.42s ease-in-out 0.28s",
        "alert-pop": "alert-pop 0.35s ease-out both",
        shake: "shake 0.42s ease-in-out",
        "loader-bar": "loader-bar 1.2s ease-in-out infinite",
        "node-blink": "node-blink 1.2s ease-in-out infinite",
        "hub-pulse": "hub-pulse 1.2s ease-in-out infinite",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
