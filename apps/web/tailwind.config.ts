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
