import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { Bell, BellOff, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { tanggal } from '../lib/format'
import type { Contract } from '../lib/types'

export const CONTRACTS_CHANGED = 'contracts:changed'
export const notifyContractsChanged = () => window.dispatchEvent(new Event(CONTRACTS_CHANGED))

export default function NotificationBell() {
  const [data, setData] = useState<{ jumlah: number; items: Contract[] }>({ jumlah: 0, items: [] })
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLSpanElement>(null)
  const nav = useNavigate()

  const load = useCallback(() => {
    api.get('/api/notifications').then((r) => setData(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 5 * 60 * 1000)
    window.addEventListener(CONTRACTS_CHANGED, load)
    return () => {
      clearInterval(iv)
      window.removeEventListener(CONTRACTS_CHANGED, load)
    }
  }, [load])

  useEffect(() => {
    if (data.jumlah > 0 && dot.current) {
      gsap.fromTo(dot.current, { scale: 0.4 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' })
    }
  }, [data.jumlah])

  useEffect(() => {
    if (!open) return
    gsap.fromTo(panel.current, { y: -8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3, ease: 'power3.out' })
    gsap.fromTo(panel.current!.querySelectorAll('.notif-item'), { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, stagger: 0.04, delay: 0.05 })
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={wrap} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label={`Notifikasi, ${data.jumlah} kontrak segera habis`}
        className={clsx('relative grid h-11 w-11 place-items-center rounded-xl border bg-fg/[.04] transition',
          open ? 'border-champagne shadow-gold' : 'border-fg/[.07] hover:border-champagne/60')}>
        <Bell className="h-[18px] w-[18px] text-ink" strokeWidth={1.8} />
        {data.jumlah > 0 && (
          <span ref={dot} className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-status-warn px-1 text-[10px] font-bold text-white ring-2 ring-base">
            {data.jumlah}
          </span>
        )}
      </button>

      {open && (
        <div ref={panel} className="absolute right-0 top-14 z-50 w-[380px] overflow-hidden rounded-2xl border border-fg/[.07] bg-fg/[.04] shadow-lift">
          <div className="card-dark rounded-none px-5 py-4">
            <p className="eyebrow text-champagne">Reminder</p>
            <p className="mt-1 text-[15px] font-semibold">
              {data.jumlah > 0 ? `${data.jumlah} kontrak sisa ≤ 3 bulan` : 'Semua kontrak aman'}
            </p>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {data.items.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center text-sm text-ink-muted">
                <BellOff className="mb-3 h-6 w-6 text-champagne-500" />
                Belum ada kontrak yang perlu diingatkan.
              </div>
            ) : (
              data.items.map((c) => (
                <button key={c.id} onClick={() => { setOpen(false); nav(`/kontrak/${c.id}`) }}
                  className="notif-item group flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-fg/[.05]">
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', c.status === 'berakhir' ? 'bg-status-end' : c.sisa_hari <= 30 ? 'bg-status-end' : 'bg-status-warn')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{c.nama_kontrak}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink-muted">{c.penyedia}</span>
                    <span className="mt-1.5 block text-xs">
                      <span className={clsx('font-semibold', c.status === 'berakhir' ? 'text-status-end' : 'text-status-warn')}>
                        {c.status === 'berakhir' ? c.sisa_text : `Sisa ${c.sisa_text}`}
                      </span>
                      <span className="text-ink-faint"> · {tanggal(c.tanggal_berakhir, true)}</span>
                    </span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-champagne-600" />
                </button>
              ))
            )}
          </div>
          <button onClick={() => { setOpen(false); nav('/kontrak?status=segera_habis') }}
            className="w-full border-t border-fg/[.07] py-3 text-center text-[13px] font-semibold text-champagne-700 hover:bg-champagne/[.08]">
            Lihat semua di Cek Kontrak
          </button>
        </div>
      )}
    </div>
  )
}
