"""Isi database dengan contoh kontrak untuk demo.

Jalankan: python seed_demo.py
Hapus contoh: python seed_demo.py --hapus
"""
import sys
from random import Random

from dateutil.relativedelta import relativedelta
from sqlalchemy import delete, select

from app.database import Base, SessionLocal, engine
from app.main import init_db
from app.models import Admin, Contract
from app.services.status import today

PREFIX = "DEMO/"

DATA = [
    ("Jasa Kebersihan Gedung Kantor Pusat", "PT Prima Bersih Nusantara", 14, 1_850_000_000),
    ("Sewa Kendaraan Operasional", "PT Trans Armada Mandiri", 1.5, 2_340_000_000),
    ("Pemeliharaan Sistem Informasi Aset", "PT Data Solusi Integra", 2.4, 4_750_000_000),
    ("Jasa Keamanan (Satpam) Kantor", "PT Garda Utama Sentosa", 0.6, 3_120_000_000),
    ("Sewa Gedung Kantor Wilayah", "PT Graha Properti Indonesia", 20, 12_500_000_000),
    ("Konsultan Penilai Aset Tanah", "KJPP Hartono & Rekan", 5, 6_800_000_000),
    ("Pengadaan Lisensi Perangkat Lunak", "PT Mitra Teknologi Global", 2.9, 1_275_000_000),
    ("Jasa Pengukuran & Pemetaan Lahan", "PT Geo Survey Persada", 9, 8_430_000_000),
    ("Layanan Internet & Jaringan", "PT Telekomunikasi Andalan", -1.2, 960_000_000),
    ("Asuransi Aset Gedung", "PT Asuransi Proteksi Raya", 30, 2_150_000_000),
    ("Katering Rapat & Kegiatan", "CV Rasa Nusantara", -4, 420_000_000),
    ("Jasa Konsultan Hukum Pertanahan", "Kantor Hukum Wibowo & Partners", 7, 3_600_000_000),
]


def seed():
    init_db()
    rng = Random(7)
    t = today()
    with SessionLocal() as db:
        admin = db.scalar(select(Admin).limit(1))
        for i, (nama, penyedia, bulan_sisa, nilai) in enumerate(DATA, 1):
            nomor = f"{PREFIX}PKS-{i:03d}/BBT/{t.year}"
            if db.scalar(select(Contract.id).where(Contract.nomor_pks == nomor)):
                continue
            berakhir = t + relativedelta(days=int(bulan_sisa * 30.4))
            durasi = rng.choice([12, 18, 24, 36])
            db.add(Contract(
                nama_kontrak=nama, penyedia=penyedia, nomor_pks=nomor,
                tanggal_pks=berakhir - relativedelta(months=durasi), tanggal_berakhir=berakhir,
                nilai_kontrak=nilai, created_by_id=admin.id if admin else None,
                diperpanjang=(i == 11),
            ))
        db.commit()
    print(f"OK: {len(DATA)} kontrak demo siap.")


def hapus():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.execute(delete(Contract).where(Contract.nomor_pks.like(f"{PREFIX}%")))
        db.commit()
    print("Kontrak demo dihapus.")


if __name__ == "__main__":
    hapus() if "--hapus" in sys.argv else seed()
