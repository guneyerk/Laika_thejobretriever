#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Laika dashboard - a local web UI over the job-search folder (Python standard library only).

Started with `laika ui`. It listens on 127.0.0.1 only, and every API call must carry the random key that
is printed in the address, so other web pages can't read or change anything. Reading and recording
decisions happen here directly; Scan now, Create CV and Create cover letter run Laika through Claude Code
in the background (`claude -p`), one task at a time.
"""
from __future__ import annotations

import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

UI_DIR = Path(__file__).resolve().parent / "ui"
STATIC = {"/": ("index.html", "text/html; charset=utf-8"), "/index.html": ("index.html", "text/html; charset=utf-8"),
          "/app.js": ("app.js", "text/javascript; charset=utf-8"), "/app.css": ("app.css", "text/css; charset=utf-8")}

SECTORS = [("Recruiting", r"staffing|recruit"), ("Software & IT", r"software|it services|technology|internet|computer"),
           ("Energy & utilities", r"energy|utilit|oil|renewable|power"),
           ("Manufacturing & industrial", r"manufactur|appliances|electrical|industrial|machinery|packaging|plastic|chemical|automation"),
           ("Financial services", r"financ|bank|insurance|investment|capital markets"),
           ("Healthcare & pharma", r"health|pharma|medical|biotech|hospital"),
           ("Retail & consumer", r"retail|consumer|food|beverage|luxury|apparel|cosmetic"),
           ("Real estate & construction", r"real estate|construction|building|architecture"),
           ("Logistics & transport", r"transport|logistic|supply chain|airline|maritime"),
           ("Consulting & services", r"consult|business services|outsourcing|professional services"),
           ("Media & marketing", r"media|advertis|marketing|entertainment|publishing"), ("Education", r"education|e-learning")]
RECRUITER = re.compile(r"recruit|staffing|talent|headhunt|executive search|personnel|hays\b|michael page|robert walters|randstad|"
                       r"adecco|manpower|korn ferry|spencer stuart|heidrick|egon zehnder|russell reynolds|jobgether|page executive", re.I)
US_STATES = {"AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
             "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
             "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"}
COUNTRY_ALIASES = {"turkiye": "Turkey", "türkiye": "Turkey", "uae": "United Arab Emirates", "uk": "United Kingdom",
                   "usa": "United States", "us": "United States"}
ALLOWED_TOOLS = ["Bash(python *)", "Bash(python3 *)", "Bash(py *)", "Read", "Write", "Edit", "Glob", "Grep",
                 "WebFetch", "WebSearch", "Skill", "TodoWrite"]
STEPS = {
    "scan": [("Planning the search", r"\brun start\b"), ("Searching LinkedIn", r"fetch-linkedin"),
             ("Reading job descriptions", r"\bdetails\b"), ("Scoring roles against your CV", r"candidates --export|scores\.json"),
             ("Saving to your tracker", r"\bregister\b")],
    "cv": [("Reading the role", r"\btailor\b"), ("Writing tailored content", r"content\.json"),
           ("Building Word + PDF", r"cv-build"), ("Checking the PDF", r"\.pdf")],
    "letter": [("Reading the role and your style", r"\bletter (J\d+|\d+)|style show|Laika Writing Style"),
               ("Writing the letter", r"letter\.json"), ("Building Word + PDF", r"letter-build"), ("Checking the PDF", r"\.pdf")],
}


def _fold(s: str) -> str:
    return (s or "").translate(str.maketrans("İıŞşĞğÜüÖöÇç", "IiSsGgUuOoCc")).lower()


# ---------------------------------------------------------------------------------------------------------
# Claude Code discovery
# ---------------------------------------------------------------------------------------------------------
def _ver(p: Path) -> tuple:
    for part in p.parts:
        if re.fullmatch(r"\d+(\.\d+)+", part):
            return tuple(int(x) for x in part.split("."))
    return (0,)


def find_claude() -> str | None:
    env = os.environ.get("LAIKA_CLAUDE")
    if env and Path(env).exists():
        return env
    w = shutil.which("claude")
    if w:
        return w
    cands = []
    if os.name == "nt":
        cands += list((Path(os.environ.get("APPDATA", "")) / "Claude" / "claude-code").glob("*/*/claude.exe"))
    else:
        cands += list((Path.home() / "Library/Application Support/Claude/claude-code").glob("*/*/claude"))
    for extra in (Path.home() / ".claude/local/claude", Path.home() / ".local/bin/claude"):
        if extra.exists():
            cands.append(extra)
    cands = [c for c in cands if c.exists()]
    return str(max(cands, key=_ver)) if cands else None


# Settings a user may give Claude Code themselves; kept when the rest of a host session's variables are dropped.
_KEEP_VARS = ("CLAUDE_CODE_USE_", "CLAUDE_CODE_SKIP_", "CLAUDE_CODE_GIT_BASH_PATH", "CLAUDE_CODE_OAUTH_TOKEN",
              "CLAUDE_CODE_MAX_OUTPUT_TOKENS", "CLAUDE_CODE_API_KEY_HELPER_TTL_MS", "CLAUDE_CODE_CLIENT_")


def cli_env() -> dict:
    """The environment for Claude Code runs. When the dashboard was started from inside a Claude Code session,
    that session's own variables are dropped, so background tasks run as independent sessions."""
    env = dict(os.environ)
    if env.get("CLAUDECODE"):
        for k in list(env):
            if k == "CLAUDECODE" or k.startswith(("CLAUDE_AGENT_SDK_", "CLAUDE_PREVIEW_")) or k in ("CLAUDE_PID", "CLAUDE_EFFORT")                     or (k.startswith("CLAUDE_CODE_") and not k.startswith(_KEEP_VARS)):
                del env[k]
    return env


