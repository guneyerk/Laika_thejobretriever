# 🐕 Laika, The Job Retriever

**A personal job-search agent for [Claude Code](https://code.claude.com).** Laika finds the most relevant
job boards for the regions you select and brings in the fresh openings from them. It rates each one
against your CV, explains why it fits and what could be a problem, keeps every role in an Excel tracker
with no duplicates, learns from what you apply to and ignore, and writes a tailored CV and cover letter
for any role you pick.

> [!WARNING]
> **Please read the [Disclaimer](DISCLAIMER.md) before using Laika.** In short:
> - Laika is a personal tool for your own job search, not a scraper. Many job sites, including
>   LinkedIn, restrict automated access in their terms, and you are responsible for following the
>   terms of every site you use it with.
> - Laika never applies, signs in or bypasses bot checks for you.
> - Its scores are AI-generated, so always read the actual posting.
>
> Laika is not affiliated with LinkedIn, any job site, or Anthropic.

---

## What Laika does

- **Onboards you in a few questions:** your CV, locations, target roles, seniority, team leadership, work
  mode and job sites, plus any licenses and certifications if you like. Everything goes into a job-search
  folder you choose.
- **Searches only for what's new.** Every query remembers when it last ran, so you never see the same
  role twice. The same job posted on two sites counts once.
- **Rates every role 0-100 against your CV** and any licenses and certifications you add, with a short
  "why it fits" and "watch out" for each, and shows you a ranked shortlist with links.
- **Writes tailored CVs.** Pick a role and Laika builds a CV for it from your CV and certificates, in one
  clean two-page layout, as Word and PDF. It uses only your real figures: if a key number is missing, it
  asks you instead of inventing one.
- **Writes cover letters in your voice.** The first time, choose a polished default tone, or share a few
  things you've written (posts, documents, emails) and Laika learns your style. Every piece of feedback
  ("shorter", "less formal") updates the letter and the saved style, so the next one starts closer.
- **Keeps letters sounding like you.**
  - Laika asks for one personal detail before drafting.
  - It checks every draft for stock phrases and machine-like rhythm, and rewrites them in your voice.
  - It learns from the sentences you change yourself in the Word file. No detector tricks: just your
    voice and real details.
- **Records your decisions:** applied, ignored, or pending. They go into `Job Tracker.xlsx`, plus a card
  per role with a snapshot of the job description.
- **Learns from your choices.** After each round it looks for patterns, such as titles you always skip
  or roles it under-rated, and proposes concrete criteria changes. It changes nothing without your OK.
- **Follows your rules.** For example: "sales roles only in my industries", "direct reports only matter
  for manager-level roles", or "no technical AI roles". Each rule is saved, logged and applied in every
  future search.

## Requirements

| What | Why |
|---|---|
| **Claude Code** (desktop app or terminal, local sessions) | Laika runs as a Claude Code plugin |
| **Python 3.10+** | Laika's helper script (tracker, de-duplication, LinkedIn fetching). On Windows it's `python`, on macOS/Linux `python3` |
| `openpyxl` and `pypdf` Python packages | Excel tracker and PDF CV reading. Laika offers to install them on first run |
| *Optional:* `python-docx`, plus **LibreOffice** or **Microsoft Word** | Tailored CVs and cover letters: `python-docx` writes the Word file, and LibreOffice (any OS) or Word (Windows) turns it into a PDF |
| *Optional:* a browser tool, either the Claude desktop app's **built-in browser** or **Claude in Chrome** | Needed only for job boards that block scripted access (method `browser`) |

## Install

**As a plugin (recommended).** In a Claude Code session:

```
/plugin marketplace add guneyerk/Laika_thejobretriever
/plugin install laika@laika-the-job-retriever
```

Or from your terminal:

```bash
claude plugin marketplace add guneyerk/Laika_thejobretriever
```

```bash
claude plugin install laika@laika-the-job-retriever
```

Start a new session, or run `/reload-plugins`, and Laika is available in every folder.

**Manual alternative.** Copy `plugins/laika/skills/laika` to `~/.claude/skills/laika`. Laika then runs as
`/laika` in any project. To update, replace the folder with a newer copy.

## First run

Type **`/laika:laika`**, or just say **"Hi Laika"**. Laika asks for:

1. your **CV**, as a file path (PDF, Word, TXT, Markdown) or pasted text
2. your **locations**, such as `Berlin, Germany`, `Remote (EMEA)`
3. the **roles** you want
4. *optionally*, your **licenses and certifications** (certificate files)
5. where to create your **job-search folder**
6. a few search parameters: seniority, team leadership, work mode, job sites, things to avoid

It then runs the first search, looking back 14 days, and shows you a ranked shortlist. Reply naturally,
e.g. `apply 1,3 · ignore 2 (too junior)`.

## Everyday use

- **"Laika, fetch!"** runs a new search that covers only what's new since the last one.
- **"Show my pending roles"** / **"Tell me more about #4"**
- **"I applied to 2 and 5, ignore the rest"**
- **"Add Amsterdam to my locations"** / **"Also search for Head of Revenue Operations"**
- **"Sales roles should only be in industries I've worked in"** saves a rule that's applied from then on.
- **"Find the best job sites for Singapore"**
- **"Here's my updated CV: ~/Documents/cv.pdf"** / **"Add my PMP certificate: ~/Downloads/pmp.pdf"**
- **"Make me a CV for #2"** builds a CV tailored to that role, saved next to the others in `Tailored CVs/`.
- **"Write a cover letter for #2"** / **"both 3"**, and then feedback like **"make it less formal"**.
- **"Learn my writing style from these posts: <links>"**
- **"I edited the letter myself"** makes Laika compare your version with its draft and learn from the
  changes.

## Your job-search folder

```
Laika Job Search/
├── CV/                    your CV (older versions in CV/Archive) + "Laika CV Summary.md"
├── Licenses and Certifications/   optional: certificates Laika reads together with your CV
├── Locations/locations.txt
├── Roles/roles.txt
├── Search Criteria/       criteria.txt + changelog.md (every change and why)
├── Job Sites/sites.txt
├── Roles Scanned/         one report per search
├── Roles Applied/         one card per role you apply to
├── Roles Ignored/         one card per role you ignore
├── Tailored CVs/          one folder per role you asked a CV for (Word + PDF)
├── Cover Letters/         one folder per role you asked a cover letter for (Word + PDF)
├── Writing Style/         how you write (Laika Writing Style.md) + the samples it learned from
├── Job Tracker.xlsx       every role: Role, Company Name, Relevancy Score, Search Date, Status, ...
└── .laika/                Laika's memory (job database, search history)
```

**Status values:** `Pending` (shown to you, waiting for your decision), `Applied`, `Ignored`, and
`Low Match` (scanned, but below your minimum score).

**You can edit things yourself:**
- **Licenses and Certifications:** drop certificate files (PDF, Word, text or images) in this folder.
  It's optional; with none, Laika uses your CV alone.
- **`Writing Style/Laika Writing Style.md`:** correct or add rules any time. Laika follows it for every
  letter.
- **The text files:** Laika notices the changes on its next run. A new role, location or site gets a
  full 14-day lookback.
- **`Laika CV Summary.md`:** this is how Laika reads your profile. Correct it and Laika uses your version.
- **`Job Tracker.xlsx`:** change Status from the drop-down or type in "My Notes", and Laika imports it
  on its next run. Keep the file closed while Laika works.

## Several profiles on one computer, or testing Laika

By default one Laika profile is shared by every folder on your computer. To give a folder its own,
separate Laika, for a test run or a second person, say **"give this folder its own Laika profile"**.
Laika then runs `profile here`, which creates `.laika-profile.json` in that folder. Laika in that folder
starts fresh with onboarding and never touches the other profile. Delete the file to go back.

## Job sites

| Site | How | Notes |
|---|---|---|
| **LinkedIn** (default) | Built-in fetcher using LinkedIn's public job-search pages, politely paced | Rate limits pause it for a few minutes; finished queries are never repeated |
| **kariyer.net** (Turkey) | Browser, built-in search URL | Senior roles are mostly posted in Turkish, so use Turkish search titles |
| **GulfTalent** (UAE / Gulf) | Browser, through the site's own search | Results are loose; Laika filters titles strictly |
| **Any other board** | `browser` or `web` method | Ask Laika to research the best boards for your locations |

Each line of `Job Sites/sites.txt` is `Name | URL | method | search titles (optional)`. The optional 4th
column gives a site its own search titles, e.g. local-language ones:

```
kariyer.net | https://www.kariyer.net | browser | Satış Direktörü; Pazarlama Direktörü
```

When a site shows a bot check (for example "press and hold"), Laika stops and asks you to complete it
yourself, or skips that site for this search. Those queries keep their window, so nothing is missed.

## Privacy

- All your data stays in your job-search folder on your computer. The only other file Laika writes is
  `~/.laika/config.json`, which just records where your job-search folder is.
- Your CV and job descriptions are read by Claude as part of your Claude Code conversation, under your
  Claude account's terms. Laika sends no data anywhere else.
- Web searches contain only role titles, locations and site names, never CV content.
- Tailored CVs and cover letters are written to your job-search folder only. Laika never sends them
  anywhere or applies for you.
- Writing samples you share are kept in `Writing Style/Samples/`. If you let Laika use a connected mailbox,
  it reads only the messages you point it to and never sends anything.

## Limitations

- **Site changes.** Job sites change their layouts. If a site stops returning results, Laika says so;
  please [open an issue](https://github.com/guneyerk/Laika_thejobretriever/issues).
- **LinkedIn's public search** ignores the remote/hybrid filter, and its seniority labels are often
  wrong. Laika checks both in the job description.
- **"Remote anywhere"** mostly returns US-only remote roles. Use your region instead, e.g.
  `Remote (EMEA)`.
- **Scores are judgement calls by an AI model.** They can be wrong, especially about visa or work-permit
  eligibility, and they're not career advice.
- **Cloud sessions** (claude.ai/code in the browser) don't load your locally installed plugins. Use the
  desktop app or the terminal.

## Troubleshooting

Run this check (use `python3` on macOS/Linux). It reports missing packages and tests LinkedIn access:

```bash
python plugins/laika/skills/laika/scripts/laika.py doctor --net
```

- **"Job Tracker.xlsx is open":** close it. Laika catches up on its next command.
- **LinkedIn rate limiting (HTTP 429/999):** wait a few minutes and say "continue".
- **Moved your job-search folder?** Tell Laika the new path, and it reconnects without losing anything.
- **Start over:** delete `~/.laika/config.json`, and Laika runs onboarding again. Your old folder stays
  untouched.

Update or uninstall Laika from the `/plugin` panel. Uninstalling leaves your job-search folder in place.

## Repository layout

```
.claude-plugin/marketplace.json          the marketplace catalog (one plugin: laika)
plugins/laika/.claude-plugin/plugin.json plugin manifest
plugins/laika/skills/laika/SKILL.md      Laika's main instructions
plugins/laika/skills/laika/references/   onboarding, search playbook, scoring rubric, feedback loop, tailored CVs, cover letters
plugins/laika/skills/laika/scripts/      laika.py helper, cv_builder.py (CVs and cover letters) + requirements.txt
examples/sample-cv.md                    fictional CV for trying Laika out
```

## Contributing

Bug reports, site adapters and improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Provided as is, without warranty. See the [Disclaimer](DISCLAIMER.md).
