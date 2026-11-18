import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { CheckCircle2, KeyRound, Mail, MailX, Plus, Send, ServerCog, Trash2, UserCheck, UserX, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { ConfirmDialog, Modal, Skeleton, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, errMsg } from '../lib/api'
import { initials, waktuRelatif } from '../lib/format'
import type { Admin } from '../lib/types'

interface ReminderInfo {
  smtp_aktif: boolean
  smtp_host: string | null
  pengirim: string
  bulan_reminder: number
  jam_kirim: string
  riwayat: { waktu: string; status: string; pesan: string; jumlah_kontrak: number; penerima: string }[]
}

export default function Admins() {
  const { admin: me } = useAuth()
  const toast = useToast()
  const root = useRef<HTMLDivElement>(null)
  const [list, setList] = useState<Admin[] | null>(null)
  const [info, setInfo] = useState<ReminderInfo | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [resetFor, setResetFor] = useState<Admin | null>(null)
  const [delFor, setDelFor] = useState<Admin | null>(null)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    api.get<Admin[]>('/api/admins').then((r) => setList(r.data)).catch((e) => toast('error', 'Gagal memuat admin', errMsg(e)))
    api.get<ReminderInfo>('/api/settings/reminder').then((r) => setInfo(r.data)).catch(() => {})
  }, [toast])
  useEffect(load, [load])

  useGSAP(() => {
    if (!list) return
    gsap.fromTo('.reveal', { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07 })
  }, { scope: root, dependencies: [list === null] })

  const patch = async (a: Admin, body: Partial<Admin>, ok: string) => {
    try {
      await api.patch(`/api/admins/${a.id}`, body)
      toast('success', ok)
      load()
    } catch (e) {
      toast('error', 'Gagal memperbarui', errMsg(e))
    }
  }

  const sendNow = async () => {
    setSending(true)
    try {
      const { data } = await api.post('/api/settings/reminder/send-now')
      toast(data.status === 'terkirim' ? 'success' : data.status === 'gagal' ? 'error' : 'info',
        data.status === 'terkirim' ? 'Email reminder terkirim' : data.status === 'gagal' ? 'Email gagal dikirim' : 'Email tidak dikirim', data.pesan)
      load()
    } catch (e) {
      toast('error', 'Gagal', errMsg(e))
    } finally {
      setSending(false)
    }
  }

  const doDelete = async () => {
    if (!delFor) return
    setBusy(true)
    try {
      await api.delete(`/api/admins/${delFor.id}`)
      toast('success', 'Admin dihapus', delFor.nama)
      setDelFor(null)
      load()
    } catch (e) {
      toast('error', 'Gagal menghapus', errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  if (!list) return <div className="grid gap-6 lg:grid-cols-12"><Skeleton className="h-96 lg:col-span-8" /><Skeleton className="h-96 lg:col-span-4" /></div>

  return (
    <div ref={root} className="grid items-start gap-6 lg:grid-cols-12">
      {/* ---------- Daftar admin ---------- */}
      <section className="reveal card overflow-hidden lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
          <div>
            <p className="eyebrow text-champagne-600">Akses panel</p>
            <h3 className="mt-1 font-semibold tracking-tight text-[19px] text-ink">Akun admin</h3>
            <p className="mt-0.5 text-sm text-ink-muted">{list.length} admin · {list.filter((a) => a.is_active).length} aktif</p>
          </div>
          <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Tambah admin</button>
        </div>
        <ul className="divide-y divide-fg/[.06] border-t border-fg/[.07]">
          {list.map((a) => {
            const self = a.id === me?.id
            return (
              <li key={a.id} className={clsx('flex flex-wrap items-center gap-4 px-7 py-4', !a.is_active && 'opacity-60')}>
                <span className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold', a.is_active ? 'bg-gradient-to-br from-champagne/30 to-champagne/5 border border-champagne/30 text-champagne' : 'bg-fg/[.08] text-ink-muted')}>
                  {initials(a.nama)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold text-ink">
                    {a.nama}
                    {self && <span className="rounded-full bg-champagne/[.14] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-champagne-700">Anda</span>}
                    {!a.is_active && <span className="rounded-full bg-fg/[.08] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Nonaktif</span>}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{a.email} · login {a.last_login ? waktuRelatif(a.last_login) : 'belum pernah'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => patch(a, { terima_email: !a.terima_email }, a.terima_email ? 'Email reminder dimatikan' : 'Email reminder dinyalakan')}
                    className={clsx('rounded-lg p-2 transition', a.terima_email ? 'text-status-aktif hover:bg-status-aktifBg' : 'text-ink-faint hover:bg-fg/[.05]')}
                    title={a.terima_email ? 'Menerima email reminder (klik untuk matikan)' : 'Tidak menerima email (klik untuk nyalakan)'}>
                    {a.terima_email ? <Mail className="h-4 w-4" /> : <MailX className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setResetFor(a)} className="rounded-lg p-2 text-ink-muted hover:bg-fg/[.05] hover:text-ink" title="Reset password"><KeyRound className="h-4 w-4" /></button>
                  {!self && (
                    <>
                      <button onClick={() => patch(a, { is_active: !a.is_active }, a.is_active ? 'Admin dinonaktifkan' : 'Admin diaktifkan')}
                        className="rounded-lg p-2 text-ink-muted hover:bg-fg/[.05] hover:text-ink" title={a.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                        {a.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setDelFor(a)} className="rounded-lg p-2 text-ink-muted hover:bg-status-endBg hover:text-status-end" title="Hapus"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ---------- Reminder email ---------- */}
      <aside className="space-y-6 lg:col-span-4">
        <section className="reveal card-dark noise p-7">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-champagne">Reminder email</p>
            <ServerCog className="h-5 w-5 text-champagne/70" strokeWidth={1.5} />
          </div>
          {info ? (
            <>
              <p className={clsx('mt-4 flex items-center gap-2 text-lg font-semibold', info.smtp_aktif ? 'text-ink' : 'text-[#F2D3A0]')}>
                {info.smtp_aktif ? <CheckCircle2 className="h-5 w-5 text-[#8FD3B0]" /> : <XCircle className="h-5 w-5" />}
                {info.smtp_aktif ? 'Email aktif' : 'Email belum diatur'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink/50">
                {info.smtp_aktif ? `Server ${info.smtp_host}` : 'Isi pengaturan SMTP di file backend/.env lalu restart backend.'}
              </p>
              <div className="hairline my-5" />
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-ink/45">Kirim tiap hari</dt><dd className="text-ink">{info.jam_kirim}</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">Batas reminder</dt><dd className="text-ink">≤ {info.bulan_reminder} bulan</dd></div>
                <div className="flex justify-between"><dt className="text-ink/45">Tahap kirim</dt><dd className="text-ink">3 bln · 30 hr · 7 hr</dd></div>
              </dl>
              <button onClick={sendNow} disabled={sending} className="btn-gold mt-6 w-full">
                {sending ? <Spinner /> : <Send className="h-4 w-4" />} Kirim reminder sekarang
              </button>
            </>
          ) : <Skeleton className="mt-4 h-40 bg-fg/10" />}
        </section>

        <section className="reveal card p-6">
          <p className="eyebrow text-champagne-600">Riwayat pengiriman</p>
          {info && info.riwayat.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {info.riwayat.map((r, i) => (
                <li key={i} className="flex gap-3">
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', r.status === 'terkirim' ? 'bg-status-aktif' : r.status === 'gagal' ? 'bg-status-end' : 'bg-ink-faint')} />
                  <div className="min-w-0">
                    <p className="text-sm text-ink"><span className="font-semibold capitalize">{r.status}</span> · {r.jumlah_kontrak} kontrak</p>
                    <p className="truncate text-xs text-ink-muted" title={r.pesan}>{r.pesan}</p>
                    <p className="text-[11px] text-ink-faint">{waktuRelatif(r.waktu)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-ink-muted">Belum ada riwayat.</p>}
        </section>
      </aside>

      <AddAdminModal open={addOpen} onClose={() => setAddOpen(false)} onDone={load} />
      <ResetPasswordModal admin={resetFor} onClose={() => setResetFor(null)} />
      <ConfirmDialog open={!!delFor} onClose={() => setDelFor(null)} onConfirm={doDelete} loading={busy} danger confirmText="Hapus admin"
        title="Hapus admin?" message={<>Akun <b className="text-ink">{delFor?.nama}</b> ({delFor?.email}) tidak bisa login lagi. Kontrak yang pernah diinput tetap tersimpan.</>} />
    </div>
  )
}

function AddAdminModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ nama: '', email: '', password: '', terima_email: true })
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setF({ nama: '', email: '', password: '', terima_email: true }) }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/admins', f)
      toast('success', 'Admin ditambahkan', `${f.nama} sudah bisa login.`)
      onClose()
      onDone()
    } catch (err) {
      toast('error', 'Gagal menambah admin', errMsg(err))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Tambah admin" subtitle="Admin baru bisa mengelola semua kontrak.">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="a-nama">Nama</label>
          <input id="a-nama" className="input" required minLength={2} value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></div>
        <div><label className="label" htmlFor="a-email">Email</label>
          <input id="a-email" type="email" className="input" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label" htmlFor="a-pw">Password awal</label>
          <input id="a-pw" type="text" className="input" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <p className="hint">Minimal 8 karakter. Minta admin baru menggantinya setelah login.</p></div>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={f.terima_email} onChange={(e) => setF({ ...f, terima_email: e.target.checked })} className="h-4 w-4 accent-[#D4B483]" />
          Kirim email reminder ke admin ini
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" disabled={saving}>{saving ? <Spinner /> : 'Tambah admin'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPasswordModal({ admin, onClose }: { admin: Admin | null; onClose: () => void }) {
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => setPw(''), [admin])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!admin) return
    setSaving(true)
    try {
      await api.post(`/api/admins/${admin.id}/reset-password`, { password_baru: pw })
      toast('success', 'Password direset', `Beri tahu ${admin.nama} password barunya.`)
      onClose()
    } catch (err) {
      toast('error', 'Gagal reset password', errMsg(err))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open={!!admin} onClose={onClose} title="Reset password" subtitle={admin ? `${admin.nama} · ${admin.email}` : ''} width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="r-pw">Password baru</label>
          <input id="r-pw" type="text" className="input" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" disabled={saving || pw.length < 8}>{saving ? <Spinner /> : 'Simpan password'}</button>
        </div>
      </form>
    </Modal>
  )
}