_status_cache = {"at": 0.0, "value": None}


def claude_status(force: bool = False) -> dict:
    if not force and _status_cache["value"] and time.time() - _status_cache["at"] < 30:
        return _status_cache["value"]
    cli = find_claude()
    out = {"found": bool(cli), "path": cli, "loggedIn": False}
    if cli:
        try:
            r = subprocess.run([cli, "auth", "status", "--json"], capture_output=True, text=True, encoding="utf-8",
                               errors="replace", timeout=25, env=cli_env(), **_no_window())
            data = json.loads(r.stdout or "{}")
            out["loggedIn"] = bool(data.get("loggedIn"))
            out["authMethod"] = data.get("authMethod")
        except (OSError, subprocess.SubprocessError, ValueError):
            out["error"] = "Could not ask Claude Code for its sign-in status."
    _status_cache.update(at=time.time(), value=out)
    return out


def _no_window() -> dict:
    return {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}


# ---------------------------------------------------------------------------------------------------------
# Background tasks (one at a time)
# ---------------------------------------------------------------------------------------------------------
class Tasks:
    def __init__(self, m: Path, workspace: Path):
        self.m, self.workspace = m, workspace
        self.dir = m / ".laika" / "tasks"
        self.dir.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        self.items: list[dict] = []
        self.proc = None
        for f in sorted(self.dir.glob("*.json"))[-15:]:
            try:
                t = json.loads(f.read_text(encoding="utf-8"))
                if t.get("status") == "running":
                    t["status"], t["summary"] = "stopped", "The dashboard was closed while this task ran."
                self.items.append(t)
            except (OSError, ValueError):
                pass
        self.version = 0

    def running(self) -> dict | None:
        return next((t for t in self.items if t["status"] == "running"), None)

    def public(self) -> list[dict]:
        keep = ("id", "kind", "job", "label", "status", "started", "ended", "steps", "step", "activity", "summary", "cost", "error")
        return [{k: t.get(k) for k in keep} for t in reversed(self.items[-10:])]

    def _save(self, t: dict) -> None:
        (self.dir / f"{t['id']}.json").write_text(json.dumps(t, ensure_ascii=False, indent=1), encoding="utf-8")
        self.version += 1

    def start(self, kind: str, job: dict | None, inputs: dict) -> dict:
        with self.lock:
            if self.running():
                raise RuntimeError("Laika is already working on a task. Wait for it to finish.")
            cli = find_claude()
            if not cli:
                raise RuntimeError("Claude Code was not found on this computer.")
            label = {"scan": "Scan now", "cv": "Create CV", "letter": "Create cover letter"}[kind]
            if job:
                label += f" · {job['title']} - {job['company']}"
            t = {"id": time.strftime("%Y%m%d-%H%M%S") + "-" + kind, "kind": kind, "job": job["id"] if job else None,
                 "label": label, "status": "running", "started": time.strftime("%Y-%m-%d %H:%M:%S"), "ended": None,
                 "steps": [s for s, _ in STEPS[kind]], "step": -1, "activity": "Starting Claude Code…", "summary": "",
                 "cost": None, "error": None}
            self.items.append(t)
            self._save(t)
            prompt = build_prompt(kind, job, inputs)
            threading.Thread(target=self._run, args=(t, cli, prompt), daemon=True).start()
            return t

    def cancel(self, tid: str) -> bool:
        t = next((x for x in self.items if x["id"] == tid), None)
        if t and t["status"] == "running" and self.proc:
            self.proc.terminate()
            t["status"], t["summary"] = "stopped", "Stopped from the dashboard."
            self._save(t)
            return True
        return False

    def _advance(self, t: dict, text: str) -> None:
        for i, (_, rx) in enumerate(STEPS[t["kind"]]):
            if i > t["step"] and re.search(rx, text, re.I):
                t["step"] = i

    def _run(self, t: dict, cli: str, prompt: str) -> None:
        cmd = [cli, "-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits",
               "--add-dir", str(self.m), "--allowedTools", *ALLOWED_TOOLS]
        raw = (self.dir / f"{t['id']}.jsonl").open("w", encoding="utf-8")
        try:
            self.proc = subprocess.Popen(cmd, cwd=str(self.workspace), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                         stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
                                         env=cli_env(), **_no_window())
            self.proc.stdin.write(prompt)
            self.proc.stdin.close()
            for line in self.proc.stdout:
                raw.write(line)
                line = line.strip()
                if not line:
                    continue
                try:
                    ev = json.loads(line)
                except ValueError:
                    t["activity"] = line[:160]
                    continue
                if ev.get("type") == "assistant":
                    for c in (ev.get("message") or {}).get("content") or []:
                        if c.get("type") == "tool_use":
                            inp = c.get("input") or {}
                            desc = (inp.get("description") or inp.get("command") or inp.get("file_path") or inp.get("url")
                                    or inp.get("skill") or inp.get("query") or inp.get("pattern") or c.get("name"))
                            t["activity"] = f"{c.get('name')}: {str(desc)[:150]}"
                            self._advance(t, json.dumps(inp, ensure_ascii=False))
                        elif c.get("type") == "text" and c.get("text", "").strip():
                            t["activity"] = c["text"].strip().splitlines()[0][:160]
                elif ev.get("type") == "result":
                    t["summary"] = (ev.get("result") or "").strip()
                    t["cost"] = ev.get("total_cost_usd")
                    if ev.get("is_error"):
                        t["error"] = t["summary"] or "Claude Code reported an error."
                self._save(t)
            self.proc.wait()
            if t["status"] == "running":
                ok = self.proc.returncode == 0 and not t["error"]
                t["status"] = "done" if ok else "failed"
                if ok:
                    t["step"] = len(t["steps"])
                elif not t["error"]:
                    t["error"] = f"Claude Code stopped (exit code {self.proc.returncode})."
        except OSError as e:
            t["status"], t["error"] = "failed", f"Could not start Claude Code: {e}"
        finally:
            raw.close()
            t["ended"] = time.strftime("%Y-%m-%d %H:%M:%S")
            self.proc = None
            self._save(t)


