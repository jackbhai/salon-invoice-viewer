/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // AMOLED palette
        amoled: {
          bg: '#000000',
          surface: '#0a0a0a',
          card: '#111113',
          card2: '#16161a',
          border: '#222228',
          border2: '#2c2c33',
          text: '#e8e8ea',
          muted: '#9a9aa3',
          dim: '#6b6b74',
        },
        accent: {
          DEFAULT: '#22d3ee',
          soft: '#67e8f9',
          violet: '#a78bfa',
          green: '#34d399',
          pink: '#f472b6',
          amber: '#fbbf24',
          red: '#fb7185',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,0.15), 0 0 24px rgba(34,211,238,0.10)',
      },
      animation: {
        fadein: 'fadein .25s ease-out',
        slideup: 'slideup .28s cubic-bezier(.16,1,.3,1)',
      },
      keyframes: {
        fadein: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideup: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
