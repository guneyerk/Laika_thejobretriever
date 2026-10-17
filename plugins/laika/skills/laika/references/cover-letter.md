# Cover letters

Laika writes one-page cover letters for chosen roles. Each letter is an editable Word file (.docx) plus a
PDF, in the same design as the tailored CV (name and contact header, Arial body). It is written in the
user's own writing style, which Laika learns once and refines from every round of feedback.

**When to offer:**
- **After a shortlist:** together with the tailored-CV offer, in one line (see SKILL.md).
- **After the user applies:** offer it for roles that have no letter yet, once per conversation.
- **Whenever the user asks,** e.g. "letter 2", "write a cover letter for the Acme role", or "both 3"
  (tailored CV and letter).

One letter per role. For several roles, do them one after another.

## Rules

1. **One page.** `letter-build` fails if the PDF is longer. Aim for about 250-400 words in 3-5 paragraphs,
   unless the writing style says otherwise.
2. **Open with a professional introduction,** whatever the writing style. The first paragraph says:
   - who the user is: their name, their current role and, if it helps, a relevant earlier one
   - which role they're applying for (and where, if the posting is location-specific)

   Only then move on to the role's needs. For example: "I am Alex Morgan, Head of Sales Operations at
   Brightline Analytics, and I would like to apply for the Head of Product, Payments role in Berlin."
3. **A letter is a job application.** A learned style shapes the voice, but casual elements stay out
   unless the user chose to keep them (see "Application fit" below).
4. **Facts only from the user's own documents:** the base CV content
   (`Tailored CVs/Base CV content.json`), the documents in `Licenses and Certifications/`, and what the
   user tells you.
   - Use only figures from those sources. Never invent a number, achievement, skill or credential.
   - No placeholders such as [Company] or XX; `letter-build` rejects them.
   - If a tailored CV exists for the role, keep the letter consistent with it.
5. **About the employer, use what the posting says.** Research the company on the web only if the user
   asks; the search then contains only the company name. Don't claim knowledge you don't have.
   - For recruiter postings ("our client"), write to the recruiter and don't guess the client's name.
6. **Address a named person** only if the posting or the user names them. Otherwise use the writing
   style's default salutation ("Dear Hiring Manager," in the default style).
7. **Match the user's writing style** (`Writing Style/Laika Writing Style.md`), but never at the expense of
   rules 2-4.
8. **Sound like the user, not like a template.** Ask for one personal touch, run the naturalness check,
   and learn from the user's own edits (all below).
   - Never add deliberate typos, hidden characters or other tricks aimed at AI detectors.
   - Never promise that a letter will "pass" a detector: detectors are unreliable, and wrongly flag
     human writing too.
   - If a posting asks applicants not to use AI tools, point that out to the user before writing.
9. **Private by default.** Letters stay in the master folder. Laika never sends one and never applies on
   the user's behalf.

## First letter: set up the writing style

`laika letter <ref>` prints `WRITING STYLE: NOT SET` until the style is saved. Then, before writing
anything, ask once (AskUserQuestion):

- **Question:** "How should your cover letters sound? I can use a polished default professional tone, or
  learn your own style from things you've written."
- **Options:**
  - `Default professional tone`
  - `Learn my style from samples`: links (LinkedIn posts, articles, a blog), documents, emails or pasted
    text.

**Default:** Write `Writing Style/Laika Writing Style.md` from the template below, with
`**Mode:** default professional` and `**Application fit:** professional by default`, and fill the
sections with the default guidance.

**Samples:** collect what the user gives you, then save every sample under `Writing Style/Samples/`.
- **Files:** `laika style add "<file>" ...`. That covers .txt, .md, .docx, .pdf and .eml emails.
- **Pasted text:** Write it to `Writing Style/Samples/<date> pasted.md`.
- **Links:** WebFetch each link, and Write the user's own text to `Writing Style/Samples/<date> <site>.md`
  with the URL on top. If a page can't be read (e.g. it needs a login), ask the user to paste the text.
- **Emails:** pasted text or exported .eml files. If a mail tool is connected and the user asks you to
  use it, read only the messages the user wrote themselves (their sent mail), and only the ones they point
  you to or agree to. Never send, reply or change anything in the mailbox.
- Learn only from text the user wrote. Skip quoted replies, other people's messages, forwarded text and
  boilerplate signatures.

Then `laika style samples` (Read image samples directly), analyse the writing, and Write the style file
with `**Mode:** learned from your writing` and every section filled from evidence. Prefer concrete
patterns ("opens with the outcome, then the context") over adjectives ("dynamic").
- **Quotes:** short typical phrases are fine, because they're the user's own words. Keep them few.
- **Defaults:** where the samples don't show something (e.g. a sign-off), say "default:" and use the
  professional default.