BACKGROUND = ("This is a background task started from the Laika dashboard: nobody can answer questions, so never ask any "
              "and never wait for input. Follow the laika skill, including its \"Background runs\" rules. Use only the "
              "laika helper and file tools; there is no browser in this run. Finish with a plain summary of at most "
              "5 short lines for the dashboard.")


def build_prompt(kind: str, job: dict | None, inputs: dict) -> str:
    """Prompts name the role by its Laika ID only - posting text never goes into the prompt."""
    def clean(v: str, n: int = 600) -> str:
        return re.sub(r"\s+", " ", str(v or "")).strip()[:n]
    if kind == "scan":
        return (f"[Laika dashboard task: scan]\n{BACKGROUND}\n\nRun a new Laika search now, exactly as for \"Laika, fetch!\": "
                "plan, search the api and web sites, skip browser-method sites (pass their query IDs to register --skipped), "
                "triage, score against the CV and the user's rules, and register. Don't present the shortlist or ask for "
                "decisions. In the summary: new roles, how many were shortlisted, the top 3 (score, title, company), and "
                "which sites were skipped.")
    jid = job["id"]
    if kind == "cv":
        return (f"[Laika dashboard task: cv]\n{BACKGROUND}\n\nCreate a tailored CV for role {jid} (look it up with "
                f"`laika tailor {jid}`), following references/tailored-cv.md. What the user wants emphasised: "
                f"{clean(inputs.get('notes')) or 'nothing specific'}. Key bullets without a figure stay qualitative; list "
                "them in the summary so the user can add figures later. Build it with cv-build and check the PDF.")
    return (f"[Laika dashboard task: letter]\n{BACKGROUND}\n\nWrite a cover letter for role {jid} (look it up with "
            f"`laika letter {jid}`), following references/cover-letter.md. The user's personal touch - why this role or "
            f"company: {clean(inputs.get('why')) or 'not given'}; a moment from their career that fits: "
            f"{clean(inputs.get('moment')) or 'choose the strongest one from the CV'}. If no writing style is set yet, use "
            "the default professional tone, save it as the style file, and say so in the summary. Build it with "
            "letter-build, fix what the naturalness check flags, and check the PDF.")


