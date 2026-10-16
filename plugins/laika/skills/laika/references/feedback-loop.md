# Feedback loop: learning from the user's choices

Run this after recording decisions (`laika decide`). The goal is to propose criteria changes the
evidence supports, and apply only the ones the user approves.

## When

- After every decision round where at least 2 roles were decided, or the user gave any reason.
- Also when `status` shows "Decisions since last criteria review" ≥ 5, or the user asks ("why do you
  keep showing me X?").
- Skip it, and say nothing, if there's no meaningful pattern yet. Proposing nothing is fine.

## How to reason

Run `laika feedback` and look for patterns with evidence of at least 2 decisions (1 is enough when the
user stated an explicit rule, like "never agencies"):

| Signal in feedback | Possible proposal |
|---|---|
| Title word only in ignored roles (e.g. "sales" 3×) | add it to `exclude_keywords` |
| Ignore reasons repeat a theme ("too junior", "no leadership") | adjust `seniority` / `team_leadership`, or raise the score weight via `other_preferences` |
| Applied roles have titles not in `roles.txt` | add that title to roles |
| A role title in `roles.txt` produced only ignores | remove or replace it |
| Applied roles outside the saved locations | add that location |
| A location or source produced only ignores | drop the location, or the site (`list remove sites`) |
| Same company ignored ≥2× with "company" reasons | add to `companies_excluded` |
| High-scoring roles ignored (over-rating) | scoring note in `other_preferences` (e.g. "deprioritise gaming studios") and/or raise `min_relevancy_score` |
| Low-scoring roles applied (under-rating) | scoring note (e.g. "banking product roles are welcome") and/or lower `min_relevancy_score` |
| Many good roles, few new results | add role variants or a site; increase `max_results_per_query` |
| User applied to roles that one of their own rules had filtered out | the rule is stricter than intended: propose a wider wording (e.g. add the adjacent industries they applied in) |
| User applies to almost everything shown (80%+) | the threshold or rules may be too tight: consider showing slightly lower scores |
| A query (title × location × site) never produces shortlisted roles | drop or replace that title, location or site to cut noise and search time |

Each proposal needs: the **exact change**, the **evidence** ("you ignored 3 of 3 roles with 'Sales'
in the title"), and the **expected effect** on future searches.

## How to ask

- Up to 4 proposals: one AskUserQuestion with `multiSelect: true`, one option per proposal. The
  label is the short change ("Exclude 'sales' titles"), the description gives evidence and effect. The
  user can pick none, or type something else.
- More than 4: show a numbered list in chat and ask which to apply ("all", "1,3", "none").
- Never apply anything that wasn't selected.
- If the user ignored roles without giving reasons, you can add one optional question in the same
  AskUserQuestion call ("why did you pass on X and Y?"), with a few likely reasons as options. Save the
  answers as decision reasons (`laika decide --reason J0123=...`), and as a preference in
  `other_preferences` when they describe a general pattern.

## Applying approved changes

Use the helper so every change is logged in `Search Criteria/changelog.md`:

```
laika criteria set exclude_keywords "intern, junior, sales" --reason "ignored 3/3 sales roles"
laika list add roles "Product Owner" --reason "applied to 2 product owner roles"
laika list remove locations "Lyon, France" --reason "ignored all Lyon roles"
laika criteria set other_preferences "Deprioritise gaming studios; banking product roles welcome" --reason "feedback review"
```

For list-type criteria, start from the current value (`criteria show`) and write the full new list,
since `criteria set` replaces the value. Afterwards run `laika feedback --mark-reviewed` and confirm in one
line what changed. New roles and locations get a full-lookback search next time automatically.

If the user declines everything, still run `--mark-reviewed` so you don't ask again about the same
evidence.
