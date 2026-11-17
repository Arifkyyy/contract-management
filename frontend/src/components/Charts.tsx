import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'
import { rupiahCompact } from '../lib/format'
import type { Dashboard, Status } from '../lib/types'
import { statusMeta } from './ui'

/**
 * Jumlah kontrak berakhir per bulan (12 bulan ke depan). Satu seri.
 * Bulan dalam masa reminder diberi warna champagne pekat; bulan dengan kontrak terbanyak
 * di masa reminder diberi efek cahaya (seperti sorotan) supaya langsung terlihat.
 */
export function ExpiryTimeline({ data }: { data: Dashboard['timeline'] }) {
  const root = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.jumlah))
  const step = max <= 4 ? 1 : Math.ceil(max / 4)
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step).reverse()
  const remind = data.map((d, i) => ({ d, i })).filter(({ d }) => d.masa_reminder && d.jumlah > 0)
  const peak = remind.length ? remind.reduce((a, b) => (b.d.jumlah > a.d.jumlah ? b : a)).i : -1
  const active = hover ?? peak

  useGSAP(() => {
    gsap.fromTo('.bar', { scaleY: 0 }, { scaleY: 1, duration: 1, ease: 'power3.out', stagger: 0.05, delay: 0.2 })
    gsap.fromTo('.beam', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, delay: 1 })
  }, { scope: root, dependencies: [data] })

  return (
    <div ref={root}>
      <div className="relative flex h-72 gap-3">
        <div className="flex flex-col justify-between pb-7 text-right text-[11px] text-ink-faint tabular">
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 leading-none">{t}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 bottom-7 top-0 flex flex-col justify-between">
            {ticks.map((t) => <div key={t} className={clsx('h-px', t === 0 ? 'bg-white/[.12]' : 'bg-white/[.05]')} />)}
          </div>
          <div className="absolute inset-0 flex items-stretch gap-2">
            {data.map((d, i) => {
              const h = (d.jumlah / top) * 100
              const isActive = active === i && d.jumlah > 0
              return (
                <div key={i} className="relative flex flex-1 flex-col items-center"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <div className="relative flex w-full flex-1 items-end justify-center">
                    {/* kolom latar tipis */}
                    <div className="absolute inset-x-[18%] bottom-0 top-0 rounded-t-lg bg-white/[.025]" />
                    <div className={clsx('bar relative w-[64%] max-w-[22px] origin-bottom rounded-t-[6px] transition-[filter,opacity] duration-300',
                      hover !== null && hover !== i && 'opacity-45')}
                      style={{
                        height: `${h}%`,
                        minHeight: d.jumlah ? 6 : 0,
                        background: isActive
                          ? 'linear-gradient(180deg, #FFF3D6 0%, #E6CFA6 30%, #C9A56E 100%)'
                          : d.masa_reminder
                            ? 'linear-gradient(180deg, rgba(212,180,131,.95), rgba(212,180,131,.45))'
                            : 'linear-gradient(180deg, rgba(134,168,245,.55), rgba(134,168,245,.15))',
                        boxShadow: isActive ? '0 0 22px rgba(230,207,166,.75), 0 0 60px rgba(212,180,131,.35)' : undefined,
                      }} />
                    {isActive && (
                      <>
                        <div className="beam pointer-events-none absolute bottom-0 left-1/2 h-24 w-14 -translate-x-1/2 translate-y-full"
                          style={{ background: 'radial-gradient(50% 60% at 50% 0%, rgba(230,207,166,.55), transparent 70%)' }} />
                        <div className={clsx('pointer-events-none absolute z-10 translate-y-1/2 rounded-xl border border-champagne/30 bg-[#0E1526]/95 px-3 py-2 text-xs shadow-lift backdrop-blur',
                          i > data.length / 2 ? 'right-[70%]' : 'left-[70%]')}
                          style={{ bottom: `${Math.min(h, 80)}%` }}>
                          <p className="whitespace-nowrap font-semibold text-champagne">{d.bulan}</p>
                          <p className="mt-0.5 whitespace-nowrap text-ink">{d.jumlah} kontrak berakhir</p>
                          {d.nilai > 0 && <p className="whitespace-nowrap text-ink-muted">{rupiahCompact(d.nilai)}</p>}
                        </div>
                      </>
                    )}
                  </div>
                  <span className={clsx('mt-2 h-5 text-[10.5px] leading-5', isActive ? 'font-semibold text-champagne' : 'text-ink-faint')}>{d.bulan.split(' ')[0]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-5 text-xs text-ink-muted">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px] bg-champagne" /> Masa reminder (≤ 3 bulan)</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px] bg-status-renew/60" /> Bulan berikutnya</span>
      </div>
    </div>
  )
}

/** Donut komposisi status kontrak. Total di tengah, label + jumlah di samping. */
const DONUT_COLOR: Record<Status, string> = {
  aktif: '#5FD3A2', segera_habis: '#F2B657', berakhir: '#F2777D', diperpanjang: '#86A8F5', tidak_diperpanjang: '#A3ACBD',
}
export function StatusDonut({ counts }: { counts: Record<Status, number> }) {
  const root = useRef<HTMLDivElement>(null)
  const order: Status[] = ['aktif', 'segera_habis', 'berakhir', 'diperpanjang', 'tidak_diperpanjang']
  const sum = order.reduce((a, s) => a + counts[s], 0)
  const total = sum || 1
  const R = 70
  const C = 2 * Math.PI * R
  const GAP = 4
  let acc = 0
  const segs = order.filter((s) => counts[s] > 0).map((s) => {
    const len = (counts[s] / total) * C
    const seg = { s, len: Math.max(len - GAP, 1), off: acc }
    acc += len
    return seg
  })

  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 250)
    return () => clearTimeout(t)
  }, [])

  return (
    <div ref={root} className="flex flex-wrap items-center gap-8">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <div className="absolute inset-6 rounded-full bg-champagne/10 blur-2xl" />
        <svg viewBox="0 0 180 180" className="relative h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="16" />
          {segs.map(({ s, len, off }, i) => (
            <circle key={s} cx="90" cy="90" r={R} fill="none" stroke={DONUT_COLOR[s]} strokeWidth="16"
              strokeLinecap="round" strokeDasharray={`${drawn ? len : 0} ${C}`} strokeDashoffset={-off}
              style={{ filter: `drop-shadow(0 0 6px ${DONUT_COLOR[s]}66)`, transition: `stroke-dasharray 1.2s cubic-bezier(.22,1,.36,1) ${i * 0.12}s` }}>
              <title>{`${statusMeta[s].label}: ${counts[s]}`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[11px] text-ink-muted">Total</p>
            <p className="text-[34px] font-semibold leading-none tracking-tight text-ink tabular">{sum}</p>
            <p className="mt-1 text-[11px] text-ink-faint">kontrak</p>
          </div>
        </div>
      </div>
      <ul className="min-w-[160px] flex-1 space-y-3.5">
        {order.map((s) => (
          <li key={s} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2.5 text-ink-soft">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLOR[s], boxShadow: `0 0 10px ${DONUT_COLOR[s]}` }} />
              {statusMeta[s].label}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-semibold text-ink tabular">{counts[s]}</span>
              <span className="w-10 text-right text-xs text-ink-faint tabular">{Math.round((counts[s] / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Nilai kontrak per penyedia — bar horizontal satu seri. */
export function TopVendors({ data }: { data: Dashboard['top_penyedia'] }) {
  const root = useRef<HTMLDivElement>(null)
  const max = Math.max(1, ...data.map((d) => d.nilai))
  useGSAP(() => {
    gsap.fromTo('.hbar', { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.3 })
  }, { scope: root, dependencies: [data] })
  return (
    <div ref={root} className="space-y-5">
      {data.map((d, i) => (
        <div key={d.penyedia} title={`${d.penyedia}: ${rupiahCompact(d.nilai)} (${d.jumlah} kontrak)`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline gap-3">
              <span className="text-xs font-semibold text-champagne/70 tabular">{String(i + 1).padStart(2, '0')}</span>
              <span className="truncate font-medium text-ink">{d.penyedia}</span>
            </span>
            <span className="shrink-0 font-semibold text-ink tabular">{rupiahCompact(d.nilai)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.05]">
            <div className="hbar h-full origin-left rounded-full"
              style={{ width: `${(d.nilai / max) * 100}%`, background: 'linear-gradient(90deg, rgba(212,180,131,.35), #E6CFA6)', boxShadow: '0 0 12px rgba(212,180,131,.45)' }} />
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">{d.jumlah} kontrak</p>
        </div>
      ))}
    </div>
  )
}
