# Search playbook

Each line in `Job Sites/sites.txt` is `Name | URL | method | search titles (optional)`. The method is
`api`, `browser` or `web`. `laika run start` turns the lines into queries (`q01`, `q02`, ...), each with a
`since` date. Only roles posted on or after that date count as new. The helper drops older postings
when you pass the query ID to `add-candidates`.

If a site has its own search titles (the 4th column, e.g. local-language titles), its queries use those
instead of `roles.txt`. Title matching always considers both.

## LinkedIn (`api`)

```
laika fetch-linkedin          # all LinkedIn queries; politely paced; resumable
laika details --cids ...      # descriptions for the candidates you'll score (or --limit N for the top N)
```

- Uses LinkedIn's public job-search pages (no login), with each request spaced about 1.5 s apart.
  With many queries (30+), run it in the background (Bash `run_in_background`) and do the browser sites
  meanwhile. Don't call `add-candidates` until it has finished.
- The time window (`f_TPR`) comes from each query's `since` date. Postings older than the window are
  dropped.
- LinkedIn's public search **ignores the work-mode filter**. Remote queries add "remote" to the keywords,
  but check work mode and location in the description while scoring anyway.
- "Remote (EMEA)"-type queries also return many roles tied to one European city. Treat those as
  location mismatches unless the description says remote and open to the user's country.
- The seniority labels LinkedIn shows are often wrong ("Associate" on a 5+-year role, "Entry level" on a
  director role). Judge seniority from the description.
- HTTP 429/999 means rate limiting. The query stops early: what it found is kept, but it isn't marked
  done, and the last line lists the unfinished queries. Wait a few minutes and rerun; only those run
  again. Don't mark them with `run done`: if one never finishes, `register` keeps its old window so the
  next search covers it.

## Browser sites (`browser`)

These need a browser tool: the Claude desktop app's built-in browser (`mcp__Claude_Browser__*`, read
its skill first) or Claude in Chrome (`mcp__claude-in-chrome__*`). The general pattern:

1. **Open the site once** in a tab, for example its search page for the first title. Many job boards
   block scripted HTTP requests but work fine in a real browser.
2. **Search from inside that tab with paced, same-origin `fetch()` calls.** Use the site's own search
   pages or JSON endpoints, 3-6 seconds apart, instead of loading the visible page for every query.
   That means far fewer full page loads and far fewer bot checks. JavaScript tool calls time out after
   about 45 seconds, so **start** a loop that stores results on `window` and return at once, then **poll**
   until it reports done.
3. **Bot checks:** if a page title says "Access denied", or the page shows a press-and-hold or "verify
   you are human" check, **stop and do not attempt it.** Call `tabs_context` to see whether the browser
   pane is visible; if it's hidden, ask the user to show it (Ctrl/Cmd+Shift+B in the desktop app). Then
   ask them to complete the check and continue afterwards. If they'd rather skip, put the site's query
   IDs in `register --skipped`. A refused in-page `fetch()` (HTTP 403) while the tab itself still loads
   normally is different: don't stop, read the visible page instead, one search at a time (see
   kariyer.net below).
4. **Filter** to cards in the user's locations, within the window, and with titles plausibly related to
   the target roles. Job-board keyword search is often loose ("Sales Director" returns sales executives),
   so drop unrelated titles here instead of registering noise.
5. **Descriptions:** fetch them in-page for the promising ones only (up to about 8-10 per site), paced.
6. **Write** the kept jobs to a JSON file in the run folder and add them:

```json
[{"title": "...", "company": "...", "location": "...", "url": "https://...", "work_mode": "...",
  "age_days": 3, "posted": "2026-10-14", "description": "..."}]
```

```
laika add-candidates --in "<run folder>/<site>.json" --source "<Site name>" --query q40,q41,...
```

Pass every query ID of that site in `--query`, including the ones that found nothing, so they're marked
searched. `age_days` or `posted` lets the helper drop postings older than the window.

### kariyer.net (Turkey)

