import mimetypes
import uuid
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import Select, and_, extract, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_admin
from ..config import settings
from ..database import get_db
from ..models import Admin, Contract
from ..schemas import ContractList, ContractOut, RenewIn
from ..services import exporter
from ..services.status import AKTIF, BERAKHIR, DIPERPANJANG, SEGERA_HABIS, reminder_threshold, today

router = APIRouter(prefix="/api/contracts", tags=["Kontrak"])

SORT_FIELDS = {
    "tanggal_berakhir": Contract.tanggal_berakhir,
    "tanggal_pks": Contract.tanggal_pks,
    "nilai_kontrak": Contract.nilai_kontrak,
    "nama_kontrak": Contract.nama_kontrak,
    "penyedia": Contract.penyedia,
    "created_at": Contract.created_at,
}


# ---------------- Filter helper ----------------
def status_condition(status: str):
    t, th = today(), reminder_threshold()
    not_renew = Contract.diperpanjang.is_(False)
    return {
        DIPERPANJANG: Contract.diperpanjang.is_(True),
        BERAKHIR: and_(not_renew, Contract.tanggal_berakhir < t),
        SEGERA_HABIS: and_(not_renew, Contract.tanggal_berakhir >= t, Contract.tanggal_berakhir <= th),
        AKTIF: and_(not_renew, Contract.tanggal_berakhir > th),
    }.get(status)


class Filters:
    def __init__(
        self,
        q: str | None = Query(None, description="Cari nama kontrak / penyedia / nomor PKS"),
        status: str | None = Query(None, description="aktif,segera_habis,berakhir,diperpanjang (boleh lebih dari satu, pisah koma)"),
        penyedia: str | None = None,
        tahun_pks: int | None = None,
        berakhir_dari: date | None = None,
        berakhir_sampai: date | None = None,
        nilai_min: int | None = None,
        nilai_max: int | None = None,
        ada_file: bool | None = None,
        sort_by: str = "tanggal_berakhir",
        order: str = "asc",
    ):
        self.q, self.status, self.penyedia, self.tahun_pks = q, status, penyedia, tahun_pks
        self.berakhir_dari, self.berakhir_sampai = berakhir_dari, berakhir_sampai
        self.nilai_min, self.nilai_max, self.ada_file = nilai_min, nilai_max, ada_file
        self.sort_by, self.order = sort_by, order

    def base_conditions(self) -> list:
        conds = []
        if self.q:
            like = f"%{self.q.strip()}%"
            conds.append(or_(Contract.nama_kontrak.ilike(like), Contract.penyedia.ilike(like), Contract.nomor_pks.ilike(like)))
        if self.penyedia:
            conds.append(Contract.penyedia == self.penyedia)
        if self.tahun_pks:
            conds.append(extract("year", Contract.tanggal_pks) == self.tahun_pks)
        if self.berakhir_dari:
            conds.append(Contract.tanggal_berakhir >= self.berakhir_dari)
        if self.berakhir_sampai:
            conds.append(Contract.tanggal_berakhir <= self.berakhir_sampai)
        if self.nilai_min is not None:
            conds.append(Contract.nilai_kontrak >= self.nilai_min)
        if self.nilai_max is not None:
            conds.append(Contract.nilai_kontrak <= self.nilai_max)
        if self.ada_file is not None:
            conds.append(Contract.file_path.is_not(None) if self.ada_file else Contract.file_path.is_(None))
        return conds

    def status_list(self) -> list[str]:
        if not self.status:
            return []
        return [s.strip() for s in self.status.split(",") if status_condition(s.strip()) is not None]

    def all_conditions(self) -> list:
        conds = self.base_conditions()
        statuses = self.status_list()
        if statuses:
            conds.append(or_(*[status_condition(s) for s in statuses]))
        return conds

    def apply_sort(self, stmt: Select) -> Select:
        col = SORT_FIELDS.get(self.sort_by, Contract.tanggal_berakhir)
        return stmt.order_by(col.desc() if self.order == "desc" else col.asc(), Contract.id.desc())


# ---------------- File helper ----------------
async def save_upload(file: UploadFile) -> tuple[str, str, int]:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in settings.ALLOWED_EXT:
        raise HTTPException(400, "Format file harus PDF, DOC, DOCX, JPG, atau PNG")
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(400, f"Ukuran file maksimal {settings.MAX_UPLOAD_MB} MB")
    stored = f"{uuid.uuid4().hex}{ext}"
    (settings.UPLOAD_DIR / stored).write_bytes(data)
    return file.filename or stored, stored, len(data)


def remove_file(stored: str | None):
    if stored:
        p = settings.UPLOAD_DIR / stored
        if p.is_file():
            p.unlink()


def get_contract_or_404(db: Session, cid: int) -> Contract:
    c = db.get(Contract, cid, options=[joinedload(Contract.created_by)])
    if not c:
        raise HTTPException(404, "Kontrak tidak ditemukan")
    return c


def validate_dates(tanggal_pks: date, tanggal_berakhir: date):
    if tanggal_berakhir <= tanggal_pks:
        raise HTTPException(422, "Tanggal berakhir harus setelah tanggal PKS")


