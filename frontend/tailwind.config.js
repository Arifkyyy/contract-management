/** @type {import('tailwindcss').Config} */
// Tema kantor modern: hijau Badan Bank Tanah, mode terang & gelap (variabel CSS di index.css).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warna tema = variabel CSS (lihat index.css) → otomatis ikut mode gelap/terang.
        base: 'rgb(var(--base) / <alpha-value>)', // latar halaman
        midnight: { DEFAULT: '#0F172A', 900: '#0B1120', 800: '#0F172A', 700: '#1E293B', 600: '#334155' },
        navy: '#1E293B',
        panel: 'rgb(var(--panel) / <alpha-value>)', // permukaan kartu (dipakai dengan transparansi)
        // "fg" = lapisan tipis di atas latar (putih di mode gelap, navy di mode terang)
        fg: 'rgb(var(--fg) / <alpha-value>)',
        // "accent" = warna utama (hijau Badan Bank Tanah); "on-accent" = teks di atasnya
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          50: 'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent) / <alpha-value>)',
          500: 'rgb(var(--accent) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
        },
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        // "ivory" = warna teks terang dari palet
        ivory: { DEFAULT: '#FAF8F3', 100: '#F5F2EA', 200: '#EEE9DD', 300: '#E2DCCC' },
        // "ink" = hierarki teks
        ink: { DEFAULT: 'rgb(var(--ink) / <alpha-value>)', soft: 'rgb(var(--ink-soft) / <alpha-value>)', muted: 'rgb(var(--ink-muted) / <alpha-value>)', faint: 'rgb(var(--ink-faint) / <alpha-value>)' },
        status: {
          aktif: 'rgb(var(--st-aktif) / <alpha-value>)',
          aktifBg: 'rgb(var(--st-aktif) / .13)',
          warn: 'rgb(var(--st-warn) / <alpha-value>)',
          warnBg: 'rgb(var(--st-warn) / .14)',
          end: 'rgb(var(--st-end) / <alpha-value>)',
          endBg: 'rgb(var(--st-end) / .13)',
          renew: 'rgb(var(--st-renew) / <alpha-value>)',
          renewBg: 'rgb(var(--st-renew) / .13)',
          off: 'rgb(var(--st-off) / <alpha-value>)',
          offBg: 'rgb(var(--st-off) / .14)',
        },
        brand: { green: '#1D7948', yellow: '#F2C12D', orange: '#CA7F2C' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        lift: 'var(--shadow-lift)',
      },
    },
  },
  plugins: [],
}
