from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nama: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    terima_email: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nama_kontrak: Mapped[str] = mapped_column(String(255), index=True)
    penyedia: Mapped[str] = mapped_column(String(255), index=True)
    nomor_pks: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    tanggal_pks: Mapped[date] = mapped_column(Date)
    tanggal_berakhir: Mapped[date] = mapped_column(Date, index=True)
    nilai_kontrak: Mapped[int] = mapped_column(BigInteger, default=0)  # dalam Rupiah
    keterangan: Mapped[str | None] = mapped_column(Text, nullable=True)

    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)

    diperpanjang: Mapped[bool] = mapped_column(Boolean, default=False)
    # 0 = belum pernah, 1 = sudah kirim tahap 3 bulan, 2 = tahap 1 bulan, 3 = tahap 7 hari
    reminder_stage: Mapped[int] = mapped_column(Integer, default=0)

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[Admin | None] = relationship()
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    recipients: Mapped[str] = mapped_column(Text)
    jumlah_kontrak: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30))  # terkirim / gagal / dilewati
    pesan: Mapped[str | None] = mapped_column(Text, nullable=True)