Search URL: `https://www.kariyer.net/is-ilanlari?kw=<title>`. The pages are server-rendered, so the result
cards (`a.k-ad-card`) are in the HTML, whether you `fetch()` the page in-page or read the loaded page.
Senior roles are posted mostly with **Turkish titles** (Satış Direktörü, Pazarlama Direktörü, Dijital
Dönüşüm Direktörü, Yapay Zeka...); English titles return mostly noise.

A card's "N gün" counts from the posting's **last update**, not from when it was first posted. Employers
refresh listings often, so most cards inside the window are roles already in the tracker. That's
expected: de-duplication drops them at `add-candidates`, so many cards and few new roles is normal.

**Card reader.** Define it in the kariyer.net tab. It reads a fetched page or the visible one
(`document`). Set the defaults: `MAX_AGE` is the days back to the query's `since` date, `PLACE` the
user's locations as cards show them.

```js
window.__kread = (doc, MAX_AGE = 14, PLACE = /istanbul|İstanbul|uzaktan|remote/i) => {
  const cards = [...doc.querySelectorAll('a.k-ad-card')], kept = [];
  for (const a of cards) {
    const L = [...a.querySelectorAll('span')].filter(e => e.children.length === 0 && e.textContent.trim())
      .map(e => ({c: String(e.className || ''), t: e.textContent.trim()}));
    const ti = L.findIndex(x => x.c.includes('k-ad-card-title'));
    const txt = a.textContent.replace(/\s+/g, ' ');
    const m = txt.match(/(\d+)\s*(gün|hafta|ay|saat|dakika)\b/);
    let age = null;
    if (m) age = m[2] === 'gün' ? +m[1] : m[2] === 'hafta' ? 7 * m[1] : m[2] === 'ay' ? 30 * m[1] : 0;
    else if (/Bugün|Yeni/.test(txt)) age = 0;
    const loc = ((a.querySelector('.location') || {}).textContent || '').trim();
    const wm = ((a.querySelector('.work-model') || {}).textContent || '').trim();
    if (!PLACE.test(loc + ' ' + wm) || (age !== null && age > MAX_AGE)) continue;
    const href = (a.getAttribute('href') || '').split('?')[0];
    kept.push({title: ti >= 0 ? L[ti].t : '', company: (L.slice(ti + 1).find(x => !x.c) || {}).t || '',
      location: loc, work_mode: wm, url: href.startsWith('http') ? href : 'https://www.kariyer.net' + href, age_days: age});
  }
  return {cards: cards.length, kept};
};
```

**Search loop.** Then start the loop from the same tab, with the plan's titles for this site in `KWS`:

```js
window.__laika = {done: false, out: {}, stats: {}};
(async () => {
  const KWS = ["Satış Direktörü", "Pazarlama Direktörü"];   // this site's titles from the plan
  for (const kw of KWS) {
    try {
      const r = await fetch('/is-ilanlari?kw=' + encodeURIComponent(kw), {credentials: 'include'});
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      if (!r.ok || /denied|captcha/i.test(doc.title)) { window.__laika.stats[kw] = 'BLOCKED ' + r.status; break; }
      const {cards, kept} = window.__kread(doc);
      for (const rec of kept) {
        const prev = window.__laika.out[rec.url] || (window.__laika.out[rec.url] = {...rec, kw: []});
        prev.kw.push(kw);
      }
      window.__laika.stats[kw] = cards + ' cards / ' + kept.length + ' kept';
    } catch (e) { window.__laika.stats[kw] = 'ERROR ' + e; }
    await new Promise(r => setTimeout(r, 4000 + Math.random() * 2000));
  }
  window.__laika.done = true;
})();
'started'
```

Poll with `({done: window.__laika.done, stats: window.__laika.stats, n: Object.keys(window.__laika.out).length})`,
then read the results with `JSON.stringify(Object.values(window.__laika.out))`.

