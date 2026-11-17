export type Status = 'aktif' | 'segera_habis' | 'berakhir' | 'diperpanjang'

export interface Admin {
  id: number
  nama: string
  email: string
  is_active: boolean
  terima_email: boolean
  last_login: string | null
  created_at: string | null
}

export interface Contract {
  id: number
  nama_kontrak: string
  penyedia: string
  nomor_pks: string
  tanggal_pks: string
  tanggal_berakhir: string
  nilai_kontrak: number
  keterangan: string | null
  file_name: string | null
  file_size: number | null
  has_file: boolean
  diperpanjang: boolean
  status: Status
  status_label: string
  sisa_hari: number
  sisa_text: string
  progress: number
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ContractList {
  items: Contract[]
  total: number
  page: number
  page_size: number
  total_nilai: number
  status_counts: Record<Status | 'semua', number>
}

export interface Dashboard {
  total_kontrak: number
  total_nilai: number
  nilai_berjalan: number
  counts: Record<Status, number>
  nilai_per_status: Record<Status, number>
  segera_habis: Contract[]
  terbaru: Contract[]
  timeline: { bulan: string; tahun: number; bulan_ke: number; jumlah: number; nilai: number; masa_reminder: boolean }[]
  top_penyedia: { penyedia: string; jumlah: number; nilai: number }[]
  tanggal: string
}
