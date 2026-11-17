/** @type {import('tailwindcss').Config} */
// Tema gelap "glass": midnight + navy + champagne, terinspirasi dashboard kaca premium.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#060A14', // latar halaman
        midnight: { DEFAULT: '#0F172A', 900: '#0B1120', 800: '#0F172A', 700: '#1E293B', 600: '#334155' },
        navy: '#1E293B',
        panel: '#0E1526', // permukaan kartu (dipakai dengan transparansi)
        champagne: {
          DEFAULT: '#D4B483',
          50: '#1A1610',
          100: '#262017',
          200: '#EADAB9',
          300: '#E2C99C',
          400: '#D4B483',
          500: '#C9A56E',
          600: '#D4B483',
          700: '#E6CFA6',
        },
        // "ivory" = warna teks terang dari palet
        ivory: { DEFAULT: '#FAF8F3', 100: '#F5F2EA', 200: '#EEE9DD', 300: '#E2DCCC' },
        // "ink" = hierarki teks di atas latar gelap
        ink: { DEFAULT: '#F4F1EA', soft: '#C4CAD6', muted: '#8A94A8', faint: '#5D677C' },
        status: {
          aktif: '#5FD3A2',
          aktifBg: 'rgba(95,211,162,.12)',
          warn: '#F2B657',
          warnBg: 'rgba(242,182,87,.13)',
          end: '#F2777D',
          endBg: 'rgba(242,119,125,.13)',
          renew: '#86A8F5',
          renewBg: 'rgba(134,168,245,.13)',
          off: '#A3ACBD',
          offBg: 'rgba(163,172,189,.13)',
        },
        brand: { green: '#1D7948', yellow: '#F2C12D', orange: '#CA7F2C' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,.05) inset, 0 20px 40px -24px rgba(0,0,0,.7)',
        lift: '0 1px 0 rgba(255,255,255,.06) inset, 0 30px 60px -20px rgba(0,0,0,.8)',
        gold: '0 0 0 1px rgba(212,180,131,.45), 0 10px 30px -8px rgba(212,180,131,.45)',
        glow: '0 0 24px rgba(212,180,131,.55)',
      },
      borderRadius: { '4xl': '2rem' },
      letterSpacing: { eyebrow: '.16em' },
    },
  },
  plugins: [],
}
