import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { AlertCircle, ArrowLeft, Building2, CalendarRange, CheckCircle2, FileText, Hourglass, Paperclip, ShieldCheck, Trash2, UploadCloud, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { Skeleton, Spinner, StatusBadge } from '../components/ui'
import { notifyContractsChanged } from '../components/NotificationBell'
import { useToast } from '../context/ToastContext'
import { api, errMsg } from '../lib/api'
import { fileSize, parseDate, rupiah, rupiahCompact, sisaWaktu, tanggal } from '../lib/format'
import type { Contract, Status } from '../lib/types'

const ALLOWED = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
const MAX_MB = 20

interface FormState {
  nama_kontrak: string
  penyedia: string
  nomor_pks: string
  tanggal_pks: string
  tanggal_mulai: string
  tanggal_berakhir: string
  nilai_kontrak: string // digit saja
  critical_pengesahan: string
  denda: string
  jaminan_kontrak: string
  keterangan: string
}
const EMPTY: FormState = {
  nama_kontrak: '', penyedia: '', nomor_pks: '', tanggal_pks: '', tanggal_mulai: '', tanggal_berakhir: '', nilai_kontrak: '',
  critical_pengesahan: '', denda: '', jaminan_kontrak: '', keterangan: '',
}

function predictStatus(berakhir: string): Status | null {
  if (!berakhir) return null
  const { hari } = sisaWaktu(berakhir)
  if (hari < 0) return 'berakhir'
  const now = new Date()
  const batas = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
  return parseDate(berakhir) <= batas ? 'segera_habis' : 'aktif'
}

function Section({ icon, title, desc, children }: { icon: ReactNode; title: string; desc: string; children: ReactNode }) {
  return (
    <section className="reveal card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-champagne/40 bg-champagne/[.08] text-champagne-700">{icon}</span>
        <div>
          <h3 className="font-semibold tracking-tight text-[18px] leading-tight text-ink">{title}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">{desc}</p>
        </div>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({ label, error, hint, className, children, htmlFor }: { label: string; error?: string; hint?: string; className?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <p className="mt-1.5 flex items-center gap-1.5 text-xs text-status-end"><AlertCircle className="h-3.5 w-3.5" />{error}</p>
        : hint ? <p className="hint">{hint}</p> : null}
    </div>
  )
}

export default function ContractForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const nav = useNavigate()
  const toast = useToast()
  const root = useRef<HTMLFormElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const [f, setF] = useState<FormState>(EMPTY)
  const [file, setFile] = useState<File | null>(null)
  const [existing, setExisting] = useState<Contract | null>(null)
  const [hapusFile, setHapusFile] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'file', string>>>({})
  const [penyediaList, setPenyediaList] = useState<string[]>([])
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [drag, setDrag] = useState(false)

  useEffect(() => {
    api.get('/api/contracts/options').then((r) => setPenyediaList(r.data.penyedia)).catch(() => {})
    if (!id) return
    api.get<Contract>(`/api/contracts/${id}`)
      .then(({ data: c }) => {
        setExisting(c)
        setF({
          nama_kontrak: c.nama_kontrak, penyedia: c.penyedia, nomor_pks: c.nomor_pks, tanggal_pks: c.tanggal_pks, tanggal_mulai: c.tanggal_mulai ?? '',
          tanggal_berakhir: c.tanggal_berakhir, nilai_kontrak: String(c.nilai_kontrak),
          critical_pengesahan: c.critical_pengesahan ?? '', denda: c.denda ?? '', jaminan_kontrak: c.jaminan_kontrak ?? '',
          keterangan: c.keterangan ?? '',
        })
      })
      .catch((e) => { toast('error', 'Kontrak tidak ditemukan', errMsg(e)); nav('/kontrak') })
      .finally(() => setLoading(false))
  }, [id, nav, toast])

  useGSAP(() => {
    if (loading) return
    gsap.fromTo('.reveal', { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08 })
  }, { scope: root, dependencies: [loading] })

  const set = (k: keyof FormState, v: string) => {
    setF((s) => ({ ...s, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const sisa = f.tanggal_berakhir ? sisaWaktu(f.tanggal_berakhir) : null
  const status = useMemo(() => predictStatus(f.tanggal_berakhir), [f.tanggal_berakhir])
  const awal = f.tanggal_mulai || f.tanggal_pks
  const durasi = awal && f.tanggal_berakhir && f.tanggal_berakhir > awal
    ? Math.round((parseDate(f.tanggal_berakhir).getTime() - parseDate(awal).getTime()) / 86400000) : null

  const pickFile = (fl: File | undefined | null) => {
    if (!fl) return
    const ext = '.' + (fl.name.split('.').pop() ?? '').toLowerCase()
    if (!ALLOWED.includes(ext)) return setErrors((e) => ({ ...e, file: 'Format harus PDF, DOC, DOCX, JPG, atau PNG' }))
    if (fl.size > MAX_MB * 1024 * 1024) return setErrors((e) => ({ ...e, file: `Ukuran maksimal ${MAX_MB} MB` }))
    setErrors((e) => ({ ...e, file: undefined }))
    setFile(fl)
    setHapusFile(false)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    pickFile(e.dataTransfer.files?.[0])
  }

  const checkPks = async () => {
    if (!f.nomor_pks.trim()) return
    try {
      const { data } = await api.get('/api/contracts/check-pks', { params: { nomor: f.nomor_pks, exclude_id: id } })
      if (!data.tersedia) setErrors((e) => ({ ...e, nomor_pks: 'Nomor PKS ini sudah terdaftar' }))
    } catch { /* abaikan */ }
  }

  const validate = () => {
    const e: typeof errors = {}
    if (f.nama_kontrak.trim().length < 2) e.nama_kontrak = 'Nama kontrak wajib diisi'
    if (f.penyedia.trim().length < 2) e.penyedia = 'Nama penyedia wajib diisi'
    if (!f.nomor_pks.trim()) e.nomor_pks = 'Nomor PKS wajib diisi'
    else if (errors.nomor_pks) e.nomor_pks = errors.nomor_pks
    if (!f.tanggal_pks) e.tanggal_pks = 'Pilih tanggal PKS'
    if (!f.tanggal_mulai) e.tanggal_mulai = 'Pilih tanggal awal kontrak'
    if (!f.tanggal_berakhir) e.tanggal_berakhir = 'Pilih tanggal akhir kontrak'
    else if (f.tanggal_mulai && f.tanggal_berakhir <= f.tanggal_mulai) e.tanggal_berakhir = 'Harus setelah tanggal awal kontrak'
    else if (f.tanggal_pks && f.tanggal_berakhir <= f.tanggal_pks) e.tanggal_berakhir = 'Harus setelah tanggal PKS'
    if (!f.nilai_kontrak || Number(f.nilai_kontrak) <= 0) e.nilai_kontrak = 'Isi nilai kontrak'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!validate()) {
      toast('error', 'Periksa kembali isian', 'Ada kolom yang belum lengkap atau salah.')
      root.current?.querySelector('.input-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const fd = new FormData()
    Object.entries(f).forEach(([k, v]) => fd.append(k, v.trim()))
    if (file) fd.append('file', file)
    if (editing && hapusFile) fd.append('hapus_file', 'true')
    setSaving(true)
    try {
      const { data } = editing ? await api.put<Contract>(`/api/contracts/${id}`, fd) : await api.post<Contract>('/api/contracts', fd)
      notifyContractsChanged()
      toast('success', editing ? 'Perubahan disimpan' : 'Kontrak ditambahkan',
        data.status === 'segera_habis' ? `Kontrak ini sisa ${data.sisa_text} — langsung masuk daftar reminder.` : `Sisa kontrak ${data.sisa_text}.`)
      nav(`/kontrak/${data.id}`)
    } catch (e) {
      const msg = errMsg(e)
      if (msg.includes('Nomor PKS')) setErrors((s) => ({ ...s, nomor_pks: msg }))
      toast('error', 'Gagal menyimpan', msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="grid gap-6 lg:grid-cols-12"><Skeleton className="h-96 lg:col-span-8" /><Skeleton className="h-96 lg:col-span-4" /></div>

  const err = (k: keyof FormState) => clsx('input', errors[k] && 'input-error')
  const showExisting = editing && existing?.has_file && !file && !hapusFile

  return (
    <form ref={root} onSubmit={submit} noValidate className="grid items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <Link to={editing ? `/kontrak/${id}` : '/kontrak'} className="reveal inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {editing ? 'Kembali ke detail' : 'Kembali ke daftar'}
        </Link>

        <Section icon={<Building2 className="h-5 w-5" strokeWidth={1.6} />} title="Identitas kontrak" desc="Nama pekerjaan dan pihak penyedia.">
          <Field label="Nama kontrak" error={errors.nama_kontrak} className="sm:col-span-2" htmlFor="nama">
            <input id="nama" className={err('nama_kontrak')} value={f.nama_kontrak} onChange={(e) => set('nama_kontrak', e.target.value)}
              placeholder="Contoh: Jasa Kebersihan Gedung Kantor Pusat" />
          </Field>
          <Field label="Penyedia" error={errors.penyedia} hint="Ketik nama baru atau pilih dari saran" className="sm:col-span-2" htmlFor="penyedia">
            <input id="penyedia" list="penyedia-list" className={err('penyedia')} value={f.penyedia} onChange={(e) => set('penyedia', e.target.value)}
              placeholder="Contoh: PT Prima Bersih Nusantara" />
            <datalist id="penyedia-list">{penyediaList.map((p) => <option key={p} value={p} />)}</datalist>
          </Field>
        </Section>

        <Section icon={<CalendarRange className="h-5 w-5" strokeWidth={1.6} />} title="PKS & masa berlaku" desc="Sisa kontrak dihitung otomatis dari tanggal akhir kontrak.">
          <Field label="Nomor PKS" error={errors.nomor_pks} htmlFor="pks">
            <input id="pks" className={err('nomor_pks')} value={f.nomor_pks} onBlur={checkPks}
              onChange={(e) => { set('nomor_pks', e.target.value); setErrors((s) => ({ ...s, nomor_pks: undefined })) }}
              placeholder="Contoh: 012/PKS/BBT/XI/2026" />
          </Field>
          <Field label="Tanggal PKS" error={errors.tanggal_pks} htmlFor="tpks">
            <input id="tpks" type="date" className={err('tanggal_pks')} value={f.tanggal_pks} onChange={(e) => set('tanggal_pks', e.target.value)} />
          </Field>
          <Field label="Tanggal awal kontrak" error={errors.tanggal_mulai} hint="Mulai berlakunya kontrak / pekerjaan" htmlFor="tstart">
            <input id="tstart" type="date" className={err('tanggal_mulai')} value={f.tanggal_mulai} onChange={(e) => set('tanggal_mulai', e.target.value)} />
          </Field>
          <Field label="Tanggal akhir kontrak" error={errors.tanggal_berakhir} hint="Dipakai untuk sisa kontrak & reminder" htmlFor="tend">
            <input id="tend" type="date" min={f.tanggal_mulai || f.tanggal_pks || undefined} className={err('tanggal_berakhir')} value={f.tanggal_berakhir}
              onChange={(e) => set('tanggal_berakhir', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <p className="label">Sisa kontrak <span className="font-normal text-ink-faint">(otomatis)</span></p>
            <div className={clsx('flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
              !sisa ? 'border-dashed border-white/[.12] text-ink-faint'
                : status === 'berakhir' ? 'border-status-end/25 bg-status-endBg text-status-end'
                : status === 'segera_habis' ? 'border-status-warn/25 bg-status-warnBg text-status-warn'
                : 'border-status-aktif/20 bg-status-aktifBg text-status-aktif')}>
              <Hourglass className="h-4 w-4 shrink-0" />
              {sisa ? (
                <span><span className="font-semibold">{sisa.text}</span>
                  {status === 'segera_habis' && ' — langsung masuk daftar reminder'}
                  {status === 'berakhir' && ' — kontrak sudah berakhir'}
                </span>
              ) : 'Isi tanggal akhir kontrak untuk melihat sisa kontrak'}
            </div>
          </div>
        </Section>

        <Section icon={<Wallet className="h-5 w-5" strokeWidth={1.6} />} title="Nilai & dokumen" desc="Nilai dalam Rupiah dan file PKS yang ditandatangani.">
          <Field label="Nilai kontrak" error={errors.nilai_kontrak} hint={f.nilai_kontrak ? `≈ ${rupiahCompact(Number(f.nilai_kontrak))}` : 'Termasuk pajak, sesuai PKS'} className="sm:col-span-2" htmlFor="nilai">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">Rp</span>
              <input id="nilai" inputMode="numeric" className={clsx(err('nilai_kontrak'), 'pl-11 tabular')}
                value={f.nilai_kontrak ? Number(f.nilai_kontrak).toLocaleString('id-ID') : ''}
                onChange={(e) => set('nilai_kontrak', e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 16))} placeholder="0" />
            </div>
          </Field>

          <div className="sm:col-span-2">
            <p className="label">File kontrak <span className="font-normal text-ink-faint">(opsional)</span></p>
            {showExisting ? (
              <div className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-white/[.03] p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-champagne/30 bg-champagne/10 text-champagne"><FileText className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{existing!.file_name}</p>
                  <p className="text-xs text-ink-muted">{fileSize(existing!.file_size)} · file saat ini</p>
                </div>
                <button type="button" className="btn-ghost text-[13px]" onClick={() => fileInput.current?.click()}>Ganti</button>
                <button type="button" className="btn-ghost text-[13px] text-status-end" onClick={() => setHapusFile(true)}><Trash2 className="h-4 w-4" /></button>
              </div>
            ) : file ? (
              <div className="flex items-center gap-4 rounded-2xl border border-champagne/50 bg-champagne/[.08] p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-champagne/30 bg-champagne/10 text-champagne"><CheckCircle2 className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                  <p className="text-xs text-ink-muted">{fileSize(file.size)} · siap diunggah</p>
                </div>
                <button type="button" className="btn-ghost text-[13px]" onClick={() => setFile(null)}>Batal</button>
              </div>
            ) : (
              <div role="button" tabIndex={0} onClick={() => fileInput.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
                className={clsx('flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition',
                  drag ? 'border-champagne bg-champagne/[.08]' : errors.file ? 'border-status-end/50 bg-status-endBg/40' : 'border-white/[.12] hover:border-champagne/70 hover:bg-white/[.05]')}>
                <UploadCloud className={clsx('h-8 w-8 transition', drag ? 'scale-110 text-champagne-600' : 'text-champagne-500')} strokeWidth={1.4} />
                <p className="mt-3 text-sm font-semibold text-ink">Tarik file ke sini atau <span className="text-champagne-700 underline underline-offset-4">pilih file</span></p>
                <p className="mt-1 text-xs text-ink-muted">PDF, DOC, DOCX, JPG, PNG · maks {MAX_MB} MB</p>
                {hapusFile && <p className="mt-2 text-xs text-status-end">File lama akan dihapus saat disimpan</p>}
              </div>
            )}
            {errors.file && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-status-end"><AlertCircle className="h-3.5 w-3.5" />{errors.file}</p>}
            <input ref={fileInput} type="file" accept={ALLOWED.join(',')} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>

        </Section>

        <Section icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.6} />} title="Ketentuan kontrak" desc="Poin penting yang perlu diperhatikan. Semua kolom opsional, ketik bebas.">
          <Field label="Critical pengesahan kontrak" hint="Misal: syarat/tahapan yang harus dipenuhi sebelum kontrak sah" className="sm:col-span-2" htmlFor="critical">
            <textarea id="critical" rows={3} className="input resize-y" value={f.critical_pengesahan} onChange={(e) => set('critical_pengesahan', e.target.value)}
              placeholder="Contoh: Wajib paraf Direktur Keuangan & review Divisi Hukum sebelum tanda tangan" />
          </Field>
          <Field label="Denda" hint="Ketentuan denda keterlambatan / wanprestasi" className="sm:col-span-2" htmlFor="denda">
            <textarea id="denda" rows={3} className="input resize-y" value={f.denda} onChange={(e) => set('denda', e.target.value)}
              placeholder="Contoh: 1‰ dari nilai kontrak per hari keterlambatan, maks. 5%" />
          </Field>
          <Field label="Jaminan kontrak" hint="Jenis, nilai, dan masa berlaku jaminan" className="sm:col-span-2" htmlFor="jaminan">
            <textarea id="jaminan" rows={3} className="input resize-y" value={f.jaminan_kontrak} onChange={(e) => set('jaminan_kontrak', e.target.value)}
              placeholder="Contoh: Jaminan pelaksanaan 5% (Bank Garansi) berlaku s.d. 31 Des 2027" />
          </Field>
          <Field label="Keterangan" hint="Catatan internal lainnya, misal rencana perpanjangan" className="sm:col-span-2" htmlFor="ket">
            <textarea id="ket" rows={3} className="input resize-y" value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)}
              placeholder="Ketik catatan di sini…" />
          </Field>
        </Section>
      </div>

      {/* ---------- Preview ---------- */}
      <aside className="space-y-4 lg:sticky lg:top-[100px] lg:col-span-4">
        <div className="reveal card-dark noise p-7">
          <p className="eyebrow text-champagne">Pratinjau</p>
          <p className={clsx('mt-4 font-semibold tracking-tight text-[28px] leading-tight', f.nama_kontrak ? 'text-ink' : 'text-ink/30')}>
            {f.nama_kontrak || 'Nama kontrak'}
          </p>
          <p className="mt-1 text-sm text-ink/55">{f.penyedia || 'Penyedia'}</p>

          <div className="hairline my-6" />

          <dl className="space-y-3.5 text-sm">
            {[
              ['Nomor PKS', f.nomor_pks || '—'],
              ['Tanggal PKS', f.tanggal_pks ? tanggal(f.tanggal_pks) : '—'],
              ['Awal kontrak', f.tanggal_mulai ? tanggal(f.tanggal_mulai) : '—'],
              ['Akhir kontrak', f.tanggal_berakhir ? tanggal(f.tanggal_berakhir) : '—'],
              ['Durasi', durasi ? `${durasi} hari` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-ink/45">{k}</dt>
                <dd className="truncate text-right font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <p className="text-xs text-champagne">Nilai kontrak</p>
            <p className="mt-1 font-semibold tracking-tight text-3xl text-ink tabular">{f.nilai_kontrak ? rupiah(Number(f.nilai_kontrak)) : 'Rp 0'}</p>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-ink/45">Status nanti</span>
            {status ? <StatusBadge status={status} /> : <span className="text-xs text-ink/30">—</span>}
          </div>
          {(file || showExisting) && (
            <p className="mt-3 flex items-center gap-2 text-xs text-ink/55"><Paperclip className="h-3.5 w-3.5" /> {file?.name ?? existing?.file_name}</p>
          )}
        </div>

        <div className="reveal flex gap-2">
          <Link to={editing ? `/kontrak/${id}` : '/kontrak'} className="btn-ghost flex-1 border border-white/[.07] bg-white/[.04]">Batal</Link>
          <button type="submit" disabled={saving} className="btn-primary h-12 flex-[2]">
            {saving ? <><Spinner /> Menyimpan…</> : editing ? 'Simpan perubahan' : 'Simpan kontrak'}
          </button>
        </div>
      </aside>
    </form>
  )
}
