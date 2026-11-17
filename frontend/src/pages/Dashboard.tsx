import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { AlertTriangle, ArrowRight, ArrowUpRight, Download, FilePlus2, Plus, ScrollText, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { CountUp, EmptyState, Skeleton, StatusBadge, TimeBar, statusMeta } from '../components/ui'
import { ExpiryTimeline, StatusDonut, TopVendors } from '../components/Charts'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, downloadBlob, errMsg } from '../lib/api'
import { rupiahCompact, rupiahShort, sapaan, tanggal, waktuRelatif } from '../lib/format'
import type { Dashboard as D, Status } from '../lib/types'
import { useLite } from '../lib/perf'

const HeroObject = lazy(() => import('../components/HeroObject'))
const STATUS_ORDER: Status[] = ['aktif', 'segera_habis', 'berakhir', 'diperpanjang']

function CardHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-champagne/80">{eyebrow}</p>
        <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-ink">{title}</h3>
      </div>
      {action}
    </div>
  )
}

export default function Dashboard() {
  const { admin } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [data, setData] = useState<D | null>(null)
  const [exporting, setExporting] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const lite = useLite()

  useEffect(() => {
    api.get<D>('/api/dashboard').then((r) => setData(r.data)).catch((e) => toast('error', 'Gagal memuat dashboard', errMsg(e)))
  }, [toast])

  useGSAP(() => {
    if (!data) return
    gsap.fromTo('.reveal', { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.85, ease: 'power3.out', stagger: 0.07 })
    gsap.fromTo('.kpi', { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06, delay: 0.35 })
  }, { scope: root, dependencies: [data] })

  const exportAll = async () => {
    setExporting(true)
    try {
      await downloadBlob('/api/contracts/export', { format: 'xlsx' }, 'daftar-kontrak.xlsx')
    } catch (e) {
      toast('error', 'Export gagal', errMsg(e))
    } finally {
      setExporting(false)
    }
  }

  if (!data) {
    return (
      <div className="grid gap-5 lg:grid-cols-12">
        <Skeleton className="h-[340px] lg:col-span-8" />
        <Skeleton className="h-[340px] lg:col-span-4" />
        <Skeleton className="h-80 lg:col-span-7" />
        <Skeleton className="h-80 lg:col-span-5" />
      </div>
    )
  }

  const total = rupiahShort(data.total_nilai)
  const nSegera = data.counts.segera_habis
  const firstName = admin?.nama.split(' ')[0]

  if (data.total_kontrak === 0) {
    return (
      <div ref={root} className="reveal card">
        <EmptyState icon={<ScrollText className="h-7 w-7" strokeWidth={1.5} />} title="Belum ada kontrak"
          desc="Mulai dengan menambahkan kontrak pertama. Reminder akan muncul otomatis saat sisa kontrak ≤ 3 bulan."
          action={<Link to="/kontrak/baru" className="btn-primary"><FilePlus2 className="h-4 w-4" /> Input kontrak pertama</Link>} />
      </div>
    )
  }

  return (
    <div ref={root} className="space-y-5">
      {/* ---------- Baris 1: hero + donut ---------- */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="reveal card-dark noise flex min-h-[340px] flex-col p-7 sm:p-9 lg:col-span-8">
          <div className="pointer-events-none absolute -right-10 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-champagne/20 blur-3xl" />
          {!lite && <Suspense fallback={null}>
            <HeroObject className="pointer-events-none absolute -right-4 top-0 hidden h-[64%] w-[36%] md:block" />
          </Suspense>}

          <div className="relative mb-8 max-w-[560px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-champagne/25 bg-champagne/10 px-3 py-1 text-[11px] font-medium text-champagne">
              <Sparkles className="h-3.5 w-3.5" /> {tanggal(data.tanggal)}
            </span>
            <h2 className="mt-5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[34px]">
              {sapaan()}, <span className="font-serif text-[1.15em] font-normal italic tracking-normal gold-text">{firstName}</span>
            </h2>
            <p className="mt-2 text-sm text-ink-muted">Total nilai kontrak yang tercatat saat ini</p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-medium text-ink-muted">Rp</span>
              <CountUp value={Number(total.value.replace(/\./g, '').replace(',', '.'))}
                format={(n) => n.toLocaleString('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: total.value.includes(',') ? 1 : 0 })}
                className="text-[64px] font-semibold leading-none tracking-[-0.045em] text-ink sm:text-[76px]" />
              <span className="text-4xl font-semibold tracking-tight gold-text">{total.unit}</span>
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link to="/kontrak/baru" className="btn-primary h-11 px-5"><Plus className="h-4 w-4" /> Tambah kontrak</Link>
              <button onClick={exportAll} disabled={exporting} className="btn-outline h-11 px-5">
                <Download className="h-4 w-4" /> {exporting ? 'Menyiapkan…' : 'Export'}
              </button>
            </div>
          </div>

          {/* Baris KPI ala kaca */}
          <div className="relative mt-auto grid grid-cols-2 gap-2 rounded-2xl border border-white/[.08] bg-white/[.04] p-2 backdrop-blur-xl sm:grid-cols-4">
            {STATUS_ORDER.map((s) => {
              const M = statusMeta[s]
              const Icon = M.icon
              return (
                <button key={s} onClick={() => nav(`/kontrak?status=${s}`)}
                  className="kpi group flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[.06]">
                  <span className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', M.cls)}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <CountUp value={data.counts[s]} className="block text-xl font-semibold leading-none tracking-tight text-ink" />
                    <span className="mt-1 block truncate text-[11px] text-ink-muted">{M.label}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="reveal card p-6 sm:p-7 lg:col-span-4">
          <CardHead eyebrow="Komposisi" title="Status kontrak" />
          <div className="mt-6"><StatusDonut counts={data.counts} /></div>
          <div className="hairline my-5" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-ink-muted">Nilai berjalan</p>
              <p className="mt-1 font-semibold text-ink tabular">{rupiahCompact(data.nilai_berjalan)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Perlu tindak lanjut</p>
              <p className="mt-1 font-semibold text-status-warn tabular">{rupiahCompact(data.nilai_per_status.segera_habis)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Banner reminder ---------- */}
      {nSegera > 0 && (
        <section className="reveal relative overflow-hidden rounded-[22px] border border-status-warn/25 p-5 sm:px-6"
          style={{ background: 'linear-gradient(90deg, rgba(242,182,87,.16), rgba(212,180,131,.05) 55%, rgba(14,21,38,.5))' }}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-status-warn text-midnight shadow-[0_0_24px_rgba(242,182,87,.55)]">
              <AlertTriangle className="h-5 w-5" />
              <span className="absolute inset-0 animate-ping rounded-xl bg-status-warn/40" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{nSegera} kontrak akan berakhir dalam 3 bulan</p>
              <p className="mt-0.5 truncate text-sm text-ink-muted">
                Terdekat: <span className="text-ink-soft">{data.segera_habis[0]?.nama_kontrak}</span> — sisa {data.segera_habis[0]?.sisa_text}
              </p>
            </div>
            <Link to="/kontrak?status=segera_habis" className="btn-primary">Tindak lanjuti <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      )}

      {/* ---------- Baris 2: grafik + segera berakhir ---------- */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="reveal card p-6 sm:p-7 lg:col-span-7">
          <CardHead eyebrow="12 bulan ke depan" title="Jadwal kontrak berakhir"
            action={<span className="rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1 text-xs text-ink-muted">Per bulan</span>} />
          <div className="mt-7"><ExpiryTimeline data={data.timeline} /></div>
        </div>

        <div className="reveal card p-6 sm:p-7 lg:col-span-5">
          <CardHead eyebrow="Perlu perhatian" title="Segera berakhir"
            action={<Link to="/kontrak?status=segera_habis" className="btn-ghost -mr-2 -mt-1 px-3 text-[13px]">Semua <ArrowRight className="h-4 w-4" /></Link>} />
          {data.segera_habis.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/[.1] py-12 text-center text-sm text-ink-muted">
              Tidak ada kontrak yang berakhir dalam 3 bulan ke depan.
            </div>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {data.segera_habis.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link to={`/kontrak/${c.id}`} className="group flex items-center gap-4 rounded-2xl border border-white/[.05] bg-white/[.025] p-3.5 transition hover:border-champagne/30 hover:bg-white/[.05]">
                    <div className={clsx('grid h-14 w-14 shrink-0 place-items-center rounded-xl border text-center',
                      c.sisa_hari <= 30 ? 'border-status-end/30 bg-status-endBg' : 'border-status-warn/30 bg-status-warnBg')}>
                      <div>
                        <p className={clsx('text-lg font-bold leading-none tabular', c.sisa_hari <= 30 ? 'text-status-end' : 'text-status-warn')}>{c.sisa_hari}</p>
                        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-muted">hari</p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink group-hover:text-champagne">{c.nama_kontrak}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{c.penyedia} · {tanggal(c.tanggal_berakhir, true)}</p>
                      <div className="mt-2"><TimeBar progress={c.progress} status={c.status} /></div>
                    </div>
                    <p className="hidden shrink-0 text-right text-sm font-semibold text-ink tabular sm:block">{rupiahCompact(c.nilai_kontrak)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---------- Baris 3: penyedia + terbaru ---------- */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="reveal card p-6 sm:p-7 lg:col-span-5">
          <CardHead eyebrow="Berdasarkan nilai" title="Penyedia terbesar" />
          <div className="mt-6"><TopVendors data={data.top_penyedia} /></div>
        </div>

        <div className="reveal card p-6 sm:p-7 lg:col-span-7">
          <CardHead eyebrow="Aktivitas" title="Baru ditambahkan"
            action={<Link to="/kontrak?sort=created_at:desc" className="btn-ghost -mr-2 -mt-1 px-3 text-[13px]">Semua <ArrowUpRight className="h-4 w-4" /></Link>} />
          <ul className="mt-4 divide-y divide-white/[.05]">
            {data.terbaru.map((c) => (
              <li key={c.id}>
                <Link to={`/kontrak/${c.id}`} className="group -mx-3 flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-white/[.04]">
                  <span className="icon-tile h-10 w-10 shrink-0 text-champagne"><ScrollText className="h-[18px] w-[18px]" strokeWidth={1.6} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink group-hover:text-champagne">{c.nama_kontrak}</span>
                    <span className="block truncate text-xs text-ink-muted">{c.nomor_pks} · {waktuRelatif(c.created_at)}</span>
                  </span>
                  <span className="hidden text-sm font-semibold text-ink-soft tabular md:block">{rupiahCompact(c.nilai_kontrak)}</span>
                  <StatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
