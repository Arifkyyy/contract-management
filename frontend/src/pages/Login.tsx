import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowRight, BellRing, Check, Eye, EyeOff, FileCheck2, Landmark, Lock, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { Logo, Spinner, ThemeToggle } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../lib/api'

/* ---------- Dekorasi bertema bank tanah & kontrak ---------- */

/** Pola petak bidang tanah (garis batas kadaster) untuk latar halaman */
function ParcelBackdrop() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-accent opacity-[.10] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]">
      <defs>
        <pattern id="parcel" width="240" height="240" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M0 38 L64 30 L118 46 L170 22 L240 34" />
            <path d="M0 112 L52 104 L96 126 L150 98 L196 118 L240 108" />
            <path d="M0 188 L70 176 L124 196 L178 170 L240 184" />
            <path d="M64 30 L52 104 L70 176 L60 240 M118 46 L96 126 L124 196 L118 240 M170 22 L150 98 L178 170 L186 240" />
            <path d="M64 0 L64 30 M170 0 L170 22 M196 118 L178 170" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#parcel)" />
    </svg>
  )
}

/** Petak tanah dengan pin lokasi (kiri bawah) */
function LandTile() {
  return (
    <div className="glass-chip w-[190px] p-3">
      <svg viewBox="0 0 160 104" className="h-auto w-full">
        <rect width="160" height="104" rx="10" className="fill-accent/[.07]" />
        <g className="stroke-accent/40" fill="none" strokeWidth="1.3">
          <path d="M0 34 L48 28 L92 40 L160 26" />
          <path d="M0 74 L40 68 L84 82 L160 70" />
          <path d="M48 28 L40 68 L46 104 M92 40 L84 82 L90 104 M126 32 L120 74 L128 104" />
        </g>
        {/* bidang terpilih */}
        <path d="M48 28 L92 40 L84 82 L40 68 Z" className="fill-accent/25 stroke-accent" strokeWidth="1.6" />
        <path d="M92 40 L126 32 L120 74 L84 82 Z" fill="#F2C12D" fillOpacity=".28" stroke="#CA7F2C" strokeWidth="1.2" strokeDasharray="3 3" />
      </svg>
      <div className="mt-2.5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-ink">Bidang tanah</p>
          <p className="text-[10px] text-ink-muted">Lokasi objek kontrak</p>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-on-accent"><MapPin className="h-3.5 w-3.5" /></span>
      </div>
    </div>
  )
}

/** Tumpukan dokumen PKS bercap (kiri atas) */
function ContractStack() {
  return (
    <div className="relative h-[150px] w-[132px]">
      <div className="glass-chip absolute inset-0 translate-x-3 translate-y-2 rotate-6 opacity-70" />
      <div className="glass-chip absolute inset-0 p-3.5">
        <div className="flex items-center gap-1.5">
          <FileCheck2 className="h-3.5 w-3.5 text-accent" />
          <span className="text-[10px] font-semibold text-ink">PKS-2026/014</span>
        </div>
        <div className="mt-3 space-y-1.5">
          {[100, 86, 92, 64, 78].map((w, i) => (
            <div key={i} className="h-[5px] rounded-full bg-fg/[.09]" style={{ width: `${w}%` }} />
          ))}
        </div>
        {/* cap / segel */}
        <div className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full border-2 border-dashed border-brand-orange/70 bg-brand-yellow/25 text-brand-orange -rotate-12">
          <Check className="h-4 w-4" strokeWidth={3} />
        </div>
        <div className="absolute bottom-4 left-3.5 h-px w-12 bg-fg/30" />
      </div>
    </div>
  )
}

/** Kartu pengingat masa kontrak (kanan atas) */
function ReminderCard() {
  return (
    <div className="glass-chip w-[214px] p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-yellow/25 text-brand-orange"><BellRing className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold leading-snug text-ink">Kontrak berakhir 90 hari lagi</p>
          <p className="mt-0.5 text-[10.5px] text-ink-muted">Pengingat terkirim ke email</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/[.07]">
        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-accent to-brand-yellow" />
      </div>
    </div>
  )
}

/** Lencana status aktif (kanan bawah) */
function StatusBadge() {
  return (
    <div className="glass-chip flex items-center gap-2.5 px-3.5 py-2.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-aktif opacity-50" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-aktif" />
      </span>
      <span className="text-[11.5px] font-semibold text-ink">Kontrak aktif terpantau</span>
    </div>
  )
}

