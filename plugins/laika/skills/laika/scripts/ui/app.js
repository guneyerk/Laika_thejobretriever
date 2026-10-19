/* Laika dashboard - talks to the local server started by `laika ui`. No libraries. */
(() => {
  'use strict';
  const TOKEN = new URLSearchParams(location.search).get('t') || '';
  async function api(path, body) {
    const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'X-Laika-Token': TOKEN, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
    return d;
  }
  const $ = (s, root = document) => root.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'));
  const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '-');
  const ICON = {
    scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    cv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    letter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m5 12 5 5 9-10"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12 20 4l-6 16-3-7z"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  };
  const icon = (btn, name, label) => { btn.innerHTML = ICON[name] || ''; btn.append(document.createTextNode(label)); return btn; };

  /* ---------------- state ---------------- */
  let D = null, J = [], T = 60, APPLIED = ['Applied', 'Interviewing', 'Offer', 'Rejected'];
  let FAMS = [], famIndex = {};
  const F = { period: 'all', where: 'all', family: 'all', source: 'all', status: 'all', minScore: 0, q: '' };
  const isApplied = (j) => APPLIED.includes(j.status);
  const lastRun = () => (D.runs.length ? D.runs[D.runs.length - 1] : null);
  const today = () => J.reduce((m, j) => (j.found > m ? j.found : m), '');
  function famColor(f) { const i = famIndex[f]; return i != null && i < 4 ? `var(--fam${i + 1})` : 'var(--deemph-2)'; }
  function famChip(f) { const c = el('span', 'fam', f || 'Other'); c.style.setProperty('--fc', famColor(f)); return c; }
  function inPeriod(j) {
    const lr = lastRun();
    if (F.period === 'last') return lr && j.run === lr.run;
    if (F.period === '7d') return (new Date(today()) - new Date(j.found)) / 864e5 <= 7;
    return true;
  }
  function filtered(opts = {}) {
    const q = F.q.toLowerCase();
    return J.filter((j) => inPeriod(j)
      && (F.where === 'all' || (F.where === 'target' ? j.target : F.where === 'elsewhere' ? !j.target : j.where === F.where))
      && (F.family === 'all' || j.family === F.family)
      && (F.source === 'all' || j.source === F.source)
      && (opts.ignoreStatus || F.status === 'all' || (F.status === 'applied' ? isApplied(j) : j.status === F.status))
      && (!F.minScore || (j.score != null && j.score >= F.minScore))
      && (!q || (j.title + ' ' + j.company + ' ' + j.location).toLowerCase().includes(q)));
  }

  /* ---------------- tooltip ---------------- */
  const tip = el('div', 'tip'); document.body.append(tip);
  function hover(node, value, label) {
    const show = (x, y) => { tip.replaceChildren(el('b', null, value), document.createTextNode(label)); tip.classList.add('on');
      tip.style.left = Math.min(x + 14, innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (y + 14) + 'px'; };
    node.addEventListener('pointermove', (e) => show(e.clientX, e.clientY));
    node.addEventListener('pointerleave', () => tip.classList.remove('on'));
    node.tabIndex = 0;
    node.addEventListener('focus', () => { const r = node.getBoundingClientRect(); show(r.right, r.top); });
    node.addEventListener('blur', () => tip.classList.remove('on'));
  }

  /* ---------------- toast ---------------- */
  const toastEl = el('div', 'toast'); document.body.append(toastEl); let toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3800); }

  /* ---------------- badges ---------------- */
  function scoreBadge(s) { return el('span', 'score ' + (s == null ? 'none' : s >= 80 ? 's80' : s >= T ? 's60' : s >= 40 ? 's40' : ''), s == null ? '—' : String(s)); }
  function statusPill(s) { const p = el('span', 'pill ' + s.replace(' ', '')); p.append(el('span', 'dot'), document.createTextNode(s)); return p; }
  function openFile(path, folder) { api('/api/open', { path, folder }).catch((e) => toast(e.message)); }
  function docButtons(j, small = true) {
    const f = document.createDocumentFragment();
    if (j.cv) { const b = icon(el('button', 'btn' + (small ? ' sm' : '')), 'cv', 'Open CV'); b.addEventListener('click', (e) => { e.stopPropagation(); openFile(j.cv); }); f.append(b); }
    if (j.letter) { const b = icon(el('button', 'btn' + (small ? ' sm' : '')), 'letter', 'Open cover letter'); b.addEventListener('click', (e) => { e.stopPropagation(); openFile(j.letter); }); f.append(b); }
    return f;
  }

  /* ---------------- charts ---------------- */
  function card(container, title, sub, render, tableRows) {
    const c = el('div', 'card'), h = el('div', 'card-h'), left = el('div');
    left.append(el('h3', null, title)); if (sub) left.append(el('div', 'sub', sub));
    const tog = el('button', 'linkbtn', 'Table'); if (!tableRows) tog.style.visibility = 'hidden';
    h.append(left, tog); c.append(h); const body = el('div'); c.append(body); container.append(c);
    let asTable = false;
    const draw = () => {
      body.replaceChildren();
      if (asTable && tableRows) {
        const t = el('table', 'tbl'), rows = tableRows(), hr = el('tr');
        rows.head.forEach((x, i) => hr.append(el('th', i ? 'cell-num' : null, x))); t.append(hr);
        rows.rows.forEach((r) => { const tr = el('tr'); r.forEach((x, i) => tr.append(el('td', i ? 'cell-num' : null, String(x ?? '—')))); t.append(tr); });
        body.append(t);
      } else render(body);
    };
    tog.addEventListener('click', () => { asTable = !asTable; tog.textContent = asTable ? 'Chart' : 'Table'; draw(); });
    return { draw };
  }
  function barList(container, rows, opts = {}) {
    const max = Math.max(1, ...rows.map((r) => r.value)), wrap = el('div', 'bars');
    rows.forEach((r) => {
      const row = el('div', 'bar-row' + (opts.onClick ? ' clickable' : '')), lab = el('div', 'lab', r.label); lab.title = r.label;
      const track = el('div', 'track'), fill = el('div', 'fill' + (r.de ? ' de' : ''));
      fill.style.width = Math.max(0.6, 86 * r.value / max) + '%'; if (r.color && !r.de) fill.style.background = r.color;
      track.append(fill, el('span', 'val', fmt(r.value) + (r.extra ? ' · ' + r.extra : '')));
      row.append(lab, track); hover(row, fmt(r.value) + ' ' + (opts.unit || 'roles'), r.label + (r.extra ? ' (' + r.extra + ')' : ''));
      if (opts.onClick) row.addEventListener('click', () => opts.onClick(r));
      wrap.append(row);
    });
    if (!rows.length) wrap.append(el('div', 'muted', 'No roles in this view.'));
    container.append(wrap);
  }
  function niceStep(max) { const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function columns(container, items, opts = {}) {
    const ns = 'http://www.w3.org/2000/svg', W = Math.max(260, Math.round(container.clientWidth || 520)), H = 180, pl = 34, pr = 8, pt = 18, pb = 26;
    const max = Math.max(1, ...items.map((i) => i.value)), step = niceStep(max), top = Math.ceil(max / step) * step;
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart');
    const iw = W - pl - pr, ih = H - pt - pb, band = iw / items.length, bw = Math.min(24, band * 0.62);
    const add = (tag, attrs, text) => { const n = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); if (text != null) n.textContent = text; svg.append(n); return n; };
    for (let v = 0; v <= top; v += step) { const y = pt + ih - ih * v / top; add('line', { x1: pl, x2: W - pr, y1: y, y2: y, class: v ? 'grid' : 'base' }); add('text', { x: pl - 6, y: y + 3.5, 'text-anchor': 'end' }, fmt(v)); }
    items.forEach((it, i) => {
      const x = pl + band * i + (band - bw) / 2, h = ih * it.value / top, y = pt + ih - h, r = Math.min(4, h);
      const g = document.createElementNS(ns, 'g');
      const hit = document.createElementNS(ns, 'rect'); [['x', pl + band * i], ['y', pt], ['width', band], ['height', ih], ['fill', 'transparent']].forEach(([k, v]) => hit.setAttribute(k, v));
      const p = document.createElementNS(ns, 'path'); p.setAttribute('d', `M${x},${pt + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${pt + ih} Z`);
      p.setAttribute('class', 'mark' + (it.tone ? ' ' + it.tone : '')); g.append(hit, p); svg.append(g);
      hover(g, fmt(it.value) + ' roles', it.sub || it.label);
      add('text', { x: pl + band * i + band / 2, y: H - 8, 'text-anchor': 'middle' }, it.label);
    });
    if (opts.threshold != null) {
      const x = pl + band * opts.threshold; add('line', { x1: x, x2: x, y1: pt - 6, y2: pt + ih, class: 'thresh' });
      add('text', { x: x + 5, y: pt - 2, class: 'thresh-label' }, opts.thresholdLabel);
    }
    container.append(svg);
  }
  function countBy(jobs, key) {
    const m = new Map(); jobs.forEach((j) => { const k = typeof key === 'function' ? key(j) : j[key]; if (k === '' || k == null) return; m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }
  const notApplied = (jobs) => jobs.filter((x) => !isApplied(x) && x.status !== 'Ignored' && x.score != null).sort((a, b) => b.score - a.score);
  function topList(container, jobs, n) {
    const box = el('div', 'toplist');
    notApplied(jobs).slice(0, n).forEach((x) => {
      const r = el('div', 'tr'); r.style.setProperty('--fc', famColor(x.family));
      const mid = el('div'), s = el('div', 's'); mid.append(el('div', 't', x.title));
      s.append(document.createTextNode(`${x.company} · ${x.where || x.country}`), famChip(x.family)); if (x.status === 'Pending') s.append(statusPill('Pending'));
      mid.append(s);
      const acts = el('div', 'acts');
      const mk = (label, ic, fn) => { const b = icon(el('button', 'btn sm'), ic, label); b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); acts.append(b); };
      mk('Apply', 'check', () => decide([x], 'Applied')); mk('Create CV', 'cv', () => createDialog('cv', x)); mk('Create cover letter', 'letter', () => createDialog('letter', x));
      r.append(scoreBadge(x.score), mid, acts); r.addEventListener('click', () => openDrawer(x)); box.append(r);
    });
    if (!box.children.length) box.append(el('div', 'empty', 'Nothing left to apply to in this view. Scan now for fresh roles.'));
    container.append(box);
  }
  function chartSet(container, opts = {}) {
    const cards = [], add = (...a) => cards.push(card(container, ...a)), j = () => filtered({ ignoreStatus: true });
    const goRoles = (k, v) => { F[k] = v; go('roles'); };
    if (!opts.skipTop) add('Top roles you haven\'t applied to', 'Highest scores first · ignored roles left out', (b) => topList(b, j(), 7),
      () => ({ head: ['Role', 'Company', 'Score'], rows: notApplied(j()).slice(0, 25).map((x) => [x.title, x.company, x.score]) }));
    const bins = () => { const b = Array.from({ length: 10 }, (_, i) => ({ label: String(i * 10), value: 0, tone: i * 10 >= T ? 'top' : i * 10 >= 40 ? 'near' : 'de', sub: `Score ${i * 10}-${i * 10 + 9}` }));
      j().forEach((x) => { if (x.score != null) b[Math.min(9, Math.floor(x.score / 10))].value++; }); b[9].sub = 'Score 90-100'; return b; };
    add('Score distribution', `Dark blue = your shortlist (${T}+) · light blue = near misses (40-${T - 1})`, (b) => {
      columns(b, bins(), { threshold: T / 10, thresholdLabel: `shortlist ${T}+` });
      const m = el('div', 'muted', `${fmt(j().filter((x) => x.score >= T).length)} shortlisted · ${fmt(j().filter((x) => x.score == null).length)} unscored (clearly off-target titles)`);
      m.style.cssText = 'font-size:12px;margin-top:6px'; b.append(m);
    }, () => ({ head: ['Score', 'Roles'], rows: bins().map((x) => [x.sub, x.value]) }));
    add('Where the roles are', 'Orange = your locations', (b) => {
      const all = j(), mine = countBy(all.filter((x) => x.target), 'where').map((r) => ({ ...r, color: 'var(--loc)' }));
      const other = countBy(all.filter((x) => !x.target), 'country'), rest = other.slice(6).reduce((s, r) => s + r.value, 0);
      barList(b, mine.concat(other.slice(0, 6).map((r) => ({ ...r, de: true }))).concat(rest ? [{ label: 'Other countries', value: rest, de: true }] : []),
        { onClick: (r) => { if (mine.find((x) => x.label === r.label)) goRoles('where', r.label); } });
    }, () => ({ head: ['Place', 'Roles'], rows: countBy(j(), (x) => x.where || x.country).map((r) => [r.label, r.value]) }));
    add(FAMS.length ? 'Role family' : 'Role searched', FAMS.length ? 'From your role families' : 'Group your roles into families on the Profile page', (b) => {
      barList(b, countBy(j(), 'family').slice(0, 10).map((r) => ({ ...r, color: famColor(r.label) })), { onClick: (r) => goRoles('family', r.label) });
    }, () => ({ head: ['Family', 'Roles'], rows: countBy(j(), 'family').map((r) => [r.label, r.value]) }));
    add('Status', 'Your decisions on scanned roles', (b) => {
      const all = j(), pend = all.filter((x) => x.status === 'Pending').length, app = all.filter(isApplied).length, ign = all.filter((x) => x.status === 'Ignored').length;
      const low = all.filter((x) => x.status === 'Low Match').length, tot = pend + app + ign || 1;
      const st = el('div', 'stack');
      [['Pending', pend, 'var(--pending)'], ['Applied', app, 'var(--applied)'], ['Ignored', ign, 'var(--muted)']].forEach(([s, n, c]) => {
        if (!n) return; const seg = el('div'); seg.style.flex = String(n); seg.style.background = c; hover(seg, fmt(n), `${s} · ${pct(n, tot)}`); st.append(seg); });
      const lg = el('div', 'legend');
      [['Pending', pend, 'var(--pending)'], ['Applied', app, 'var(--applied)'], ['Ignored', ign, 'var(--muted)']].forEach(([s, n, c]) => { const i = el('span'), k = el('span', 'key'); k.style.background = c; i.append(k, document.createTextNode(`${s} ${fmt(n)}`)); lg.append(i); });
      b.append(st, lg);
      const stages = ['Interviewing', 'Offer', 'Rejected'].map((s) => [s, all.filter((x) => x.status === s).length]).filter(([, n]) => n);
      if (stages.length) b.append(el('div', 'lowmatch', 'Applied includes ' + stages.map(([s, n]) => `${fmt(n)} ${s.toLowerCase()}`).join(' · ')));
      const lm = el('div', 'lowmatch', `+ ${fmt(low)} low matches`); const br = el('button', 'linkbtn', 'Browse');
      br.addEventListener('click', () => { F.status = 'Low Match'; go('roles'); }); lm.append(br); b.append(lm);
    }, () => ({ head: ['Status', 'Roles'], rows: D.statuses.map((s) => [s, j().filter((x) => x.status === s).length]) }));
    add('From scan to offer', 'How the funnel narrows', (b) => {
      const all = j(), ramp = ['var(--o1)', 'var(--o2)', 'var(--o3)', 'var(--o4)', 'var(--o5)', 'var(--o5)', 'var(--o5)'];
      const steps = [['Scanned', all.length], ['In your locations', all.filter((x) => x.target).length], ['Scored 40+', all.filter((x) => x.score >= 40).length],
        [`Shortlisted ${T}+`, all.filter((x) => x.score >= T).length], ['Applied', all.filter(isApplied).length],
        ['Interviewing', all.filter((x) => x.status === 'Interviewing' || x.status === 'Offer').length], ['Offer', all.filter((x) => x.status === 'Offer').length]];
      const max = Math.max(1, steps[0][1]), wrap = el('div', 'bars');
      steps.forEach(([label, v], i) => { const row = el('div', 'bar-row'); row.append(el('div', 'lab', label)); const tr = el('div', 'track'), f = el('div', 'fill');
        f.style.width = Math.max(0.8, 86 * v / max) + '%'; f.style.background = ramp[i]; tr.append(f, el('span', 'val', fmt(v) + (i ? ' · ' + pct(v, steps[i - 1][1]) : '')));
        row.append(tr); hover(row, fmt(v), label + (i ? ` - ${pct(v, steps[i - 1][1])} of the step before` : '')); wrap.append(row); });
      b.append(wrap);
    }, null);
    add('Industry', 'From scoring and LinkedIn details', (b) => {
      const all = j(), known = all.filter((x) => x.industry); barList(b, countBy(known, 'industry').slice(0, 8));
      const m = el('div', 'muted', `Industry known for ${fmt(known.length)} of ${fmt(all.length)} roles`); m.style.cssText = 'font-size:12px;margin-top:8px'; b.append(m);
    }, () => ({ head: ['Industry', 'Roles'], rows: countBy(j().filter((x) => x.industry), 'industry').map((r) => [r.label, r.value]) }));
    add('Top companies', 'Most roles scanned', (b) => barList(b, countBy(j(), 'company').slice(0, 8)),
      () => ({ head: ['Company', 'Roles'], rows: countBy(j(), 'company').slice(0, 30).map((r) => [r.label, r.value]) }));
    add('Recruiters vs direct employers', 'Recruiter postings often hide the client', (b) => {
      const all = j(), rec = all.filter((x) => x.recruiter).length;
      barList(b, [{ label: 'Direct employers', value: all.length - rec, color: 'var(--violet)' }, { label: 'Recruiters', value: rec, de: true }]);
    }, null);
    cards.forEach((c) => c.draw());
    return { draw: () => cards.forEach((c) => c.draw()) };
  }

  /* ---------------- role table ---------------- */
  const COLS = [
    ['score', 'Score', (j) => scoreBadge(j.score), (j) => (j.score == null ? -1 : j.score)],
    ['title', 'Role', (j) => { const d = el('div'); d.append(el('div', 'role', j.title), el('div', 'co', j.company)); return d; }, (j) => j.title.toLowerCase()],
    ['where', 'Location', (j) => el('span', null, j.where || j.country), (j) => (j.target ? '0' : '1') + (j.where || j.country)],
    ['family', 'Family', (j) => famChip(j.family), (j) => j.family],
    ['industry', 'Industry', (j) => el('span', 'ink2', j.industry || '—'), (j) => j.industry || '~'],
    ['source', 'Source', (j) => el('span', 'ink2', j.source), (j) => j.source],
    ['found', 'Found', (j) => el('span', 'num ink2', j.found.slice(5)), (j) => j.found],
    ['status', 'Status', (j) => statusPill(j.status), (j) => D.statuses.indexOf(j.status)],
    ['docs', 'Docs', (j) => { const d = el('span'); d.style.cssText = 'display:inline-flex;gap:4px'; if (j.cv) d.append(el('span', 'chip on', 'CV')); if (j.letter) d.append(el('span', 'chip on', 'Letter')); if (!j.cv && !j.letter) d.append(el('span', 'muted', '—')); return d; }, (j) => (j.cv ? 2 : 0) + (j.letter ? 1 : 0)],
  ];
  const table = { sort: 'score', dir: -1, group: 'none', limit: 100 };
  function roleTable(container) {
    container.replaceChildren();
    const top = el('div', 'filters'); top.style.marginBottom = '10px';
    const q = el('input', 'input'); q.placeholder = 'Search role, company or city'; q.style.width = '240px'; q.value = F.q;
    q.addEventListener('input', () => { F.q = q.value; drawTable(); });
    const sel = (opts, cur, fn, label) => { const s = el('select', 'select'); s.setAttribute('aria-label', label); opts.forEach(([v, t]) => { const o = el('option', null, t); o.value = v; o.selected = String(v) === String(cur); s.append(o); }); s.addEventListener('change', () => fn(s.value)); return s; };
    top.append(q,
      sel([['all', 'Any status'], ['Pending', 'Pending'], ['applied', 'Applied (any stage)'], ['Interviewing', 'Interviewing'], ['Offer', 'Offer'], ['Rejected', 'Rejected'], ['Ignored', 'Ignored'], ['Low Match', 'Low Match']], F.status, (v) => { F.status = v; drawTable(); }, 'Status'),
      sel([[0, 'Any score'], [40, '40+'], [T, `${T}+ (shortlist)`], [80, '80+']], F.minScore, (v) => { F.minScore = Number(v); drawTable(); }, 'Score'),
      sel([['none', 'No grouping'], ['where', 'Group by location'], ['family', 'Group by family'], ['status', 'Group by status'], ['company', 'Group by company'], ['industry', 'Group by industry'], ['source', 'Group by source']], table.group, (v) => { table.group = v; drawTable(); }, 'Grouping'));
    const count = el('span', 'muted'); count.style.cssText = 'margin-left:auto;font-size:12.5px'; top.append(count);
    const scroller = el('div'); scroller.style.cssText = 'overflow:auto;border:1px solid var(--border);border-radius:10px;background:var(--surface)';
    container.append(top, scroller);
    function drawTable() {
      const rows = filtered(), col = COLS.find((c) => c[0] === table.sort);
      rows.sort((a, b) => { const x = col[3](a), y = col[3](b); return (x > y ? 1 : x < y ? -1 : 0) * table.dir || ((b.score ?? -1) - (a.score ?? -1)); });
      count.textContent = `${fmt(rows.length)} roles`;
      const t = el('table', 'tbl'), hr = el('tr');
      COLS.forEach(([k, label]) => { const th = el('th', 'sortable', label); if (k === table.sort) th.append(el('span', 'arr', table.dir < 0 ? '▼' : '▲'));
        th.addEventListener('click', () => { if (table.sort === k) table.dir *= -1; else { table.sort = k; table.dir = ['score', 'found', 'docs'].includes(k) ? -1 : 1; } drawTable(); }); hr.append(th); });
      t.append(hr);
      const g = table.group, shown = rows.slice(0, table.limit), counts = new Map();
      if (g !== 'none') rows.forEach((r) => counts.set(r[g] || '—', (counts.get(r[g] || '—') || 0) + 1));
      const ordered = g === 'none' ? shown : shown.slice().sort((a, b) => String(a[g] || '—').localeCompare(String(b[g] || '—')) || ((b.score ?? -1) - (a.score ?? -1)));
      let last = null;
      ordered.forEach((j) => {
        if (g !== 'none' && (j[g] || '—') !== last) { last = j[g] || '—'; const gr = el('tr', 'grp'), td = el('td', null, `${last} · ${counts.get(last)}`); td.colSpan = COLS.length; gr.append(td); t.append(gr); }
        const tr = el('tr', 'row'); COLS.forEach(([, , render]) => { const td = el('td'); td.append(render(j)); tr.append(td); });
        tr.addEventListener('click', () => openDrawer(j)); t.append(tr);
      });
      scroller.replaceChildren(t);
      if (rows.length > table.limit) { const more = el('button', 'btn sm', `Show more (${fmt(rows.length - table.limit)} left)`); more.style.margin = '10px'; more.addEventListener('click', () => { table.limit += 200; drawTable(); }); scroller.append(more); }
    }
    drawTable();
  }

  /* ---------------- drawer ---------------- */
  const scrim = el('div', 'scrim'), drawer = el('aside', 'drawer'); drawer.setAttribute('aria-label', 'Role details'); document.body.append(scrim, drawer);
  const modal = el('div', 'modal'); modal.setAttribute('role', 'dialog'); document.body.append(modal);
  function closeAll() { drawer.classList.remove('on'); modal.classList.remove('on'); scrim.classList.remove('on'); }
  scrim.addEventListener('click', closeAll); document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  async function openDrawer(j) {
    drawer.replaceChildren(); const head = el('div', 'dh'), row = el('div'); row.style.cssText = 'display:flex;gap:12px;align-items:flex-start';
    const sc = scoreBadge(j.score); sc.style.cssText += ';min-width:46px;height:36px;font-size:16px';
    const t = el('div'); t.style.flex = '1'; t.append(el('h2', null, j.title), el('div', 'ink2', `${j.company} · ${j.location || j.country}`));
    const pills = el('div'); pills.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px'; pills.append(statusPill(j.status), famChip(j.family), el('span', 'chip', j.source)); if (j.recruiter) pills.append(el('span', 'chip', 'Recruiter'));
    t.append(pills); row.append(sc, t); head.append(row);
    const body = el('div', 'db'), kv = el('dl', 'kv');
    [['Posted', j.posted || '—'], ['Found', `${j.found} (${j.run})`], ['Industry', j.industry || '—'], ['Seniority', j.seniority || '—'], ['Applicants', j.applicants ? (j.applicants > 200 ? '200+' : String(j.applicants)) : '—']]
      .forEach(([k, v]) => kv.append(el('dt', null, k), el('dd', null, v)));
    body.append(kv);
    const note = (title, text) => { const n = el('div', 'note'); n.append(el('h4', null, title), document.createTextNode(text)); body.append(n); };
    if (j.why) note('✅ Why it fits', j.why); if (j.concerns) note('⚠️ Watch out', j.concerns); if (j.reason) note('Your note', j.reason);
    const links = el('div'); links.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px';
    if (j.url) { const a = icon(el('a', 'btn sm'), 'link', 'Open posting'); a.href = j.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.append(a); }
    links.append(docButtons(j)); body.append(links);
    const extra = el('div'); body.append(extra);
    const foot = el('div', 'df');
    const btn = (label, ic, fn, primary) => { const b = icon(el('button', 'btn' + (primary ? ' primary' : '')), ic, label); b.addEventListener('click', fn); foot.append(b); return b; };
    if (!isApplied(j)) btn('Mark applied', 'check', () => decide([j], 'Applied'), true);
    if (isApplied(j)) {
      const s = el('select', 'stage-select'); s.setAttribute('aria-label', 'Application stage');
      APPLIED.forEach((x) => { const o = el('option', null, x); o.value = x; o.selected = x === j.status; s.append(o); });
      s.addEventListener('change', () => decide([j], s.value)); foot.append(s);
    }
    if (j.status !== 'Ignored' && !isApplied(j)) btn('Ignore', 'x', () => decide([j], 'Ignored'));
    btn('Create CV', 'cv', () => createDialog('cv', j)); btn('Create cover letter', 'letter', () => createDialog('letter', j)); btn('Add note', 'note', () => noteDialog(j));
    drawer.append(head, body, foot); drawer.classList.add('on'); scrim.classList.add('on');
    try {
      const d = await api('/api/job/' + encodeURIComponent(j.id));
      if (d.history && d.history.length) { extra.append(el('h4', 'muted', 'History')); const ul = el('ul', 'history'); d.history.forEach((h) => ul.append(el('li', null, `${h.date} · ${h.status}${h.via && h.via !== 'laika' ? ' (' + h.via + ')' : ''}`))); extra.append(ul); }
      if (d.description) { const det = el('details'); det.style.marginTop = '12px'; det.append(el('summary', 'linkbtn', 'Job description (snapshot from the scan)')); det.append(el('div', 'desc', d.description)); extra.append(det); }
    } catch (e) { /* details are optional */ }
  }

  /* ---------------- dialogs ---------------- */
  function openModal(title, intro, nodes, okLabel, onOk) {
    modal.replaceChildren(); const h = el('div', 'mh'); h.append(el('h2', null, title)); if (intro) { const p = el('p', 'ink2', intro); p.style.margin = '6px 0 0'; h.append(p); }
    const b = el('div', 'mb'); nodes.forEach((n) => b.append(n));
    const f = el('div', 'mf'), c = el('button', 'btn', 'Cancel'), ok = el('button', 'btn primary', okLabel);
    c.addEventListener('click', closeAll); ok.addEventListener('click', async () => { ok.disabled = true; try { await onOk(); closeAll(); } catch (e) { toast(e.message); ok.disabled = false; } });
    f.append(c, ok); modal.append(h, b, f); modal.classList.add('on'); scrim.classList.add('on');
    const first = modal.querySelector('textarea, input'); if (first) setTimeout(() => first.focus(), 50);
  }
  const field = (label, placeholder) => { const f = el('label', 'field'); f.append(el('span', null, label)); const t = el('textarea'); t.placeholder = placeholder || ''; f.append(t); return [f, t]; };
  const para = (text) => { const p = el('p', 'muted', text); p.style.fontSize = '12.5px'; return p; };
  function createDialog(kind, j) {
    if (!claudeReady()) return toast('Connect Claude Code first (see the banner at the top).');
    if (kind === 'cv') {
      const [f, t] = field('Anything to emphasise? (optional)', 'e.g. my channel and partner work');
      openModal('Create CV', `A CV tailored to ${j.title} at ${j.company}, built from your CV and certificates in your standard two-page format, using only real figures.`,
        [f, para('Laika works on it in the background through Claude Code (a few minutes). Bullets without a figure stay qualitative and are listed when it finishes.')],
        'Create CV', () => startTask('cv', j, { notes: t.value }));
    } else {
      const [f1, t1] = field('Why this role or company? (the personal touch)', 'e.g. it is the natural next step after my cybersecurity work');
      const [f2, t2] = field('A moment from your career that fits (optional)', 'e.g. building the regional team from scratch');
      openModal('Create cover letter', `A one-page letter for ${j.title} at ${j.company}, in your writing style, opening with a professional introduction.`,
        [f1, f2, para('Laika writes it in the background through Claude Code and runs the naturalness check before it finishes.')],
        'Create cover letter', () => startTask('letter', j, { why: t1.value, moment: t2.value }));
    }
  }
  function scanDialog() {
    if (!claudeReady()) return toast('Connect Claude Code first (see the banner at the top).');
    const lr = lastRun(), nodes = [];
    D.profile.sites.forEach((s) => { const l = el('div', 'check'); l.append(el('span', null, s.method === 'browser' ? '–' : '✓'));
      const t = el('span', null, s.name); t.append(el('small', null, s.method === 'browser' ? 'Needs the browser - skipped in background scans, so its searches keep their window for your next chat scan' : s.method === 'api' ? 'Searched in the background' : 'Searched with web search in the background'));
      l.append(t); nodes.push(l); });
    nodes.push(para('Runs as a background Claude Code task, usually 10-20 minutes. You can keep using the dashboard; new roles appear when it finishes.'));
    openModal('Scan now', `Laika searches everything posted since your last scan${lr ? ' (' + lr.run.slice(0, 10) + ')' : ''} for your ${D.profile.roles.length} roles in ${D.profile.locations.length} locations, then scores it against your CV and rules.`,
      nodes, 'Start scan', () => startTask('scan', null, {}));
  }
  function noteDialog(j) {
    const [f, t] = field('Your note', 'e.g. recruiter call on Monday'); t.value = j.reason || '';
    openModal('Add a note', `${j.title} at ${j.company}`, [f], 'Save note', async () => { await api('/api/note', { id: j.id, text: t.value }); toast('Note saved.'); await load(); });
  }

  /* ---------------- decisions + tasks ---------------- */
  async function decide(jobs, status) {
    try { await api('/api/decide', { ids: jobs.map((j) => j.id), status }); toast(`${jobs.length === 1 ? jobs[0].title : jobs.length + ' roles'}: ${status}`); closeAll(); await load(); }
    catch (e) { toast(e.message); }
  }
  async function startTask(kind, j, inputs) {
    await api('/api/task', { kind, id: j ? j.id : null, inputs }); toast('Started. Laika is working on it in the background.'); pollTasks(true);
  }
  const tasksBox = el('div', 'tasks'); document.body.append(tasksBox);
  let taskTimer = null, seenDone = new Set(), firstPoll = true, lastTasks = [];
  async function pollTasks(soon) {
    clearTimeout(taskTimer);
    try {
      const d = await api('/api/tasks'); lastTasks = d.tasks; renderTasks(d.tasks);
      const finished = d.tasks.filter((t) => t.status !== 'running' && !seenDone.has(t.id));
      finished.forEach((t) => seenDone.add(t.id));
      if (!firstPoll && finished.length) { toast(finished[0].status === 'done' ? `${finished[0].label} - finished` : `${finished[0].label} - ${finished[0].status}`); await load(); }
      firstPoll = false;
      taskTimer = setTimeout(pollTasks, d.busy || soon ? 2000 : 15000);
      if (page === 'scans') drawScans();
    } catch (e) { taskTimer = setTimeout(pollTasks, 5000); }
  }
  const dismissed = new Set();
  function renderTasks(tasks) {
    tasksBox.replaceChildren();
    // The running task plus the latest finished one; the full list is on the Scans page.
    const fin = tasks.find((t) => t.status !== 'running' && !dismissed.has(t.id) && t.ended && (Date.now() - new Date(t.ended.replace(' ', 'T'))) < 10 * 60e3);
    tasks.filter((t) => t.status === 'running').concat(fin ? [fin] : []).slice(0, 2).forEach((t) => {
      const c = el('div', 'task' + (t.status === 'failed' ? ' failed' : '')), h = el('div', 't');
      h.append(el('span', null, t.label), el('span', 'muted', t.status === 'running' ? 'working…' : t.status)); c.append(h);
      const ul = el('ul', 'steps'); t.steps.forEach((s, i) => ul.append(el('li', t.status === 'done' || i < t.step ? 'done' : (t.status === 'running' && i === Math.max(0, t.step)) ? 'now' : '', s))); c.append(ul);
      if (t.status === 'running') { c.append(el('div', 'act', t.activity || '')); const pr = el('div', 'progress'), bar = el('div'); bar.style.width = (100 * Math.max(0, t.step) / t.steps.length) + '%'; pr.append(bar); c.append(pr);
        const stop = el('button', 'btn sm', 'Stop'); stop.style.marginTop = '8px'; stop.addEventListener('click', () => api('/api/task/cancel', { id: t.id }).then(() => pollTasks(true))); c.append(stop); }
      else { if (t.summary || t.error) c.append(el('div', 'sum', t.error || t.summary)); const x = el('button', 'btn sm', 'Dismiss'); x.style.marginTop = '8px'; x.addEventListener('click', () => { dismissed.add(t.id); renderTasks(lastTasks); }); c.append(x); }
      tasksBox.append(c);
    });
  }

  /* ---------------- Claude Code connection ---------------- */
  let CLAUDE = null;
  const claudeReady = () => CLAUDE && CLAUDE.found && CLAUDE.loggedIn;
  async function checkClaude(force) {
    try { CLAUDE = await api('/api/claude' + (force ? '?refresh=1' : '')); } catch (e) { CLAUDE = null; }
    const b = $('#banner'); b.replaceChildren(); b.style.display = 'none';
    if (!CLAUDE || claudeReady()) return;
    b.style.display = 'flex';
    if (!CLAUDE.found) { b.append(el('div', null, 'Scan now, Create CV and Create cover letter need Claude Code on this computer. Install the Claude desktop app or Claude Code, then reload this page.')); return; }
    const txt = el('div'); txt.append(el('b', null, 'Connect Claude Code to run tasks from here. '), document.createTextNode('Scan now, Create CV and Create cover letter run Laika in the background through Claude Code, which needs a one-time sign-in.'));
    const go = el('button', 'btn primary', 'Connect Claude Code');
    go.addEventListener('click', async () => {
      try { const r = await api('/api/claude/login', {}); toast(r.message); if (r.command) { const c = el('code', null, r.command); c.style.cssText = 'display:block;margin-top:6px;font-size:12px'; txt.append(c); }
        const t0 = Date.now(); const poll = async () => { await checkClaude(true); if (!claudeReady() && Date.now() - t0 < 5 * 60e3) setTimeout(poll, 5000); else if (claudeReady()) toast('Claude Code is connected.'); }; setTimeout(poll, 5000);
      } catch (e) { toast(e.message); }
    });
    const sp = el('div', 'sp'); b.append(txt, sp, go);
  }

  /* ---------------- theme ---------------- */
  function themeSwitch() {
    const w = el('div', 'theme-switch'); w.setAttribute('role', 'group'); w.setAttribute('aria-label', 'Day or night');
    let cur = 'auto'; try { cur = localStorage.getItem('laika-theme') || 'auto'; } catch (e) { /* storage blocked */ }
    const apply = (m) => { if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m === 'day' ? 'light' : 'dark'); };
    apply(cur);
    [['day', 'Day', 'sun'], ['night', 'Night', 'moon'], ['auto', 'Auto', 'auto']].forEach(([m, label, ic]) => {
      const b = icon(el('button'), ic, label); b.dataset.m = m; b.title = m === 'auto' ? 'Follow your system' : label + ' mode';
      b.classList.toggle('on', m === cur); b.setAttribute('aria-pressed', String(m === cur));
      b.addEventListener('click', () => { cur = m; apply(m); try { localStorage.setItem('laika-theme', m); } catch (e) { /* ignore */ }
        w.querySelectorAll('button').forEach((x) => { x.classList.toggle('on', x.dataset.m === m); x.setAttribute('aria-pressed', String(x.dataset.m === m)); }); if (charts) charts.draw(); });
      w.append(b);
    });
    return w;
  }

  /* ---------------- pages ---------------- */
  const NAV = [['overview', 'Overview', 'grid'], ['roles', 'Roles', 'list'], ['apps', 'Applications', 'send'], ['scans', 'Scans', 'clock'], ['profile', 'Profile & rules', 'user']];
  let page = 'overview', charts = null;
  function go(p) {
    page = p;
    document.querySelectorAll('.nav').forEach((b) => b.classList.toggle('on', b.dataset.page === p));
    document.querySelectorAll('.page').forEach((s) => s.classList.toggle('on', s.id === 'p-' + p));
    $('#pageTitle').textContent = NAV.find((n) => n[0] === p)[1];
    $('#filters').style.visibility = ['scans', 'profile'].includes(p) ? 'hidden' : '';  // the filters only apply to roles
    render(); scrollTo(0, 0);
  }
  function filterBar() {
    const box = $('#filters'); box.replaceChildren();
    const places = [...new Set(J.filter((j) => j.target).map((j) => j.where))];
    const defs = [
      ['period', 'When', [['all', 'All time'], ['last', 'Last scan'], ['7d', 'Last 7 days']]],
      ['where', 'Where', [['all', 'Everywhere'], ['target', 'Your locations'], ...places.map((p) => [p, p]), ['elsewhere', 'Elsewhere']]],
      ['family', FAMS.length ? 'Role family' : 'Role searched', [['all', FAMS.length ? 'All families' : 'All roles'], ...[...new Set(J.map((j) => j.family))].sort().map((f) => [f, f])]],
      ['source', 'Source', [['all', 'All sources'], ...[...new Set(J.map((j) => j.source))].sort().map((s) => [s, s])]],
    ];
    defs.forEach(([k, label, opts]) => { const s = el('select', 'select'); s.setAttribute('aria-label', label);
      opts.forEach(([v, t]) => { const o = el('option', null, t); o.value = v; o.selected = String(F[k]) === String(v); s.append(o); });
      s.addEventListener('change', () => { F[k] = s.value; render(); }); box.append(s); });
  }
  function drawOverview() {
    const all = filtered({ ignoreStatus: true }), lr = lastRun(), t = $('#tiles'); t.replaceChildren();
    const tile = (label, value, delta, color, ic, hero) => { const d = el('div', 'tile' + (hero ? ' hero' : '')); d.style.setProperty('--tc', color);
      const i = el('div', 'ico'); i.innerHTML = ICON[ic]; d.append(i, el('div', 'label', label), el('div', 'value', value)); if (delta) d.append(el('div', 'delta', delta)); t.append(d); };
    const stages = (s) => all.filter((x) => x.status === s).length;
    tile('Waiting for your decision', fmt(all.filter((x) => x.status === 'Pending').length), 'Shortlisted roles you haven\'t decided on', 'var(--pending)', 'star', true);
    tile('Roles scanned', fmt(all.length), `${fmt(all.filter((x) => x.target).length)} in your locations`, 'var(--violet)', 'scan');
    tile(`Shortlisted (${T}+)`, fmt(all.filter((x) => x.score >= T).length), `${pct(all.filter((x) => x.score >= T).length, all.length)} of scanned`, 'var(--fam4)', 'list');
    tile('Applied', fmt(all.filter(isApplied).length), `${fmt(stages('Interviewing'))} interviewing · ${fmt(stages('Offer'))} offer${stages('Offer') === 1 ? '' : 's'}`, 'var(--applied)', 'check');
    tile('Last scan', lr ? `+${fmt(lr.new)}` : '—', lr ? `${lr.run.slice(0, 10)} · ${lr.shortlisted} shortlisted` : 'No scans yet', 'var(--loc)', 'clock');
    const box = $('#top'); box.replaceChildren(); topList(box, all, 8);
    $('#topSub').textContent = `highest scores first · ${fmt(J.filter((x) => x.status === 'Pending').length)} waiting for your decision · ignored roles left out`;
    if (!charts) charts = chartSet($('#charts'), { skipTop: true }); else charts.draw();
  }
  function drawApps() {
    const apps = filtered({ ignoreStatus: true }).filter(isApplied).sort((a, b) => (b.decided || '').localeCompare(a.decided || ''));
    const counts = APPLIED.map((s) => `${s} ${fmt(apps.filter((x) => x.status === s).length)}`).join(' · ');
    $('#appsSub').textContent = counts;
    const tb = el('table', 'tbl'), hr = el('tr'); ['Date', 'Role', 'Location', 'Score', 'Documents', 'Stage'].forEach((x) => hr.append(el('th', null, x))); tb.append(hr);
    apps.forEach((j) => {
      const tr = el('tr', 'row'), cells = [el('span', 'num ink2', j.decided || '—'), (() => { const d = el('div'); d.append(el('div', 'role', j.title), el('div', 'co', j.company)); return d; })(),
        el('span', null, j.where || j.country), scoreBadge(j.score), (() => { const d = el('div'); d.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap'; d.append(docButtons(j)); if (!j.cv && !j.letter) d.append(el('span', 'muted', '—')); return d; })()];
      const s = el('select', 'stage-select'); s.setAttribute('aria-label', 'Stage'); APPLIED.forEach((x) => { const o = el('option', null, x); o.value = x; o.selected = x === j.status; s.append(o); });
      s.addEventListener('click', (e) => e.stopPropagation()); s.addEventListener('change', () => decide([j], s.value)); cells.push(s);
      cells.forEach((n) => { const td = el('td'); td.append(n); tr.append(td); }); tr.addEventListener('click', () => openDrawer(j)); tb.append(tr);
    });
    if (!apps.length) { const tr = el('tr'), td = el('td', 'muted', 'No applications yet.'); td.colSpan = 6; tr.append(td); tb.append(tr); }
    $('#appsTable').replaceChildren(tb);
  }
  function drawScans() {
    const tb = el('table', 'tbl'), hr = el('tr'); ['Scan', 'Window from', 'Sources', 'Searches', 'Seen', 'New', 'Shortlisted', 'Duplicates'].forEach((x, i) => hr.append(el('th', i > 2 ? 'cell-num' : null, x))); tb.append(hr);
    D.runs.slice().reverse().forEach((r) => { const tr = el('tr'); [r.run, r.since, r.sources, r.queries, r.seen, r.new, r.shortlisted, r.duplicates].forEach((x, i) => tr.append(el('td', i > 2 ? 'cell-num' : null, String(x ?? '—')))); tb.append(tr); });
    $('#scanTable').replaceChildren(tb);
    const log = $('#taskLog'); log.replaceChildren();
    lastTasks.forEach((t) => { const it = el('div', 'item'), h = el('div', 'h'); h.append(el('span', null, t.label), el('span', 'muted', `${t.status} · ${t.started}`)); it.append(h);
      if (t.summary || t.error) it.append(el('div', 's', t.error || t.summary)); log.append(it); });
    if (!lastTasks.length) log.append(el('div', 'muted', 'No background tasks yet.'));
  }
  function drawProfile() {
    const P = D.profile, box = $('#profile'); box.replaceChildren();
    const listCard = (title, kind, lines, hint) => {
      const c = el('div', 'card'), h = el('div', 'card-h'); h.append(el('h3', null, title)); c.append(h);
      if (hint) c.append(para(hint));
      const ta = el('textarea', 'edit-area'); ta.value = lines.join('\n'); c.append(ta);
      const ra = el('div', 'row-actions'), save = el('button', 'btn primary', 'Save');
      save.addEventListener('click', async () => { try { await api('/api/list', { kind, items: ta.value.split('\n') }); toast(`${title} saved. Laika picks the change up on the next scan.`); await load(); } catch (e) { toast(e.message); } });
      ra.append(save); c.append(ra); box.append(c);
    };
    listCard(`Roles (${P.roles.length})`, 'roles', P.roles, 'One job title per line. A new title gets the full first-search lookback.');
    listCard(`Locations (${P.locations.length})`, 'locations', P.locations, 'One per line, e.g. "Berlin, Germany" or "Remote (EMEA)".');
    listCard(`Job sites (${P.sites.length})`, 'sites', P.siteLines, 'Name | URL | method (api, browser or web) | optional search titles');
    const fc = el('div', 'card'), fh = el('div', 'card-h'); fh.append(el('h3', null, 'Role families')); fc.append(fh, para('Groups your roles for the charts and colours, one family per line:  Family: Role A; Role B'));
    const fta = el('textarea', 'edit-area'); fta.value = P.families.map((f) => `${f.name}: ${f.roles.join('; ')}`).join('\n'); fc.append(fta);
    const fra = el('div', 'row-actions'), fs = el('button', 'btn primary', 'Save');
    fs.addEventListener('click', async () => { const fams = fta.value.split('\n').filter((l) => l.includes(':')).map((l) => { const [n, r] = l.split(/:(.*)/s); return { name: n.trim(), roles: r.split(/[;,]/).map((x) => x.trim()).filter(Boolean) }; });
      try { await api('/api/families', { families: fams }); toast('Role families saved.'); charts = null; $('#charts').replaceChildren(); await load(); } catch (e) { toast(e.message); } });
    fra.append(fs); fc.append(fra); box.append(fc);
    const cc = el('div', 'card'), ch = el('div', 'card-h'); ch.append(el('h3', null, 'Search criteria and your rules')); cc.append(ch, para('Laika applies these when it scores. Every change is logged in Search Criteria/changelog.md.'));
    Object.entries(P.criteria).forEach(([k, v]) => {
      const w = el('div', 'crit'), lab = el('label', null, k.replace(/_/g, ' ')), ta = el('textarea'); ta.value = v || ''; w.append(lab, ta);
      const save = el('button', 'btn sm', 'Save'); save.style.justifySelf = 'end';
      save.addEventListener('click', async () => { try { await api('/api/criteria', { key: k, value: ta.value }); toast(`Saved ${k.replace(/_/g, ' ')}.`); await load(); } catch (e) { toast(e.message); } });
      w.append(save); cc.append(w);
    });
    box.append(cc);
  }
  function render() {
    if (!D) return;
    $('#navBadge').textContent = String(J.filter((x) => x.status === 'Pending').length);
    const lr = lastRun(); $('#lastScan').textContent = lr ? `Last scan ${lr.run.slice(0, 10)} · ${fmt(lr.seen)} listings · ${fmt(lr.new)} new` : 'No scans yet';
    if (page === 'overview') drawOverview();
    if (page === 'roles') roleTable($('#roleTable'));
    if (page === 'apps') drawApps();
    if (page === 'scans') drawScans();
    if (page === 'profile') drawProfile();
  }
  async function load() {
    try { D = await api('/api/data'); }
    catch (e) { $('#content').replaceChildren(el('div', 'empty', e.message)); return; }
    J = D.jobs; T = D.threshold || 60; APPLIED = D.applied || APPLIED;
    FAMS = D.profile.families.map((f) => f.name); famIndex = {}; FAMS.forEach((f, i) => { famIndex[f] = i; });
    filterBar(); render();
  }

  /* ---------------- boot ---------------- */
  NAV.forEach(([k, label, ic]) => { const b = icon(el('button', 'nav' + (k === 'overview' ? ' on' : '')), ic, label); b.dataset.page = k; if (k === 'roles') { const c = el('span', 'count', '0'); c.id = 'navBadge'; b.append(c); } b.addEventListener('click', () => go(k)); $('#navs').append(b); });
  icon($('#scan'), 'scan', 'Scan now'); $('#scan').addEventListener('click', scanDialog);
  icon($('#scan2'), 'scan', 'Scan now'); $('#scan2').addEventListener('click', scanDialog);
  $('#theme').append(themeSwitch());
  $('#seeAll').addEventListener('click', () => go('roles'));
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (charts && page === 'overview') charts.draw(); }, 150); });
  if (!TOKEN) { $('#content').replaceChildren(el('div', 'empty', 'Open the dashboard from the address that `laika ui` printed (it includes your private key).')); return; }
  load().then(() => { checkClaude(); pollTasks(); });
  setInterval(() => { if (!document.hidden && !modal.classList.contains('on') && !drawer.classList.contains('on')) load(); }, 60000);
})();
