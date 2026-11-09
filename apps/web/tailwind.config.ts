import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F2EA",
        ink: {
          DEFAULT: "#16150F",
          light: "#2B2921",
        },
        accent: {
          DEFAULT: "#B8341A",
          hover: "#9C2B14",
          light: "#FDF1EE",
        },
        editorial: {
          muted: "#5A574D",
          border: "#D8D3C4",
          line: "#E4DFD2",
          surface: "#FBF9F4",
          card: "#FFFFFF",
        },
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "Space Grotesk", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
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
        "16": "64px",
        "20": "80px",
        "24": "96px",
        "32": "128px",
      },
      borderWidth: {
        DEFAULT: "1px",
        "1": "1px",
      },
    },
  },
  plugins: [],
};

export default config;
