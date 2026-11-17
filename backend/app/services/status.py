"""Logika status kontrak & sisa waktu."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

from dateutil.relativedelta import relativedelta

from ..config import settings

AKTIF = "aktif"
SEGERA_HABIS = "segera_habis"
BERAKHIR = "berakhir"
DIPERPANJANG = "diperpanjang"

STATUS_LABEL = {
    AKTIF: "Aktif",
    SEGERA_HABIS: "Segera Habis",
    BERAKHIR: "Berakhir",
    DIPERPANJANG: "Diperpanjang",
}


def today() -> date:
    return datetime.now(ZoneInfo(settings.TIMEZONE)).date()


def reminder_threshold(ref: date | None = None) -> date:
    """Tanggal batas: kontrak yang berakhir <= tanggal ini masuk masa reminder."""
    return (ref or today()) + relativedelta(months=settings.REMINDER_MONTHS)


def compute_status(tanggal_berakhir: date, diperpanjang: bool, ref: date | None = None) -> str:
    ref = ref or today()
    if diperpanjang:
        return DIPERPANJANG
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
