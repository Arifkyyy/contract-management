# Contract Management — Panel Admin Reminder Kontrak

Web khusus admin untuk mencatat kontrak dan mengingatkan kontrak yang **sisa ≤ 3 bulan**.

- **Frontend**: React + TypeScript + Tailwind + GSAP (animasi) + Three.js (latar 3D halaman login)
- **Backend**: FastAPI + SQLAlchemy (SQLite bawaan, bisa ganti PostgreSQL)
- **Tampilan**: tema gelap "glass" (kartu kaca transparan + cahaya lembut) dengan palet Midnight `#0F172A`, Navy `#1E293B`, Champagne `#D4B483`, Ivory `#FAF8F3`
- **Logo**: logo Badan Bank Tanah tanpa background ada di `frontend/public/brand/` (`bbt-mark.png` = simbol BT, `bbt-logo-full.png` = logo + tulisan). Ganti file ini kalau punya versi resmi resolusi tinggi.

## Fitur

| Halaman | Isi |
|---|---|
| Login | Email + password, latar 3D partikel emas |
| Dashboard | Total nilai kontrak, jumlah per status, banner reminder, daftar "segera berakhir" (hitung mundur hari), grafik kontrak berakhir 12 bulan ke depan, penyedia terbesar, kontrak terbaru |
| Input Kontrak | Nama kontrak, penyedia, nomor PKS, tanggal PKS, **tanggal berakhir**, nilai kontrak, file kontrak (+ keterangan opsional). **Sisa kontrak dihitung otomatis.** Ada pratinjau langsung di samping form |
| Cek Kontrak | Tabel + filter: cari teks, status (Aktif / Segera Habis / Berakhir / Diperpanjang), penyedia, tahun PKS, rentang tanggal berakhir, rentang nilai, ada/tidak ada file, urutan. Export Excel & PDF sesuai filter |
| Detail Kontrak | Garis waktu PKS → reminder → berakhir, pratinjau file PDF/gambar, unduh, edit, hapus, tandai sudah diperpanjang |
| Kelola Admin | Tambah admin, nonaktifkan, reset password, hapus, atur siapa yang terima email. Status email + tombol "Kirim reminder sekarang" + riwayat kirim |

**Aturan status (otomatis):**
- *Berakhir* → tanggal berakhir sudah lewat
- *Segera Habis* → sisa ≤ 3 bulan (muncul di dashboard, lonceng notifikasi, dan email)
- *Aktif* → sisa > 3 bulan
- *Diperpanjang* → ditandai manual oleh admin; tidak diingatkan lagi

**Email reminder:** dikirim otomatis tiap hari jam 08.00 WIB. Satu kontrak hanya dikirim sekali per tahap (sisa 3 bulan → 30 hari → 7 hari), jadi admin tidak kebanjiran email yang sama.

---

## Cara menjalankan (Windows / PowerShell)

Butuh: **Python 3.10+** dan **Node.js 18+**.

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Admin pertama dibuat otomatis dari isi `.env`:
- Email: `admin@banktanah.id`
- Password: `Admin#12345`

**Segera ganti password** lewat menu profil (pojok kanan atas) setelah login.

Mau coba dengan data contoh? (buka terminal lain, aktifkan venv dulu)

```powershell
python seed_demo.py          # isi 12 kontrak contoh
python seed_demo.py --hapus  # hapus lagi kontrak contoh
```

Dokumentasi API otomatis: http://localhost:8000/docs

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173

---

## Mengaktifkan email

Isi bagian SMTP di `backend/.env`, lalu restart backend. Contoh Gmail (pakai **App Password**, bukan password biasa):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=akunanda@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM="Contract Management <akunanda@gmail.com>"
SMTP_TLS=true
```

Untuk email kantor, minta host/port SMTP ke tim IT. Cek berhasil atau tidak lewat **Kelola Admin → Kirim reminder sekarang**.

Pengaturan lain di `.env`:
- `REMINDER_MONTHS=3` → batas "segera habis"
- `REMINDER_HOUR=8`, `REMINDER_MINUTE=0` → jam kirim email (WIB)

---

## Deploy ke server (satu alamat)

1. Build frontend: `cd frontend && npm run build`
2. Salin isi folder `frontend/dist` ke `backend/static`
3. Di `backend/.env`: ganti `SECRET_KEY` dengan string acak panjang, isi `CORS_ORIGINS` dengan alamat web
4. Jalankan: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

Backend akan menyajikan web sekaligus API di port yang sama. File kontrak tersimpan di `backend/uploads` — **ikutkan folder ini (dan file database) saat backup**.

Pakai PostgreSQL: `pip install psycopg2-binary`, lalu ubah `DATABASE_URL` di `.env`.

---

## Kalau terasa lag / patah-patah di browser

Efek kaca (blur), animasi latar, dan objek 3D butuh **kartu grafis (GPU)**. Kalau browser tidak memakai GPU, semua efek digambar oleh prosesor (CPU) sehingga patah-patah.

1. **Nyalakan akselerasi hardware di Chrome:** Settings → System → *Use graphics acceleration when available* → ON → Relaunch.
   Cek di `chrome://gpu`: baris *WebGL* harus "Hardware accelerated".
2. **Matikan Energy Saver** (Settings → Performance) — mode ini membatasi animasi ke 30 fps saat laptop pakai baterai.
3. Coba jendela **Incognito** — kalau lancar, berarti ada extension yang memperberat.

Web ini juga punya **Mode ringan** (menu profil kanan atas). Mode ini aktif otomatis kalau terdeteksi tanpa GPU atau frame rate rendah: blur, animasi latar, dan objek 3D dimatikan, tampilan tetap rapi.

## Struktur folder

```
backend/
  app/
    main.py            # start app, buat tabel, jadwal email harian
    config.py          # baca .env
    models.py          # tabel admins, contracts, reminder_logs
    schemas.py         # format data API
    auth.py            # login JWT + hash password (bcrypt)
    routers/           # auth, dashboard, contracts, admins
    services/
      status.py        # hitung status & sisa kontrak
      reminder.py      # kirim email reminder
      exporter.py      # export Excel & PDF
  seed_demo.py
frontend/
  src/
    pages/             # Login, Dashboard, ContractForm, ContractList, ContractDetail, Admins
    components/        # Layout, GoldScene (3D), Charts, NotificationBell, ui
    lib/               # api, format (Rupiah, tanggal), types
```
