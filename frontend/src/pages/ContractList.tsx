import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  ArrowDownUp, ChevronLeft, ChevronRight, Download, Eye, FileSpreadsheet, FileText, Filter, Paperclip, Pencil, Plus, Search, SearchX, Trash2, X,
} from 'lucide-react'
import clsx from 'clsx'
import { ConfirmDialog, EmptyState, Skeleton, StatusBadge, TimeBar, statusMeta } from '../components/ui'
import { notifyContractsChanged } from '../components/NotificationBell'
import { useToast } from '../context/ToastContext'
import { api, downloadBlob, errMsg } from '../lib/api'
import { rupiah, rupiahCompact, tanggal } from '../lib/format'
import type { Contract, ContractList as CL, Status } from '../lib/types'

const STATUSES: Status[] = ['aktif', 'segera_habis', 'berakhir', 'diperpanjang', 'tidak_diperpanjang']
const SORTS = [
  { v: 'tanggal_berakhir:asc', l: 'Berakhir paling dekat' },
  { v: 'tanggal_berakhir:desc', l: 'Berakhir paling jauh' },
  { v: 'nilai_kontrak:desc', l: 'Nilai terbesar' },
  { v: 'nilai_kontrak:asc', l: 'Nilai terkecil' },
  { v: 'tanggal_pks:desc', l: 'PKS terbaru' },
  { v: 'nama_kontrak:asc', l: 'Nama A–Z' },
  { v: 'created_at:desc', l: 'Terakhir ditambahkan' },
]
const ADV_KEYS = ['penyedia', 'tahun_pks', 'berakhir_dari', 'berakhir_sampai', 'nilai_min', 'nilai_max', 'ada_file'] as const

