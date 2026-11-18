/**
 * Pengganti objek 3D saat mode ringan: ilustrasi SVG statis bergaya sama
 * (kristal champagne bersegi + dua cincin orbit + titik-titik).
 * Tanpa WebGL, tanpa animasi, tanpa filter blur — aman untuk perangkat lemah.
 */
const C = 200 // titik tengah viewBox

// Kristal: segi enam dengan titik puncak digeser sedikit supaya terasa 3D
const P = {
  top: [200, 104], ur: [281, 152], lr: [276, 250], bot: [198, 298], ll: [119, 246], ul: [124, 150],
  core: [214, 186], core2: [190, 226],
} as const
type K = keyof typeof P
const tri = (a: K, b: K, c: K) => [P[a], P[b], P[c]].map((p) => p.join(',')).join(' ')

const FACETS: [string, string][] = [
  [tri('top', 'ur', 'core'), '#F6E9CC'],
  [tri('ur', 'lr', 'core'), '#D9BC8A'],
  [tri('lr', 'core2', 'core'), '#B8955F'],
  [tri('lr', 'bot', 'core2'), '#8E6F42'],
  [tri('bot', 'll', 'core2'), '#A3824F'],
  [tri('ll', 'core', 'core2'), '#C9A76F'],
  [tri('ll', 'ul', 'core'), '#E6CFA6'],
  [tri('ul', 'top', 'core'), '#FFF4DC'],
]

// Titik-titik di sepanjang cincin luar (posisi tetap, tidak acak tiap render)
const DOTS = Array.from({ length: 34 }, (_, i) => {
  const a = (i / 34) * Math.PI * 2
  const jitter = Math.sin(i * 12.9898) * 6
  return { x: C + Math.cos(a) * (182 + jitter), y: C + Math.sin(a) * (52 + jitter / 3), r: i % 5 === 0 ? 2.4 : 1.4, o: 0.35 + (i % 4) * 0.15 }
})

export default function LiteArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="la-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4B483" stopOpacity=".38" />
          <stop offset="55%" stopColor="#D4B483" stopOpacity=".08" />
          <stop offset="100%" stopColor="#D4B483" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="la-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#EADAB9" stopOpacity=".1" />
          <stop offset="50%" stopColor="#F3E4C4" stopOpacity=".9" />
          <stop offset="100%" stopColor="#EADAB9" stopOpacity=".15" />
        </linearGradient>
        <linearGradient id="la-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".45" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* setengah bawah cincin = bagian yang lewat di depan kristal */}
        <clipPath id="la-front" clipPathUnits="userSpaceOnUse"><rect x="0" y={C} width="400" height="200" /></clipPath>
      </defs>

      <circle cx={C} cy={C} r="190" fill="url(#la-glow)" />
      {/* lingkaran tipis latar */}
      <circle cx={C} cy={C} r="150" fill="none" stroke="#D4B483" strokeOpacity=".12" strokeDasharray="2 7" />
      <circle cx={C} cy={C} r="118" fill="none" stroke="#D4B483" strokeOpacity=".08" />

      {/* cincin — bagian belakang */}
      <g transform={`rotate(-16 ${C} ${C})`}>
        <ellipse cx={C} cy={C} rx="150" ry="40" fill="none" stroke="url(#la-ring)" strokeWidth="2.2" opacity=".55" />
      </g>
      <g transform={`rotate(11 ${C} ${C})`}>
        <ellipse cx={C} cy={C} rx="182" ry="52" fill="none" stroke="url(#la-ring)" strokeWidth="1" opacity=".45" />
        {DOTS.filter((d) => d.y < C).map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#F3E4C4" opacity={d.o * 0.6} />)}
      </g>

      {/* kristal */}
      <g>
        {FACETS.map(([pts, fill], i) => <polygon key={i} points={pts} fill={fill} stroke="#0E1526" strokeOpacity=".18" strokeWidth=".8" strokeLinejoin="round" />)}
        <polygon points={tri('ul', 'top', 'core')} fill="url(#la-shine)" />
      </g>

      {/* cincin — bagian depan */}
      <g transform={`rotate(-16 ${C} ${C})`}>
        <ellipse cx={C} cy={C} rx="150" ry="40" fill="none" stroke="url(#la-ring)" strokeWidth="2.4" clipPath="url(#la-front)" />
      </g>
      <g transform={`rotate(11 ${C} ${C})`}>
        <ellipse cx={C} cy={C} rx="182" ry="52" fill="none" stroke="url(#la-ring)" strokeWidth="1.1" clipPath="url(#la-front)" opacity=".8" />
        {DOTS.filter((d) => d.y >= C).map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#F3E4C4" opacity={d.o} />)}
      </g>

      {/* kilau kecil */}
      <path d="M300 92 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" fill="#FFF4DC" opacity=".85" />
      <path d="M96 300 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#FFF4DC" opacity=".55" />
    </svg>
  )
}