# ---------------------------------------------------------------------------------------------------------
# Data for the UI
# ---------------------------------------------------------------------------------------------------------
class Model:
    def __init__(self, helper, m: Path):
        self.L, self.m = helper, m

    def locations(self) -> list[dict]:
        out = []
        for loc in self.L.read_lines(self.m / self.L.F_LOCATIONS):
            where, remote = self.L.parse_location(loc)
            parts = [p.strip() for p in where.split(",") if p.strip()]
            out.append({"label": loc if remote else (parts[0] if parts else loc), "remote": remote,
                        "city": _fold(parts[0]) if parts and not remote else "", "country": parts[-1] if len(parts) > 1 else ""})
        return out

    def country(self, loc: str, locs: list[dict]) -> str:
        parts = [p.strip() for p in (loc or "").split(",") if p.strip()]
        if not parts:
            return "Unknown"
        last = parts[-1]
        for L in locs:
            if L["city"] and L["city"] in _fold(loc) and L["country"]:
                return COUNTRY_ALIASES.get(_fold(L["country"]), L["country"])
        if last in US_STATES:
            return "United States"
        return COUNTRY_ALIASES.get(_fold(last), last)

    def payload(self) -> dict:
        L, m = self.L, self.m
        st, db, crit = L.load_state(m), L.load_db(m), L.read_criteria(m)
        locs = self.locations()
        fams = L.read_families(m)
        fam_of = {_fold(r): f for f, roles in fams for r in roles}
        jobs = []
        for j in db["jobs"]:
            det = j.get("details") or {}
            loc_l = _fold(j.get("location"))
            where = next((x["label"] for x in locs if x["city"] and x["city"] in loc_l), None)
            if not where and "remote" in loc_l:
                where = next((x["label"] for x in locs if x["remote"]), None)
            role = (j.get("query") or "").split(" @ ")[0].strip()
            family = fam_of.get(_fold(role)) or (None if fams else role) or "Other"
            if fams and family not in [f for f, _ in fams]:
                family = next((f for f, roles in fams if any(_fold(r) in _fold(j["title"]) for r in roles)), "Other")
            ind_raw = j.get("industry") or det.get("industries") or ""
            sector = next((n for n, rx in SECTORS if re.search(rx, ind_raw, re.I)), "Other" if ind_raw else "")
            if j.get("industry") and not sector:
                sector = j["industry"]
            appl = det.get("applicants") or ""
            num = re.search(r"(\d+)", appl.replace(",", ""))
            score = j.get("score")
            try:
                score = int(score) if score not in (None, "") else None
            except (TypeError, ValueError):
                score = None
            jobs.append({
                "id": j["id"], "title": j["title"], "company": j["company"], "location": j.get("location") or "",
                "where": where or "", "country": self.country(j.get("location"), locs), "target": bool(where),
                "family": family, "role": role, "source": j.get("source") or "", "score": score, "status": j["status"],
                "found": j["search_date"], "posted": j.get("posted") or "", "decided": j.get("status_date") if j["status"] in L.DECIDED else "",
                "why": j.get("why") or "", "concerns": j.get("concerns") or "", "reason": j.get("reason") or "",
                "url": j.get("url") or "", "cv": j.get("tailored_cv") or "", "letter": j.get("cover_letter") or "",
                "seniority": det.get("seniority_level") or "", "industry": sector,
                "applicants": (int(num.group(1)) + (1 if "over" in appl.lower() else 0)) if num else None,
                "recruiter": bool(RECRUITER.search(j.get("company") or "")) or "Staffing and Recruiting" in (det.get("industries") or ""),
                "hasDesc": bool(det.get("description")), "run": j.get("run_id") or "", "history": j.get("history") or [],
            })
        sites = L.read_sites(m)
        return {
            "jobs": jobs, "runs": st.get("runs_log", []), "threshold": L.crit_int(crit, "min_relevancy_score"),
            "statuses": L.STATUSES, "applied": list(L.APPLIED_STAGES),
            "profile": {"roles": L.read_lines(m / L.F_ROLES), "locations": L.read_lines(m / L.F_LOCATIONS),
                        "sites": [{"name": s["name"], "method": s["method"], "url": s.get("url", "")} for s in sites],
                        "siteLines": L.read_lines(m / L.F_SITES), "criteria": crit,
                        "families": [{"name": f, "roles": r} for f, r in fams]},
            "lastSearch": st.get("last_search_at"), "master": str(m), "version": L.VERSION,
        }

    def job(self, jid: str) -> dict | None:
        j = self.L.find_job(self.L.load_db(self.m), jid)
        if not j:
            return None
        det = j.get("details") or {}
        return {"id": j["id"], "description": det.get("description") or "", "history": j.get("history") or []}


