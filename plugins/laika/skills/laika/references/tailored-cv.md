# Tailored CVs

Laika can write a CV tailored to one role, in one fixed two-page design, as an editable Word file
(.docx) plus a PDF. The layout is reproduced exactly by the bundled builder (`cv-build`). Never
hand-format a CV, never switch to another layout or a document/design artifact: always use `cv-build`.

**When to offer it:**
- After presenting a shortlist.
- After the user marks roles as Applied, for roles without one, once per conversation.
- Whenever the user asks, e.g. "make me a CV for #2".

One CV per role. For several roles, do them one after another. Cover letters have their own guide:
[cover-letter.md](cover-letter.md).

## Hard rules

1. **Two pages maximum.** `cv-build` fails if the PDF is longer. Fix it by cutting content:
   - tighten the summary
   - drop the weakest bullets
   - reduce older roles to one bullet
   - merge early-career roles

   Never shrink fonts, margins or spacing.
2. **Real metrics only.** Use a number only if the user, their CV or their certificates supplied it.
   - Never invent, estimate, round up or "illustrate" a figure.
   - Never ship placeholders such as [X%], XX or TBD; `cv-build` rejects them.
3. **Ask when a metric is missing and would matter.** If a key bullet has no figure, ask the user before
   building. Key bullets are those in the 2-3 most recent roles, or anything the target job emphasises.
   - Put all such questions in one message (AskUserQuestion when available).
   - If they have no figure, keep the bullet qualitative.
   - `cv-build` lists the bullets that contain no number, to help decide what to ask.
4. **Reverse-chronological.** Most recent role first (by end date, then start date; "Present" first);
   education likewise. The builder re-sorts automatically, but write content.json in that order anyway.
5. **Fixed section order:**
   1. header
   2. Professional Summary
   3. Work Experience
   4. Education
   5. Professional Development
   6. Skills
   7. Languages

   Omit a section only when there is nothing for it. Don't add sections (photo, references, hobbies)
   unless asked.
6. **Facts come only from the user's own documents.** That means the CV, the documents in
   `Licenses and Certifications/`, and what the user tells you.
   - Tailoring changes emphasis, ordering of bullets and which bullets to keep.
   - Titles, employers, dates, figures and credentials stay exactly as provided.
   - Never add a skill, tool or certificate the user doesn't have, even if the role asks for it. Name
     the gap in chat instead.
7. **Private by default.** The CV stays in the master folder. Its content never goes into web searches,
   and Laika never sends a CV or applies on the user's behalf.

## Workflow

1. **Prepare:** `laika tailor <ref>` (a list number or a job ID). It prints:
   - the role's folder in `Tailored CVs/`
   - the paths of the CV, the certificate documents and the base content
   - the role card with the job description

   If the card has no job description, read the posting first: WebFetch the link, or use the browser for
   browser sites. If that fails, tailor from the title and Laika's notes, and say so.
2. **Base content (once):** `Tailored CVs/Base CV content.json` is the user's complete, untailored CV in
   the schema below. Every tailored CV starts from it, so facts stay identical across CVs. Write it when
   `tailor` says it doesn't exist or is OLDER than the CV or a certificate document.
   - Use `laika cv text` and `laika certs text`, and Read image certificates directly.
   - Copy every role, bullet, figure, date and credential faithfully.
   - Credentials that are only in the certificate documents go into `professional_development`, as
     "Credential (Abbrev), Issuer, Year."
   - Tell the user once that this file exists and that they can correct it.
3. **Tailor:** write the role's `content.json` from the base:
   - **Headline:** three focus areas that match the role.
   - **Summary:** rewritten for this role's priorities, using the posting's language where it is true
     for the user.
   - **Bullets:** within each job, put the most relevant first. Drop the least relevant if space is
     needed.
   - **Skills:** list the role's keywords the user really has first.
   - **Professional Development:** list relevant credentials first. Drop unrelated ones only if space is
     needed.
4. **Check metrics** (rule 3). Ask in one batch before building. A figure the user supplies is a fact:
   add it to the base content too, so the next CV has it, and say so.
