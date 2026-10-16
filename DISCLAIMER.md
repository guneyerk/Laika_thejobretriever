# Disclaimer

Please read this before using Laika, The Job Retriever ("Laika"). By using Laika you accept the points
below.

## 1. Independent project, no affiliation

Laika is an independent open-source project. It is **not affiliated with, endorsed by or sponsored by**
LinkedIn, kariyer.net, GulfTalent, any other job site, or Anthropic. All product names and trademarks
belong to their owners and are used only to describe compatibility.

## 2. How Laika accesses job sites, and your responsibility

- **LinkedIn:** Laika's helper requests LinkedIn's publicly accessible job-search pages (no login), with
  pauses between requests and a cap on results per search.
- **Other sites:** Laika either uses your own browser session (the Claude desktop app's built-in browser
  or Claude in Chrome), loading pages at a human pace, or uses web search and page fetches.
- **Many job sites restrict or prohibit automated access** in their terms of service. LinkedIn's User
  Agreement, for example, prohibits scraping and automated collection of its data. Using Laika with such
  a site may break its terms and can lead to rate limiting, blocks, or action against your account or
  IP address.
- **You are solely responsible** for reviewing and following the terms of every site you use with
  Laika. If you're unsure, or a site objects, don't use Laika with that site. Remove it from
  `Job Sites/sites.txt`.
- **Use Laika only for your own personal job search, at low volume.** Don't use it to collect data at
  scale, build datasets, resell information, or run it for other people as a service. Don't remove or
  weaken its pacing.

## 3. What Laika never does

- It never applies to jobs, fills in application forms, sends messages, signs in or creates accounts for
  you. "Applied" only records your own decision.
- It never solves, bypasses or works around CAPTCHAs, "press and hold" checks or other bot protection.
  When one appears, Laika stops and asks you to complete it yourself, or skips the site.

## 4. AI-generated assessments

Relevancy scores, "why it fits" notes and concerns are produced by an AI model (Claude) from your CV and
the posting. They **can be wrong, incomplete or outdated**, including about seniority, location, remote
eligibility, language, visa or work-permit requirements. They are **not** career, legal, immigration or
financial advice. Always read the original posting and decide for yourself.

## 5. Your data and privacy

- Laika stores your CV, profile files, job tracker and search history **locally**, in the folder you
  choose, plus a small pointer file at `~/.laika/config.json`.
- To rate roles, your CV and the job descriptions are processed by Claude as part of your Claude Code
  conversation. That processing is governed by your agreement with Anthropic, not by this project.
  Laika itself sends your data nowhere else.
- Web searches made by Laika contain only role titles, locations and site names, never CV content.
- Job postings may contain other people's personal data, such as recruiter names. Keep your tracker
  private and don't redistribute it.

## 6. No warranty, no liability

Laika is provided **"as is", without warranty of any kind**, under the [MIT License](LICENSE). The authors
and contributors are not liable for any claim, damage or other liability arising from its use. That
includes missed opportunities, inaccurate scores, account restrictions by third-party sites, or data
loss. Keep your own backups of anything important.
