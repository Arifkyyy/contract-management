from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import Addendum, Contract
from .services.status import PROSES_LABEL, STATUS_LABEL, compute_status, progress_pct, sisa_text, today


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
class AddendumOut(BaseModel):
    id: int
    urutan: int
    nomor: str
    tanggal: date
    tanggal_akhir_lama: date
    tanggal_akhir_baru: date
    nilai_lama: int
    nilai_baru: int
    catatan: str | None
    file_name: str | None
    file_size: int | None
    has_file: bool
    created_by: str | None
    created_at: datetime | None

    @classmethod
    def from_model(cls, a: Addendum) -> "AddendumOut":
        return cls(
            id=a.id, urutan=a.urutan, nomor=a.nomor, tanggal=a.tanggal,
            tanggal_akhir_lama=a.tanggal_akhir_lama, tanggal_akhir_baru=a.tanggal_akhir_baru,
            nilai_lama=a.nilai_lama, nilai_baru=a.nilai_baru, catatan=a.catatan,
            file_name=a.file_name, file_size=a.file_size, has_file=bool(a.file_path),
            created_by=a.created_by.nama if a.created_by else None, created_at=a.created_at,
        )


class ContractOut(BaseModel):
    id: int
    nama_kontrak: str
    penyedia: str
    nomor_pks: str
    tanggal_pks: date
    tanggal_mulai: date | None
    tanggal_berakhir: date
    nilai_kontrak: int
    critical_pengesahan: str | None
    denda: str | None
    jaminan_kontrak: str | None
    keterangan: str | None
    file_name: str | None
    file_size: int | None
    has_file: bool
    status_proses: str
    status_proses_label: str
    catatan_proses: str | None
    addendum: list[AddendumOut]
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
        status = compute_status(c.tanggal_berakhir, c.status_proses, ref)
        return cls(
            id=c.id,
            nama_kontrak=c.nama_kontrak,
            penyedia=c.penyedia,
            nomor_pks=c.nomor_pks,
            tanggal_pks=c.tanggal_pks,
            tanggal_mulai=c.tanggal_mulai,
            tanggal_berakhir=c.tanggal_berakhir,
            nilai_kontrak=c.nilai_kontrak,
            critical_pengesahan=c.critical_pengesahan,
            denda=c.denda,
            jaminan_kontrak=c.jaminan_kontrak,
            keterangan=c.keterangan,
            file_name=c.file_name,
            file_size=c.file_size,
            has_file=bool(c.file_path),
            status_proses=c.status_proses,
            status_proses_label=PROSES_LABEL.get(c.status_proses, c.status_proses),
            catatan_proses=c.catatan_proses,
            addendum=[AddendumOut.from_model(a) for a in c.addendums],
            status=status,
            status_label=STATUS_LABEL[status],
            sisa_hari=(c.tanggal_berakhir - ref).days,
            sisa_text=sisa_text(c.tanggal_berakhir, ref),
            progress=progress_pct(c.tanggal_mulai or c.tanggal_pks, c.tanggal_berakhir, ref),
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


class ProsesIn(BaseModel):
    status_proses: Literal["belum", "proses", "diperpanjang", "tidak_diperpanjang"]
    catatan_proses: str | None = Field(default=None, max_length=2000)
