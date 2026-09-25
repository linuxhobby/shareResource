import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#070912",
          900: "#0b0f1d",
          850: "#11162a",
          800: "#161c33",
          700: "#1f2742",
          600: "#2b3454",
        },
        star: {
          DEFAULT: "#7c5cff",
          light: "#a78bfa",
        },
        quark: "#4f7bff",
        baidu: "#3aa0ff",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,255,.25), 0 18px 60px -20px rgba(124,92,255,.55)",
        card: "0 10px 30px -12px rgba(0,0,0,.55)",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        twinkle: {
          "0%,100%": { opacity: ".25" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        twinkle: "twinkle 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
