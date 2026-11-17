import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  AlertCircle, ArrowLeft, ArrowRight, Ban, Bell, Circle, Download, ExternalLink, FilePlus2, FileText, FileX2, History,
  Hourglass, Paperclip, Pencil, RefreshCw, Trash2,
} from 'lucide-react'
import clsx from 'clsx'
import { ConfirmDialog, Modal, Skeleton, Spinner, StatusBadge } from '../components/ui'
import { notifyContractsChanged } from '../components/NotificationBell'
import { useToast } from '../context/ToastContext'
import { api, downloadBlob, errMsg } from '../lib/api'
import { fileSize, parseDate, rupiah, tanggal, waktuRelatif } from '../lib/format'
import type { Addendum, Contract, StatusProses } from '../lib/types'

const PROSES: { v: StatusProses; label: string; desc: string; icon: typeof Circle; tone: string }[] = [
  { v: 'belum', label: 'Belum diproses', desc: 'Belum ada tindak lanjut', icon: Circle, tone: 'text-ink-muted' },
  { v: 'proses', label: 'Sedang diproses', desc: 'Negosiasi / menunggu persetujuan', icon: Hourglass, tone: 'text-champagne' },
  { v: 'diperpanjang', label: 'Sudah diperpanjang', desc: 'Addendum menyusul · reminder berhenti', icon: RefreshCw, tone: 'text-status-renew' },
  { v: 'tidak_diperpanjang', label: 'Tidak diperpanjang', desc: 'Kontrak diselesaikan · reminder berhenti', icon: Ban, tone: 'text-status-off' },
]

const ALLOWED = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
const MAX_MB = 20

/** Selisih dua tanggal sebagai teks pendek, mis. "+12 bulan" atau "+20 hari". */
function tambahDurasi(dari: string, ke: string) {
  const hari = Math.round((parseDate(ke).getTime() - parseDate(dari).getTime()) / 86400000)
  const bulan = Math.round(hari / 30.44)
  return bulan >= 1 ? `+${bulan} bulan` : `+${hari} hari`
}