export default function Login() {
  const { admin, login } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(params.get('expired') ? 'Sesi Anda berakhir. Silakan masuk kembali.' : '')
  const root = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo('.login-card', { autoAlpha: 0, y: 24, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7 })
        .fromTo('.login-badge', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }, 0.2)
        .fromTo('.form-item', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.04 }, 0.3)
        .fromTo('.deco', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.35)

      // melayang pelan
      gsap.utils.toArray<HTMLElement>('.float').forEach((el, i) => {
        gsap.to(el, { y: i % 2 ? 10 : -10, rotation: i % 2 ? 1.5 : -1.5, duration: 3.2 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })
      })
    })
  }, { scope: root })

  if (admin) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      nav('/', { replace: true })
    } catch (err) {
      setError(errMsg(err, 'Gagal masuk'))
      gsap.fromTo(formRef.current, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={root} className="relative flex min-h-screen flex-col overflow-hidden bg-base">
      {/* ---------- Latar ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[.10] blur-[110px]" />
        <div className="absolute -left-40 bottom-[-10%] h-[420px] w-[420px] rounded-full bg-brand-yellow/[.14] blur-[100px]" />
        <div className="absolute -right-32 top-[-8%] h-[380px] w-[380px] rounded-full bg-accent/[.12] blur-[100px]" />
      </div>
      <ParcelBackdrop />

      {/* ---------- Header ---------- */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
        <ThemeToggle />
      </header>

      {/* ---------- Konten ---------- */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-14 pt-10">
        <div className="relative w-full max-w-[420px]">
          {/* dekorasi kiri */}
          <div aria-hidden className="pointer-events-none absolute right-full top-0 hidden h-full w-[300px] lg:block">
            <div className="deco float absolute right-10 top-6"><ContractStack /></div>
            <div className="deco float absolute bottom-10 right-4"><LandTile /></div>
            <span className="deco patok right-[200px] top-[46%] h-3 w-3 bg-accent" />
            <span className="deco patok right-[56px] top-[42%] h-2 w-2 bg-brand-yellow" />
            <span className="deco patok right-[240px] bottom-6 h-2.5 w-2.5 bg-brand-yellow" />
          </div>

          {/* dekorasi kanan */}
          <div aria-hidden className="pointer-events-none absolute left-full top-0 hidden h-full w-[300px] lg:block">
            <div className="deco float absolute left-8 top-16"><ReminderCard /></div>
            <div className="deco float absolute bottom-20 left-14"><StatusBadge /></div>
            <span className="deco patok left-[190px] top-[48%] h-3 w-3 bg-brand-yellow" />
            <span className="deco patok left-[30px] top-[54%] h-2 w-2 bg-accent" />
            <span className="deco patok left-[220px] bottom-8 h-2.5 w-2.5 bg-accent" />
          </div>

          {/* kartu kaca */}
          <div className="login-card glass px-7 pb-7 pt-14 sm:px-9">
            {/* lencana di atas kartu */}
            <div className="login-badge absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
              <div className="rounded-full bg-base/60 p-1.5 shadow-lift backdrop-blur">
                <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-b from-[#23915A] to-[#145532] text-white shadow-[inset_0_2px_0_rgba(255,255,255,.25)]">
                  <Landmark className="h-8 w-8" strokeWidth={1.7} />
                </div>
              </div>
            </div>

            <form ref={formRef} onSubmit={submit} noValidate>
              <div className="text-center">
                <h1 className="form-item text-[28px] font-bold tracking-[-0.02em] text-ink">Masuk</h1>
                <p className="form-item mt-1.5 text-[13.5px] text-ink-muted">Selamat datang kembali. Masuk ke panel admin kontrak.</p>
              </div>

              {error && (
                <div role="alert" className="form-item mt-6 rounded-xl border border-status-end/20 bg-status-endBg px-4 py-3 text-sm text-status-end">
                  {error}
                </div>
              )}

              <div className="form-item mt-7">
                <label htmlFor="email" className="label">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input id="email" type="email" autoComplete="username" required autoFocus value={email}
                    onChange={(e) => setEmail(e.target.value)} className="input glass-input pl-11" placeholder="nama@instansi.go.id" />
                </div>
              </div>

              <div className="form-item mt-4">
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password}
                    onChange={(e) => setPassword(e.target.value)} className="input glass-input pl-11 pr-12" placeholder="••••••••" />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-faint hover:text-ink">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || !email || !password}
                className="form-item btn btn-glow group mt-7 h-12 w-full rounded-xl text-[15px] text-white transition hover:brightness-105 disabled:shadow-none">
                {loading ? <Spinner /> : <>Masuk <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
              </button>

              {/* baris fitur (pengganti "login dengan") */}
              <div className="form-item mt-8 flex items-center gap-3">
                <div className="hairline flex-1" />
                <span className="text-[11px] font-medium text-ink-faint">Badan Bank Tanah</span>
                <div className="hairline flex-1" />
              </div>
              <ul className="form-item mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: BellRing, t: 'Pengingat 3 bulan' },
                  { icon: FileCheck2, t: 'Arsip PKS' },
                  { icon: ShieldCheck, t: 'Khusus admin' },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex flex-col items-center gap-1.5">
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-line bg-panel text-accent shadow-soft">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <span className="text-[11px] font-medium text-ink-muted">{t}</span>
                  </li>
                ))}
              </ul>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-ink-faint">
            Lupa password? Minta admin lain untuk mereset dari menu <span className="font-semibold text-ink-soft">Kelola Admin</span>.
          </p>
        </div>
      </main>
    </div>
  )
}
