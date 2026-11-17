from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_admin, hash_password
from ..config import settings
from ..database import get_db
from ..models import Admin, ReminderLog
from ..schemas import AdminCreate, AdminOut, AdminUpdate, ResetPasswordIn
from ..services.reminder import run_reminder

router = APIRouter(prefix="/api", tags=["Admin & Pengaturan"])


@router.get("/admins", response_model=list[AdminOut])
def list_admins(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    return db.scalars(select(Admin).order_by(Admin.created_at)).all()


@router.post("/admins", response_model=AdminOut, status_code=201)
def create_admin(body: AdminCreate, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    if db.scalar(select(Admin.id).where(func.lower(Admin.email) == body.email.lower())):
        raise HTTPException(409, "Email sudah dipakai admin lain")
    a = Admin(nama=body.nama.strip(), email=body.email.lower(), password_hash=hash_password(body.password), terima_email=body.terima_email)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.patch("/admins/{aid}", response_model=AdminOut)
def update_admin(aid: int, body: AdminUpdate, db: Session = Depends(get_db), me: Admin = Depends(get_current_admin)):
    a = db.get(Admin, aid)
    if not a:
        raise HTTPException(404, "Admin tidak ditemukan")
    if body.is_active is False and a.id == me.id:
        raise HTTPException(400, "Anda tidak bisa menonaktifkan akun sendiri")
    if body.nama is not None:
        a.nama = body.nama.strip()
    if body.is_active is not None:
        a.is_active = body.is_active
    if body.terima_email is not None:
        a.terima_email = body.terima_email
    db.commit()
    db.refresh(a)
    return a


@router.post("/admins/{aid}/reset-password")
def reset_password(aid: int, body: ResetPasswordIn, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    a = db.get(Admin, aid)
    if not a:
        raise HTTPException(404, "Admin tidak ditemukan")
    a.password_hash = hash_password(body.password_baru)
    db.commit()
    return {"ok": True}


@router.delete("/admins/{aid}", status_code=204)
def delete_admin(aid: int, db: Session = Depends(get_db), me: Admin = Depends(get_current_admin)):
    if aid == me.id:
        raise HTTPException(400, "Anda tidak bisa menghapus akun sendiri")
    a = db.get(Admin, aid)
    if not a:
        raise HTTPException(404, "Admin tidak ditemukan")
    db.delete(a)
    db.commit()


# ---------- Pengaturan reminder ----------
@router.get("/settings/reminder")
def reminder_settings(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    logs = db.scalars(select(ReminderLog).order_by(ReminderLog.sent_at.desc()).limit(8)).all()
    return {
        "smtp_aktif": settings.smtp_enabled,
        "smtp_host": settings.SMTP_HOST or None,
        "pengirim": settings.SMTP_FROM,
        "bulan_reminder": settings.REMINDER_MONTHS,
        "jam_kirim": f"{settings.REMINDER_HOUR:02d}:{settings.REMINDER_MINUTE:02d} WIB",
        "riwayat": [
            {"waktu": l.sent_at, "status": l.status, "pesan": l.pesan, "jumlah_kontrak": l.jumlah_kontrak, "penerima": l.recipients}
            for l in logs
        ],
    }


@router.post("/settings/reminder/send-now")
def send_now(_: Admin = Depends(get_current_admin)):
    return run_reminder(force=True)
