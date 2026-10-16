# Changelog

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
