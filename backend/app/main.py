import logging
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, select, text

from .auth import hash_password
from .config import settings
from .database import Base, SessionLocal, engine
from .models import Admin
from .routers import admins, auth, contracts, dashboard
from .services.reminder import run_reminder

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("app")


# Kolom yang ditambahkan setelah rilis awal: create_all() tidak menambah kolom ke tabel lama,
# jadi tambahkan manual kalau belum ada.
NEW_CONTRACT_COLUMNS = {
    "tanggal_mulai": "DATE",
    "status_proses": "VARCHAR(30) NOT NULL DEFAULT 'belum'",
    "catatan_proses": "TEXT",
    "critical_pengesahan": "TEXT",
    "denda": "TEXT",
    "jaminan_kontrak": "TEXT",
}


def migrate_columns():
    existing = {c["name"] for c in inspect(engine).get_columns("contracts")}
    with engine.begin() as conn:
        for col, typ in NEW_CONTRACT_COLUMNS.items():
            if col not in existing:
                conn.execute(text(f"ALTER TABLE contracts ADD COLUMN {col} {typ}"))
                log.info("Kolom baru ditambahkan: contracts.%s", col)
                if col == "status_proses":
                    # Kontrak yang dulu ditandai "sudah diperpanjang" tetap berstatus Diperpanjang
                    conn.execute(text("UPDATE contracts SET status_proses = 'diperpanjang' WHERE diperpanjang = :t"), {"t": True})


def init_db():
    Base.metadata.create_all(engine)
    migrate_columns()
    with SessionLocal() as db:
        if not db.scalar(select(Admin.id).limit(1)):
            db.add(Admin(
                nama=settings.FIRST_ADMIN_NAME,
                email=settings.FIRST_ADMIN_EMAIL.lower(),
                password_hash=hash_password(settings.FIRST_ADMIN_PASSWORD),
            ))
            db.commit()
            log.info("Admin pertama dibuat: %s", settings.FIRST_ADMIN_EMAIL)


scheduler = BackgroundScheduler(timezone=settings.TIMEZONE)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    scheduler.add_job(
        run_reminder,
        CronTrigger(hour=settings.REMINDER_HOUR, minute=settings.REMINDER_MINUTE, timezone=settings.TIMEZONE),
        id="reminder-harian",
        replace_existing=True,
    )
    scheduler.start()
    log.info("Reminder email terjadwal tiap hari pukul %02d:%02d WIB", settings.REMINDER_HOUR, settings.REMINDER_MINUTE)
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(contracts.router)
app.include_router(admins.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Kalau frontend sudah di-build (npm run build) dan folder dist dicopy ke backend/static,
# backend sekaligus menyajikan web-nya di satu alamat.
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        file = STATIC_DIR / path
        if path and file.is_file():
            return FileResponse(file)
        return FileResponse(STATIC_DIR / "index.html")
