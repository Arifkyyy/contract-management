from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Admin

ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except ValueError:
        return False


def create_token(admin_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=settings.TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": str(admin_id), "exp": exp}, settings.SECRET_KEY, algorithm=ALGORITHM)


def get_current_admin(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Admin:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesi berakhir, silakan login kembali")
    if not cred:
        raise unauthorized
    try:
        payload = jwt.decode(cred.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    admin = db.get(Admin, admin_id)
    if not admin or not admin.is_active:
        raise unauthorized
    return admin
