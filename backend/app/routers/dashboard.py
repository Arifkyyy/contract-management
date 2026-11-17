from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_admin
from ..database import get_db
from ..models import Admin, Contract
from ..schemas import ContractOut
from ..services.status import (
    AKTIF, ALL_STATUS, PROSES_JALAN, PROSES_TERBUKA, SEGERA_HABIS, compute_status, reminder_threshold, today,
)

router = APIRouter(prefix="/api", tags=["Dashboard"])

BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    t = today()
    contracts = db.scalars(select(Contract).options(joinedload(Contract.created_by))).all()

    counts = {s: 0 for s in ALL_STATUS}
    nilai = {s: 0 for s in ALL_STATUS}
    for c in contracts:
        s = compute_status(c.tanggal_berakhir, c.status_proses, t)
        counts[s] += 1
        nilai[s] += c.nilai_kontrak

    # Kontrak berakhir per bulan, 12 bulan ke depan (yang masih dipantau)
    start = t.replace(day=1)
    timeline = []
    for i in range(12):
        m0 = start + relativedelta(months=i)
        m1 = m0 + relativedelta(months=1)
        items = [c for c in contracts if c.status_proses in PROSES_TERBUKA and m0 <= c.tanggal_berakhir < m1]
        timeline.append({
            "bulan": f"{BULAN[m0.month - 1]} {str(m0.year)[2:]}",
            "tahun": m0.year,
            "bulan_ke": m0.month,
            "jumlah": len(items),
            "nilai": sum(c.nilai_kontrak for c in items),
            "masa_reminder": m0 <= reminder_threshold(t),
        })

    segera = sorted(
        (c for c in contracts if compute_status(c.tanggal_berakhir, c.status_proses, t) == SEGERA_HABIS),
        key=lambda c: c.tanggal_berakhir,
    )
    segera_diproses = sum(1 for c in segera if c.status_proses == PROSES_JALAN)
    terbaru = sorted(contracts, key=lambda c: (c.created_at, c.id), reverse=True)[:5]

    top = db.execute(
        select(Contract.penyedia, func.count(Contract.id), func.sum(Contract.nilai_kontrak))
        .group_by(Contract.penyedia)
        .order_by(func.sum(Contract.nilai_kontrak).desc())
        .limit(5)
    ).all()

    return {
        "total_kontrak": len(contracts),
        "total_nilai": sum(c.nilai_kontrak for c in contracts),
        "nilai_berjalan": nilai[AKTIF] + nilai[SEGERA_HABIS],
        "counts": counts,
        "nilai_per_status": nilai,
        "segera_habis": [ContractOut.from_model(c) for c in segera],
        "segera_proses": {"belum": len(segera) - segera_diproses, "proses": segera_diproses},
        "terbaru": [ContractOut.from_model(c) for c in terbaru],
        "timeline": timeline,
        "top_penyedia": [{"penyedia": p, "jumlah": n, "nilai": int(v or 0)} for p, n, v in top],
        "tanggal": t.isoformat(),
    }


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    t, th = today(), reminder_threshold()
    rows = db.scalars(
        select(Contract)
        .where(Contract.status_proses.in_(PROSES_TERBUKA), Contract.tanggal_berakhir <= th, Contract.tanggal_berakhir >= t - relativedelta(days=30))
        .order_by(Contract.tanggal_berakhir)
    ).all()
    items = [ContractOut.from_model(c) for c in rows]
    return {"jumlah": sum(1 for i in items if i.status == SEGERA_HABIS), "items": items}
