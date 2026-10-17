# Scoring roles against the CV

Inputs:
- the run's `for_scoring.md`
- `CV/Laika CV Summary.md`, which covers the CV and any licenses and certifications. Use `cv text` and
  `certs text` when you need detail.
- the criteria (`laika criteria show`)
- the learnings from `laika feedback` Output: `scores.json` in the
run folder.

```json
[
  {"cid": "c001", "score": 82,
   "why": "Owns a fintech payments product end to end - matches 6 years leading payments at X; asks for SQL and A/B testing, both on the CV.",
   "concerns": "Asks for crypto exchange experience (none on CV); 200+ applicants already."}
]
```

## Rubric (0-100)

| Dimension | Points | What to check |
|---|---|---|
| Role & function fit | 25 | Is this actually the job the user targets? The title AND the real responsibilities, not just keywords |
| Skills & domain fit | 25 | Must-have skills, tools, licenses/certifications and industry vs. the CV and certificates. Preferred industries add, excluded industries subtract |
| Seniority & experience | 20 | Years asked vs. the CV, scope of the role vs. the `seniority` criterion. Too junior and too senior both lose points |
| Leadership fit | 10 | People management asked vs. the `team_leadership` criterion and the CV's leadership history |
| Location, work mode & language | 10 | In one of the user's locations (or truly remote)? Work mode in `work_mode`? Required languages on the CV? |
| Other preferences | 10 | Employment type, salary (if stated), `other_preferences`, learned patterns from past decisions |

Bands: **85+** excellent (apply soon) · **70-84** strong · **60-69** worth a look · **<60** low match
(registered, not shown). The threshold is `min_relevancy_score`.

## Hard caps (apply after summing)

- Excluded industry or company, or the title contains an `exclude_keywords` word: **max 40**
  (the helper usually auto-flags these already).
- Location outside the user's list with no remote option, or a required language the user lacks:
  **max 45**.
- The posting says it's closed (`closed: True`): **max 30**, and say so in concerns.
- No description available (scored from the card only): **max 75**, and add "Scored from the listing
  card only" to concerns.
- **Custom criteria keys are rules the user set** (they appear under "Custom criteria" in `criteria.txt`,
  e.g. `sales_role_industries`). Apply them literally. A rule that says something is "capped below the
  threshold" means **max `min_relevancy_score` - 5**, and the concern must name the rule.
- Team leadership follows the `team_leadership` text exactly. For example, "required for Manager-level
  roles only" means a Director/Head/VP role with no direct reports is **not** penalised, while a
  Manager role without people management is capped at `min_relevancy_score` - 5.

After a criteria change, re-check the roles still **Pending** against the new rules and update them with
`laika rescore --in <file>`. Tell the user which roles moved and why.

## Writing "why" and "concerns"

- 1-2 sentences each, concrete, and tied to CV evidence ("8 years of B2C product work, incl. checkout
  at Y") or posting evidence ("requires 3+ years of people management").
- Licenses and certifications count as evidence like CV lines. A credential the posting asks for and the user
  holds goes in "why" (e.g. "asks for PMP - you hold it, 2023"). One it requires that the user lacks, or that
  has expired, goes in concerns. With no certificate documents, judge from the CV alone.
- Concerns are what a recruiter would probe or what could make the role a bad fit: missing must-haves,
  seniority mismatch, domain gap, location or work-mode doubt, agency posting with an unknown employer,
  large applicant count, posting age.
- Be honest. Inflated scores waste the user's time, and their ignore decisions will teach you to be
  stricter anyway.

## Using past decisions (learning)

Before scoring, skim `laika feedback`:
- Ignore reasons and "high-scoring roles you ignored" show what you over-rate. Lower similar roles now
  and mention the pattern in concerns ("you passed on two gaming-studio roles before").
- "Low-scoring roles you applied to" show what you under-rate. Give similar roles more credit.
- `other_preferences` holds approved notes from earlier criteria reviews. Treat them as rules.

## Candidates without a score

Anything left out of `scores.json` is registered as **Low Match** with an automatic note, which is
right for clearly unrelated titles. For anything plausibly relevant, give a real score even if it
ends up low.
