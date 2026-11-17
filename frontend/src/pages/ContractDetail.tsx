import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ArrowLeft, Bell, Download, ExternalLink, FileText, FileX2, Pencil, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { ConfirmDialog, Skeleton, Spinner, StatusBadge } from '../components/ui'
import { notifyContractsChanged } from '../components/NotificationBell'
import { useToast } from '../context/ToastContext'
import { api, downloadBlob, errMsg } from '../lib/api'
import { fileSize, parseDate, rupiah, tanggal, waktuRelatif } from '../lib/format'
import type { Contract } from '../lib/types'

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

  const toggleRenew = async () => {
    setBusy(true)
    try {
      const { data } = await api.patch<Contract>(`/api/contracts/${c.id}/perpanjang`, { diperpanjang: !c.diperpanjang })
      setC(data)
      notifyContractsChanged()
      toast('success', data.diperpanjang ? 'Ditandai sudah diperpanjang' : 'Tanda perpanjangan dibatalkan',
        data.diperpanjang ? 'Kontrak ini tidak akan diingatkan lagi.' : undefined)
    } catch (e) {
      toast('error', 'Gagal memperbarui', errMsg(e))
    } finally {
      setBusy(false)
    }
  }

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
  const start = parseDate(c.tanggal_pks).getTime()
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
              <button onClick={toggleRenew} disabled={busy} className="btn border border-champagne/40 text-champagne hover:bg-champagne/10">
                {busy ? <Spinner /> : c.diperpanjang ? <RotateCcw className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                {c.diperpanjang ? 'Batalkan tanda perpanjang' : 'Tandai sudah diperpanjang'}
              </button>
              <button onClick={() => setConfirmDel(true)} className="btn text-ink/60 hover:bg-white/5 hover:text-[#F2B8B2]"><Trash2 className="h-4 w-4" /> Hapus</button>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm text-champagne">{c.sisa_hari < 0 ? 'Sudah lewat' : c.diperpanjang ? 'Masa awal sisa' : 'Sisa waktu'}</p>
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
            <div><p className="text-ink/40">Tanggal PKS</p><p className="mt-0.5 font-semibold text-ink">{tanggal(c.tanggal_pks)}</p></div>
            <div className="text-center"><p className="flex items-center justify-center gap-1.5 text-status-warn/90"><Bell className="h-3 w-3" /> Mulai reminder</p><p className="mt-0.5 font-semibold text-ink">{tanggal(`${rem.getFullYear()}-${String(rem.getMonth() + 1).padStart(2, '0')}-${String(rem.getDate()).padStart(2, '0')}`)}</p></div>
            <div className="text-right"><p className="text-ink/40">Berakhir</p><p className="mt-0.5 font-semibold text-ink">{tanggal(c.tanggal_berakhir)}</p></div>
          </div>
        </div>
      </section>

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
              ['Tanggal berakhir', tanggal(c.tanggal_berakhir)],
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
          {c.keterangan && (
            <div className="mt-5 rounded-2xl bg-white/[.03] p-4">
              <p className="eyebrow text-ink-faint">Keterangan</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{c.keterangan}</p>
            </div>
          )}
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
        title="Hapus kontrak?" message={<>Kontrak <b className="text-ink">{c.nama_kontrak}</b> beserta file-nya akan dihapus permanen.</>} />
    </div>
  )
}
