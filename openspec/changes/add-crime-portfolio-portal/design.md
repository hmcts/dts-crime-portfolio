## Context

DTS Crime delivery information is spread across Ardoq (architecture), Jira
(delivery), Confluence (knowledge), and SharePoint (documents). None of those
tools is going away; what is missing is a discoverable front door that pulls
the picture together for staff who do not know where to look.

HMCTS will build the portal in-house. The build plan uses Next.js App Router
on the front, Sanity CMS as the system of record, an upstream auth proxy that
injects user identity as a request header, and standalone scripts for
scheduled work.

This change is the foundational scaffolding — every capability listed in the
proposal is new. Subsequent changes will modify these specs as needs evolve.

## Goals / Non-Goals

**Goals:**
- One destination that answers "what is being delivered, by whom, in what
  stage, against which strategy actions, with what governance assurance".
- Low barrier to contribution: editors maintain their own dossiers inline, and
  reference entities (people, groups, capabilities) can be created during
  submission without leaving the form.
- A consistent design system across portfolio, dossier, galaxy, action plan,
  prompts, learning, events, profile, and help.
- Snapshots and a change log that make point-in-time comparisons trustworthy
  even after people leave or groups rename.
- Resilience to the underlying systems of record: data is referenced and
  linked, not mirrored.

**Non-Goals:**
- Replacing Ardoq, Jira, Confluence, or SharePoint.
- Building a relational data store. Sanity is the single source of truth.
- Storing user sessions or credentials in the app. Identity is provided by the
  upstream proxy on every request.
- Real-time collaboration on dossier editing (last-write-wins is acceptable
  for v1).
- A native mobile app. The web app is responsive but desktop-first.

## Decisions

### D1. Sanity as the only datastore
Every domain entity is a Sanity document; references use Sanity references and
queries use GROQ. Files use Sanity's asset pipeline. Rationale: removes
relational DB ops, gives content authors a Studio for free, and keeps content
velocity high without a dedicated DBA function.

### D2. Browser never writes to Sanity directly
All mutations go through Next.js API routes which resolve the user from
`x-user-email`, apply role checks, and write the mutation plus a ChangeLog
entry in a single Sanity transaction. The write client uses a server-only
token; the read client is anonymous and used widely.

### D3. Two-level email allowlists for authz
Editor and Admin are derived from email allowlists (Editor maps email → set of
project IDs; Admin is a flat list). Viewer is anyone the proxy admits. There
are no in-app sessions or tokens; the proxy is the trust boundary.

### D4. Stage and Tier as first-class enums
A single TypeScript enum source of truth feeds the Sanity schema, the
submission form, the dashboard cards, the galaxy colour map, and every export.
Changing the enum is a schema change, not a content edit.

### D5. Reference-data endpoint as the dropdown lynchpin
One server route returns groups, directorates, business areas, people,
capabilities, and actions in parallel. Every form and filter consumes it. This
keeps dropdowns consistent and avoids N+1 fetches.

### D6. Inline entity creation during submission
If the submitter types a person, group, or capability that does not exist yet,
the API creates the document in the same transaction and links it. New
entities are flagged for editor approval but do not block submission.

### D7. Tiering calculator runs on the client
The 10-question assessment is a pure function of its inputs and recomputes the
overall tier on every change. The same function runs server-side at write time
to prevent tampering.

### D8. ChangeLog is the source of truth for "Recent Activity" and Compare
Every mutation writes `{ documentId, field, before, after, userEmail,
timestamp }`. Compare diffs and the recent-activity counts are derived from
this log, not by walking document history.

### D9. Snapshots capture resolved text, not just IDs
A `ReportingCut` serialises every project with reference text (person names,
group names, capability names) inlined. Old snapshots stay readable after
references are renamed or deleted.

### D10. Galaxy view is a single canvas
Constellations are computed by a 2D force-directed layout, cached per lens.
Stars share state with the dashboard so filters and overlays apply identically
across both views. WebGL is acceptable if canvas perf is insufficient at
target portfolio size (~1k projects).

### D11. Exports are client-side except where they need the audit log
Excel, Word ownership reports, and PowerPoint summaries are generated in the
browser using `exceljs`, `docx`, and `pptxgenjs` from already-fetched data.
Compliance briefings and compare/word exports run server-side because they
need ChangeLog or full audit context.

### D12. Updates are stored as Portable Text
Project progress updates, FAQ answers, learning bodies, and prompt summaries
all use Sanity's Portable Text. The same renderer powers dossier display,
exports, and any future digest emails.

### D13. Idempotent writes for shared mutations
Submission, prompt upvote, and prompt comment endpoints are safe to retry. The
upvote endpoint stores `{ userEmail }` per vote so a duplicate request is a
no-op rather than a double-count.

### D14. Tooltip explainers ship with every jargon label
Delivery area, business area, governance tier, risk register, DPIA, ATRS, and
ethics framework each have an `i` icon that opens an inline explainer. Copy
lives in Sanity so it can be updated without a release.

## Risks / Trade-offs

- **Sanity-only datastore:** great for content velocity, but heavy aggregation
  queries (multi-field cross-document reporting) will need careful GROQ design
  and may push us toward a server-side cache. Acceptable for v1.
- **Header-based auth:** trusting `x-user-email` works only because the
  upstream proxy is the gateway. A misconfigured route that bypasses the proxy
  would be a hard-to-detect identity bypass. Mitigation: every API route
  starts with the same auth resolver helper, and a smoke test asserts that a
  request without the header is rejected.
- **Allowlist sprawl:** Editor allowlists per project are flexible but require
  ongoing curation. Mitigation: an Admin UI for allowlist management and a
  weekly export of current allowlists for review.
- **Snapshot fidelity vs. cost:** quarterly full snapshots grow the dataset
  linearly. Mitigation: ChangeLog compactor rolls up old rows, and snapshots
  are stored in a separate dataset with a longer retention policy.
- **Galaxy view perf:** a 1k+ project canvas with a force-directed layout will
  not run smoothly on low-end laptops. Mitigation: precompute layouts per
  lens, cap node count by current filters, and fall back to a static SVG for
  unsupported browsers.
- **Public-form abuse via inline entity creation:** anyone admitted by the
  proxy can submit. Mitigation: new entities created during submission are
  marked `pendingReview` and surfaced to admins before they appear in
  dropdowns for other users.
- **Single source of truth dependency on Sanity:** an outage of Sanity takes
  the whole portal down. Mitigation: page-level static caches for read paths
  and a clear status page; writes fail fast with a user-visible message.
- **Drift from underlying systems of record:** linking out to Ardoq/Jira/
  Confluence/SharePoint avoids duplication but introduces broken-link risk.
  Mitigation: a weekly link-check job and a per-link `lastVerifiedAt` field.
