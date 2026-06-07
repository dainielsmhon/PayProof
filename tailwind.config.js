/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === PayProof Design System ===
        pp: {
          // Deep Space Background
          bg:        '#050914',
          surface:   '#0a1628',
          card:      '#0d1f38',
          border:    'rgba(255,255,255,0.07)',
          // Brand
          violet:    '#7C6FFF',
          'violet-dim': '#4B45A0',
          cyan:      '#00D4FF',
          'cyan-dim':  '#00698a',
          // Status
          mint:      '#00E5A0',
          amber:     '#FFB547',
          coral:     '#FF4D6D',
          // Text
          'text-primary':   '#F0F4FF',
          'text-secondary': '#8B9EC7',
          'text-muted':     '#4A5A7A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-pp': 'linear-gradient(135deg, #7C6FFF 0%, #00D4FF 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(124,111,255,0.12) 0%, rgba(0,212,255,0.06) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.35s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(124, 111, 255, 0.3)' },
          '50%': { boxShadow: '0 0 0 12px rgba(124, 111, 255, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-violet': '0 0 30px rgba(124,111,255,0.25)',
        'glow-cyan':   '0 0 30px rgba(0,212,255,0.20)',
        'glow-mint':   '0 0 20px rgba(0,229,160,0.20)',
        'inner-glow':  'inset 0 1px 0 rgba(255,255,255,0.1)',
        'card-hover':  '0 20px 60px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
