import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "Contract Management")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-ganti-di-production")
    TOKEN_EXPIRE_HOURS: int = int(os.getenv("TOKEN_EXPIRE_HOURS", "12"))
    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()
    ]

    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'contract.db'}")

    FIRST_ADMIN_NAME: str = os.getenv("FIRST_ADMIN_NAME", "Administrator")
    FIRST_ADMIN_EMAIL: str = os.getenv("FIRST_ADMIN_EMAIL", "admin@banktanah.id")
    FIRST_ADMIN_PASSWORD: str = os.getenv("FIRST_ADMIN_PASSWORD", "Admin#12345")

    REMINDER_MONTHS: int = int(os.getenv("REMINDER_MONTHS", "3"))
    REMINDER_HOUR: int = int(os.getenv("REMINDER_HOUR", "8"))
    REMINDER_MINUTE: int = int(os.getenv("REMINDER_MINUTE", "0"))
    TIMEZONE: str = "Asia/Jakarta"

    SMTP_HOST: str = os.getenv("SMTP_HOST", "").strip()
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587") or 587)
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "Contract Management <noreply@localhost>")
    SMTP_TLS: str = os.getenv("SMTP_TLS", "true").strip().lower()

    UPLOAD_DIR: Path = (BASE_DIR / os.getenv("UPLOAD_DIR", "./uploads")).resolve()
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "20"))
    ALLOWED_EXT: set[str] = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}

    @property
    def smtp_enabled(self) -> bool:
        return bool(self.SMTP_HOST)


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