5. **Build:** `laika cv-build "<role folder>"`. It writes `First_Last_CV_<Mon><YY>.docx` and `.pdf` in
   that folder. Months are written Jan Feb Mar Apr May June July Aug Sept Oct Nov Dec.
   - Exit code 2 means a rule failed: fix the content and rerun.
   - On success the CV is linked on the role: the "Tailored CV" column in `Job Tracker.xlsx`, and its
     role card.
   - If no PDF converter is found, the .docx is still built. Tell the user to install LibreOffice (or
     use Microsoft Word on Windows) for the PDF and the 2-page check.
6. **Look at it:** Read the PDF and check every page:
   - at most 2 pages
   - no job title stranded at the bottom of a page
   - bold only on real figures
7. **Deliver:** give both paths (and send the PDF with SendUserFile when that tool is available).
   - Say which bullets stayed qualitative because no figure was given.
   - Name any gaps between the role and the CV.
   - Remind the user to read it before sending.

## Writing conventions

- **Headline:** three focus areas separated by " | ".
- **Contact:** two lines, "City, Country | phone" and "email | LinkedIn URL" (as on the user's CV).
- **Summary:** one paragraph of 4-6 sentences, no "I", closing with the education/credential line. No
  bold.
- **Job title line:** the title only. A region suffix is fine, e.g. "Marketing Manager, Nordics &
  Baltics".
- **Meta line:** "Company | City, Country | Month YYYY - Month YYYY", with full month names and
  "Present" for current roles.
- **Bullets:** open with a strong action verb; one or two lines each.
  - 3-5 bullets for recent roles, 1-2 for early ones.
  - Wrap the single key figure or achievement phrase in `**...**` for bold, only when it is a real
    figure.
- **Education:** school (bold) / degree / "City, Country | YYYY - YYYY".
- **Professional Development:** "Provider: Programme, Place, Dates." or "Credential (Abbrev), Issuer,
  Year."
- **Skills:** one semicolon-separated line ending with a period.
- **Languages:** "Language: Level." per item.
- The section headings are in English, so write the CV in English.

## content.json schema

```json
{
  "name": "First Last",
  "headline": "Area One | Area Two | Area Three",
  "contact": ["City, Country | +00 000 000 00 00", "name@example.com | https://www.linkedin.com/in/handle/"],
  "summary": "One paragraph.",
  "experience": [
    { "title": "Job Title", "company": "Company", "location": "City, Country",
      "start": "October 2025", "end": "Present",
      "bullets": ["Action verb ... by **2.5 times**; ...", "..."] }
  ],
  "education": [
    { "school": "School", "degree": "Degree, Field", "location": "City, Country", "start": "2017", "end": "2018" }
  ],
  "professional_development": ["Provider: Programme, Place, Dates.", "Credential (Abbrev), Issuer, Year."],
  "skills": ["Skill", "Skill", "Tool"],
  "languages": ["Language: Native.", "Language: Fluent, IELTS 8.5/9."]
}
```

## Design spec (reference only; the builder encodes all of it)

- **Page:** A4. Margins 0.72" left/right/bottom, 0.625" top.
- **Fonts:**
  - Name: Calibri Bold 26pt #4F81BD.
  - Section headings: Calibri Bold 13pt #4F81BD.
  - Job titles: Calibri Bold 11.5pt black.
  - Body: Arial 11pt black, exact 13.4pt line height.
  - Company/location/date lines: Arial 10pt #4A4A4A.
  - Contact lines: Arial 9.5pt #4A4A4A.
- **Bullets:**
  - Experience bullets: "•" flush with the margin, wrapped lines hang at 9.4pt, 5pt between bullets.
  - Professional Development and Languages use Word's standard indented bullets (0.25" / 0.5").
- **Page breaks:** each job block (title, meta, bullets) stays together across page breaks.
- **Pagination:** exact line heights and one-sided paragraph gaps make Word and the PDF paginate
  identically.
- **PDF conversion:** `cv-build` uses LibreOffice when it's installed, otherwise Microsoft Word on
  Windows (`--pdf libreoffice|word|none` to choose). The .docx needs the `python-docx` package (see
  `laika doctor`).
