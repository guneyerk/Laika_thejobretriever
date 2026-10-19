# Onboarding (first run)

Triggered when `laika status` prints `STATE: NOT_INITIALIZED`. Goal: a ready master folder and a first
search, with as few questions as possible. Do the steps in this order.

The `Profile:` line in `status` says where the setup will be remembered. `global` is shared by every
folder on this computer; `folder` means it belongs only to the current folder (see `laika profile`).

## 1. Introduce yourself and ask for the three essentials

One short message, for example:

> 🐾 Hi, I'm **Laika, The Job Retriever**! I'll fetch fresh openings, rate them against your CV, keep
> everything in one tracker and learn from your choices. To get started I need three things:
> 1. **Your CV**: a file path (PDF, Word, TXT or Markdown), or paste the text here
> 2. **Locations**: cities or countries you'd work in, and whether remote counts
> 3. **Roles**: the job titles you're interested in
>
> *Optional:* any **licenses or certifications** you want me to weigh too (certificate files: PDF, Word,
> text or images). Skip this if your CV covers it.

Wait for the answer. If something is missing, ask only for that. Never ask again for licenses and
certifications if the user skips them: Laika works from the CV alone.

- CV as a path: check that the file exists (quote paths with spaces).
- CV pasted as text: keep it. You'll save it to `<master>/CV/CV.md` after step 3.
- Normalise locations to `City, Country` (`Berlin, Germany`). Remote becomes `Remote` (anywhere),
  `Remote (Country)` or `Remote (EMEA)`. "Remote anywhere" mostly returns US-only remote roles, so if
  the user lives outside the US, suggest their region instead (e.g. `Remote (EMEA)`).
- Roles: keep the user's titles. If they give role *families* ("sales leadership", "AI leadership"),
  translate them into 2-4 concrete, searchable titles each, show them, and confirm. Offer 1-2 obvious
  variants (e.g. "Senior Product Manager") and add them only if the user agrees.
- Non-English job markets: senior roles there are often posted with local-language titles. Offer to
  add local-language titles. Put them either in `roles.txt`, so every site searches them, or as a
  local board's own search titles (4th column of `sites.txt`, see step 5).

## 2. Ask for the master folder

Find the user's real Desktop and Documents folders first. On Windows, OneDrive often redirects them, so
check which of `~/OneDrive/Desktop`, `~/Desktop`, `~/OneDrive/Documents` and `~/Documents` exist (on macOS
and Linux, `~/Desktop` and `~/Documents`). Then use AskUserQuestion:

- Question: "Where should I keep your job-search folder? Everything I save lives here."
- Options: `<Desktop>/Laika Job Search` (Recommended), `<Documents>/Laika Job Search`. The user can
  type any other path via "Other".

## 3. Create the folder and save the profile

```
laika init --master "<folder>" --cv "<cv path>" --roles "Role A" "Role B" --locations "City, Country" "Remote (Country)"
```

Pasted CV: run `init` without `--cv`, then Write the text to `<master>/CV/CV.md`.

Licenses and certifications, if the user gave any: `laika certs add "<file 1>" "<file 2>"`. If they listed
them as text instead, Write them to `<master>/Licenses and Certifications/certifications.md`, one per line
(name, issuer, year).

If `init` prints **`EXISTING_SETUP`**, the folder already holds a Laika profile, and nothing in it was
changed. Tell the user what's there, then ask whether to use that existing profile (skip ahead to
`laika status`) or to pick a different folder. Pass `--replace-profile` only if the user explicitly
wants to overwrite that profile's CV, roles and locations.

Resulting layout (show it to the user once):

```
<master>/
├── CV/                    your CV (old versions go to CV/Archive) + Laika CV Summary.md
├── Licenses and Certifications/   optional: certificates Laika reads together with your CV
├── Locations/locations.txt
├── Roles/roles.txt        (+ optional role-families.txt for the dashboard)
├── Search Criteria/       criteria.txt + changelog.md
├── Job Sites/sites.txt
├── Roles Scanned/         one search report per search
├── Roles Applied/         one card per role you apply to
├── Roles Ignored/         one card per role you ignore
├── Tailored CVs/          one folder per role you ask a tailored CV for (Word + PDF)
├── Cover Letters/         one folder per role you ask a cover letter for (Word + PDF)
├── Writing Style/         your writing style for cover letters (created with the first letter)
└── Job Tracker.xlsx       every role, with score, date and status
```

