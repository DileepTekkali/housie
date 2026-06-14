/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Deep teal-slate base for a calm, clean look.
        ink: '#072028',
        // Primary accent: calm teal/cyan.
        royal: {
          50: '#ecfeff',
          100: '#cffafe',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a',
        },
        // Warm accent for the ball, prizes and primary CTA.
        gold: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(20,184,166,0.45)',
        ball: 'inset 0 -6px 14px rgba(0,0,0,0.35), inset 0 6px 10px rgba(255,255,255,0.55), 0 8px 18px rgba(0,0,0,0.35)',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-22px) rotate(8deg)' },
        },
        shine: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        pop: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { transform: 'scale(1.12)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        shine: 'shine 6s linear infinite',
        pop: 'pop 0.5s cubic-bezier(0.18,0.89,0.32,1.28)',
      },
    },
  },
  plugins: [],
};
