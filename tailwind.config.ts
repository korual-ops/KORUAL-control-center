import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        korual: {
          black: "#05070b",
          navy: "#07111f",
          ink: "#0d1728",
          panel: "#111b2c",
          gold: "#d8b76a",
          champagne: "#f0dfb1",
          mist: "#9caec8"
        }
      },
      boxShadow: {
        glass: "0 24px 80px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