# ---------------------------------------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------------------------------------
def open_path(p: Path) -> None:
    if os.name == "nt":
        os.startfile(str(p))  # noqa: S606 - local file the user asked to open
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(p)])
    else:
        subprocess.Popen(["xdg-open", str(p)])


def make_handler(app):
    class Handler(BaseHTTPRequestHandler):
        server_version = "Laika"

        def log_message(self, *args):  # keep the console quiet
            pass

        def _send(self, code: int, body, ctype: str = "application/json; charset=utf-8"):
            data = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.end_headers()
            self.wfile.write(data)

        def _host_ok(self) -> bool:
            host = (self.headers.get("Host") or "").lower()
            return host in (f"127.0.0.1:{app.port}", f"localhost:{app.port}")

        def _authed(self) -> bool:
            return self._host_ok() and secrets.compare_digest(self.headers.get("X-Laika-Token") or "", app.token)

        def _body(self) -> dict:
            n = int(self.headers.get("Content-Length") or 0)
            if n > 1_000_000:
                return {}
            try:
                return json.loads(self.rfile.read(n) or b"{}")
            except ValueError:
                return {}

        def do_GET(self):
            u = urlparse(self.path)
            if u.path in STATIC:
                if not self._host_ok():
                    return self._send(403, {"error": "forbidden"})
                name, ctype = STATIC[u.path]
                return self._send(200, (UI_DIR / name).read_bytes(), ctype)
            if not self._authed():
                return self._send(403, {"error": "Open the dashboard from the address `laika ui` printed."})
            try:
                if u.path == "/api/data":
                    return self._send(200, app.data())
                if u.path == "/api/tasks":
                    return self._send(200, {"tasks": app.tasks.public(), "busy": bool(app.tasks.running()), "version": app.tasks.version})
                if u.path == "/api/claude":
                    force = parse_qs(u.query).get("refresh") == ["1"]
                    return self._send(200, claude_status(force))
                if u.path.startswith("/api/job/"):
                    j = app.model.job(u.path.rsplit("/", 1)[-1])
                    return self._send(200 if j else 404, j or {"error": "unknown role"})
            except Exception as e:  # noqa: BLE001 - report instead of dropping the connection
                return self._send(500, {"error": str(e)})
            return self._send(404, {"error": "not found"})

        def do_POST(self):
            if not self._authed():
                return self._send(403, {"error": "forbidden"})
            u, b = urlparse(self.path), self._body()
            try:
                return self._send(200, app.post(u.path, b))
            except RuntimeError as e:
                return self._send(409, {"error": str(e)})
            except (KeyError, ValueError) as e:
                return self._send(400, {"error": str(e)})
            except Exception as e:  # noqa: BLE001
                return self._send(500, {"error": str(e)})

    return Handler


