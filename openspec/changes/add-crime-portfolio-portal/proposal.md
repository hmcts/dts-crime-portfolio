## Why

Within DTS Crime in HMCTS there is no single, trusted place that brings together
delivery and operational information. Product taxonomy, delivery status,
objectives, KPIs, dashboards, domain teams, "how‑tos", SOPs, guidance, and
shared platform knowledge live across **Ardoq, Jira, Confluence, and
SharePoint**. The fragmentation slows new starters, hides ownership, duplicates
content, and obscures progress against strategy.

HMCTS will build its own portal to unblock DTS Crime quickly, with a data
model and content surfaces tailored to DTS Crime needs. The portal does not
replace existing systems of record — it is the single discoverable front door
over them.

## What Changes

This is the foundational change for a greenfield codebase. It establishes the
structure (Next.js + Sanity + auth proxy), the cross-cutting platform
capabilities (access control, change tracking, reference data), and the
user-facing surfaces required by the three audiences:

- Leadership get a live, filterable picture of every project plus snapshot
  comparisons and exports.
- Delivery teams submit projects, maintain dossiers, log progress, and link
  work to the published action plan.
- All staff read learning content, share prompts, see events, and find FAQs.

All capabilities below are NEW — there is no prior spec to modify.

## Capabilities

### New Capabilities

- `portfolio-management`: filterable card grid of every project, with stage
  pills, governance signals, search, and a stat strip linking to recent
  activity, action plan, and risk themes.
- `project-dossier`: deep-linkable slide-over panel showing description,
  ownership, governance and assurance, action plan links, and timestamped
  Portable Text updates.
- `project-submission`: six-section progress-bar-tracked survey with the
  10-question tiering assessment, inline entity creation, and a final review
  that recomputes the tier.
- `edit-studio`: inline editing of every dossier section for users on the
  editor allowlist, with Portable Text for updates and a ChangeLog write per
  save.
- `reference-data`: one round-trip endpoint that returns groups, directorates,
  business areas, people, capabilities, and actions for every dropdown across
  the app.
- `galaxy-view`: zoomable canvas constellation map of the portfolio with lens
  re-clustering, signal overlays, search, and dossier deep links.
- `action-plan-tracking`: strand summary tiles, action list/detail layout,
  RAG-style status pills, and reverse-resolved linked projects per action.
- `compare-mode`: portfolio diffs between two dates or against a saved
  Reporting Cut, with field-level changes and a Word "what changed" briefing.
- `exports`: client-side Excel, Word, PowerPoint generation plus a server-side
  compliance briefing covering DPIA, ATRS, ethics framework, and tier gaps.
- `prompts-library`: community prompt sharing with tag and tool filters, sort
  modes, idempotent upvotes, comments, and a monthly competition leaderboard.
- `learning-hub`: tag-filterable videos, guides, and playlists with featured
  flags and a content viewer.
- `events-listing`: searchable event list filtered by category and location.
- `help-faq`: 10-section grouped FAQ with cross-content search and
  expand/collapse controls.
- `profile-view`: user-scoped projects grouped by role (delivery owner,
  additional delivery owner, business lead, legal lead).
- `access-control`: Viewer / Editor / Admin model resolved per request from
  an `x-user-email` header set by the upstream auth proxy, gated by email
  allowlists.
- `change-tracking`: audit log row written by every mutation, used by compare,
  recent-activity counts, and exports.
- `email-reminders`: scheduled GOV.UK Notify job that nudges delivery owners
  on stale projects and logs send results back to Sanity.

### Modified Capabilities

None — this is the initial scaffolding.

## Impact

- **New code:** Next.js App Router project, Sanity Studio project, standalone
  Node scripts for reminders/snapshots/competition tabulation, Terraform for
  infra.
- **External dependencies:** Sanity CMS project and dataset, GOV.UK Notify
  account, PostHog project, identity proxy that can inject `x-user-email`.
- **Existing systems of record:** none replaced. Ardoq, Jira, Confluence,
  SharePoint continue to own their respective slices; the portal links out
  rather than copying.
- **Operational:** scheduled jobs (daily reminders, quarterly snapshot writer,
  weekly ChangeLog compactor, monthly prompt competition tabulator) and an
  editor/admin allowlist that needs ongoing curation.
