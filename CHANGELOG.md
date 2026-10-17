# Changelog

## 1.3.0 - 2026-10-17

- **Personal touch:** before drafting a cover letter, Laika asks one or two quick questions only the user
  can answer: why this role, and a specific moment that fits it.
  - Lasting details (e.g. a relocation plan) are saved under "Personal details you've shared" in the style
    file for later letters.
- **Naturalness check:** `letter-build` flags patterns that make a letter read as generic or
  machine-written:
  - stock phrases ("I am writing to express", "passionate about", "delve")
  - very even sentence or paragraph lengths
  - repeated sentence openings and stock transitions
  - too many lists of three
  - long dashes and exclamation marks

  Laika rewrites them in the user's own words. It never uses tricks aimed at AI detectors.
- **Learning from your edits:** new `letter-diff` command. It compares the user's edited Word letter with
  Laika's draft and shows every changed sentence, so Laika can turn the patterns into style rules.
  - `--update-json` keeps the user's text for rebuilds, with a backup of the draft.

## 1.2.0 - 2026-10-17

- **Cover letters:** after rating roles, Laika offers cover letters together with tailored CVs
  (`cv 1`, `letter 2`, `both 3`).
  - Each letter is one page, in the same design as the CV, as an editable .docx plus a PDF. It's saved in
    `Cover Letters/` and linked in a new "Cover Letter" tracker column and on the role card.
  - It uses only facts from the user's CV, certificates and what they say.
- **Writing style:** the first time, Laika asks whether to use a default professional tone or learn the
  user's own style from samples they share (links, documents, emails or pasted text).
  - The style is saved in `Writing Style/Laika Writing Style.md`, which the user can edit.
  - Feedback on a letter revises the letter and updates the style, with a dated feedback log.
- New `letter`, `letter-build` and `style` commands. `cv_builder.py` builds letters too (`--letter`).
  The shared design code was refactored, and CV output is unchanged.
- `status` shows whether a writing style is set.
- `Tailored CVs/` and `Cover Letters/` are part of the folder layout from setup on. Existing folders get them on the next `status`.
- Every cover letter opens with a short professional introduction (name, current role, the role applied
  for), whatever the writing style.
- **Application fit:** when a learned style is too casual for a job application (slang, emojis, ALL CAPS,
  jokes, a rant-style tone, casual sign-offs), Laika asks once whether to adjust it for applications.
  - The answer is recorded in the style file, and `letter` shows whether the check is still to do.

## 1.1.0 - 2026-10-17

- **Licenses and Certifications:** a new, optional folder in the job-search folder.
  - Laika reads its documents (PDF, Word, text or images) together with the CV. They go into the CV
    summary and the scoring, and Laika notices when one is added, changed or removed.
  - New `certs list | text | add` commands.
  - With an empty folder, nothing changes: Laika uses the CV alone.
- **Tailored CVs:** after rating roles, Laika offers to write a CV tailored to a role.
  - It's built from the user's CV and certificates in one fixed two-page layout (Calibri/Arial, blue
    headings, reverse-chronological) as an editable .docx plus a PDF.
  - Rules: real metrics only (no placeholders, missing figures are asked for), at most two pages, and a
    fixed section order.
  - New `tailor` and `cv-build` commands and a bundled `cv_builder.py` (needs `python-docx`). The PDF is
    made with LibreOffice, or Microsoft Word on Windows.
  - Each CV is saved in `Tailored CVs/`, linked in a new "Tailored CV" column of the tracker and on the
    role card.
- `doctor` also checks the tailored-CV tools.

## 1.0.1 - 2026-10-17

- LinkedIn: a query that stops early (rate limiting or another error) is no longer left marked done,
  also after `--refetch`. What it found stays in the run, a plain `fetch-linkedin` rerun fetches only
  the unfinished queries, and the last line of the output lists them. If one never finishes, `register`
  keeps its old window and says so.
- `fetch-linkedin` prints one line for the queries it skips instead of one line each, and `run status`
  marks queries that stopped early.
- kariyer.net: when in-page `fetch()` is refused (HTTP 403) but pages still load, the playbook now reads
  the cards from the visible page, one title at a time. Laika stops and asks the user only when page
  loads are blocked too, and never attempts the press-and-hold check.
- kariyer.net: the playbook notes that a card's "N gün" counts from the last update, so most cards are
  roles already in the tracker (de-duplication drops them).

## 1.0.0 - 2026-10-16

First public release.

- Onboarding: CV (PDF, Word, TXT, Markdown or pasted), locations, roles, job-search folder, search
  parameters, job sites, and a CV summary you can correct.
- Change detection: edits to the CV, roles, locations, criteria and sites are noticed on the next run.
- Searches that only cover what's new: each query remembers when it last ran, and new
  roles/locations/sites get a 14-day lookback.
- LinkedIn fetcher (public job-search pages, paced, resumable, rate-limit aware).
- Browser search support for kariyer.net (Turkey) and GulfTalent (UAE / Gulf), plus any other board via
  the `browser` or `web` methods. Sites can have their own (e.g. local-language) search titles.
- De-duplication by posting ID and by company + title + city, across sites and searches. Repeat
  postings can be marked during scoring.
- Scoring rubric (0-100) with hard caps, custom rules (e.g. industry limits for sales roles,
  enablement-only AI roles) and learning from past decisions.
- Excel tracker with drop-downs, colours, hyperlinks and a search log. Status edits made in Excel are
  imported back.
- Role cards for applied and ignored roles, and a report per search.
- Feedback loop: decision statistics, ignore reasons, and proposed criteria changes applied only with
  approval, all logged in `changelog.md`.
- Big-run workflow: compact triage list, focused description fetching, excerpt exports.
- `rescore` to re-check registered roles after a rule change.
- Per-folder profiles: `profile here` gives a folder its own, separate Laika (for testing, or a second
  person on one computer).
- Safety: onboarding never overwrites an existing Laika folder's CV, roles or locations, and searches
  that didn't run keep their window.
