const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')

/** Rp 128,4 M (miliar), Rp 950 Jt (juta), Rp 1,2 T (triliun) */
export function rupiahShort(n: number): { value: string; unit: string } {
  const abs = Math.abs(n)
  const fmt = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 1 })
  if (abs >= 1e12) return { value: fmt(n / 1e12), unit: 'T' }
  if (abs >= 1e9) return { value: fmt(n / 1e9), unit: 'M' }
  if (abs >= 1e6) return { value: fmt(n / 1e6), unit: 'Jt' }
  return { value: Math.round(n).toLocaleString('id-ID'), unit: '' }
}
export const rupiahCompact = (n: number) => {
  const r = rupiahShort(n)
  return `Rp ${r.value}${r.unit ? ' ' + r.unit : ''}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function tanggal(s: string | null | undefined, pendek = false): string {
  if (!s) return '-'
  const d = parseDate(s)
  return `${d.getDate()} ${(pendek ? BULAN_PENDEK : BULAN)[d.getMonth()]} ${d.getFullYear()}`
}

export function waktuRelatif(s: string | null | undefined): string {
  if (!s) return '-'
  // Backend menyimpan waktu dalam UTC tanpa zona -> tambahkan 'Z'
  const d = new Date(/Z|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z')
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`
}

/** Hitung sisa waktu (bulan & hari) dari hari ini ke tanggal berakhir — dipakai untuk preview di form. */
export function sisaWaktu(berakhir: string): { text: string; hari: number } {
  const end = parseDate(berakhir)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const hari = Math.round((end.getTime() - today.getTime()) / 86400000)
  if (hari < 0) return { text: `Sudah lewat ${-hari} hari`, hari }
  if (hari === 0) return { text: 'Berakhir hari ini', hari }
  let months = (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth())
  let cursor = new Date(today.getFullYear(), today.getMonth() + months, today.getDate())
  if (cursor > end) {
    months -= 1
    cursor = new Date(today.getFullYear(), today.getMonth() + months, today.getDate())
  }
  const days = Math.round((end.getTime() - cursor.getTime()) / 86400000)
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts = [y && `${y} tahun`, m && `${m} bulan`, days && `${days} hari`].filter(Boolean)
  return { text: parts.join(' ') || '0 hari', hari }
}

export const fileSize = (b?: number | null) => {
  if (!b) return ''
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export const initials = (nama: string) =>
  nama.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')

export function sapaan(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}
