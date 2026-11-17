import { lazy, Suspense, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowRight, BellRing, Eye, EyeOff, FileCheck2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Logo, Spinner } from '../components/ui'
import Ambient from '../components/Ambient'
import { useLite } from '../lib/perf'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../lib/api'

const GoldScene = lazy(() => import('../components/GoldScene'))

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
  const lite = useLite()
  const formRef = useRef<HTMLFormElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
    tl.fromTo('.hero-word', { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.07 }, 0.2)
      .fromTo('.hero-fade', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, 0.6)
      .fromTo('.form-item', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.35)
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

  const headline = ['Setiap', 'kontrak,', 'tepat', 'pada', 'waktunya.']

  return (
    <div ref={root} className="relative flex min-h-screen bg-base">
      <Ambient />
      {/* ---------- Panel kiri: brand + 3D ---------- */}
      <aside className="noise relative z-10 m-4 hidden w-[56%] overflow-hidden rounded-[30px] border border-white/[.07] bg-[#0A1020] shadow-lift lg:block">
        {lite
          ? <div className="absolute inset-0" style={{ background: 'radial-gradient(80% 60% at 70% 80%, rgba(212,180,131,.18), transparent 70%)' }} />
          : <Suspense fallback={null}><GoldScene className="absolute inset-0" /></Suspense>}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight via-midnight/20 to-midnight/70" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="hero-fade"><Logo size="lg" /></div>

          <div className="max-w-xl">
            <p className="hero-fade eyebrow text-champagne">Panel Admin · Reminder Kontrak</p>
            <h1 className="mt-5 text-[58px] font-semibold leading-[1.02] tracking-[-0.035em] text-ink xl:text-[68px]">
              {headline.map((w, i) => (
                <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-2 align-bottom">
                  <span className={`hero-word inline-block ${i === 1 ? 'font-serif font-normal italic tracking-normal gold-text pr-1' : ''}`}>{w}</span>
                </span>
              ))}
            </h1>
            <p className="hero-fade mt-6 max-w-md text-[15px] leading-relaxed text-ink/65">
              Catat kontrak sekali, sistem yang mengingatkan. Anda akan diberi tahu
              otomatis saat kontrak tinggal 3 bulan lagi.
            </p>
          </div>

          <div className="hero-fade grid max-w-xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              { icon: BellRing, t: 'Reminder 3 bulan', d: 'Di dashboard & email' },
              { icon: FileCheck2, t: 'Arsip file PKS', d: 'PDF, Word, gambar' },
              { icon: ShieldCheck, t: 'Khusus admin', d: 'Akses terkunci' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t}>
                <Icon className="h-5 w-5 text-champagne" strokeWidth={1.6} />
                <p className="mt-3 text-sm font-semibold text-ink">{t}</p>
                <p className="mt-0.5 text-xs text-ink/50">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ---------- Panel kanan: form ---------- */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-champagne/15 blur-3xl" />
        <form ref={formRef} onSubmit={submit} className="card relative w-full max-w-[440px] p-8 sm:p-10" noValidate>
          <div className="form-item mb-8 lg:hidden"><Logo /></div>
          <p className="form-item eyebrow text-champagne-600">Selamat datang kembali</p>
          <h2 className="form-item mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">Masuk ke panel admin</h2>
          <p className="form-item mt-2 text-sm text-ink-muted">Gunakan akun admin yang sudah terdaftar.</p>

          {error && (
            <div role="alert" className="form-item mt-6 rounded-xl border border-status-end/20 bg-status-endBg px-4 py-3 text-sm text-status-end">
              {error}
            </div>
          )}

          <div className="form-item mt-8">
            <label htmlFor="email" className="label">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input id="email" type="email" autoComplete="username" required autoFocus value={email}
                onChange={(e) => setEmail(e.target.value)} className="input h-12 pl-10" placeholder="nama@instansi.go.id" />
            </div>
          </div>

          <div className="form-item mt-5">
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)} className="input h-12 pl-10 pr-11" placeholder="••••••••" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-faint hover:text-ink">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !email || !password} className="form-item btn-primary group mt-8 h-12 w-full text-[15px]">
            {loading ? <Spinner /> : <>Masuk <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
          </button>

          <div className="form-item hairline mt-10" />
          <p className="form-item mt-5 text-center text-xs text-ink-faint">
            Lupa password? Minta admin lain untuk mereset dari menu <span className="font-semibold text-ink-soft">Kelola Admin</span>.
          </p>
        </form>
      </main>
    </div>
  )
}