export default function ContractDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const root = useRef<HTMLDivElement>(null)
  const [c, setC] = useState<Contract | null>(null)
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [proses, setProses] = useState<StatusProses>('belum')
  const [catatanProses, setCatatanProses] = useState('')
  const [savingProses, setSavingProses] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [delAdd, setDelAdd] = useState<Addendum | null>(null)

  useEffect(() => {
    if (!c) return
    setProses(c.status_proses)
    setCatatanProses(c.catatan_proses ?? '')
  }, [c])

  useEffect(() => {
    api.get<Contract>(`/api/contracts/${id}`).then((r) => setC(r.data))
      .catch((e) => { toast('error', 'Kontrak tidak ditemukan', errMsg(e)); nav('/kontrak') })
  }, [id, nav, toast])

  // Pratinjau file (pakai blob supaya token ikut terkirim)
  useEffect(() => {
    if (!c?.has_file) return
    const ext = (c.file_name ?? '').split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) return
    let url = ''
    setPreviewLoading(true)
    api.get(`/api/contracts/${c.id}/file`, { responseType: 'blob' })
      .then((r) => { url = URL.createObjectURL(r.data); setPreview({ url, type: ext === 'pdf' ? 'pdf' : 'img' }) })
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [c?.id, c?.has_file, c?.file_name])

  useGSAP(() => {
    if (!c) return
    gsap.fromTo('.reveal', { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.75, ease: 'power3.out', stagger: 0.08 })
    gsap.fromTo('.tl-fill', { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'power3.inOut', delay: 0.3 })
    gsap.fromTo('.tl-dot', { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', delay: 1.2 })
  }, { scope: root, dependencies: [c?.id] })

  if (!c) return <div className="space-y-6"><Skeleton className="h-64" /><Skeleton className="h-96" /></div>

  const prosesDirty = proses !== c.status_proses || catatanProses.trim() !== (c.catatan_proses ?? '')

  const saveProses = async () => {
    setSavingProses(true)
    try {
      const { data } = await api.patch<Contract>(`/api/contracts/${c.id}/proses`, { status_proses: proses, catatan_proses: catatanProses.trim() || null })
      setC(data)
      notifyContractsChanged()
      toast('success', `Proses: ${data.status_proses_label}`,
        data.status_proses === 'diperpanjang' ? 'Jangan lupa catat addendum supaya tanggal akhir diperbarui.'
          : data.status_proses === 'tidak_diperpanjang' ? 'Kontrak ini tidak akan diingatkan lagi.' : undefined)
    } catch (e) {
      toast('error', 'Gagal memperbarui proses', errMsg(e))
    } finally {
      setSavingProses(false)
    }
  }

  const doDeleteAddendum = async () => {
    if (!delAdd) return
    setBusy(true)
    try {
      const { data } = await api.delete<Contract>(`/api/contracts/${c.id}/addendum/${delAdd.id}`)
      setC(data)
      notifyContractsChanged()
      toast('success', `Addendum ke-${delAdd.urutan} dihapus`, `Tanggal akhir kembali ke ${tanggal(data.tanggal_berakhir)}.`)
      setDelAdd(null)
    } catch (e) {
      toast('error', 'Gagal menghapus addendum', errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const downloadAddendum = (a: Addendum) =>
    downloadBlob(`/api/contracts/${c.id}/addendum/${a.id}/file`, { inline: false }, a.file_name ?? `addendum-${a.urutan}`)
      .catch((e) => toast('error', 'Gagal mengunduh', errMsg(e)))

  // Riwayat masa kontrak: PKS awal lalu tiap addendum
  const first = c.addendum[0]
  const lastAddId = c.addendum[c.addendum.length - 1]?.id

  const doDelete = async () => {
    setBusy(true)
    try {
      await api.delete(`/api/contracts/${c.id}`)
      notifyContractsChanged()
      toast('success', 'Kontrak dihapus')
      nav('/kontrak')
    } catch (e) {
      toast('error', 'Gagal menghapus', errMsg(e))
      setBusy(false)
    }
  }

  const download = () => downloadBlob(`/api/contracts/${c.id}/file`, { inline: false }, c.file_name ?? 'kontrak').catch((e) => toast('error', 'Gagal mengunduh', errMsg(e)))

  // Posisi titik reminder (3 bulan sebelum berakhir) pada garis waktu
  const start = parseDate(c.tanggal_mulai ?? c.tanggal_pks).getTime()
  const end = parseDate(c.tanggal_berakhir).getTime()
  const rem = new Date(parseDate(c.tanggal_berakhir)); rem.setMonth(rem.getMonth() - 3)
  const remPct = Math.max(0, Math.min(100, ((rem.getTime() - start) / (end - start)) * 100))
  const bigNumber = c.sisa_hari >= 0 ? c.sisa_hari : -c.sisa_hari

  return (
    <div ref={root} className="space-y-6">
      <Link to="/kontrak" className="reveal inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Cek Kontrak
      </Link>

      {/* ---------- Header ---------- */}
      <section className="reveal card-dark noise p-7 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-champagne/15" />
        <div className="relative flex flex-wrap items-start justify-between gap-8">
          <div className="min-w-0 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={c.status} />
              <span className="text-xs text-ink/45">PKS {c.nomor_pks}</span>
            </div>
            <h2 className="mt-4 font-semibold tracking-tight text-[40px] leading-[1.08] text-ink sm:text-[48px]">{c.nama_kontrak}</h2>
            <p className="mt-2 text-ink/60">{c.penyedia}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link to={`/kontrak/${c.id}/edit`} className="btn-gold"><Pencil className="h-4 w-4" /> Edit</Link>
              <button onClick={() => setAddOpen(true)} className="btn border border-champagne/40 text-champagne hover:bg-champagne/10">
                <FilePlus2 className="h-4 w-4" /> Catat perpanjangan (addendum)
              </button>
              <button onClick={() => setConfirmDel(true)} className="btn text-ink/60 hover:bg-white/5 hover:text-[#F2B8B2]"><Trash2 className="h-4 w-4" /> Hapus</button>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm text-champagne">{c.sisa_hari < 0 ? 'Sudah lewat' : 'Sisa waktu'}</p>
            <p className={clsx('font-semibold tracking-tight text-[88px] leading-none tabular', c.status === 'berakhir' ? 'text-[#F2B8B2]' : c.status === 'segera_habis' ? 'gold-text' : 'text-ink')}>
              {bigNumber}
            </p>
            <p className="text-sm text-ink/55">hari · {c.sisa_text}</p>
          </div>
        </div>

        {/* Garis waktu */}
        <div className="relative mt-10">
          <div className="relative h-2 rounded-full bg-white/10">
            <div className="absolute inset-y-0 right-0 rounded-r-full bg-status-warn/35" style={{ left: `${remPct}%` }} />
            <div className="tl-fill absolute inset-y-0 left-0 origin-left rounded-full bg-gradient-to-r from-champagne-600 to-champagne-300" style={{ width: `${c.progress}%` }} />
            <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2" style={{ left: `${c.progress}%` }}><span className="tl-dot block h-4 w-4 rounded-full border-[3px] border-midnight bg-champagne shadow-gold" /></span>
          </div>
          <div className="mt-4 grid grid-cols-3 text-xs">
            <div><p className="text-ink/40">{c.tanggal_mulai ? 'Awal kontrak' : 'Tanggal PKS'}</p><p className="mt-0.5 font-semibold text-ink">{tanggal(c.tanggal_mulai ?? c.tanggal_pks)}</p></div>
            <div className="text-center"><p className="flex items-center justify-center gap-1.5 text-status-warn/90"><Bell className="h-3 w-3" /> Mulai reminder</p><p className="mt-0.5 font-semibold text-ink">{tanggal(`${rem.getFullYear()}-${String(rem.getMonth() + 1).padStart(2, '0')}-${String(rem.getDate()).padStart(2, '0')}`)}</p></div>
            <div className="text-right"><p className="text-ink/40">Akhir kontrak</p><p className="mt-0.5 font-semibold text-ink">{tanggal(c.tanggal_berakhir)}</p></div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* ---------- Proses perpanjangan ---------- */}
        <section className="reveal card p-7 lg:col-span-5">
          <p className="eyebrow text-champagne-600">Perpanjangan</p>
          <h3 className="mt-1 font-semibold tracking-tight text-[19px] text-ink">Proses masa kontrak ini</h3>
          <p className="mt-1 text-sm text-ink-muted">Tandai tahap tindak lanjut menjelang kontrak berakhir.</p>
          <div className="mt-5 space-y-2" role="radiogroup" aria-label="Tahap proses perpanjangan">
            {PROSES.map((p) => {
              const on = proses === p.v
              const Icon = p.icon
              return (
                <button key={p.v} type="button" role="radio" aria-checked={on} onClick={() => setProses(p.v)}
                  className={clsx('flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                    on ? 'border-champagne/50 bg-champagne/[.08]' : 'border-white/[.06] bg-white/[.02] hover:border-white/[.14] hover:bg-white/[.04]')}>
                  <Icon className={clsx('h-4 w-4 shrink-0', on ? p.tone : 'text-ink-faint')} />
                  <span className="min-w-0 flex-1">
                    <span className={clsx('block text-sm font-semibold', on ? 'text-ink' : 'text-ink-soft')}>{p.label}</span>
                    <span className="block text-xs text-ink-muted">{p.desc}</span>
                  </span>
                  <span className={clsx('h-4 w-4 shrink-0 rounded-full border-2', on ? 'border-champagne bg-champagne shadow-[inset_0_0_0_3px_#0E1526]' : 'border-white/20')} />
                </button>
              )
            })}
          </div>
          <label className="label mt-5" htmlFor="catatan-proses">Catatan proses <span className="font-normal text-ink-faint">(opsional)</span></label>
          <textarea id="catatan-proses" rows={3} className="input resize-y" value={catatanProses} onChange={(e) => setCatatanProses(e.target.value)}
            placeholder="Contoh: Nota dinas perpanjangan sudah dikirim ke Direksi, menunggu disposisi" />
          {proses === 'diperpanjang' && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-status-renew/25 bg-status-renewBg p-4 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-renew" />
              <div className="min-w-0 flex-1 text-ink-soft">
                Kalau addendum sudah ada, langsung <b className="text-ink">catat addendum</b> saja. Tanggal akhir diperbarui dan reminder aktif lagi untuk masa baru.
                <button type="button" onClick={() => setAddOpen(true)} className="mt-2 flex items-center gap-1.5 font-semibold text-status-renew hover:underline">
                  Catat addendum sekarang <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-faint">Saat ini: <span className="text-ink-soft">{c.status_proses_label}</span></p>
            <button type="button" onClick={saveProses} disabled={!prosesDirty || savingProses} className="btn-primary">
              {savingProses ? <><Spinner /> Menyimpan…</> : 'Simpan proses'}
            </button>
          </div>
        </section>

        {/* ---------- Riwayat addendum ---------- */}
        <section className="reveal card p-7 lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-champagne-600">Riwayat</p>
              <h3 className="mt-1 font-semibold tracking-tight text-[19px] text-ink">Masa kontrak & addendum</h3>
            </div>
            <button onClick={() => setAddOpen(true)} className="btn-outline shrink-0 text-[13px]"><FilePlus2 className="h-4 w-4" /> Addendum</button>
          </div>

          <ol className="relative mt-6 space-y-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-white/[.08]">
            <li className="relative flex gap-4">
              <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[.1] bg-[#0E1526] text-ink-muted"><FileText className="h-3.5 w-3.5" /></span>
              <div className="min-w-0 flex-1 rounded-2xl border border-white/[.05] bg-white/[.02] p-4">
                <p className="text-sm font-semibold text-ink">PKS awal <span className="font-normal text-ink-muted">· {c.nomor_pks}</span></p>
                <p className="mt-1 text-xs text-ink-muted">
                  {tanggal(c.tanggal_mulai ?? c.tanggal_pks)} – {tanggal(first?.tanggal_akhir_lama ?? c.tanggal_berakhir)} · {rupiah(first?.nilai_lama ?? c.nilai_kontrak)}
                </p>
              </div>
            </li>
            {c.addendum.map((a) => (
              <li key={a.id} className="relative flex gap-4">
                <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-champagne/40 bg-[#0E1526] text-[11px] font-bold text-champagne">{a.urutan}</span>
                <div className="min-w-0 flex-1 rounded-2xl border border-white/[.05] bg-white/[.02] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">Addendum ke-{a.urutan} <span className="font-normal text-ink-muted">· {a.nomor}</span></p>
                      <p className="text-xs text-ink-faint">Tanggal addendum {tanggal(a.tanggal)}{a.created_by ? ` · dicatat oleh ${a.created_by}` : ''}</p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {a.has_file && <button onClick={() => downloadAddendum(a)} className="rounded-lg p-2 text-ink-muted hover:bg-white/[.05] hover:text-ink" title={`Unduh ${a.file_name}`}><Download className="h-4 w-4" /></button>}
                      {a.id === lastAddId && <button onClick={() => setDelAdd(a)} className="rounded-lg p-2 text-ink-muted hover:bg-status-endBg hover:text-status-end" title="Hapus addendum"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="text-ink-muted">{tanggal(a.tanggal_akhir_lama)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-champagne" />
                    <span className="font-semibold text-ink">{tanggal(a.tanggal_akhir_baru)}</span>
                    <span className="rounded-full bg-status-renewBg px-2 py-0.5 text-[11px] font-semibold text-status-renew">{tambahDurasi(a.tanggal_akhir_lama, a.tanggal_akhir_baru)}</span>
                  </div>
                  {a.nilai_baru !== a.nilai_lama && (
                    <p className="mt-1 text-xs text-ink-muted">Nilai {rupiah(a.nilai_lama)} → <span className="font-semibold text-ink-soft">{rupiah(a.nilai_baru)}</span></p>
                  )}
                  {a.catatan && <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink-soft">{a.catatan}</p>}
                  {a.has_file && <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-ink-faint"><Paperclip className="h-3 w-3 shrink-0" /> {a.file_name}</p>}
                </div>
              </li>
            ))}
          </ol>
          {c.addendum.length === 0 && (
            <p className="mt-5 flex items-center gap-2 rounded-2xl border border-dashed border-white/[.1] px-4 py-3 text-sm text-ink-muted">
              <History className="h-4 w-4 shrink-0" /> Belum ada addendum. Perpanjangan yang dicatat akan muncul di sini.
            </p>
          )}
        </section>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* ---------- Info ---------- */}
        <section className="reveal card p-7 lg:col-span-5">
          <p className="eyebrow text-champagne-600">Rincian</p>
          <h3 className="mt-1 font-semibold tracking-tight text-[19px] text-ink">Data kontrak</h3>
          <dl className="mt-6 divide-y divide-white/[.06] text-sm">
            {[
              ['Nama kontrak', c.nama_kontrak],
              ['Penyedia', c.penyedia],
              ['Nomor PKS', c.nomor_pks],
              ['Tanggal PKS', tanggal(c.tanggal_pks)],
              ['Tanggal awal kontrak', c.tanggal_mulai ? tanggal(c.tanggal_mulai) : '-'],
              ['Tanggal akhir kontrak', tanggal(c.tanggal_berakhir)],
              ['Nilai kontrak', rupiah(c.nilai_kontrak)],
              ['Sisa kontrak', c.sisa_text],
              ['Diinput oleh', c.created_by ?? '-'],
              ['Terakhir diubah', waktuRelatif(c.updated_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 py-3.5">
                <dt className="shrink-0 text-ink-muted">{k}</dt>
                <dd className="text-right font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          {([
            ['Critical pengesahan kontrak', c.critical_pengesahan],
            ['Denda', c.denda],
            ['Jaminan kontrak', c.jaminan_kontrak],
            ['Keterangan', c.keterangan],
          ] as const).filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="mt-5 rounded-2xl bg-white/[.03] p-4">
              <p className="eyebrow text-ink-faint">{k}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{v}</p>
            </div>
          ))}
        </section>

        {/* ---------- File ---------- */}
        <section className="reveal card overflow-hidden lg:col-span-7">
          <div className="flex items-center justify-between gap-4 border-b border-white/[.07] px-7 py-5">
            <div className="min-w-0">
              <p className="eyebrow text-champagne-600">Dokumen</p>
              <p className="mt-1 truncate font-semibold text-ink">{c.file_name ?? 'Belum ada file'}</p>
              {c.file_size && <p className="text-xs text-ink-muted">{fileSize(c.file_size)}</p>}
            </div>
            {c.has_file && (
              <div className="flex shrink-0 gap-2">
                {preview && <a href={preview.url} target="_blank" rel="noreferrer" className="btn-ghost border border-white/[.07]" title="Buka di tab baru"><ExternalLink className="h-4 w-4" /></a>}
                <button onClick={download} className="btn-outline"><Download className="h-4 w-4" /> Unduh</button>
              </div>
            )}
          </div>
          <div className="bg-black/20">
            {!c.has_file ? (
              <div className="flex flex-col items-center py-20 text-center">
                <FileX2 className="h-10 w-10 text-champagne-500" strokeWidth={1.3} />
                <p className="mt-4 font-semibold tracking-tight text-2xl text-ink">File belum diunggah</p>
                <p className="mt-1 text-sm text-ink-muted">Tambahkan file PKS lewat menu edit.</p>
                <Link to={`/kontrak/${c.id}/edit`} className="btn-primary mt-6">Unggah file</Link>
              </div>
            ) : previewLoading ? (
              <div className="grid h-[560px] place-items-center"><Spinner className="h-6 w-6 text-champagne-600" /></div>
            ) : preview?.type === 'pdf' ? (
              <iframe src={preview.url} title="Pratinjau kontrak" className="h-[640px] w-full" />
            ) : preview?.type === 'img' ? (
              <img src={preview.url} alt={c.file_name ?? 'File kontrak'} className="mx-auto max-h-[640px] object-contain p-6" />
            ) : (
              <div className="flex flex-col items-center py-20 text-center">
                <FileText className="h-10 w-10 text-champagne-500" strokeWidth={1.3} />
                <p className="mt-4 text-sm text-ink-muted">Pratinjau tidak tersedia untuk file Word. Silakan unduh.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={doDelete} loading={busy} danger confirmText="Hapus kontrak"
        title="Hapus kontrak?" message={<>Kontrak <b className="text-ink">{c.nama_kontrak}</b> beserta file dan riwayat addendum-nya akan dihapus permanen.</>} />
      <ConfirmDialog open={!!delAdd} onClose={() => setDelAdd(null)} onConfirm={doDeleteAddendum} loading={busy} danger confirmText="Hapus addendum"
        title={`Hapus addendum ke-${delAdd?.urutan ?? ''}?`}
        message={delAdd && <>Tanggal akhir kontrak akan dikembalikan ke <b className="text-ink">{tanggal(delAdd.tanggal_akhir_lama)}</b> dan nilai ke <b className="text-ink">{rupiah(delAdd.nilai_lama)}</b>. File addendum ikut dihapus.</>} />
      <AddendumModal c={c} open={addOpen} onClose={() => setAddOpen(false)}
        onSaved={(data) => {
          setC(data)
          setAddOpen(false)
          notifyContractsChanged()
          const a = data.addendum[data.addendum.length - 1]
          toast('success', `Addendum ke-${a?.urutan} dicatat`, `Tanggal akhir kini ${tanggal(data.tanggal_berakhir)}. Reminder aktif lagi untuk masa baru.`)
        }} />
    </div>
  )
}

/* ---------- Form catat addendum ---------- */
function AddendumModal({ c, open, onClose, onSaved }: { c: Contract; open: boolean; onClose: () => void; onSaved: (c: Contract) => void }) {
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [nomor, setNomor] = useState('')
  const [tgl, setTgl] = useState('')
  const [akhir, setAkhir] = useState('')
  const [nilai, setNilai] = useState('')
  const [catatan, setCatatan] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNomor(''); setTgl(''); setAkhir(''); setNilai(String(c.nilai_kontrak)); setCatatan(''); setFile(null); setErrors({})
  }, [open, c.nilai_kontrak])

  const pickFile = (fl: File | undefined) => {
    if (!fl) return
    const ext = '.' + (fl.name.split('.').pop() ?? '').toLowerCase()
    if (!ALLOWED.includes(ext)) return setErrors((e) => ({ ...e, file: 'Format harus PDF, DOC, DOCX, JPG, atau PNG' }))
    if (fl.size > MAX_MB * 1024 * 1024) return setErrors((e) => ({ ...e, file: `Ukuran maksimal ${MAX_MB} MB` }))
    setErrors((e) => ({ ...e, file: '' }))
    setFile(fl)
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!nomor.trim()) e.nomor = 'Nomor addendum wajib diisi'
    if (!tgl) e.tgl = 'Pilih tanggal addendum'
    if (!akhir) e.akhir = 'Pilih tanggal akhir baru'
    else if (akhir <= c.tanggal_berakhir) e.akhir = `Harus setelah ${tanggal(c.tanggal_berakhir)}`
    setErrors(e)
    if (Object.values(e).some(Boolean)) return
    const fd = new FormData()
    fd.append('nomor', nomor.trim())
    fd.append('tanggal', tgl)
    fd.append('tanggal_akhir_baru', akhir)
    if (nilai) fd.append('nilai_baru', nilai)
    if (catatan.trim()) fd.append('catatan', catatan.trim())
    if (file) fd.append('file', file)
    setSaving(true)
    try {
      const { data } = await api.post<Contract>(`/api/contracts/${c.id}/addendum`, fd)
      onSaved(data)
    } catch (err) {
      toast('error', 'Gagal mencatat addendum', errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const errText = (k: string) => errors[k] && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-status-end"><AlertCircle className="h-3.5 w-3.5" />{errors[k]}</p>
  const ke = c.addendum.length + 1

  return (
    <Modal open={open} onClose={onClose} title={`Catat addendum ke-${ke}`} width="max-w-xl"
      subtitle={`Tanggal akhir saat ini ${tanggal(c.tanggal_berakhir)}. Setelah disimpan, tanggal akhir & nilai kontrak diperbarui.`}>
      <form onSubmit={submit} noValidate className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="add-nomor">Nomor addendum</label>
          <input id="add-nomor" className={clsx('input', errors.nomor && 'input-error')} value={nomor} onChange={(e) => setNomor(e.target.value)}
            placeholder={`Contoh: ADD-${ke}/${c.nomor_pks}`} />
          {errText('nomor')}
        </div>
        <div>
          <label className="label" htmlFor="add-tgl">Tanggal addendum</label>
          <input id="add-tgl" type="date" className={clsx('input', errors.tgl && 'input-error')} value={tgl} onChange={(e) => setTgl(e.target.value)} />
          {errText('tgl')}
        </div>
        <div>
          <label className="label" htmlFor="add-akhir">Tanggal akhir baru</label>
          <input id="add-akhir" type="date" min={c.tanggal_berakhir} className={clsx('input', errors.akhir && 'input-error')} value={akhir} onChange={(e) => setAkhir(e.target.value)} />
          {errors.akhir ? errText('akhir') : akhir > c.tanggal_berakhir && <p className="hint">{tambahDurasi(c.tanggal_berakhir, akhir)} dari tanggal akhir sekarang</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="add-nilai">Nilai kontrak setelah addendum</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">Rp</span>
            <input id="add-nilai" inputMode="numeric" className="input pl-11 tabular" placeholder="0"
              value={nilai ? Number(nilai).toLocaleString('id-ID') : ''}
              onChange={(e) => setNilai(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 16))} />
          </div>
          <p className="hint">{Number(nilai) === c.nilai_kontrak ? 'Sama dengan nilai sekarang. Ubah kalau nilainya ikut berubah.' : `Sebelumnya ${rupiah(c.nilai_kontrak)}`}</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="add-catatan">Catatan <span className="font-normal text-ink-faint">(opsional)</span></label>
          <textarea id="add-catatan" rows={2} className="input resize-y" value={catatan} onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: Perpanjangan 12 bulan, harga satuan tetap" />
        </div>
        <div className="sm:col-span-2">
          <p className="label">File addendum <span className="font-normal text-ink-faint">(opsional)</span></p>
          <div className="flex items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.03] p-3">
            <Paperclip className="h-4 w-4 shrink-0 text-champagne" />
            <p className="min-w-0 flex-1 truncate text-sm text-ink-soft">{file ? `${file.name} · ${fileSize(file.size)}` : 'Belum ada file'}</p>
            {file && <button type="button" className="btn-ghost text-[13px]" onClick={() => setFile(null)}>Batal</button>}
            <button type="button" className="btn-outline text-[13px]" onClick={() => fileInput.current?.click()}>{file ? 'Ganti' : 'Pilih file'}</button>
          </div>
          {errText('file')}
          <input ref={fileInput} type="file" accept={ALLOWED.join(',')} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
        </div>
        <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <><Spinner /> Menyimpan…</> : 'Simpan addendum'}</button>
        </div>
      </form>
    </Modal>
  )
}
