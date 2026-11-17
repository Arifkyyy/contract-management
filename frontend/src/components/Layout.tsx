import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { BellRing, ChevronDown, Gauge, FilePlus2, LayoutDashboard, LogOut, Menu, ScrollText, UserCog, UsersRound, X } from 'lucide-react'
import clsx from 'clsx'
import { Logo } from './ui'
import Ambient from './Ambient'
import NotificationBell from './NotificationBell'
import ProfileModal from './ProfileModal'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/format'
import { setLite, useLite } from '../lib/perf'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/kontrak/baru', label: 'Input Kontrak', icon: FilePlus2 },
  { to: '/kontrak', label: 'Cek Kontrak', icon: ScrollText, end: true },
  { to: '/admin', label: 'Kelola Admin', icon: UsersRound },
]

const TITLES: [RegExp, string, string][] = [
  [/^\/$/, 'Dashboard', 'Ringkasan kontrak'],
  [/^\/kontrak\/baru$/, 'Input Kontrak', 'Tambah data baru'],
  [/^\/kontrak\/\d+\/edit$/, 'Edit Kontrak', 'Perbarui data'],
  [/^\/kontrak\/\d+$/, 'Detail Kontrak', 'Cek kontrak'],
  [/^\/kontrak$/, 'Cek Kontrak', 'Daftar & filter'],
  [/^\/admin$/, 'Kelola Admin', 'Akun & reminder'],
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const pill = useRef<HTMLSpanElement>(null)

  // Penanda menu aktif yang meluncur halus antar item
  useLayoutEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('a.active')
    if (!active || !pill.current) {
      gsap.to(pill.current, { autoAlpha: 0, duration: 0.2 })
      return
    }
    gsap.to(pill.current, { y: active.offsetTop, height: active.offsetHeight, autoAlpha: 1, duration: 0.55, ease: 'power3.out' })
  }, [pathname])

  return (
    <div className="noise relative flex h-full flex-col overflow-hidden rounded-[26px] border border-white/[.07] px-4 py-6 shadow-lift backdrop-blur-2xl"
      style={{ background: 'linear-gradient(180deg, rgba(20,29,51,.78) 0%, rgba(10,16,30,.82) 100%)' }}>
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-champagne/20 blur-3xl" />
      <div className="relative px-2"><Logo /></div>
      <div className="hairline relative mx-2 mt-6" />

      <p className="eyebrow relative mt-6 px-3 text-ink-faint">Menu</p>
      <nav ref={navRef} className="relative mt-3 flex flex-col gap-1">
        <span ref={pill} className="invisible absolute left-0 right-0 top-0 rounded-2xl border border-champagne/30"
          style={{ background: 'linear-gradient(90deg, rgba(212,180,131,.28), rgba(212,180,131,.06))', boxShadow: '0 0 28px -8px rgba(212,180,131,.7), inset 0 1px 0 rgba(255,255,255,.12)' }} />
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => {
              const on = isActive || (to === '/kontrak' && /^\/kontrak\/\d+/.test(pathname))
              return clsx('group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors',
                on ? 'active text-ink' : 'text-ink-muted hover:text-ink')
            }}>
            {({ isActive }) => {
              const on = isActive || (to === '/kontrak' && /^\/kontrak\/\d+/.test(pathname))
              return (
                <>
                  <span className={clsx('grid h-8 w-8 place-items-center rounded-xl transition', on ? 'bg-champagne text-midnight shadow-glow' : 'bg-white/[.04] group-hover:bg-white/[.08]')}>
                    <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
                  </span>
                  {label}
                </>
              )
            }}
          </NavLink>
        ))}
      </nav>

      <div className="relative mt-auto overflow-hidden rounded-2xl border border-champagne/20 p-5"
        style={{ background: 'radial-gradient(120% 100% at 0% 0%, rgba(212,180,131,.22), transparent 60%), rgba(255,255,255,.03)' }}>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-champagne/15 text-champagne"><BellRing className="h-4 w-4" /></span>
        <p className="mt-3 text-sm font-semibold text-ink">Reminder otomatis</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">Kontrak sisa ≤ 3 bulan tampil di dashboard & dikirim ke email admin tiap pagi.</p>
      </div>
      <p className="relative mt-4 px-2 text-[11px] text-ink-faint">v1.1 · Khusus admin</p>
    </div>
  )
}

export default function Layout() {
  const { admin, logout } = useAuth()
  const { pathname } = useLocation()
  const nav = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const lite = useLite()
  const main = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const found = TITLES.find(([re]) => re.test(pathname))
  const title = found?.[1] ?? ''
  const eyebrow = found?.[2] ?? ''

  // Transisi antar halaman
  useGSAP(() => {
    gsap.fromTo(main.current, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out' })
    window.scrollTo({ top: 0 })
  }, { dependencies: [pathname] })

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  return (
    <div className="relative min-h-screen bg-base">
      <Ambient />

      <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-[256px] lg:block"><Sidebar /></aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-3 left-3 top-3 w-[264px]">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-6 rounded-lg p-2 text-ink-muted" aria-label="Tutup menu">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 lg:pl-[276px]">
        <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
          <div className="mx-auto flex h-[72px] max-w-[1400px] items-center gap-4 rounded-[22px] border border-white/[.07] bg-[#0B1222]/70 px-4 shadow-soft backdrop-blur-2xl sm:px-6">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-white/[.08] bg-white/[.04] p-2.5 lg:hidden" aria-label="Buka menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-champagne/80">{eyebrow}</p>
              <h1 className="truncate text-[20px] font-semibold tracking-tight text-ink">{title}</h1>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell />
              <div ref={menuRef} className="relative">
                <button onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.04] py-1.5 pl-1.5 pr-3 transition hover:border-champagne/40">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-champagne-200 to-champagne-500 text-xs font-bold text-midnight">{initials(admin?.nama ?? '')}</span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[140px] truncate text-[13px] font-semibold leading-tight text-ink">{admin?.nama}</span>
                    <span className="block text-[11px] leading-tight text-ink-muted">Admin</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-ink-faint" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-2xl border border-white/[.08] bg-[#0E1526]/95 p-1.5 shadow-lift backdrop-blur-2xl">
                    <button onClick={() => { setMenuOpen(false); setProfileOpen(true) }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-white/[.06]">
                      <UserCog className="h-4 w-4 text-ink-muted" /> Profil & password
                    </button>
                    <button onClick={() => setLite(!lite)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-white/[.06]">
                      <Gauge className="h-4 w-4 text-ink-muted" />
                      <span className="flex-1 text-left">Mode ringan</span>
                      <span className={clsx('relative h-5 w-9 rounded-full transition', lite ? 'bg-champagne' : 'bg-white/[.12]')}>
                        <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', lite ? 'left-[18px]' : 'left-0.5')} />
                      </span>
                    </button>
                    <button onClick={() => { logout(); nav('/login') }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-status-end hover:bg-status-endBg">
                      <LogOut className="h-4 w-4" /> Keluar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main ref={main} className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 sm:px-6">
          <Outlet />
        </main>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
