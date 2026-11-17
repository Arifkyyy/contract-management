import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { AlertTriangle, Ban, CheckCircle2, Clock, RefreshCw, X, XCircle } from 'lucide-react'
import clsx from 'clsx'
import type { Status } from '../lib/types'

/* ---------- Logo (Badan Bank Tanah) ---------- */
export function Logo({ compact = false, size = 'md' }: { light?: boolean; compact?: boolean; size?: 'md' | 'lg' }) {
  const lg = size === 'lg'
  return (
    <div className="flex items-center gap-3">
      <img src="/brand/bbt-mark-sm.png" alt="Badan Bank Tanah" draggable={false}
        className={clsx('w-auto select-none drop-shadow-[0_4px_14px_rgba(242,193,45,.25)]', lg ? 'h-12' : 'h-9')} />
      {!compact && (
        <div className="leading-tight">
          <p className={clsx('font-bold tracking-tight text-ink', lg ? 'text-[19px]' : 'text-[15px]')}>Badan Bank Tanah</p>
          <p className={clsx('mt-0.5 font-medium text-champagne/80', lg ? 'text-[12px]' : 'text-[10.5px]')}>Contract Management</p>
        </div>
      )}
    </div>
  )
}

/* ---------- Status badge ---------- */
const STATUS_STYLE: Record<Status, { cls: string; icon: typeof Clock; label: string }> = {
  aktif: { cls: 'bg-status-aktifBg text-status-aktif', icon: CheckCircle2, label: 'Aktif' },
  segera_habis: { cls: 'bg-status-warnBg text-status-warn', icon: AlertTriangle, label: 'Segera Habis' },
  berakhir: { cls: 'bg-status-endBg text-status-end', icon: XCircle, label: 'Berakhir' },
  diperpanjang: { cls: 'bg-status-renewBg text-status-renew', icon: RefreshCw, label: 'Diperpanjang' },
  tidak_diperpanjang: { cls: 'bg-status-offBg text-status-off', icon: Ban, label: 'Tidak Diperpanjang' },
}
export const statusMeta = STATUS_STYLE

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const s = STATUS_STYLE[status]
  const Icon = s.icon
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', s.cls, className)}>
      <Icon className="h-3.5 w-3.5" />
      {s.label}
    </span>
  )
}

/* ---------- Progress bar sisa waktu ---------- */
export function TimeBar({ progress, status }: { progress: number; status: Status }) {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.fromTo(ref.current, { scaleX: 0 }, { scaleX: progress / 100, duration: 1.1, ease: 'power3.out', delay: 0.15 })
  }, [progress])
  const color =
    status === 'berakhir' ? 'bg-status-end' : status === 'segera_habis' ? 'bg-status-warn' : status === 'diperpanjang' ? 'bg-status-renew' : status === 'tidak_diperpanjang' ? 'bg-status-off' : 'bg-gradient-to-r from-champagne-500 to-champagne-300'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[.07]">
      <div ref={ref} className={clsx('h-full origin-left rounded-full', color)} style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  )
}

/* ---------- Count up angka ---------- */
export function CountUp({ value, format, className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useGSAP(() => {
    const obj = { v: 0 }
    gsap.to(obj, {
      v: value,
      duration: 1.4,
      ease: 'power3.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = format ? format(obj.v) : Math.round(obj.v).toLocaleString('id-ID')
      },
    })
  }, [value])
  return <span ref={ref} className={clsx('tabular', className)}>{format ? format(0) : '0'}</span>
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, subtitle, children, width = 'max-w-lg' }: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  width?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    gsap.fromTo(backdrop.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 })
    gsap.fromTo(panel.current, { y: 24, autoAlpha: 0, scale: 0.98 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power3.out' })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <div ref={backdrop} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={panel} role="dialog" aria-modal="true" className={clsx('relative w-full rounded-[26px] border border-white/[.08] bg-[#0E1526]/95 p-7 shadow-lift backdrop-blur-2xl', width)}>
        <button onClick={onClose} className="absolute right-5 top-5 rounded-lg p-1.5 text-ink-faint hover:bg-white/[.06] hover:text-ink" aria-label="Tutup">
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Ya, lanjutkan', danger, loading }: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmText?: string
  danger?: boolean
  loading?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="text-sm leading-relaxed text-ink-soft">{message}</div>
      <div className="mt-7 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Batal</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
          {loading ? 'Memproses…' : confirmText}
        </button>
      </div>
    </Modal>
  )
}

/* ---------- Skeleton & empty ---------- */
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx('animate-pulse rounded-xl bg-white/[.06]', className)} />
)

export function EmptyState({ title, desc, action, icon }: { title: string; desc?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-champagne/40 bg-champagne/[.08] text-champagne-600">{icon}</div>
      <p className="mt-5 text-xl font-semibold text-ink">{title}</p>
      {desc && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={clsx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />
}
