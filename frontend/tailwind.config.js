/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#00ff41',
        'neon-blue': '#00d4ff',
        'neon-purple': '#b400ff',
        'neon-red': '#ff0040',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s infinite',
      },
      boxShadow: {
        'neon': '0 0 20px currentColor',
        'neon-lg': '0 0 40px currentColor',
      }
    },
  },
  plugins: [],
}