# ---------------- Endpoint ----------------
@router.get("", response_model=ContractList)
def list_contracts(
    f: Filters = Depends(),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    conds = f.all_conditions()
    total = db.scalar(select(func.count(Contract.id)).where(*conds)) or 0
    total_nilai = db.scalar(select(func.coalesce(func.sum(Contract.nilai_kontrak), 0)).where(*conds)) or 0

    base = f.base_conditions()
    counts = {}
    for s in (AKTIF, SEGERA_HABIS, BERAKHIR, DIPERPANJANG):
        counts[s] = db.scalar(select(func.count(Contract.id)).where(*base, status_condition(s))) or 0
    counts["semua"] = sum(counts.values())

    stmt = f.apply_sort(select(Contract).options(joinedload(Contract.created_by)).where(*conds))
    rows = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return ContractList(
        items=[ContractOut.from_model(c) for c in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_nilai=int(total_nilai),
        status_counts=counts,
    )


@router.get("/options")
def filter_options(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    penyedia = db.scalars(select(Contract.penyedia).distinct().order_by(Contract.penyedia)).all()
    years = db.scalars(select(extract("year", Contract.tanggal_pks)).distinct()).all()
    return {"penyedia": penyedia, "tahun_pks": sorted({int(y) for y in years if y}, reverse=True)}


@router.get("/export")
def export_contracts(
    format: str = Query("xlsx", pattern="^(xlsx|pdf)$"),
    f: Filters = Depends(),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    stmt = f.apply_sort(select(Contract).where(*f.all_conditions()))
    items = [ContractOut.from_model(c) for c in db.scalars(stmt).all()]
    stamp = today().strftime("%Y%m%d")
    if format == "pdf":
        buf = exporter.to_pdf(items, admin.nama)
        media, name = "application/pdf", f"daftar-kontrak-{stamp}.pdf"
    else:
        buf = exporter.to_xlsx(items)
        media, name = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"daftar-kontrak-{stamp}.xlsx"
    return StreamingResponse(buf, media_type=media, headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.get("/check-pks")
def check_nomor_pks(nomor: str, exclude_id: int | None = None, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    stmt = select(Contract.id).where(func.lower(Contract.nomor_pks) == nomor.strip().lower())
    if exclude_id:
        stmt = stmt.where(Contract.id != exclude_id)
    return {"tersedia": db.scalar(stmt) is None}


@router.get("/{cid}", response_model=ContractOut)
def get_contract(cid: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    return ContractOut.from_model(get_contract_or_404(db, cid))


@router.post("", response_model=ContractOut, status_code=201)
async def create_contract(
    nama_kontrak: str = Form(..., min_length=2),
    penyedia: str = Form(..., min_length=2),
    nomor_pks: str = Form(..., min_length=1),
    tanggal_pks: date = Form(...),
    tanggal_berakhir: date = Form(...),
    nilai_kontrak: int = Form(..., ge=0),
    keterangan: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    validate_dates(tanggal_pks, tanggal_berakhir)
    c = Contract(
        nama_kontrak=nama_kontrak.strip(),
        penyedia=penyedia.strip(),
        nomor_pks=nomor_pks.strip(),
        tanggal_pks=tanggal_pks,
        tanggal_berakhir=tanggal_berakhir,
        nilai_kontrak=nilai_kontrak,
        keterangan=(keterangan or "").strip() or None,
        created_by_id=admin.id,
    )
    if file and file.filename:
        c.file_name, c.file_path, c.file_size = await save_upload(file)
    db.add(c)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        remove_file(c.file_path)
        raise HTTPException(409, "Nomor PKS sudah terdaftar")
    return ContractOut.from_model(get_contract_or_404(db, c.id))


@router.put("/{cid}", response_model=ContractOut)
async def update_contract(
    cid: int,
    nama_kontrak: str = Form(..., min_length=2),
    penyedia: str = Form(..., min_length=2),
    nomor_pks: str = Form(..., min_length=1),
    tanggal_pks: date = Form(...),
    tanggal_berakhir: date = Form(...),
    nilai_kontrak: int = Form(..., ge=0),
    keterangan: str | None = Form(None),
    hapus_file: bool = Form(False),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    validate_dates(tanggal_pks, tanggal_berakhir)
    c = get_contract_or_404(db, cid)
    if c.tanggal_berakhir != tanggal_berakhir:
        c.reminder_stage = 0  # tanggal berubah -> reminder dihitung ulang
    c.nama_kontrak, c.penyedia, c.nomor_pks = nama_kontrak.strip(), penyedia.strip(), nomor_pks.strip()
    c.tanggal_pks, c.tanggal_berakhir, c.nilai_kontrak = tanggal_pks, tanggal_berakhir, nilai_kontrak
    c.keterangan = (keterangan or "").strip() or None

    old_file = None
    if file and file.filename:
        old_file = c.file_path
        c.file_name, c.file_path, c.file_size = await save_upload(file)
    elif hapus_file:
        old_file = c.file_path
        c.file_name = c.file_path = c.file_size = None
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Nomor PKS sudah terdaftar")
    remove_file(old_file)
    return ContractOut.from_model(get_contract_or_404(db, cid))


@router.patch("/{cid}/perpanjang", response_model=ContractOut)
def set_renewed(cid: int, body: RenewIn, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    c = get_contract_or_404(db, cid)
    c.diperpanjang = body.diperpanjang
    db.commit()
    return ContractOut.from_model(get_contract_or_404(db, cid))


@router.delete("/{cid}", status_code=204)
def delete_contract(cid: int, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    c = get_contract_or_404(db, cid)
    stored = c.file_path
    db.delete(c)
    db.commit()
    remove_file(stored)


@router.get("/{cid}/file")
def download_file(cid: int, inline: bool = True, db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    c = get_contract_or_404(db, cid)
    if not c.file_path or not (settings.UPLOAD_DIR / c.file_path).is_file():
        raise HTTPException(404, "File kontrak tidak tersedia")
    media = mimetypes.guess_type(c.file_name or c.file_path)[0] or "application/octet-stream"
    return FileResponse(
        settings.UPLOAD_DIR / c.file_path,
        media_type=media,
        filename=c.file_name,
        content_disposition_type="inline" if inline else "attachment",
    )
