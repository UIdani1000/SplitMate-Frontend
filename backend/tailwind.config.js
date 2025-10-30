/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './templates/**/*.{html,js}',
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './**/*.html'
  ],
  darkMode: 'class', // we run dark UI; :root can toggle if needed
  theme: {
    container: {
      center: true,
      padding: '1rem'
    },
    extend: {
      colors: {
        // ===== SplitMate brand tokens (kept) =====
        'brand-purple': '#9945FF',
        'brand-green':  '#00FFB3',
        bg: '#0E0717',
        card: '#1A1024',
        'text-primary': '#F5F3FF',
        'text-muted': '#B9A9D9',
        accent: '#7A5AF8',
        danger: '#FF6B6B',
        success: '#22C55E',
      },

      fontFamily: {
        // UI & display stacks
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Poppins', 'ui-sans-serif', 'system-ui'],
      },

      borderRadius: {
        // extra softness for cards/modals
        '2xl': '1rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        // soft neon glow + inset depth for glass cards
        glow:  '0 0 18px rgba(153,69,255,0.35)',
        inset: 'inset 0 0 8px rgba(0,0,0,0.35)',
        'inner-strong':
          'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.30)',
      },

      backgroundImage: {
        // gradients for stat cards / separators / page bg
        'glass-gradient':
          'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'brand-radial':
          'radial-gradient(800px 400px at 20% 0%, rgba(153,69,255,.08), transparent 60%), radial-gradient(600px 300px at 80% 10%, rgba(0,255,179,.06), transparent 55%)',
      },

      // optional: easy brand ring utility (focus states)
      ringColor: {
        brand: '#9945FF',
      },

      // tiny spacing tweaks commonly used in dashboards
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
      },

      // opacity presets for subtle glass layers
      opacity: {
        15: '0.15',
      },

      // keyframes used by base.css (.animate-pulse-border)
      keyframes: {
        'pulse-border': {
          '0%':   { boxShadow: '0 0 0 0 rgba(153,69,255,0.4)' },
          '70%':  { boxShadow: '0 0 0 10px rgba(153,69,255,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(153,69,255,0)' },
        },
      },
      animation: {
        'pulse-border': 'pulse-border 1.5s infinite',
      },
    },
  },

  // Keep commonly used dynamic classes from being purged
  safelist: [
    // glass + borders + gradients used in HTML
    'bg-white/5','bg-white/10','bg-white/15',
    'border-white/5','border-white/10','border-white/20',
    'bg-gradient-to-b','bg-gradient-to-r',
    'from-white/5','to-transparent',
    'from-white/0','via-white/10','to-white/0',

    // status colors / badges
    'text-success','text-danger','text-brand-purple',
    'bg-success/20','bg-danger/20','bg-brand-purple/20',
    'text-text-muted','text-text-primary',

    // shadows defined in theme
    'shadow-glow','shadow-inset','shadow-inner-strong',

    // form accent color
    'accent-brand-purple',
  ],

  plugins: [
    // Add plugins later if needed (forms/typography/etc.)
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography')
  ],
};
