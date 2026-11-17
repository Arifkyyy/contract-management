from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import create_token, get_current_admin, hash_password, verify_password
from ..database import get_db
from ..models import Admin
from ..schemas import AdminOut, ChangePasswordIn, LoginIn, ProfileUpdateIn, TokenOut

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    admin = db.scalar(select(Admin).where(func.lower(Admin.email) == body.email.lower()))
    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(401, "Email atau password salah")
    if not admin.is_active:
        raise HTTPException(403, "Akun ini dinonaktifkan. Hubungi admin lain.")
    admin.last_login = datetime.now(timezone.utc).replace(tzinfo=None)  # simpan UTC
    db.commit()
    db.refresh(admin)
    return TokenOut(access_token=create_token(admin.id), admin=AdminOut.model_validate(admin))


@router.get("/me", response_model=AdminOut)
def me(admin: Admin = Depends(get_current_admin)):
    return admin


@router.patch("/me", response_model=AdminOut)
def update_me(body: ProfileUpdateIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    if body.nama is not None:
        admin.nama = body.nama.strip()
    if body.terima_email is not None:
        admin.terima_email = body.terima_email
    db.commit()
    db.refresh(admin)
    return admin


@router.post("/change-password")
def change_password(body: ChangePasswordIn, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    if not verify_password(body.password_lama, admin.password_hash):
        raise HTTPException(400, "Password lama tidak sesuai")
    admin.password_hash = hash_password(body.password_baru)
    db.commit()
    return {"ok": True}
