#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Laika CV builder - writes a CV in Laika's standard two-page layout, or a one-page cover letter in the
same design, as an editable .docx plus a PDF.

A Python port of the standard CV generator: the same design tokens, exact line heights, section order
and rule checks, so Word and the PDF paginate identically. The rules are in references/tailored-cv.md
and references/cover-letter.md.

Usage:  python cv_builder.py content.json OutputBaseName [--letter] [--pdf auto|libreoffice|word|none]
Exit codes: 0 = built and all rule checks passed, 1 = setup problem, 2 = a rule failed (fix the
content and rebuild).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:  # Windows consoles default to cp1252; CVs are full of non-ASCII names and places.
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# ---------- Design tokens (measured from the reference CV) ----------
BLUE = "4F81BD"          # name + section headings
GRAY = "4A4A4A"          # contact lines, company/location/date lines
BLACK = "000000"
HEAD = "Calibri"         # name, section headings, job titles
BODY = "Arial"           # everything else
SZ = {"name": 26, "section": 13, "jobTitle": 11.5, "body": 11, "meta": 10, "contact": 9.5}  # pt
# Exact line heights (pt) so Word and LibreOffice/PDF lay out identically.
LH = {"body": 13.4, "contact": 13.4, "meta": 13, "jobTitle": 14, "section": 16, "edu": 14.2}
# Gap between a section heading and its first line (pt). Only one side of any gap is ever set,
# because LibreOffice collapses before/after to the larger value while Word may add them.
GAP = {"text": 7.5, "firstJob": 11, "school": 7, "list": 8.4}
MARGIN = 1036            # 0.72in left/right/bottom (twips)
PAGE = (11906, 16838)    # A4 (twips)
TOP = 900                # 0.625in


def pt(n: float) -> int:
    """Points -> twips, rounded like Math.round."""
    return int(n * 20 + 0.5)


def hp(n: float) -> int:
    """Points -> half-points."""
    return int(n * 2 + 0.5)


MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9,
          "oct": 10, "nov": 11, "dec": 12}
# File-name month tags used by the standard naming (First_Last_CV_<Mon><YY>).
MONTH_TAGS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"]


def date_key(s, is_end: bool) -> int:
    t = str(s or "").strip().lower()
    if not t or re.search(r"present|current|now|ongoing", t):
        return 999999
    m = re.search(r"(?:([a-z]+)\.?\s+)?(\d{4})", t, re.A)
    if not m:
        raise ValueError(f'Unparseable date: "{s}"')
    mo = MONTHS.get(m.group(1)[:3]) if m.group(1) else (12 if is_end else 1)
    return int(m.group(2)) * 100 + (mo or 1)


def by_recency(items: list[dict]) -> list[dict]:
    """Reverse-chronological: most recent end date first, then most recent start date."""
    return sorted(items, key=lambda x: (-date_key(x.get("end"), True), -date_key(x.get("start"), False)))


# Any bracketed text, X-style figures, TBD/TBC or ?? is a placeholder metric - never ship one.
PLACEHOLDER = re.compile(r"\[[^\]]*\]|\{[^}]*\}|<[^>]+>|\bTB[DC]\b|\b[Xx]{1,3}(?:[.,]\d+)?\s?(?:%|x\b|million|M\b|k\b)"
                         r"|\b[Xx]{2,}\b|\?\?|\bN/A\b", re.A)


# ---------- PDF converters ----------
def find_soffice() -> str | None:
    for name in ("soffice", "libreoffice"):
        p = shutil.which(name)
        if p:
            return p
    for c in (r"C:\Program Files\LibreOffice\program\soffice.exe",
              r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
              "/Applications/LibreOffice.app/Contents/MacOS/soffice"):
        if Path(c).exists():
            return c
    return None