export default function ContractList() {
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const toast = useToast()
  const root = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<CL | null>(null)
  const [loading, setLoading] = useState(true)
  const [opts, setOpts] = useState<{ penyedia: string[]; tahun_pks: number[] }>({ penyedia: [], tahun_pks: [] })
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [advOpen, setAdvOpen] = useState(ADV_KEYS.some((k) => sp.get(k)))
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toDelete, setToDelete] = useState<Contract | null>(null)
  const [deleting, setDeleting] = useState(false)

  const page = Number(sp.get('page') ?? 1)
  const pageSize = Number(sp.get('page_size') ?? 10)
  const sort = sp.get('sort') ?? 'tanggal_berakhir:asc'
  const statuses = (sp.get('status') ?? '').split(',').filter(Boolean) as Status[]

  const update = useCallback((patch: Record<string, string | null>, resetPage = true) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev)
      Object.entries(patch).forEach(([k, v]) => (v === null || v === '' ? n.delete(k) : n.set(k, v)))
      if (resetPage && !('page' in patch)) n.delete('page')
      return n
    }, { replace: true })
  }, [setSp])

  // Parameter API dari URL
  const params = useMemo(() => {
    const [sort_by, order] = sort.split(':')
    const p: Record<string, string> = { sort_by, order }
    ;['q', 'status', ...ADV_KEYS].forEach((k) => { const v = sp.get(k); if (v) p[k] = v })
    return p
  }, [sp, sort])

  useEffect(() => {
    api.get('/api/contracts/options').then((r) => setOpts(r.data)).catch(() => {})
  }, [])

  // Pencarian dengan jeda (debounce)
  useEffect(() => {
    const t = setTimeout(() => { if ((sp.get('q') ?? '') !== q) update({ q }) }, 350)
    return () => clearTimeout(t)
  }, [q, sp, update])

  const load = useCallback(() => {
    setLoading(true)
    api.get<CL>('/api/contracts', { params: { ...params, page, page_size: pageSize } })
      .then((r) => setData(r.data))
      .catch((e) => toast('error', 'Gagal memuat kontrak', errMsg(e)))
      .finally(() => setLoading(false))
  }, [params, page, pageSize, toast])
  useEffect(load, [load])

  useGSAP(() => {
    gsap.fromTo('.reveal', { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'power2.out', stagger: 0.04 })
  }, { scope: root })
  useGSAP(() => {
    if (!loading && data?.items.length) gsap.fromTo('.row', { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out', stagger: 0.04 })
  }, { scope: root, dependencies: [loading, data] })

  const toggleStatus = (s: Status | 'semua') => {
    if (s === 'semua') return update({ status: null })
    const next = statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s]
    update({ status: next.join(',') || null })
  }

  const doExport = async (format: 'xlsx' | 'pdf') => {
    setExportOpen(false)
    setExporting(true)
    try {
      await downloadBlob('/api/contracts/export', { ...params, format }, `daftar-kontrak.${format}`)
      toast('success', 'Export selesai', `File ${format === 'xlsx' ? 'Excel' : 'PDF'} sudah diunduh sesuai filter aktif.`)
    } catch (e) {
      toast('error', 'Export gagal', errMsg(e))
    } finally {
      setExporting(false)
    }
  }

  const doDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/api/contracts/${toDelete.id}`)
      toast('success', 'Kontrak dihapus', toDelete.nama_kontrak)
      setToDelete(null)
      notifyContractsChanged()
      load()
    } catch (e) {
      toast('error', 'Gagal menghapus', errMsg(e))
    } finally {
      setDeleting(false)
    }
  }

  // Label filter aktif
  const activePills: { key: string; label: string }[] = []
  if (sp.get('q')) activePills.push({ key: 'q', label: `“${sp.get('q')}”` })
  if (sp.get('penyedia')) activePills.push({ key: 'penyedia', label: sp.get('penyedia')! })
  if (sp.get('tahun_pks')) activePills.push({ key: 'tahun_pks', label: `PKS ${sp.get('tahun_pks')}` })
  if (sp.get('berakhir_dari')) activePills.push({ key: 'berakhir_dari', label: `Berakhir ≥ ${tanggal(sp.get('berakhir_dari'), true)}` })
  if (sp.get('berakhir_sampai')) activePills.push({ key: 'berakhir_sampai', label: `Berakhir ≤ ${tanggal(sp.get('berakhir_sampai'), true)}` })
  if (sp.get('nilai_min')) activePills.push({ key: 'nilai_min', label: `Nilai ≥ ${rupiahCompact(Number(sp.get('nilai_min')))}` })
  if (sp.get('nilai_max')) activePills.push({ key: 'nilai_max', label: `Nilai ≤ ${rupiahCompact(Number(sp.get('nilai_max')))}` })
  if (sp.get('ada_file')) activePills.push({ key: 'ada_file', label: sp.get('ada_file') === 'true' ? 'Ada file' : 'Tanpa file' })
  const hasFilter = activePills.length > 0 || statuses.length > 0

  const resetAll = () => {
    setQ('')
    setSp(new URLSearchParams(sort !== 'tanggal_berakhir:asc' ? { sort } : {}), { replace: true })
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1
  const counts = data?.status_counts

  return (
    <div ref={root} className="space-y-5">
      {/* ---------- Toolbar ---------- */}
      <div className="reveal flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input h-12 rounded-xl pl-11 pr-10"
            placeholder="Cari nama kontrak, penyedia, atau nomor PKS…" aria-label="Cari kontrak" />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-faint hover:text-ink" aria-label="Hapus pencarian"><X className="h-4 w-4" /></button>}
        </div>
        <button onClick={() => setAdvOpen((o) => !o)}
          className={clsx('btn h-12 rounded-xl border bg-fg/[.04]', advOpen || activePills.some((p) => p.key !== 'q') ? 'border-accent text-accent-700' : 'border-line text-ink hover:border-accent/60')}>
          <Filter className="h-4 w-4" /> Filter
          {activePills.filter((p) => p.key !== 'q').length > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-midnight">{activePills.filter((p) => p.key !== 'q').length}</span>
          )}
        </button>
        <label className="relative">
          <ArrowDownUp className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <select value={sort} onChange={(e) => update({ sort: e.target.value }, false)} className="input h-12 cursor-pointer appearance-none rounded-xl pl-10 pr-8" aria-label="Urutkan">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </label>
        <div className="relative">
          <button onClick={() => setExportOpen((o) => !o)} disabled={exporting || !data?.total} className="btn-outline h-12 rounded-xl">
            <Download className="h-4 w-4" /> {exporting ? 'Menyiapkan…' : 'Export'}
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-14 z-30 w-56 rounded-xl border border-line bg-fg/[.04] p-1.5 shadow-lift" onMouseLeave={() => setExportOpen(false)}>
              <button onClick={() => doExport('xlsx')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-fg/[.05]">
                <FileSpreadsheet className="h-4 w-4 text-status-aktif" /> Excel (.xlsx)
              </button>
              <button onClick={() => doExport('pdf')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-fg/[.05]">
                <FileText className="h-4 w-4 text-status-end" /> PDF
              </button>
              <p className="px-3 pb-1.5 pt-1 text-[11px] text-ink-faint">Mengikuti filter yang aktif</p>
            </div>
          )}
        </div>
        <Link to="/kontrak/baru" className="btn-primary h-12 rounded-xl"><Plus className="h-4 w-4" /> Tambah</Link>
      </div>

      {/* ---------- Filter lanjutan ---------- */}
      {advOpen && (
        <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="f-peny">Penyedia</label>
            <select id="f-peny" className="input cursor-pointer" value={sp.get('penyedia') ?? ''} onChange={(e) => update({ penyedia: e.target.value })}>
              <option value="">Semua penyedia</option>
              {opts.penyedia.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-thn">Tahun PKS</label>
            <select id="f-thn" className="input cursor-pointer" value={sp.get('tahun_pks') ?? ''} onChange={(e) => update({ tahun_pks: e.target.value })}>
              <option value="">Semua tahun</option>
              {opts.tahun_pks.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <p className="label">Tanggal akhir kontrak</p>
            <div className="flex items-center gap-2">
              <input type="date" className="input" aria-label="Berakhir dari" value={sp.get('berakhir_dari') ?? ''} onChange={(e) => update({ berakhir_dari: e.target.value })} />
              <span className="text-ink-faint">–</span>
              <input type="date" className="input" aria-label="Berakhir sampai" value={sp.get('berakhir_sampai') ?? ''} onChange={(e) => update({ berakhir_sampai: e.target.value })} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="label">Nilai kontrak (Rp)</p>
            <div className="flex items-center gap-2">
              <MoneyInput value={sp.get('nilai_min') ?? ''} onCommit={(v) => update({ nilai_min: v })} placeholder="Minimal" />
              <span className="text-ink-faint">–</span>
              <MoneyInput value={sp.get('nilai_max') ?? ''} onCommit={(v) => update({ nilai_max: v })} placeholder="Maksimal" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="f-file">File kontrak</label>
            <select id="f-file" className="input cursor-pointer" value={sp.get('ada_file') ?? ''} onChange={(e) => update({ ada_file: e.target.value })}>
              <option value="">Semua</option>
              <option value="true">Ada file</option>
              <option value="false">Belum ada file</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={resetAll} className="btn-ghost w-full border border-line">Reset semua filter</button>
          </div>
        </div>
      )}

      {/* ---------- Chip status ---------- */}
      <div className="reveal flex flex-wrap items-center gap-2">
        <button onClick={() => toggleStatus('semua')}
          className={clsx('chip', statuses.length === 0 ? 'chip-on' : 'chip-off')}>
          Semua <span className="tabular opacity-60">{counts?.semua ?? '–'}</span>
        </button>
        {STATUSES.map((s) => {
          const on = statuses.includes(s)
          const Icon = statusMeta[s].icon
          return (
            <button key={s} onClick={() => toggleStatus(s)} aria-pressed={on}
              className={clsx('chip', on ? 'chip-on' : 'chip-off')}>
              <Icon className={clsx('h-3.5 w-3.5', statusMeta[s].cls.split(' ')[1])} />
              {statusMeta[s].label} <span className="tabular opacity-60">{counts?.[s] ?? '–'}</span>
            </button>
          )
        })}
        {activePills.map((p) => (
          <span key={p.key} className="chip border-accent/50 bg-accent/[.08] text-accent-700">
            {p.label}
            <button onClick={() => { if (p.key === 'q') setQ(''); update({ [p.key]: null }) }} aria-label={`Hapus filter ${p.label}`}><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        {hasFilter && <button onClick={resetAll} className="ml-1 text-[13px] font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline">Reset</button>}
      </div>

      {/* ---------- Tabel ---------- */}
      <div className="reveal card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-4">
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink">{data?.total ?? 0}</span> kontrak
            {data && data.total > 0 && <> · total nilai <span className="font-semibold text-ink">{rupiahCompact(data.total_nilai)}</span></>}
          </p>
        </div>

        {loading && !data ? (
          <div className="space-y-3 p-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={<SearchX className="h-7 w-7" strokeWidth={1.5} />}
            title={hasFilter ? 'Tidak ada yang cocok' : 'Belum ada kontrak'}
            desc={hasFilter ? 'Coba ubah atau reset filter.' : 'Tambahkan kontrak pertama untuk mulai memantau.'}
            action={hasFilter ? <button className="btn-outline" onClick={resetAll}>Reset filter</button> : <Link to="/kontrak/baru" className="btn-primary">Input kontrak</Link>} />
        ) : (
          <>
            {/* Desktop */}
            <div className={clsx('hidden overflow-x-auto transition-opacity md:block', loading && 'opacity-50')}>
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-muted">
                    <th className="px-6 py-3.5">Kontrak</th>
                    <th className="px-4 py-3.5">Penyedia</th>
                    <th className="px-4 py-3.5">Berakhir</th>
                    <th className="px-4 py-3.5 text-right">Nilai</th>
                    <th className="w-40 px-4 py-3.5">Sisa kontrak</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((c) => (
                    <tr key={c.id} onClick={() => nav(`/kontrak/${c.id}`)} className="row group cursor-pointer transition hover:bg-fg/[.03]">
                      <td className="max-w-[280px] px-6 py-4">
                        <p className="truncate font-semibold text-ink group-hover:text-accent-700">{c.nama_kontrak}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-muted">
                          {c.nomor_pks} {c.has_file && <Paperclip className="h-3 w-3 shrink-0 text-accent-600" aria-label="Ada file" />}
                        </p>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-4 text-ink-soft">{c.penyedia}</td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <p className="font-medium text-ink">{tanggal(c.tanggal_berakhir, true)}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">PKS {tanggal(c.tanggal_pks, true)}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-ink tabular" title={rupiah(c.nilai_kontrak)}>{rupiahCompact(c.nilai_kontrak)}</td>
                      <td className="px-4 py-4">
                        <p className={clsx('mb-1.5 whitespace-nowrap text-xs font-semibold', c.status === 'segera_habis' ? 'text-status-warn' : c.status === 'berakhir' ? 'text-status-end' : 'text-ink-soft')}>{c.sisa_text}</p>
                        <TimeBar progress={c.progress} status={c.status} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={c.status} />
                        <RowMeta c={c} />
                      </td>
                      <td className="py-4 pl-2 pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-0.5 opacity-60 transition group-hover:opacity-100">
                          <Link to={`/kontrak/${c.id}`} className="rounded-lg p-2 text-ink-muted hover:bg-fg/[.04] hover:text-ink" title="Detail"><Eye className="h-4 w-4" /></Link>
                          <Link to={`/kontrak/${c.id}/edit`} className="rounded-lg p-2 text-ink-muted hover:bg-fg/[.04] hover:text-ink" title="Edit"><Pencil className="h-4 w-4" /></Link>
                          <button onClick={() => setToDelete(c)} className="rounded-lg p-2 text-ink-muted hover:bg-status-endBg hover:text-status-end" title="Hapus"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <ul className="divide-y divide-line md:hidden">
              {data.items.map((c) => (
                <li key={c.id} className="row">
                  <Link to={`/kontrak/${c.id}`} className="block space-y-3 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{c.nama_kontrak}</p>
                        <p className="text-xs text-ink-muted">{c.penyedia}</p>
                      </div>
                      <div className="shrink-0 text-right"><StatusBadge status={c.status} /><RowMeta c={c} /></div>
                    </div>
                    <div className="flex justify-between text-xs text-ink-soft">
                      <span>Berakhir {tanggal(c.tanggal_berakhir, true)}</span>
                      <span className="font-semibold text-ink">{rupiahCompact(c.nilai_kontrak)}</span>
                    </div>
                    <TimeBar progress={c.progress} status={c.status} />
                    <p className="text-xs text-ink-muted">{c.sisa_hari < 0 ? c.sisa_text : `Sisa ${c.sisa_text}`}</p>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 text-sm">
              <label className="flex items-center gap-2 text-ink-muted">
                Tampilkan
                <select value={pageSize} onChange={(e) => update({ page_size: e.target.value })} className="input w-auto cursor-pointer py-1.5">
                  {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
                </select>
                per halaman
              </label>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted">Halaman <span className="font-semibold text-ink">{page}</span> dari {totalPages}</span>
                <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)} className="btn-ghost border border-line bg-fg/[.04] px-2.5" aria-label="Sebelumnya"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) }, false)} className="btn-ghost border border-line bg-fg/[.04] px-2.5" aria-label="Berikutnya"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={doDelete} loading={deleting} danger confirmText="Hapus kontrak"
        title="Hapus kontrak?"
        message={<>Kontrak <b className="text-ink">{toDelete?.nama_kontrak}</b> beserta file-nya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</>} />
    </div>
  )
}

function MoneyInput({ value, onCommit, placeholder }: { value: string; onCommit: (v: string) => void; placeholder: string }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <input inputMode="numeric" className="input tabular" placeholder={placeholder} aria-label={placeholder}
      value={v ? Number(v).toLocaleString('id-ID') : ''}
      onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 16))}
      onBlur={() => v !== value && onCommit(v)}
      onKeyDown={(e) => e.key === 'Enter' && onCommit(v)} />
  )
}

/** Info kecil di bawah badge: tahap proses perpanjangan & jumlah addendum. */
function RowMeta({ c }: { c: Contract }) {
  const parts: string[] = []
  if (c.status_proses === 'proses') parts.push('Sedang diproses')
  if (c.addendum.length) parts.push(`Addendum ${c.addendum.length}×`)
  if (!parts.length) return null
  return <p className={clsx('mt-1 whitespace-nowrap text-[11px]', c.status_proses === 'proses' ? 'text-accent' : 'text-ink-faint')}>{parts.join(' · ')}</p>
}