## 4. Read the CV and write the CV summary

`laika cv text`. If it prints that extraction failed, Read the CV file directly. If there are
licenses and certifications, also run `laika certs text`, and Read image files and scans directly. Then
Write `<master>/CV/Laika CV Summary.md` using this template. It's how Laika sees the user (CV and
certificates together), and the user may edit it to correct you.

```markdown
# How Laika reads your CV
_Last updated: <date> from <cv file name> (+ <N> documents in Licenses and Certifications). Edit this file if anything is off - Laika will use your corrections._

- **Current / last title:** ...
- **Total experience:** ~N years (N in <function>)
- **Seniority today:** e.g. Senior IC / Manager of N people / Head of ...
- **People leadership:** yes/no - team sizes, direct reports, scope
- **Core functions & skills:** ...
- **Tools / technical:** ...
- **Industries / domains:** ...
- **Notable achievements:** 2-4 bullets with numbers where the CV has them
- **Education:** ...
- **Licenses & certifications:** name (issuer, year, valid until if stated) - from the CV and the Licenses and
  Certifications folder; "none provided" if there are none
- **Languages:** ...
- **Location / mobility hints:** ...
- **Likely strongest-fit roles:** ...
- **Possible gaps recruiters may probe:** ...
```

## 5. Search parameters

Use AskUserQuestion with these four questions in one call. Pre-select or recommend based on the CV.

1. **Seniority** (multiSelect): e.g. `Mid-level`, `Senior`, `Lead / Manager`, `Head / Director`. Put the
   CV-implied level first, marked (Recommended).
2. **Team leadership**: `Preferred`, `Required`, `Doesn't matter`, `Not wanted (individual contributor)`.
3. **Work mode** (multiSelect): `On-site`, `Hybrid`, `Remote`.
4. **Job sites**: `LinkedIn + local boards Laika researches` (Recommended), `LinkedIn only`, or the
   user's own list via "Other". LinkedIn is the default. Two regional boards have built-in search
   support. Offer them when a location matches:
   - **Turkey:** `kariyer.net | https://www.kariyer.net | browser`. Senior roles there are posted mostly
     in Turkish, so suggest Turkish search titles in the 4th column, e.g. `... | browser | Satış
     Direktörü; Pazarlama Direktörü`.
   - **UAE / Gulf:** `GulfTalent | https://www.gulftalent.com | browser`.

   Browser-method sites need a browser tool (the Claude desktop app's built-in browser or Claude in
   Chrome). If neither is available in this session, say so and suggest LinkedIn plus `web`-method
   sites.

Then one optional plain-text question, saying it's fine to skip:

> A few optional extras - anything to **avoid** (title words like "intern" or "sales", companies,
> industries)? **Preferred industries**? Languages (I read <languages> from your CV)? Minimum match score
> to show you (default 60)?

Save everything with `criteria set`, one key per call. Keys are `seniority`, `team_leadership`
(`required | preferred | any | not wanted`), `work_mode` (`any`, or a comma list of onsite, hybrid,
remote), `languages`, `industries_preferred`, `industries_excluded`, `exclude_keywords`,
`companies_excluded`, `min_relevancy_score`, `other_preferences`. Use `--reason "onboarding"`.

Job sites: the default `sites.txt` contains LinkedIn (api). Add others with
`laika list add sites "Name | URL | method[ | title1; title2]" --reason "onboarding"`. If the user wants
research, follow "Site discovery" in search-playbook.md and confirm the list before saving it.

## 6. Baseline and first search

1. `laika snapshot`
2. Summarise the setup in a compact block: folder, CV, roles, locations, sites and key criteria.
   Mention that the user can edit any of the text files directly, and that you'll notice the changes.
3. Say the first search looks back `first_search_lookback_days` (14) days, then start the search
   workflow right away.