Then run the application-fit check (below), before showing the user a short summary of what you learned
(3-5 bullets) and saying that they can edit the file. More samples can be added at any time: re-run the
analysis, update the file and redo the application-fit check.

### Application fit

A learned style can be too casual for a job application. Check it whenever the style is learned or
re-learned from samples, and before a letter if the style file has no `**Application fit:**` line (an
older file; `laika letter` then prints `APPLICATION FIT: NOT CHECKED`).

**Too casual for an application:**
- slang, profanity or text-speak ("lol", "u")
- emojis or hashtags
- ALL CAPS shouting, or many exclamation marks
- jokes, sarcasm or self-mocking asides
- a rant-style or aggressive tone
- very casual greetings or sign-offs ("Hey", "Cheers", "See ya")

Steps:
- **None found:** write `**Application fit:** fits job applications (checked <date>)` and carry on
  without asking.
- **Any found:** ask once (AskUserQuestion). Name 2-3 concrete examples from their writing and what you
  would keep:
  - **Question:** "Your writing is more casual than a typical job application in a few places (e.g.
    <examples>). Shall I adjust your style for applications? I'd keep <what makes their voice theirs>
    and tone the rest down."
  - **Options:** `Adjust for applications (Recommended)` and `Keep my style as is`.
- **Adjust:** keep the user's voice markers. Switch the casual elements off for letters, listing them
  under "Voice & tone". Write `**Application fit:** adjusted for job applications (<date>)`.
- **Keep:** use the style unchanged, but still open with a professional introduction (rule 2). Write
  `**Application fit:** kept as is at your request (<date>)`.
- **Don't ask again** unless new samples add new casual elements, or the user asks for a different
  register. Feedback like "more formal" or "less stiff" updates this line too.

## Writing a letter

1. `laika letter <ref>`. It prints:
   - the role's folder in `Cover Letters/`
   - the writing-style status and the base CV content path
   - any tailored CV for the role
   - the role card with the job description

   If the base CV content doesn't exist yet, write it first (see tailored-cv.md, step 2). If the card has
   no job description, read the posting first (WebFetch the link, or the browser for browser sites).
2. Read `Writing Style/Laika Writing Style.md` and follow it, including the rules learned from feedback.
   If `letter` printed `APPLICATION FIT: NOT CHECKED`, run the application-fit check first.
