# Demo dataset research: Knowledge Base Agency

Research date: 2026-07-12  
Decision scope: a legally reusable, credible demo corpus that one builder can ingest and evaluate during an eight-hour sprint.

## Recommendation

Use a **12-file snapshot of PostHog's public company handbook** as the primary demo corpus. It is the best balance of current startup reality, clean Markdown, explicit reuse permission, useful cross-document questions, and manageable size.

Present it honestly as **"PostHog public handbook — demo snapshot"**, not as our own company's policies. Preserve the PostHog copyright and MIT notice with the imported files, show the upstream source URL on every document, and do not use PostHog's logo or imply endorsement.

Why this corpus is unusually good for the product:

- PostHog describes its repository as its official website, docs, and handbook, with all written content under `contents/`; the repo is active and the selected source files are plain Markdown/MDX. [Official repository and README](https://github.com/PostHog/posthog.com)
- The repository's `LICENSE` grants broad MIT-style permission specifically for content under `/contents`, subject to retaining the copyright and permission notice. [Official license](https://github.com/PostHog/posthog.com/blob/master/LICENSE)
- The chosen subset contains realistic questions across People Ops, expenses, remote work, meetings, security, support, and incidents. It also has productive overlaps: benefits link to detailed expense/time-off pages; communication's "public by default" has a confidentiality exception in the meetings page; incident handling crosses support, engineering, sales, and marketing boundaries.
- At roughly 27,000 words across 12 files, it is large enough to expose retrieval and citation errors but small enough to ingest repeatedly during a solo sprint.
- Git history supplies genuine freshness metadata. Pin the demo import to commit [`61f1bb241d1289b85a5fc30fcd3cc45c05e44aec`](https://github.com/PostHog/posthog.com/tree/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec) so answers and tests do not shift during the event.

### Primary corpus: exact files

Base download URL:

```text
https://raw.githubusercontent.com/PostHog/posthog.com/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/<path>
```

| # | Source file | Why include it | Approx. words |
|---:|---|---|---:|
| 1 | [`people/spending-money.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/people/spending-money.md) | Expenses, receipts, equipment, software, travel | 3,234 |
| 2 | [`people/benefits.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/people/benefits.md) | Benefits overview that points into several other files | 1,032 |
| 3 | [`people/time-off.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/people/time-off.md) | Permissionless leave, sickness, parental leave, birthdays | 1,951 |
| 4 | [`people/onboarding.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/people/onboarding.md) | Checklist, buddy, first week, tools, 30/60/90 checks | 3,851 |
| 5 | [`people/side-gigs.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/people/side-gigs.md) | Outside work, intellectual property, approval | 658 |
| 6 | [`company/communication.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/company/communication.md) | Async work, GitHub/Slack rules, public/private boundaries, RFCs | 4,909 |
| 7 | [`getting-started/meetings.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/getting-started/meetings.md) | Weekly rhythm, all-hands, no-meeting days | 929 |
| 8 | [`company/offsites.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/company/offsites.md) | Travel, insurance, family attendance, planning | 4,156 |
| 9 | [`company/security.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/company/security.md) | MFA, devices, compliance, phishing, impersonation | 1,396 |
| 10 | [`support/customer-support.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/support/customer-support.md) | Channels, prioritization, response targets, difficult users | 2,633 |
| 11 | [`support/support-incident-response.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/support/support-incident-response.md) | Declare, coordinate, hand over, and close incidents | 2,318 |
| 12 | [`people/finance.md`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/contents/handbook/people/finance.md) | Small index/runbook page that tests thin-document retrieval | 511 |

Also import the pinned [`LICENSE`](https://github.com/PostHog/posthog.com/blob/61f1bb241d1289b85a5fc30fcd3cc45c05e44aec/LICENSE) as `SOURCE-LICENSE.txt` and record this attribution in corpus metadata:

```text
Demo content sourced from PostHog/posthog.com, commit
61f1bb241d1289b85a5fc30fcd3cc45c05e44aec.
Copyright (c) 2020-2025 PostHog Inc.; /contents content used under its MIT license.
```

### Ingestion and citation rules

1. Store both `source_path` and pinned `source_url`; never cite a generated KB article as though it were the raw source.
2. Chunk on Markdown headings and retain the heading trail, for example `people/time-off.md > When you should have time off > You are sick`.
3. Record the Git commit as `source_version` and the upstream commit timestamp or file commit time as `source_updated_at`.
4. A valid answer must include at least one pinned source URL and section heading. For multi-policy answers, require every material claim to be supported, not merely one citation at the bottom.
5. A generated gap-fill draft is a different authority class: cite the interview/run that produced it, label it `draft` until approved, and never blend it silently with upstream PostHog policy.

## Candidate comparison

| Candidate | Legal reuse signal | Demo fit | Main drawback | Decision |
|---|---|---|---|---|
| **PostHog handbook** | `/contents` is explicitly MIT-licensed; retain notice. [License](https://github.com/PostHog/posthog.com/blob/master/LICENSE) | Current software startup; Markdown; HR + operations + support; easy pinned citations | Full handbook is enormous, so use only the proposed 12 files | **Primary** |
| **GitLab handbook** | GitLab states that the handbook is under CC BY-SA 4.0 and expects external use with attribution/share-alike. [Official handbook usage](https://handbook.gitlab.com/handbook/about/handbook-usage/) | Excellent real-company operations and strong freshness/history | Over 2,000 printed pages, higher taxonomy/noise burden, and share-alike compliance needs care. [Official handbook overview](https://handbook.gitlab.com/handbook/) | Strong expansion corpus, not the eight-hour default |
| **Sourcegraph handbook** | Apache-2.0 permits reproduction and derivative works with license/notice conditions. [Official license](https://github.com/sourcegraph/handbook/blob/main/LICENSE) | Markdown and rich startup operating material | Owner archived it on 2024-07-02 after migration to Notion, so its policies are a stale snapshot. [Official repository README/status](https://github.com/sourcegraph/handbook) | Useful freshness demo, weak primary truth source |
| **Tidepool handbook** | CC0-1.0; README explicitly welcomes forks and reuse. [Official repository](https://github.com/tidepool-org/handbook) | Clean standalone policy files; realistic People Ops; permissive | Tidepool explicitly warns the repository is outdated and points to Confluence as current source of truth | **Fallback** if PostHog import is blocked |
| **Clef handbook** | CC0-1.0; README explicitly permits forking, using, and modifying policies. [Official repository](https://github.com/clef/handbook) | Very small, tidy HR/operations corpus with stable filenames | About a decade old and Clef no longer operates, limiting demo credibility | Parser smoke-test corpus only |
| **37signals/Basecamp handbook** | Public official repository, but no clear LICENSE file or reuse grant is presented | Current, concise, and exceptionally manageable (about 15 top-level files). [Official repository](https://github.com/basecamp/handbook) | Public availability is not the same as permission to copy/repackage | Do not bundle without permission; link-only exploration at most |

### Fallback corpus

If the PostHog files cause an MDX/parser problem, use Tidepool's CC0 handbook because it is almost entirely ordinary Markdown and its README explicitly authorizes reuse. Import this small subset from the [official repository](https://github.com/tidepool-org/handbook):

- `Benefits and Perks/Vacation and Sick Leave.md`
- `Benefits and Perks/Continuing Education.md`
- `Benefits and Perks/New Parent Leave.md`
- `Employment Policies/Working Remotely.md`
- `Employment Policies/Employee Privacy.md`
- `Onboarding Documents/Communication and Transparency.md`
- `Onboarding Documents/One-on-Ones.md`
- `Operations Documents/Effective Meetings.md`
- `Operations Documents/Finances.md`
- `Operations Documents/Hack Weeks.md`
- `Operations Documents/Interview Process.md`
- `LICENSE`

Label it **"Tidepool legacy public handbook — demo snapshot"** because Tidepool itself says this GitHub version is outdated and its current source of truth moved to public Confluence. That caveat can actually exercise the product's stale-source warning.

## Proposed 25-question evaluation set

Scoring contract:

- **Answerable:** correct material answer, cited pinned file URL, and correct heading trail.
- **Cross-document:** all material parts answered and each part cited to the appropriate file(s).
- **Gap:** the bot must not invent a policy. Pass only if it says the corpus does not specify the answer, cites no irrelevant policy as proof, and creates/deduplicates a gap record.
- **Citation failure:** an otherwise correct answer without a source link is a failure.

| # | Test question | Type | Expected source/behavior |
|---:|---|---|---|
| 1 | What is the process for submitting a receipt for a company-card purchase? | Answerable | `people/spending-money.md > Logistics > Receipts` |
| 2 | What equipment can I buy for a productive home setup, and what principles constrain the spend? | Answerable | `people/spending-money.md > Expense guidelines > Equipment` |
| 3 | How should I handle a software subscription the company does not already use? | Answerable | `people/spending-money.md > Expense guidelines > Software` |
| 4 | Is time off capped, and how do I book it? | Answerable | `people/time-off.md > Permissionless time off` |
| 5 | What should I do when I am sick? | Answerable | `people/time-off.md > When you should have time off > You are sick` |
| 6 | What parental-leave options are documented? | Answerable | `people/time-off.md > Parental leave` |
| 7 | What does an onboarding buddy do? | Answerable | `people/onboarding.md > Onboarding buddy` |
| 8 | What check-ins should happen in a new hire's first 90 days? | Answerable | `people/onboarding.md > 30/60/90 day check-ins` |
| 9 | May I run a paid side project, and whose signoff is required? | Answerable | `people/side-gigs.md > Managing time` and `Getting signoff` |
| 10 | Who owns an idea created using company tools during a hackathon? | Answerable | `people/side-gigs.md > Intellectual property > Ideas that start at PostHog` |
| 11 | Which days prohibit planned internal meetings? | Answerable | `getting-started/meetings.md > No meeting days` |
| 12 | What is discussed in the Monday all-hands, and is it recorded? | Answerable | `getting-started/meetings.md > Weekly schedule` and `The all-hands` |
| 13 | What should I do if I suspect a phishing attempt? | Answerable | `company/security.md > Reporting phishing` |
| 14 | Can a support team member declare an incident, and how? | Answerable | `support/support-incident-response.md > Raising an incident` |
| 15 | What must happen to incident-related support tickets after resolution? | Answerable | `support/support-incident-response.md > After an incident resolves` |
| 16 | A customer complains publicly on social media. Where should the conversation move, and why? | Answerable | `support/customer-support.md > Guidelines for doing support` |
| 17 | Are follow-up and escalated-ticket reply targets different from initial reply targets? | Answerable | `support/customer-support.md > Follow-up / next reply response targets` and `Escalated ticket response targets` |
| 18 | Can I expense travel to work with teammates in person, and where do I find the governing details? | Cross-document | `people/benefits.md > Meeting up` + `people/spending-money.md > Expense guidelines > Travel` |
| 19 | The company is public by default. Does that mean I can publish the all-hands recording? | Cross-document/exception | `company/communication.md > Public by default` + `getting-started/meetings.md > Weekly schedule` (all-hands content is confidential) |
| 20 | For a major customer incident, who owns external messaging and how should Support coordinate? | Cross-document | `support/support-incident-response.md > Working with the Comms Lead` and `Coordinating with TAMs and CSMs` |
| 21 | How many consecutive days may I work from another country before tax or immigration review is required? | Gap | Refuse; create `remote-work-cross-border` gap |
| 22 | Which countries are prohibited for temporary remote work? | Gap | Refuse; deduplicate into `remote-work-cross-border` gap |
| 23 | Does the company reimburse home internet, and what is the monthly cap in each country? | Gap | Refuse; create `home-internet-reimbursement` gap |
| 24 | How long are Zendesk support tickets and attachments retained before deletion? | Gap | Refuse; create `support-data-retention` gap |
| 25 | What is the visitor and guest policy for employees working from a shared office? | Gap | Refuse; create `workspace-visitors` gap |

### Demo gap-fill arc

Use questions 21 and 22 for the live agency moment. They should first fail safely and collapse into one gap, **Remote work across borders**. Run a short owner interview containing four explicit decisions (maximum duration, allowed/prohibited locations, required approval, and tax/visa responsibility), generate a draft, approve it, then rerun both questions. The visible score can move from **20/25 to 22/25** while every newly answerable claim cites the approved interview-backed document.

Do not prewrite the missing policy as if PostHog supplied it. The demo should visibly label it as a synthetic policy created for testing, with the gap interview and approval trace as provenance.

## Final choice

Start with PostHog. It gives judges a recognizable real-company document pile, not a synthetic RAG benchmark, while retaining explicit legal reuse permission and deterministic source citations. Keep Tidepool downloaded only as a parser fallback. Do not mix companies in one KB: cross-company retrieval would create artificial contradictions that weaken the trust story.
