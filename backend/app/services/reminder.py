"""Reminder email kontrak yang hampir habis.

Email dikirim per tahap supaya admin tidak dibanjiri email yang sama setiap hari:
  tahap 1 -> saat sisa <= 3 bulan (REMINDER_MONTHS)
  tahap 2 -> saat sisa <= 30 hari
  tahap 3 -> saat sisa <= 7 hari
Setiap kontrak hanya dikirim sekali per tahap.
"""
import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import parseaddr

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal
from ..models import Admin, Contract, ReminderLog
from .exporter import rupiah, tgl
from .status import PROSES_TERBUKA, reminder_threshold, sisa_text, today

log = logging.getLogger("reminder")


def stage_for(sisa_hari: int, in_window: bool) -> int:
    if sisa_hari <= 7:
        return 3
    if sisa_hari <= 30:
        return 2
    if in_window:
        return 1
    return 0


def contracts_to_remind(db: Session, force: bool = False) -> list[tuple[Contract, int]]:
    t, th = today(), reminder_threshold()
    rows = db.scalars(
        select(Contract)
        .where(Contract.status_proses.in_(PROSES_TERBUKA), Contract.tanggal_berakhir >= t, Contract.tanggal_berakhir <= th)
        .order_by(Contract.tanggal_berakhir)
    ).all()
    result = []
    for c in rows:
        stage = stage_for((c.tanggal_berakhir - t).days, True)
        if force or stage > (c.reminder_stage or 0):
            result.append((c, stage))
    return result


def build_html(items: list[tuple[Contract, int]]) -> str:
    rows = ""
    for c, _ in items:
        sisa = (c.tanggal_berakhir - today()).days
        tone = "#B91C1C" if sisa <= 30 else "#B45309"
        rows += f"""
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #EEE9DD">
            <div style="font-weight:600;color:#0F172A">{c.nama_kontrak}</div>
            <div style="font-size:12px;color:#64748B;margin-top:2px">{c.penyedia} · PKS {c.nomor_pks}</div>
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid #EEE9DD;font-size:13px;color:#0F172A;white-space:nowrap">{tgl(c.tanggal_berakhir)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #EEE9DD;font-size:13px;color:#0F172A;white-space:nowrap">{rupiah(c.nilai_kontrak)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #EEE9DD;font-size:13px;font-weight:600;color:{tone};white-space:nowrap">{sisa_text(c.tanggal_berakhir)}</td>
        </tr>"""
    return f"""<!doctype html><html><body style="margin:0;background:#FAF8F3;font-family:Segoe UI,Arial,sans-serif">
    <div style="max-width:720px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #EEE9DD">
      <div style="background:#0F172A;padding:28px 32px">
        <div style="color:#D4B483;font-size:12px;letter-spacing:2px;text-transform:uppercase">Reminder Kontrak</div>
        <div style="color:#FAF8F3;font-size:22px;font-weight:600;margin-top:6px">{len(items)} kontrak akan segera berakhir</div>
      </div>
      <div style="padding:24px 32px 8px;color:#334155;font-size:14px;line-height:1.6">
        Kontrak berikut sisa waktunya kurang dari {settings.REMINDER_MONTHS} bulan. Mohon segera ditindaklanjuti
        (perpanjangan, addendum, atau pengadaan baru).
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <tr style="background:#FAF8F3;text-align:left;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:1px">
          <th style="padding:10px 16px">Kontrak</th><th style="padding:10px 16px">Berakhir</th>
          <th style="padding:10px 16px">Nilai</th><th style="padding:10px 16px">Sisa</th>
        </tr>{rows}
      </table>
      <div style="padding:20px 32px 28px;font-size:12px;color:#94A3B8">Email otomatis dari {settings.APP_NAME}. Jangan dibalas.</div>
    </div></body></html>"""


def send_email(to: list[str], subject: str, html: str, text: str):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = ", ".join(to)
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    if settings.SMTP_TLS == "ssl":
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ssl.create_default_context(), timeout=30)
    else:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30)
        if settings.SMTP_TLS == "true":
            server.starttls(context=ssl.create_default_context())
    with server:
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg, from_addr=parseaddr(settings.SMTP_FROM)[1] or settings.SMTP_USER)


def run_reminder(force: bool = False) -> dict:
    """Jalankan pengecekan & kirim email. force=True kirim semua kontrak di masa reminder (untuk tombol 'kirim sekarang')."""
    db = SessionLocal()
    try:
        items = contracts_to_remind(db, force=force)
        recipients = db.scalars(select(Admin.email).where(Admin.is_active.is_(True), Admin.terima_email.is_(True))).all()

        def finish(status: str, pesan: str):
            db.add(ReminderLog(recipients=", ".join(recipients), jumlah_kontrak=len(items), status=status, pesan=pesan))
            db.commit()
            log.info("Reminder %s: %s", status, pesan)
            return {"status": status, "pesan": pesan, "jumlah_kontrak": len(items), "penerima": list(recipients)}

        if not items:
            return {"status": "dilewati", "pesan": "Tidak ada kontrak baru yang perlu diingatkan", "jumlah_kontrak": 0, "penerima": list(recipients)}
        if not settings.smtp_enabled:
            return finish("dilewati", "SMTP belum diatur di file .env, email tidak dikirim")
        if not recipients:
            return finish("dilewati", "Tidak ada admin aktif yang menerima email")

        text = "Kontrak yang akan segera berakhir:\n\n" + "\n".join(
            f"- {c.nama_kontrak} ({c.penyedia}) berakhir {tgl(c.tanggal_berakhir)}, sisa {sisa_text(c.tanggal_berakhir)}" for c, _ in items
        )
        try:
            send_email(list(recipients), f"[Reminder] {len(items)} kontrak akan segera berakhir", build_html(items), text)
        except Exception as e:  # noqa: BLE001
            db.rollback()
            return finish("gagal", f"Gagal kirim email: {e}")
        for c, stage in items:
            c.reminder_stage = max(c.reminder_stage or 0, stage)
        return finish("terkirim", f"Email dikirim ke {len(recipients)} admin")
    finally:
        db.close()