class App:
    def __init__(self, helper, m: Path, workspace: Path):
        self.L, self.m, self.workspace = helper, m, workspace
        self.model = Model(helper, m)
        self.tasks = Tasks(m, workspace)
        self.token = secrets.token_urlsafe(18)
        self.port = 0
        self.write_lock = threading.Lock()

    def data(self) -> dict:
        if not self.tasks.running():
            with self.write_lock:  # imports Excel edits, as `status` does
                st, db = self.L.load_state(self.m), self.L.load_db(self.m)
                self.L.sync(self.m, db, st, quiet=True)
        d = self.model.payload()
        d["busy"] = bool(self.tasks.running())
        return d

    def _guard(self) -> None:
        if self.tasks.running():
            raise RuntimeError("Laika is working on a background task. Try again when it finishes.")

    def post(self, path: str, b: dict) -> dict:
        L, m = self.L, self.m
        if path == "/api/decide":
            self._guard()
            status = b.get("status")
            if status not in L.STATUSES or status == "Low Match":
                raise ValueError(f"Unknown status: {status}")
            with self.write_lock:
                st, db = L.load_state(m), L.load_db(m)
                pairs = [(j, status) for j in (L.find_job(db, x) for x in b.get("ids") or []) if j]
                if not pairs:
                    raise ValueError("No such role.")
                reasons = {j["id"]: str(b["reason"]).strip()[:500] for j, _ in pairs} if b.get("reason") else {}
                changes, excel_ok = L.record_decisions(m, db, st, pairs, reasons, via="dashboard")
            return {"ok": True, "changed": len(changes), "excel": excel_ok}
        if path == "/api/note":
            self._guard()
            with self.write_lock:
                st, db = L.load_state(m), L.load_db(m)
                j = L.find_job(db, b.get("id", ""))
                if not j:
                    raise ValueError("No such role.")
                L.record_decisions(m, db, st, [], {j["id"]: str(b.get("text", "")).strip()[:500]}, via="dashboard")
            return {"ok": True}
        if path == "/api/task":
            kind = b.get("kind")
            if kind not in STEPS:
                raise ValueError("Unknown task.")
            job = None
            if kind in ("cv", "letter"):
                job = L.find_job(L.load_db(m), b.get("id", ""))
                if not job:
                    raise ValueError("No such role.")
            status = claude_status(force=True)
            if not status.get("loggedIn"):
                raise RuntimeError("Claude Code isn't signed in yet. Use 'Connect Claude Code' first.")
            return {"task": self.tasks.start(kind, job, b.get("inputs") or {})["id"]}
        if path == "/api/task/cancel":
            return {"ok": self.tasks.cancel(b.get("id", ""))}
        if path == "/api/claude/login":
            cli = find_claude()
            if not cli:
                raise RuntimeError("Claude Code was not found on this computer.")
            if os.name == "nt":
                subprocess.Popen([cli, "auth", "login"], creationflags=subprocess.CREATE_NEW_CONSOLE, env=cli_env())
                return {"ok": True, "message": "A window opened to sign in to Claude Code. Finish signing in in your browser."}
            return {"ok": False, "command": f'"{cli}" auth login',
                    "message": "Run this in a terminal to sign in to Claude Code, then come back."}
        if path == "/api/open":
            rel = str(b.get("path") or "")
            p = (m / rel).resolve()
            if not rel or m.resolve() not in p.parents or not p.exists():
                raise ValueError("That file isn't in your job-search folder.")
            open_path(p.parent if b.get("folder") else p)
            return {"ok": True}
        if path == "/api/list":
            self._guard()
            kind = b.get("kind")
            if kind not in L.LIST_SPECS:
                raise ValueError("Unknown list.")
            items = [str(x).strip() for x in b.get("items") or [] if str(x).strip()]
            if not items:
                raise ValueError(f"Laika needs at least one entry in {kind}.")
            rel = L.LIST_SPECS[kind][0]
            with self.write_lock:
                before = L.read_lines(m / rel)
                L.write_list(m, kind, items)
                after = L.read_lines(m / rel)
                added = [x for x in after if L.norm(x) not in {L.norm(y) for y in before}]
                removed = [x for x in before if L.norm(x) not in {L.norm(y) for y in after}]
                if added or removed:
                    L.log_change(m, f"{kind}: " + "; ".join(([f"added {added}"] if added else [])
                                                           + ([f"removed {removed}"] if removed else [])),
                                 "edited in the dashboard")
                st = L.load_state(m)
                L.take_snapshot(m, st, only=[rel])
                L.save_state(m, st)
            return {"ok": True}
        if path == "/api/criteria":
            self._guard()
            key = re.sub(r"[^a-z0-9_]", "_", str(b.get("key") or "").lower()).strip("_")
            if not key:
                raise ValueError("Missing key.")
            value = str(b.get("value") or "").strip()
            if key in ("min_relevancy_score", "max_results_per_query", "first_search_lookback_days") and not value.isdigit():
                raise ValueError(f"{key} must be a whole number.")
            with self.write_lock:
                crit = L.read_criteria(m)
                old = crit.get(key, "")
                crit[key] = value
                L.write_criteria(m, crit)
                if old != value:
                    L.log_change(m, f"criteria '{key}': '{old}' -> '{value}'", "edited in the dashboard")
                st = L.load_state(m)
                L.take_snapshot(m, st, only=[L.F_CRITERIA])
                L.save_state(m, st)
            return {"ok": True}
        if path == "/api/families":
            self._guard()
            lines = []
            for f in b.get("families") or []:
                name = str(f.get("name") or "").strip().replace(":", " ")
                roles = [str(r).strip() for r in f.get("roles") or [] if str(r).strip()]
                if name and roles:
                    lines.append(f"{name}: " + "; ".join(roles))
            with self.write_lock:
                (m / L.F_FAMILIES).write_text("# Role families for the Laika dashboard - one per line:  Family: Role A; Role B\n"
                                              + "\n".join(lines) + "\n", encoding="utf-8")
            return {"ok": True}
        raise KeyError(path)


def serve(m: Path, workspace: Path, port: int = 0, open_browser: bool = True, helper=None) -> None:
    if helper is None:
        import laika as helper  # noqa: E402
    app = App(helper, m, workspace)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), make_handler(app))
    app.port = httpd.server_address[1]
    url = f"http://127.0.0.1:{app.port}/?t={app.token}"
    print(f"LAIKA DASHBOARD: {url}")
    print("Keep this running while you use the dashboard; press Ctrl+C to stop it.")
    sys.stdout.flush()
    if open_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if app.tasks.proc:
            app.tasks.proc.terminate()
        httpd.server_close()
