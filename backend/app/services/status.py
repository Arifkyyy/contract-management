"""Logika status kontrak & sisa waktu."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

from dateutil.relativedelta import relativedelta

from ..config import settings

AKTIF = "aktif"
SEGERA_HABIS = "segera_habis"
BERAKHIR = "berakhir"
DIPERPANJANG = "diperpanjang"
TIDAK_DIPERPANJANG = "tidak_diperpanjang"
ALL_STATUS = (AKTIF, SEGERA_HABIS, BERAKHIR, DIPERPANJANG, TIDAK_DIPERPANJANG)

STATUS_LABEL = {
    AKTIF: "Aktif",
    SEGERA_HABIS: "Segera Habis",
    BERAKHIR: "Berakhir",
    DIPERPANJANG: "Diperpanjang",
    TIDAK_DIPERPANJANG: "Tidak Diperpanjang",
}

# ---- Proses perpanjangan (berlaku untuk masa kontrak yang sedang berjalan) ----
# Saat addendum dicatat, tanggal akhir diperbarui & proses kembali ke "belum" untuk masa baru.
PROSES_BELUM = "belum"
PROSES_JALAN = "proses"
PROSES_DIPERPANJANG = "diperpanjang"  # sudah pasti diperpanjang, addendum belum dicatat
PROSES_TIDAK = "tidak_diperpanjang"
PROSES_LABEL = {
    PROSES_BELUM: "Belum diproses",
    PROSES_JALAN: "Sedang diproses",
    PROSES_DIPERPANJANG: "Sudah diperpanjang",
    PROSES_TIDAK: "Tidak diperpanjang",
}
# Kontrak dengan proses ini masih dipantau (masuk reminder & notifikasi)
PROSES_TERBUKA = (PROSES_BELUM, PROSES_JALAN)


def today() -> date:
    return datetime.now(ZoneInfo(settings.TIMEZONE)).date()


def reminder_threshold(ref: date | None = None) -> date:
    """Tanggal batas: kontrak yang berakhir <= tanggal ini masuk masa reminder."""
    return (ref or today()) + relativedelta(months=settings.REMINDER_MONTHS)


def compute_status(tanggal_berakhir: date, status_proses: str | None, ref: date | None = None) -> str:
    ref = ref or today()
    if status_proses == PROSES_DIPERPANJANG:
        return DIPERPANJANG
    if status_proses == PROSES_TIDAK:
        return TIDAK_DIPERPANJANG
    if tanggal_berakhir < ref:
        return BERAKHIR
    if tanggal_berakhir <= reminder_threshold(ref):
        return SEGERA_HABIS
    return AKTIF


def sisa_text(tanggal_berakhir: date, ref: date | None = None) -> str:
    ref = ref or today()
    if tanggal_berakhir < ref:
        lewat = (ref - tanggal_berakhir).days
        return f"Lewat {lewat} hari"
    if tanggal_berakhir == ref:
        return "Berakhir hari ini"
    rd = relativedelta(tanggal_berakhir, ref)
    parts = []
    if rd.years:
        parts.append(f"{rd.years} tahun")
    if rd.months:
        parts.append(f"{rd.months} bulan")
    if rd.days:
        parts.append(f"{rd.days} hari")
    return " ".join(parts) or "0 hari"


def progress_pct(tanggal_pks: date, tanggal_berakhir: date, ref: date | None = None) -> float:
    """Persentase waktu kontrak yang sudah berjalan (0-100)."""
    ref = ref or today()
    total = (tanggal_berakhir - tanggal_pks).days
    if total <= 0:
        return 100.0
    jalan = (ref - tanggal_pks).days
    return max(0.0, min(100.0, round(jalan / total * 100, 1)))
