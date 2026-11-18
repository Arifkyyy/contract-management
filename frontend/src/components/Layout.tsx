import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { BellRing, ChevronDown, FilePlus2, LayoutDashboard, LogOut, Menu, ScrollText, UserCog, UsersRound, X } from 'lucide-react'
import clsx from 'clsx'
import { Logo, ThemeToggle } from './ui'
import NotificationBell from './NotificationBell'
import ProfileModal from './ProfileModal'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/format'

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
    gsap.to(pill.current, { y: active.offsetTop, height: active.offsetHeight, autoAlpha: 1, duration: 0.3, ease: 'power2.out' })
  }, [pathname])

  return (
    <div className="relative flex h-full flex-col border-r border-line bg-panel px-3 py-5">
      <div className="px-3"><Logo /></div>

      <nav ref={navRef} className="relative mt-8 flex flex-col gap-0.5" aria-label="Menu utama">
        <span ref={pill} className="invisible absolute left-0 right-0 top-0 rounded-lg bg-accent-50">
          <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-accent" />
        </span>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => {
              const on = isActive || (to === '/kontrak' && /^\/kontrak\/\d+/.test(pathname))
              return clsx('group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                on ? 'active text-accent-700' : 'text-ink-muted hover:bg-fg/[.04] hover:text-ink')
            }}>
            {({ isActive }) => {
              const on = isActive || (to === '/kontrak' && /^\/kontrak\/\d+/.test(pathname))
              return (
                <>
                  <Icon className={clsx('h-[18px] w-[18px] shrink-0', on ? 'text-accent' : 'text-ink-faint group-hover:text-ink-muted')} strokeWidth={1.9} />
                  {label}
                </>
              )
            }}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-line bg-base p-4">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-ink"><BellRing className="h-4 w-4 text-accent" /> Reminder otomatis</p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">Kontrak dengan sisa 3 bulan atau kurang tampil di dashboard dan dikirim ke email admin setiap pagi.</p>
      </div>
      <p className="mt-3 px-3 text-[11px] text-ink-faint">Versi 1.1</p>
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
  const main = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const found = TITLES.find(([re]) => re.test(pathname))
  const title = found?.[1] ?? ''
  const eyebrow = found?.[2] ?? ''

  // Transisi antar halaman
  useGSAP(() => {
    gsap.fromTo(main.current, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' })
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block"><Sidebar /></aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[264px] shadow-lift">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-6 rounded-lg p-2 text-ink-muted" aria-label="Tutup menu">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 lg:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-line bg-panel">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg border border-line p-2 text-ink-soft lg:hidden" aria-label="Buka menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold tracking-tight text-ink">{title}</h1>
              <p className="hidden text-xs text-ink-muted sm:block">{eyebrow}</p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
              <div ref={menuRef} className="relative">
                <button onClick={() => setMenuOpen((o) => !o)}
                  className="ml-1 flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-fg/[.04]">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent">{initials(admin?.nama ?? '')}</span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[140px] truncate text-[13px] font-semibold leading-tight text-ink">{admin?.nama}</span>
                    <span className="block text-[11px] leading-tight text-ink-muted">Admin</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-ink-faint" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-line bg-panel p-1.5 shadow-lift">
                    <button onClick={() => { setMenuOpen(false); setProfileOpen(true) }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-fg/[.06]">
                      <UserCog className="h-4 w-4 text-ink-muted" /> Profil & password
                    </button>
                    <button onClick={() => { logout(); nav('/login') }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-status-end hover:bg-status-endBg">
                      <LogOut className="h-4 w-4" /> Keluar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main ref={main} className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
