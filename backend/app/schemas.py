from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import Contract
from .services.status import STATUS_LABEL, compute_status, progress_pct, sisa_text, today


# ---------- Auth ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nama: str
    email: str
    is_active: bool
    terima_email: bool
    last_login: datetime | None = None
    created_at: datetime | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminOut


class ChangePasswordIn(BaseModel):
    password_lama: str
    password_baru: str = Field(min_length=8)


class ProfileUpdateIn(BaseModel):
    nama: str | None = Field(default=None, min_length=2, max_length=120)
    terima_email: bool | None = None


# ---------- Admin ----------
class AdminCreate(BaseModel):
    nama: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    terima_email: bool = True


class AdminUpdate(BaseModel):
    nama: str | None = Field(default=None, min_length=2, max_length=120)
    is_active: bool | None = None
    terima_email: bool | None = None


class ResetPasswordIn(BaseModel):
    password_baru: str = Field(min_length=8)


# ---------- Kontrak ----------
class ContractOut(BaseModel):
    id: int
    nama_kontrak: str
    penyedia: str
    nomor_pks: str
    tanggal_pks: date
    tanggal_berakhir: date
    nilai_kontrak: int
    keterangan: str | None
    file_name: str | None
    file_size: int | None
    has_file: bool
    diperpanjang: bool
    status: str
    status_label: str
    sisa_hari: int
    sisa_text: str
    progress: float
    created_by: str | None
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_model(cls, c: Contract) -> "ContractOut":
        ref = today()
        status = compute_status(c.tanggal_berakhir, c.diperpanjang, ref)
        return cls(
            id=c.id,
            nama_kontrak=c.nama_kontrak,
            penyedia=c.penyedia,
            nomor_pks=c.nomor_pks,
            tanggal_pks=c.tanggal_pks,
            tanggal_berakhir=c.tanggal_berakhir,
            nilai_kontrak=c.nilai_kontrak,
            keterangan=c.keterangan,
            file_name=c.file_name,
            file_size=c.file_size,
            has_file=bool(c.file_path),
            diperpanjang=c.diperpanjang,
            status=status,
            status_label=STATUS_LABEL[status],
            sisa_hari=(c.tanggal_berakhir - ref).days,
            sisa_text=sisa_text(c.tanggal_berakhir, ref),
            progress=progress_pct(c.tanggal_pks, c.tanggal_berakhir, ref),
            created_by=c.created_by.nama if c.created_by else None,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )


class ContractList(BaseModel):
    items: list[ContractOut]
    total: int
    page: int
    page_size: int
    total_nilai: int
    status_counts: dict[str, int]


class RenewIn(BaseModel):
    diperpanjang: bool
