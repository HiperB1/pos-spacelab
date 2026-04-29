/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#1a1a2e",
        surface: "#2d2d4a",
        "surface-hover": "#3d3d5c",
        primary: "#00d4ff",
        "primary-hover": "#00b8e6",
        border: "#3d3d5c",
        text: {
          primary: "#ffffff",
          secondary: "#aaaaaa",
          muted: "#666666",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}