**When in-page `fetch()` is refused but pages still load.** kariyer.net sometimes answers in-page
`fetch()` with HTTP 403 ("Access to this page has been denied") right after the tab itself loaded
normally. The loop then stops with `BLOCKED 403`. This is not the press-and-hold check, so don't stop
the site and don't retry the fetch. Read the cards from the visible page instead, for each title that
isn't in `stats` yet:

1. First save what the loop found (`JSON.stringify(Object.values(window.__laika.out))`), because
   navigating clears `window`.
2. Navigate the tab to `https://www.kariyer.net/is-ilanlari?kw=<title>` (URL-encoded) and wait about
   3 seconds for it to load.
3. Define the card reader again (each page load clears it), followed by
   `JSON.stringify(window.__kread(document))`, in one `javascript_tool` call.
4. Merge the results by URL. Keep about 5 seconds between page loads; a `browser_batch` of navigate,
   wait and `javascript_tool` does one title per call.

In-page `fetch()` has worked again after the user completed a press-and-hold check, so after one, try
the loop for the remaining titles.

**Press-and-hold check.** kariyer.net uses a press-and-hold bot check ("Kısa bir güvenlik doğrulaması…
Basılı Tut"). Opening many pages quickly, or navigating straight to guessed URLs, triggers it; the
in-page approach above rarely does. If a **page load** shows the check or an "Access denied" page, page
loads are blocked too: stop and ask the user, as in step 3 of the general pattern. **Never attempt the
check yourself** (no pressing, clicking or scripting it).

**Descriptions** (one posting at a time, a few seconds apart, from the same tab):

```js
window.__kdesc = (doc) => {
  const blocks = [...doc.querySelectorAll('div, section, article')]
    .filter(e => /qualification|job-detail|genel-nitelik|is-tanimi|detail-content|job-description|ilan-detay|description/i.test(e.className || ''))
    .map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length > 150).sort((a, b) => a.length - b.length);
  return (blocks.find(x => /NİTELİK|Nitelik|İŞ TANIMI|İş Tanımı|Responsib|Qualif/i.test(x)) || blocks[0] || '').slice(0, 3000);
};
window.__laikaDesc = async (path) => {
  const r = await fetch(path, {credentials: 'include'});
  const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
  return !r.ok || /denied/i.test(doc.title) ? 'BLOCKED ' + r.status : window.__kdesc(doc);
};
await window.__laikaDesc('/is-ilani/<slug-and-id>')
```

If `fetch()` is refused here too, navigate to the few most promising postings instead, define
`window.__kdesc` again and run `window.__kdesc(document)`, with the same pacing.

### GulfTalent (UAE / Gulf)

GulfTalent's search page loads its results from a JSON API on the same site, which is simpler and
more reliable than reading the page. From a gulftalent.com tab, run:

```js
window.__laika = {done: false, out: {}, stats: {}};
(async () => {
  const KWS = ["Sales Director", "Head of Sales"];                    // this site's titles from the plan
  const SINCE = new Date('2026-10-01T00:00:00').getTime() / 1000;     // the query's `since` date
  for (const kw of KWS) {
    const q = encodeURIComponent(kw);
    const u = '/api/jobs/search?config%5Bfilters%5D=DISABLED&config%5BisDynamicSearchV2%5D=true'
      + '&filters%5Bcountry%5D[0]=10111111000000&filters%5Bsearch_keyword%5D=' + q
      + '&include_scraped=1&limit=50&offset=0&search_keyword=' + q + '&search_order=r&version=2';
    try {
      const j = await (await fetch(u, {credentials: 'include', headers: {'Accept': 'application/json'}})).json();
      const data = (j.results && j.results.data) || [];
      let kept = 0;
      for (const d of data) {
        if ((d.posted_date_ts || 0) < SINCE) continue;
        kept++;
        const id = d.position_id;
        const rec = window.__laika.out[id] || {title: d.title, company: d.company_confidential ? 'Confidential' : (d.company_name || d.jb_company_name || ''),
          location_code: String(d.location_code), url: 'https://www.gulftalent.com/uae/jobs/' + d.position_slug + '-' + id,
          posted: new Date(d.posted_date_ts * 1000).toISOString().slice(0, 10), category: d.category_name, industry: d.industry_name, kw: []};
        rec.kw.push(kw); window.__laika.out[id] = rec;
      }
      window.__laika.stats[kw] = data.length + ' results / ' + kept + ' in window';
    } catch (e) { window.__laika.stats[kw] = 'ERROR ' + e; }
    await new Promise(r => setTimeout(r, 2500 + Math.random() * 1500));
  }
  window.__laika.done = true;
})();
'started'
```

- `country 10111111000000` is the UAE. `location_code` `10111111000111` is Dubai, and
  `10111111000000` means UAE with no city given. Other codes are other emirates; check a posting if the
  user cares.
- The keyword search is loose ("Transformation Director" returns nursing directors), so filter titles
  strictly. Recruiter postings (Michael Page, RTC-1, Black Pearl...) are common.
- Descriptions: each posting page has a JSON-LD `JobPosting` block. Fetch the posting path in-page,
  parse it with `DOMParser`, find `script[type="application/ld+json"]` with `@type: JobPosting`, and
  strip the HTML from its `description`.

### Other browser sites

Use the same pattern: the site's search URL or JSON endpoint (find it by watching the page's network
requests with `read_network_requests`), in-page paced fetches, and strict filtering. Sites that need a
login, or that keep blocking automation, aren't worth fighting. Tell the user, and suggest Claude in
Chrome (their own browser session) or dropping the site.