def word_available() -> bool:
    if os.name != "nt":
        return False
    try:
        import winreg
    except ImportError:
        return False
    for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
        try:
            with winreg.OpenKey(hive, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Winword.exe"):
                return True
        except OSError:
            pass
    return False


def pdf_engines() -> list[str]:
    """Converters available on this computer, in the order `auto` tries them."""
    out = []
    if find_soffice():
        out.append("libreoffice")
    if word_available():
        out.append("word")
    return out


def to_pdf_libreoffice(docx: Path) -> Path:
    profile = (Path(tempfile.gettempdir()) / "laika_lo_cv_profile").as_uri()
    subprocess.run([find_soffice(), f"-env:UserInstallation={profile}", "--headless", "--convert-to", "pdf",
                    "--outdir", str(docx.parent), str(docx)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=240)
    return docx.with_name(docx.name[:-5] + ".pdf")


# Paths go in through environment variables, so no quoting problems with spaces or non-ASCII names.
# Word is only closed if this script's document was the last one open, so the user's own documents stay open.
WORD_PS = r"""
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
try {
  $d = $w.Documents.Open($env:LAIKA_CV_DOCX, $false, $true)
  $d.ExportAsFixedFormat($env:LAIKA_CV_PDF, 17)
  $d.Close(0)
} finally {
  if ($w.Documents.Count -eq 0) { $w.Quit() }
}
"""


def to_pdf_word(docx: Path) -> Path:
    pdf = docx.with_name(docx.name[:-5] + ".pdf")
    env = dict(os.environ, LAIKA_CV_DOCX=str(docx), LAIKA_CV_PDF=str(pdf))
    subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", WORD_PS],
                   check=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=240)
    return pdf


def page_count(pdf: Path) -> int:
    try:
        import pypdf  # type: ignore
        return len(pypdf.PdfReader(str(pdf)).pages)
    except ImportError:
        return len(re.findall(rb"/Type\s*/Page(?![a-z])", pdf.read_bytes()))


# ---------- document ----------
class DocWriter:
    """A blank A4 document with the shared design tokens, plus paragraph and run helpers."""

    def __init__(self):
        from docx import Document
        from docx.oxml import parse_xml
        from docx.oxml.ns import nsdecls, qn
        from docx.shared import Twips

        self.qn, self.Twips = qn, Twips
        self.doc = doc = Document()
        body = doc.element.body
        for p in list(body.iterchildren(qn("w:p"))):
            body.remove(p)

        # Document defaults: Arial 11pt, no inherited paragraph spacing (each paragraph sets its own).
        styles = doc.styles.element
        rpr_default = styles.find(qn("w:docDefaults")).find(qn("w:rPrDefault")).find(qn("w:rPr"))
        fonts = rpr_default.find(qn("w:rFonts"))
        for k in list(fonts.attrib):
            del fonts.attrib[k]
        for k in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            fonts.set(qn(k), BODY)
        rpr_default.find(qn("w:sz")).set(qn("w:val"), str(hp(SZ["body"])))
        rpr_default.find(qn("w:szCs")).set(qn("w:val"), str(hp(SZ["body"])))
        ppr_default = styles.find(qn("w:docDefaults")).find(qn("w:pPrDefault")).find(qn("w:pPr"))
        for child in list(ppr_default):
            ppr_default.remove(child)
        # Current Word layout rules (compatibility mode 15).
        compat = doc.settings.element.find(qn("w:compat"))
        if compat is not None:
            for child in list(compat):
                compat.remove(child)
            compat.append(parse_xml(f'<w:compatSetting {nsdecls("w")} w:name="compatibilityMode" '
                                    f'w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>'))

        # Bullet definitions: "•" flush with the margin for experience; Word's standard round bullet
        # (Symbol font, 0.25"/0.5") for Professional Development and Languages.
        numbering = doc.part.numbering_part.element
        used = [int(x) for x in re.findall(r'w:abstractNumId="(\d+)"', numbering.xml)]
        used_num = [int(x) for x in re.findall(r'<w:num w:numId="(\d+)"', numbering.xml)]
        abs_id, num_id = max(used, default=-1) + 1, max(used_num, default=0) + 1
        self.num_ids = {}
        for key, text, suff, left, hanging, font in (("exp", "•", '<w:suff w:val="space"/>', 188, 188, BODY),
                                                     ("list", "", "", 720, 360, "Symbol")):
            absnum = parse_xml(
                f'<w:abstractNum {nsdecls("w")} w:abstractNumId="{abs_id}">'
                f'<w:multiLevelType w:val="hybridMultilevel"/>'
                f'<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/>{suff}'
                f'<w:lvlText w:val="{text}"/><w:lvlJc w:val="left"/>'
                f'<w:pPr><w:ind w:left="{left}" w:hanging="{hanging}"/></w:pPr>'
                f'<w:rPr><w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:eastAsia="{font}" w:cs="{font}"/></w:rPr>'
                f'</w:lvl></w:abstractNum>')
            first_num = numbering.find(qn("w:num"))
            if first_num is not None:
                first_num.addprevious(absnum)
            else:
                numbering.append(absnum)
            numbering.append(parse_xml(f'<w:num {nsdecls("w")} w:numId="{num_id}"><w:abstractNumId w:val="{abs_id}"/></w:num>'))
            self.num_ids[key] = num_id
            abs_id, num_id = abs_id + 1, num_id + 1

    def run_el(self, text: str, font: str, size: float, color: str, bold: bool = False):
        from docx.oxml import OxmlElement
        qn = self.qn
        r = OxmlElement("w:r")
        rpr = OxmlElement("w:rPr")
        rf = OxmlElement("w:rFonts")
        for k in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            rf.set(qn(k), font)
        rpr.append(rf)
        if bold:
            rpr.append(OxmlElement("w:b"))
            rpr.append(OxmlElement("w:bCs"))
        c = OxmlElement("w:color")
        c.set(qn("w:val"), color)
        rpr.append(c)
        for tag in ("w:sz", "w:szCs"):
            s = OxmlElement(tag)
            s.set(qn("w:val"), str(hp(size)))
            rpr.append(s)
        r.append(rpr)
        t = OxmlElement("w:t")
        t.set(qn("xml:space"), "preserve")
        t.text = text
        r.append(t)
        return r

    def runs(self, p, text, font=BODY, size=SZ["body"], color=BLACK, bold=False):
        """**bold** markup -> runs. Bold marks the key metric/achievement phrase in a bullet."""
        for part in [x for x in re.split(r"(\*\*[^*]+\*\*)", str(text)) if x]:
            if part.startswith("**") and part.endswith("**"):
                p._p.append(self.run_el(part[2:-2], font, size, color, True))
            else:
                p._p.append(self.run_el(part, font, size, color, bold))

    def para(self, keep_next=False, keep_lines=False, before=None, after=None, line=None, numbered=None):
        p = self.doc.add_paragraph()
        pf = p.paragraph_format
        if keep_next:
            pf.keep_with_next = True
        if keep_lines:
            pf.keep_together = True
        if numbered:
            num_pr = p._p.get_or_add_pPr().get_or_add_numPr()
            num_pr.get_or_add_ilvl().val = 0
            num_pr.get_or_add_numId().val = self.num_ids[numbered]
        if before is not None:
            pf.space_before = self.Twips(before)
        if after is not None:
            pf.space_after = self.Twips(after)
        if line is not None:
            pf.line_spacing = self.Twips(pt(line))  # a Length means an exact line height
        return p

    def contact_line(self, line: str):
        from docx.opc.constants import RELATIONSHIP_TYPE as RT
        from docx.oxml import OxmlElement
        qn = self.qn
        p = self.para(after=0, line=LH["contact"])
        for i, part in enumerate(line.split(" | ")):
            if i:
                p._p.append(self.run_el(" | ", BODY, SZ["contact"], GRAY))
            if re.match(r"^(https?://|www\.)", part, re.I) or re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", part):
                link = f"mailto:{part}" if "@" in part and not part.startswith("http") else \
                       (part if part.startswith("http") else f"https://{part}")
                rid = self.doc.part.relate_to(link, RT.HYPERLINK, is_external=True)
                h = OxmlElement("w:hyperlink")
                h.set(qn("r:id"), rid)
                h.set(qn("w:history"), "1")
                h.append(self.run_el(part, BODY, SZ["contact"], GRAY))
                p._p.append(h)
            else:
                p._p.append(self.run_el(part, BODY, SZ["contact"], GRAY))

    def header(self, name: str, headline: str | None, contact: list[str]):
        p = self.para(after=pt(5))
        p._p.append(self.run_el(name, HEAD, SZ["name"], BLUE, bold=True))
        if headline:
            self.body_para(headline, after=pt(3))
        for line in contact or []:
            self.contact_line(line)

    def section(self, title: str):
        p = self.para(keep_next=True, before=pt(14), after=0, line=LH["section"])
        self.runs(p, title, HEAD, SZ["section"], BLUE, bold=True)

    def body_para(self, text, keep_next=False, before=None, after=0, line=LH["body"]):
        p = self.para(keep_next=keep_next, keep_lines=True, before=before, after=after, line=line)
        self.runs(p, text)

    def meta_para(self, text, keep_next=False, after=0, line=LH["meta"]):
        p = self.para(keep_next=keep_next, after=pt(after), line=line)
        p._p.append(self.run_el(text, BODY, SZ["meta"], GRAY))

    def save(self, path: Path, name: str, title: str):
        sec = self.doc.sections[0]
        Twips = self.Twips
        sec.page_width, sec.page_height = Twips(PAGE[0]), Twips(PAGE[1])
        sec.top_margin, sec.bottom_margin = Twips(TOP), Twips(MARGIN)
        sec.left_margin, sec.right_margin = Twips(MARGIN), Twips(MARGIN)
        sec.header_distance = sec.footer_distance = Twips(708)
        sec.gutter = Twips(0)
        props = self.doc.core_properties
        props.author = props.last_modified_by = name
        props.title = title
        props.comments = props.subject = props.keywords = ""
        self.doc.save(str(path))


def build_docx(cv: dict, docx_path: Path) -> None:
    w = DocWriter()
    w.header(cv["name"], cv.get("headline"), cv.get("contact") or [])

    # Professional Summary
    if cv.get("summary"):
        w.section("Professional Summary")
        w.body_para(cv["summary"], before=pt(GAP["text"]))

    # Work Experience (always re-sorted reverse-chronologically)
    jobs = by_recency(cv.get("experience") or [])
    if jobs:
        w.section("Work Experience")
        for ji, j in enumerate(jobs):
            p = w.para(keep_next=True, keep_lines=True, before=pt(GAP["firstJob"] if ji == 0 else 10.5), after=pt(2),
                       line=LH["jobTitle"])
            p._p.append(w.run_el(j["title"], HEAD, SZ["jobTitle"], BLACK, bold=True))
            meta = " | ".join(x for x in (j.get("company"), j.get("location"), f"{j.get('start')} - {j.get('end')}") if x)
            w.meta_para(meta, keep_next=True, after=6)
            bullets = j.get("bullets") or []
            for bi, b in enumerate(bullets):
                last = bi == len(bullets) - 1
                p = w.para(keep_next=not last, keep_lines=True, after=0 if last else pt(5), line=LH["body"], numbered="exp")
                w.runs(p, b)

    # Education (reverse-chronological)
    edu = by_recency(cv.get("education") or [])
    if edu:
        w.section("Education")
        for i, e in enumerate(edu):
            p = w.para(keep_next=True, before=pt(GAP["school"] if i == 0 else 2.8), line=LH["edu"])
            p._p.append(w.run_el(e["school"], BODY, SZ["body"], BLACK, bold=True))
            w.body_para(e.get("degree", ""), keep_next=True, line=LH["edu"])
            years = " - ".join(x for x in (e.get("start"), e.get("end")) if x)
            w.meta_para(" | ".join(x for x in (e.get("location"), years) if x), keep_next=i < len(edu) - 1, line=LH["edu"])

    def list_section(title: str, items):
        if not items:
            return
        w.section(title)
        for i, t in enumerate(items):
            p = w.para(keep_next=i < len(items) - 1, keep_lines=True, before=pt(GAP["list"] if i == 0 else 0.8), after=0,
                       line=LH["body"], numbered="list")
            w.runs(p, t)

    list_section("Professional Development", cv.get("professional_development"))
    if cv.get("skills"):
        w.section("Skills")
        s = "; ".join(cv["skills"]) if isinstance(cv["skills"], list) else str(cv["skills"])
        w.body_para(s if s.endswith(".") else f"{s}.", before=pt(GAP["text"]))
    list_section("Languages", cv.get("languages"))
    w.save(docx_path, cv["name"], f"{cv['name']} — CV")


# Cover letter spacing (pt): the same header as the CV, then a classic letter block.
LETTER_GAP = {"date": 22, "block": 13.4, "para": 8, "signature": 10}


def build_letter_docx(letter: dict, docx_path: Path) -> None:
    w = DocWriter()
    w.header(letter["name"], None, letter.get("contact") or [])
    if letter.get("date"):
        w.body_para(letter["date"], before=pt(LETTER_GAP["date"]))
    for i, line in enumerate(letter.get("recipient") or []):
        w.body_para(line, keep_next=True, before=pt(LETTER_GAP["block"]) if i == 0 else None)
    if letter.get("subject"):
        p = w.para(keep_lines=True, before=pt(LETTER_GAP["block"]), after=0, line=LH["body"])
        w.runs(p, letter["subject"], bold=True)
    if letter.get("salutation"):
        w.body_para(letter["salutation"], keep_next=True, before=pt(LETTER_GAP["block"]))
    for i, text in enumerate(letter.get("paragraphs") or []):
        w.body_para(text, before=pt(LETTER_GAP["block"] if i == 0 and not letter.get("salutation") else LETTER_GAP["para"]))
    if letter.get("closing"):
        w.body_para(letter["closing"], keep_next=True, before=pt(LETTER_GAP["block"]))
    w.body_para(letter.get("signature") or letter["name"], before=pt(LETTER_GAP["signature"]))
    w.save(docx_path, letter["name"], f"{letter['name']} — Cover letter")


def make_pdf(docx_path: Path, pdf: str) -> int | None:
    """Convert to PDF with the first working converter; returns the page count, or None without a PDF."""
    engines = pdf_engines()
    order = engines if pdf == "auto" else ([pdf] if pdf in engines else [])
    if pdf == "none":
        print("PDF: skipped (--pdf none)")
        return None
    if not order:
        want = "LibreOffice or Microsoft Word" if pdf == "auto" else ("LibreOffice" if pdf == "libreoffice" else "Microsoft Word")
        print(f"PDF: NOT created - {want} was not found. Install LibreOffice (free, libreoffice.org), or on Windows use "
              "Microsoft Word, then rebuild. The .docx is ready, but the page limit could not be checked.")
        return None
    for engine in order:
        try:
            pdf_path = (to_pdf_libreoffice if engine == "libreoffice" else to_pdf_word)(docx_path)
            if pdf_path.exists():
                pages = page_count(pdf_path)
                print(f"Built {pdf_path} (via {'LibreOffice' if engine == 'libreoffice' else 'Microsoft Word'})")
                print(f"Pages: {pages}")
                return pages
        except (subprocess.SubprocessError, OSError) as e:
            print(f"PDF via {engine} failed ({e.__class__.__name__}); trying the next converter if there is one.")
    return None


def placeholder_problems(data) -> list[str]:
    strings = []

    def walk(v):
        if isinstance(v, str):
            strings.append(v)
        elif isinstance(v, dict):
            for x in v.values():
                walk(x)
        elif isinstance(v, list):
            for x in v:
                walk(x)
    walk(data)
    out = []
    for t in strings:
        m = PLACEHOLDER.search(t)
        if m:
            out.append(f'Placeholder found ("{m.group(0)}") in: "{t[:60]}…" - ask the user for the real figure or '
                       "drop the claim.")
    return out


def write_docx(builder, data: dict, out_base: Path) -> Path | None:
    out_base = Path(out_base).resolve()
    out_base.parent.mkdir(parents=True, exist_ok=True)
    docx_path = Path(str(out_base) + ".docx")
    try:
        builder(data, docx_path)
    except PermissionError:
        print(f"Could not write {docx_path} - it is probably open in Word. Close it and rebuild.")
        return None
    print(f"Built {docx_path}")
    return docx_path


def load_content(content_path: Path) -> dict | None:
    try:
        import docx  # noqa: F401
    except ImportError:
        print(f"MISSING python-docx - install it with:  \"{sys.executable}\" -m pip install python-docx")
        return None
    data = json.loads(Path(content_path).read_text(encoding="utf-8-sig"))
    if not data.get("name"):
        print('The content file needs at least a "name".')
        return None
    return data


def build(content_path: Path, out_base: Path, pdf: str = "auto") -> int:
    cv = load_content(content_path)
    if cv is None:
        return 1
    try:
        jobs = by_recency(cv.get("experience") or [])
        by_recency(cv.get("education") or [])
    except ValueError as e:
        print(f"RULE VIOLATIONS:\n  {e} - use 'Month YYYY', 'YYYY' or 'Present'.")
        return 2
    docx_path = write_docx(build_docx, cv, out_base)
    if docx_path is None:
        return 1
    pages = make_pdf(docx_path, pdf)

    # ---------- rule checks ----------
    problems = placeholder_problems(cv)
    if pages is not None and pages > 2:
        problems.insert(0, f"CV is {pages} pages - the limit is 2. Trim content and rebuild.")
    notes = []
    for j in jobs:
        for b in j.get("bullets") or []:
            if not re.search(r"\d", b):
                notes.append(f'No metric: {j.get("title")} @ {j.get("company")}: "{b[:70]}{"…" if len(b) > 70 else ""}"')

    print("Experience order:")
    for j in jobs:
        print(f"  {j.get('start')} - {j.get('end')}  {j.get('title')} ({j.get('company')})")
    if notes:
        print("Bullets without a metric (ask the user if one exists - never invent):")
        for n in notes:
            print("  " + n)
    if problems:
        print("RULE VIOLATIONS:")
        for p in problems:
            print("  " + p)
        return 2
    print("All rule checks passed." if pages is not None else "Content checks passed (page count not checked - no PDF).")
    return 0


def build_letter(content_path: Path, out_base: Path, pdf: str = "auto") -> int:
    letter = load_content(content_path)
    if letter is None:
        return 1
    paras = letter.get("paragraphs") or []
    if not paras:
        print('RULE VIOLATIONS:\n  The letter has no "paragraphs".')
        return 2
    docx_path = write_docx(build_letter_docx, letter, out_base)
    if docx_path is None:
        return 1
    pages = make_pdf(docx_path, pdf)

    problems = placeholder_problems(letter)
    if pages is not None and pages > 1:
        problems.insert(0, f"Cover letter is {pages} pages - the limit is 1. Shorten it and rebuild.")
    words = sum(len(re.findall(r"\S+", p)) for p in paras)
    print(f"Body: {len(paras)} paragraphs, {words} words")
    notes = []
    if words > 450:
        notes.append("Long for a cover letter (aim for about 250-400 words unless the writing style says otherwise).")
    elif words < 150:
        notes.append("Short for a cover letter (about 250-400 words is usual).")
    for key in ("salutation", "closing"):
        if not letter.get(key):
            notes.append(f'No "{key}" - add one unless the writing style leaves it out on purpose.')
    if any("**" in p for p in paras):
        notes.append("Bold text in the body - letters normally have none.")
    for n in notes:
        print("Note: " + n)
    if problems:
        print("RULE VIOLATIONS:")
        for p in problems:
            print("  " + p)
        return 2
    print("All rule checks passed." if pages is not None else "Content checks passed (page count not checked - no PDF).")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Build a CV or cover letter (.docx + .pdf) in Laika's standard layout")
    ap.add_argument("content", help="content.json (CV) or letter.json (with --letter)")
    ap.add_argument("out_base", help="Output path without extension, e.g. out/First_Last_CV_Oct26")
    ap.add_argument("--letter", action="store_true", help="Build a one-page cover letter instead of a CV")
    ap.add_argument("--pdf", choices=["auto", "libreoffice", "word", "none"], default="auto")
    a = ap.parse_args(argv)
    sys.exit((build_letter if a.letter else build)(Path(a.content), Path(a.out_base), a.pdf))


if __name__ == "__main__":
    main()
