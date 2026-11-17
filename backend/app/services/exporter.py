"""Export daftar kontrak ke Excel dan PDF."""
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .status import today

MIDNIGHT = "0F172A"
NAVY = "1E293B"
CHAMPAGNE = "D4B483"
IVORY = "FAF8F3"

BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def tgl(d) -> str:
    return f"{d.day:02d} {BULAN[d.month - 1]} {d.year}"


def rupiah(n: int) -> str:
    return "Rp " + f"{n:,}".replace(",", ".")


HEADERS = ["No", "Nama Kontrak", "Penyedia", "Nomor PKS", "Tanggal PKS", "Tanggal Awal Kontrak", "Tanggal Akhir Kontrak", "Nilai Kontrak", "Sisa Kontrak", "Status"]


def to_xlsx(items) -> BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Daftar Kontrak"

    ws.merge_cells("A1:J1")
    ws["A1"] = "DAFTAR KONTRAK"
    ws["A1"].font = Font(bold=True, size=14, color=MIDNIGHT)
    ws.merge_cells("A2:J2")
    ws["A2"] = f"Dicetak {tgl(today())} · {len(items)} kontrak"
    ws["A2"].font = Font(size=10, color="64748B")

    head_fill = PatternFill("solid", fgColor=MIDNIGHT)
    thin = Side(style="thin", color="E2E8F0")
    for i, h in enumerate(HEADERS, 1):
        cell = ws.cell(row=4, column=i, value=h)
        cell.font = Font(bold=True, color=CHAMPAGNE)
        cell.fill = head_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[4].height = 24

    for r, c in enumerate(items, 5):
        row = [r - 4, c.nama_kontrak, c.penyedia, c.nomor_pks, c.tanggal_pks, c.tanggal_mulai, c.tanggal_berakhir, c.nilai_kontrak, c.sisa_text, c.status_label]
        for col, v in enumerate(row, 1):
            cell = ws.cell(row=r, column=col, value=v)
            cell.border = Border(bottom=thin)
            if col in (5, 6, 7):
                cell.number_format = "DD MMM YYYY"
            if col == 8:
                cell.number_format = '"Rp" #,##0'
        if (r - 5) % 2:
            for col in range(1, 11):
                ws.cell(row=r, column=col).fill = PatternFill("solid", fgColor=IVORY)

    total_row = len(items) + 5
    ws.cell(row=total_row, column=7, value="Total").font = Font(bold=True)
    tc = ws.cell(row=total_row, column=8, value=f"=SUM(H5:H{total_row - 1})" if items else 0)
    tc.font = Font(bold=True)
    tc.number_format = '"Rp" #,##0'

    widths = [6, 38, 28, 24, 15, 20, 21, 20, 20, 15]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A5"
    ws.auto_filter.ref = f"A4:J{max(4, total_row - 1)}"

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def to_pdf(items, dicetak_oleh: str) -> BytesIO:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=14 * mm, rightMargin=14 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
                            title="Daftar Kontrak")
    title = ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=16, textColor=colors.HexColor("#" + MIDNIGHT), spaceAfter=4)
    sub = ParagraphStyle("s", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#64748B"))
    cell = ParagraphStyle("c", fontName="Helvetica", fontSize=8, leading=10)

    total = sum(c.nilai_kontrak for c in items)
    story = [
        Paragraph("Daftar Kontrak", title),
        Paragraph(f"Dicetak {tgl(today())} oleh {dicetak_oleh} · {len(items)} kontrak · Total nilai {rupiah(total)}", sub),
        Spacer(1, 8 * mm),
    ]
    head = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.HexColor("#" + CHAMPAGNE))
    data = [[Paragraph(h, head) for h in HEADERS]]
    for i, c in enumerate(items, 1):
        data.append([
            str(i), Paragraph(c.nama_kontrak, cell), Paragraph(c.penyedia, cell), Paragraph(c.nomor_pks, cell),
            tgl(c.tanggal_pks), tgl(c.tanggal_mulai) if c.tanggal_mulai else "-", tgl(c.tanggal_berakhir), rupiah(c.nilai_kontrak), c.sisa_text, c.status_label,
        ])
    t = Table(data, repeatRows=1, colWidths=[9 * mm, 46 * mm, 36 * mm, 32 * mm, 22 * mm, 24 * mm, 24 * mm, 30 * mm, 24 * mm, 22 * mm])
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#" + MIDNIGHT)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#" + CHAMPAGNE)),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (7, 1), (7, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
    ]
    status_color = {"Segera Habis": "#B45309", "Berakhir": "#B91C1C", "Aktif": "#047857", "Diperpanjang": "#1D4ED8"}
    for i, c in enumerate(items, 1):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#" + IVORY)))
        style.append(("TEXTCOLOR", (9, i), (9, i), colors.HexColor(status_color.get(c.status_label, "#0F172A"))))
    t.setStyle(TableStyle(style))
    story.append(t)
    doc.build(story)
    buf.seek(0)
    return buf