## Web sites (`web`)

Run WebSearch with the plan's `search_hint` (`site:domain "Role" Location`), and add recency words when
helpful. WebFetch promising posting pages for title, company, location, posting date and description.
Only use URLs that the search or fetch actually returned. Then `add-candidates`. Postings without a date
are accepted, and de-duplication still applies.

## Site discovery (when the user asks Laika to find the best sites)

1. For each location, WebSearch things like `best job sites <country> <year>` and `<city> job board
   <field>`, also in the local language. Prefer sites with many current postings in the user's field:
   national boards, senior/executive boards, field-specific boards, remote boards for remote locations.
2. Check whether each candidate site is usable: a quick `curl`-style probe often shows a bot wall
   ("Just a moment...", 403). Those sites need the `browser` method. Indeed and Glassdoor usually block
   automation.
3. Shortlist 3-6 sites. For each, give the name, URL, why it fits, and the method. Don't list LinkedIn
   twice. Show the list and ask which to add (AskUserQuestion multiSelect if there are 4 or fewer,
   otherwise a numbered list). Save with `laika list add sites "Name | URL | method" --reason "site
   discovery"`.

## Big runs (more than about 60 candidates)

1. `laika candidates --compact --out "<run folder>/triage.txt"`, then Read it. It has one line per
   candidate, grouped by location.
2. Pick the plausible ones: in the user's locations (or genuinely remote for them), in the target
   functions, and at a fitting seniority. Respect every custom rule in the criteria. Some titles must be
   judged by content (for example "Head of AI" when the user only wants enablement-focused AI roles), so
   include those.
3. `laika details --cids <ids>` for the LinkedIn ones. For more than about 30 ids, run it in the
   background.
4. `laika candidates --export --cids <ids> --excerpt`, then Read `for_scoring.md`, in chunks if it's long.
5. Write `scores.json`: full scores with why/concerns for the chosen ones, and `duplicate_of` entries for
   repeat postings, such as the same job listed in several countries or re-posted by an aggregator.
   Quick scores for the rest are optional; unscored candidates are registered as Low Match with a note
   saying whether they were outside the user's locations or outside their target roles.

## Volume and pacing

- `max_results_per_query` (criteria, default 25) caps LinkedIn results per query. Queries multiply
  (titles × locations × sites), so suggest trimming titles that never produce shortlisted roles.
- Space browser requests 3-6 seconds apart, and keep description fetches to the promising roles.