3. **Ask for a personal touch** before drafting, once per letter, in one message (AskUserQuestion when
   available). Ask one or two quick questions only the user can answer:
   - **Why this company or role?** For example, what draws them to it, or a link to their plans.
   - **A specific moment from their experience** that fits this role's main need. Suggest 2-3 options
     from their CV as answers; they can type their own.

   Add a `Skip - use my CV` option. Don't ask again for things already under "Personal details you've
   shared" in the style file, and skip this step if the user said "just write it".
   - **Answers about this role** go into this letter only.
   - **Lasting personal details** (a relocation plan, why they're changing industry) go under "Personal
     details you've shared", so later letters can use them when relevant.
4. Plan the letter around the 2-3 things the posting cares about most, each backed by real evidence from
   the user's CV or certificates, plus the personal touch. Don't retell the CV bullet by bullet. Explain
   why this role, using what the posting says.
5. Write `letter.json` in the role folder (schema below). Use today's date in the style's date format.
6. **Build and run the naturalness pass:** `laika letter-build "<role folder>"`.
   - It writes `First_Last_Cover_Letter_<Mon><YY>.docx` and `.pdf`, checks the rules, and links the
     letter on the role (the tracker's "Cover Letter" column and the role card). Exit code 2 means a rule
     failed: fix the letter and rerun.
   - It also prints a **naturalness check**: stock phrases, very even sentence or paragraph lengths,
     repeated sentence openings, stock transitions, too many lists of three, long dashes and exclamation
     marks.
   - Read the draft once more as the user would say it. Rewrite each flagged item in the user's own words,
     following their style, rather than swapping in synonyms.
   - Rebuild until the check is clean, or every remaining note is a deliberate choice.
7. Read the PDF and check it: one page, nothing cut off, a clean header.
8. Deliver: give both paths (and send the PDF with SendUserFile when that tool is available).
   - In one or two lines, say what the letter emphasises and what the naturalness pass changed.
   - Ask for feedback, and suggest the user change a sentence or two in the Word file in their own words.
     Laika learns from those edits.

## Feedback: revise the letter and update the style

When the user comments on a letter ("too formal", "shorter", "don't start with 'I'", "mention my
relocation plans"):

1. Revise `letter.json` to follow the feedback, rebuild with `letter-build`, Read the PDF, and deliver it
   again.
2. Update `Writing Style/Laika Writing Style.md`:
   - **Feedback about how they write** (tone, length, structure, wording, openings, sign-offs,
     formatting): turn it into a rule in the matching section, or a line under "Cover letter rules".
     Replace an older rule if they conflict.
   - **Feedback about one role's content** (a fact to mention, an emphasis for this employer): apply it
     to that letter only; it's not a style rule. If it's a new fact about the user (a figure, a plan to
     relocate), also add it to the base CV content or mention it in the summary as appropriate, and say
     so.
   - Always add a dated line to the "Feedback log":
     `- <date> (<company> - <role>): "<feedback>" -> <what changed in the style, or "letter only">`.
3. Tell the user in one line what you saved to their style (or that it applied to this letter only).

## Learning from the user's own edits

When the user says they edited the letter themselves ("I changed a few lines in the Word file"):

1. `laika letter-diff "<role folder>"`. It compares the newest .docx in the folder (or `--file
   <edited.docx>`) with Laika's `letter.json`. It prints words per sentence before and after, and every
   sentence they changed, removed or added. If the file is open in Word, ask them to save and close it
   first.
2. Work out the patterns behind the edits, and add them to the style file as rules. Examples:
   - shorter sentences
   - plainer words ("use" instead of "utilize")
   - a different opening or closing
   - phrases they always cut, and words they always add

   One-off content changes are not style rules. Log the session in the "Feedback log", e.g.
   `- <date> (<company> - <role>): learned from your edits -> <rules added>`.
3. `laika letter-diff "<role folder>" --update-json` saves their text into `letter.json`, keeping Laika's
   draft as `letter.previous.json`. Rebuild with `letter-build` only if they want the PDF to match. The
   text is kept, but manual formatting they did in Word is not, so say so.
4. Tell the user in one or two lines what you learned from their edits.

## Writing style file (`Writing Style/Laika Writing Style.md`)

```markdown
# Your writing style
**Mode:** learned from your writing | default professional. _Last updated: <date>. Edit freely - Laika
follows this file for every cover letter and updates it from your feedback._
**Application fit:** fits job applications (checked <date>) | adjusted for job applications (<date>) |
kept as is at your request (<date>) | professional by default

## Sources
- <file name or link> (<email / post / document>, added <date>)

## Voice & tone
- e.g. confident and direct; warm but not chatty; first person, active voice

## Structure & length
- e.g. 3 short paragraphs, about 250 words; opens with the result, then the context

## Sentences & wording
- e.g. mostly short sentences; plain business English; numbers as digits ("EUR 2 million")

## Phrases you use / avoid
- Use: ...
- Avoid: ...

## Openings & sign-offs
- Salutation: ... | Closing: ... | Signature: full name

## Mechanics
- Spelling (British / American), contractions (yes / no), punctuation habits, date format

## Cover letter rules (from your feedback)
- ...

## Personal details you've shared
- e.g. relocating to <city> for <reason>; why they're moving into <industry> (used only when relevant)

## Feedback log
- <date> (<company> - <role>): "<feedback>" -> <what changed>
```

**Default professional guidance:**
- **Voice:** confident, specific and warm; first person, active voice.
- **Shape:** 3-4 paragraphs, about 300 words.
  1. Open with a short professional introduction: the user's name, their current role and the role they're
     applying for. Then give the strongest match between their record and the role's main need. Avoid
     the stock "I am writing to express my interest in...".
  2. Give two or three achievements with real figures that answer the posting's priorities.
  3. Say why this role and company, from the posting, plus anything practical the user mentioned (e.g.
     relocation).
  4. Close briefly, with interest in a conversation.
- **Avoid:** clichés ("passionate", "team player", "I believe I would be a great fit"), flattery and
  restating the whole CV.
- **Openings & sign-offs:** "Dear Hiring Manager," / "Kind regards," / full name. The spelling follows
  the user's CV.

## letter.json schema

```json
{
  "name": "First Last",
  "contact": ["City, Country | +00 000 000 00 00", "name@example.com | https://www.linkedin.com/in/handle/"],
  "date": "17 October 2026",
  "recipient": ["Hiring Manager", "Company", "City, Country"],
  "subject": "Application for Head of Sales",
  "salutation": "Dear Hiring Manager,",
  "paragraphs": ["First paragraph.", "Second paragraph.", "Third paragraph."],
  "closing": "Kind regards,",
  "signature": "First Last"
}
```

- `contact` uses the same lines as the CV header. `recipient` and `subject` are optional.
- Paragraphs are plain text, with no bold.
- Write the letter in the posting's language when the user wants that. The layout has no fixed headings,
  so any language works.
