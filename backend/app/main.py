import logging
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from .auth import hash_password
from .config import settings
from .database import Base, SessionLocal, engine
from .models import Admin
from .routers import admins, auth, contracts, dashboard
from .services.reminder import run_reminder

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
log = logging.getLogger("app")


def init_db():
    Base.metadata.create_all(engine)
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
