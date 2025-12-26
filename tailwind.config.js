/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './*.tsx',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        // GlazeCorp Brand Colors
        // Grayscale foundation with pink accent

        // The Glaze - Primary accent
        glaze: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899', // Primary pink
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },

        // Corporate grays
        corp: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },

        // Semantic colors
        background: '#09090b',
        foreground: '#fafafa',
        card: {
          DEFAULT: '#0f0f10',
          foreground: '#fafafa',
        },
        muted: {
          DEFAULT: '#18181b',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#ec4899',
          foreground: '#ffffff',
        },
        border: '#27272a',
        input: '#27272a',
        ring: '#ec4899',

        // Status
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#fafafa',
        },
        success: {
          DEFAULT: '#22c55e',
          foreground: '#fafafa',
        },
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(236, 72, 153, 0.5)' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(236, 72, 153, 0.3)',
        'glow-lg': '0 0 40px rgba(236, 72, 153, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(236, 72, 153, 0.1)',
      },
    },
  },
  plugins: [],
};
