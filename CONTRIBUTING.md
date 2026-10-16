# Contributing to Laika

Thanks for helping! Bug reports, site adapters, docs and improvements are all welcome.

## Reporting a problem

[Open a GitHub issue](https://github.com/guneyerk/Laika_thejobretriever/issues) with:

- what you asked Laika to do, and what happened
- your OS, your Python version, and whether you used the Claude desktop app or the terminal
- the output of `python plugins/laika/skills/laika/scripts/laika.py doctor --net` (use `python3` on
  macOS/Linux)

**Never paste your CV, your tracker or personal data into an issue.**

## How the project is organised

| Part | File | Role |
|---|---|---|
| Agent instructions | `plugins/laika/skills/laika/SKILL.md` | The workflow Claude follows: session start, search, scoring, decisions |
| Reference guides | `plugins/laika/skills/laika/references/*.md` | Onboarding, search playbook (per-site methods), scoring rubric, feedback loop |
| Helper CLI | `plugins/laika/skills/laika/scripts/laika.py` | Deterministic bookkeeping: folders, change detection, LinkedIn fetcher, de-duplication, Excel, cards, statistics |

Design principles:

- **Judgement goes in the skill, bookkeeping in the helper.** Anything that must be exact, such as
  dates, de-duplication or the Excel file, belongs in `laika.py`.
- **The helper stays a single file**, using the standard library plus `openpyxl` (and optional `pypdf`).
- **Be a good citizen on job sites:** keep the pacing, never add CAPTCHA or bot-check workarounds, and
  never add auto-apply.
- **Cross-platform:** Windows, macOS and Linux. Use `pathlib`, and write UTF-8 everywhere.

## Developing and testing

1. Load the plugin straight from your clone, without installing it:

   ```bash
   claude --plugin-dir ./plugins/laika
   ```

2. Keep test data away from your real job search: start your test session in an empty folder and
   give it its own profile first, either by asking Laika or with
   `python plugins/laika/skills/laika/scripts/laika.py --workspace <test folder> profile here`. Then
   try onboarding with `examples/sample-cv.md`. For scripted tests you can also set `LAIKA_CONFIG` to a
   sandbox config file.
3. Check the plugin and marketplace before opening a pull request:

   ```bash
   claude plugin validate ./plugins/laika
   ```

   ```bash
   claude plugin validate .
   ```

4. Run `python -m py_compile plugins/laika/skills/laika/scripts/laika.py`.

## Adding a job site

1. If the site has a predictable search URL, add it to `site_search_url()` in `laika.py`.
2. Add a section to `references/search-playbook.md`, following the kariyer.net and GulfTalent sections:
   - the search URL or JSON endpoint
   - an in-page extraction snippet (paced, start-then-poll)
   - how to read posting dates and locations
   - how to get descriptions
   - known bot checks
3. If it's a regional board worth suggesting during onboarding, add it to `KNOWN_SITES` and to the job-site
   step in `references/onboarding.md`.
4. Mention it in the README's job-site table and in `CHANGELOG.md`.

## Releasing

Bump `version` in `plugins/laika/.claude-plugin/plugin.json` and `VERSION` in `laika.py`, and add a
`CHANGELOG.md` entry. Installed copies stay on their version until the `version` field changes.
