import { useEffect, useState, type FormEvent } from 'react'
import { Modal, Spinner } from './ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, errMsg } from '../lib/api'

export default function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { admin, setAdmin } = useAuth()
  const toast = useToast()
  const [nama, setNama] = useState('')
  const [terimaEmail, setTerimaEmail] = useState(true)
  const [pw, setPw] = useState({ lama: '', baru: '', ulang: '' })
  const [saving, setSaving] = useState<'profil' | 'pw' | null>(null)

  useEffect(() => {
    if (open && admin) {
      setNama(admin.nama)
      setTerimaEmail(admin.terima_email)
      setPw({ lama: '', baru: '', ulang: '' })
    }
  }, [open, admin])

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setSaving('profil')
    try {
      const { data } = await api.patch('/api/auth/me', { nama, terima_email: terimaEmail })
      setAdmin(data)
      toast('success', 'Profil disimpan')
    } catch (err) {
      toast('error', 'Gagal menyimpan', errMsg(err))
    } finally {
      setSaving(null)
    }
  }

  const savePw = async (e: FormEvent) => {
    e.preventDefault()
    if (pw.baru !== pw.ulang) return toast('error', 'Password baru tidak sama', 'Ketik ulang password baru dengan benar.')
    setSaving('pw')
    try {
      await api.post('/api/auth/change-password', { password_lama: pw.lama, password_baru: pw.baru })
      toast('success', 'Password diganti')
      setPw({ lama: '', baru: '', ulang: '' })
    } catch (err) {
      toast('error', 'Gagal ganti password', errMsg(err))
    } finally {
      setSaving(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Profil saya" subtitle={admin?.email} width="max-w-xl">
      <form onSubmit={saveProfile} className="space-y-4">
        <div>
          <label className="label" htmlFor="p-nama">Nama</label>
          <input id="p-nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)} minLength={2} required />
        </div>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-fg/[.07] bg-fg/[.03] px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-ink">Terima email reminder</span>
            <span className="block text-xs text-ink-muted">Kirim email saat ada kontrak sisa ≤ 3 bulan</span>
          </span>
          <input type="checkbox" checked={terimaEmail} onChange={(e) => setTerimaEmail(e.target.checked)} className="h-5 w-5 accent-[#D4B483]" />
        </label>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving !== null}>{saving === 'profil' ? <Spinner /> : 'Simpan profil'}</button>
        </div>
      </form>

      <div className="hairline my-6" />

      <form onSubmit={savePw} className="space-y-4">
        <p className="eyebrow text-champagne-600">Ganti password</p>
        <input type="password" className="input" placeholder="Password lama" autoComplete="current-password"
          value={pw.lama} onChange={(e) => setPw({ ...pw, lama: e.target.value })} required />
        <div className="grid grid-cols-2 gap-3">
          <input type="password" className="input" placeholder="Password baru (min. 8)" autoComplete="new-password" minLength={8}
            value={pw.baru} onChange={(e) => setPw({ ...pw, baru: e.target.value })} required />
          <input type="password" className="input" placeholder="Ulangi password baru" autoComplete="new-password" minLength={8}
            value={pw.ulang} onChange={(e) => setPw({ ...pw, ulang: e.target.value })} required />
        </div>
        <div className="flex justify-end">
          <button className="btn-outline" disabled={saving !== null}>{saving === 'pw' ? <Spinner /> : 'Ganti password'}</button>
        </div>
      </form>
    </Modal>
  )
}
