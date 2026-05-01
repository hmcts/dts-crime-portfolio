## 1. Foundations

- [ ] 1.1 Provision a Sanity project, dataset, and the Studio repo
- [ ] 1.2 Define every Sanity schema (Project, Person, Group, Directorate,
      BusinessArea, Capability, Action, Prompt, LearningItem, Event, Faq,
      ReportingCut, ChangeLog) and seed reference data
- [ ] 1.3 Stand up a Next.js (App Router, TypeScript, Tailwind) project with
      Tailwind theme, Stage and Tier shared enums, and a Portable Text
      renderer used everywhere updates appear
- [ ] 1.4 Implement the shared auth resolver helper that reads
      `x-user-email`, looks up Editor and Admin allowlists, and returns
      `{ email, isAdmin, editableProjects }`; add the smoke test that
      asserts mutations 401 without the header
- [ ] 1.5 Create two Sanity clients (read-only, server-only token write) and
      a transaction helper that always writes a ChangeLog row with each
      mutation
- [ ] 1.6 Containerise the Next.js app behind the auth proxy and stand up
      Terraform for infra; wire PostHog

## 2. Reference data and authorisation

- [ ] 2.1 Build `GET /api/portfolios/reference-data` with parallel sub-fetches
      and `pendingReview` exclusion (`?includePending=1` for Admin)
- [ ] 2.2 Build `GET /api/portfolios/capabilities` convenience route
- [ ] 2.3 Build `GET /api/portfolios/editor-access` returning
      `{ isAdmin, editableProjects }`
- [ ] 2.4 Implement client-side reference-data cache invalidation on inline
      entity creation
- [ ] 2.5 Build the Admin allowlist management route with ChangeLog write

## 3. Portfolio core

- [ ] 3.1 Build `/portfolio` card grid with stage pills, governance signals,
      capability/area chips, and "Last updated" footer
- [ ] 3.2 Implement multi-select filters for Stage, Delivery area, Business
      area, Owner, Capability, Governance tier, Action plan, plus search and
      Clear filters
- [ ] 3.3 Implement the stat strip linking to Action Plan, Recent Activity,
      and Risk Themes
- [ ] 3.4 Build the project dossier slide-over with deep-linkable
      `/portfolio/{id}` URL, focus trap, and project switcher
- [ ] 3.5 Render People row, Governance and assurance row, Action plan link
      chips, and Updates timeline (Portable Text)
- [ ] 3.6 Add tooltip explainers (Sanity-driven copy) on every jargon label

## 4. Submission

- [ ] 4.1 Build the six-section submission survey at `/portfolio/submit`
      with the exemption banner and progress bar
- [ ] 4.2 Implement the 10-question tiering assessment with real-time
      client-side tier calculation and a server-side recomputation guard
- [ ] 4.3 Implement inline entity creation for People, Groups, and
      Capabilities with `pendingReview` flagging
- [ ] 4.4 Implement final review screen and `POST /api/portfolios/submit`
      with single Sanity transaction and ChangeLog write

## 5. Edit Studio

- [ ] 5.1 Surface inline edit affordances in the dossier for Editor (per
      project) and Admin
- [ ] 5.2 Wire Sanity's Portable Text editor for adding and editing updates
- [ ] 5.3 Implement `PATCH /api/portfolios/[id]` with per-field ChangeLog
      rows and automatic `lastUpdatedAt`

## 6. Action plan tracking

- [ ] 6.1 Build `/action-plan` with strand summary tiles, two-pane action
      list/detail layout, and status pill colour mapping
- [ ] 6.2 Implement reverse-resolved linked projects per action and chip
      navigation into the dossier
- [ ] 6.3 Build `PATCH /api/action-plan/[actionNo]` for Admin progress edits
      with ChangeLog write
- [ ] 6.4 Wire the Recent Activity entry from ChangeLog rows

## 7. Galaxy view

- [ ] 7.1 Implement the canvas constellation map with 2D force-directed
      layout cached per lens
- [ ] 7.2 Wire the lens switcher (Capability, Stage, Business area, Delivery
      area, Governance) and shared filter URL state with the portfolio
- [ ] 7.3 Implement signal overlays (Compliance gaps, Updated in 7 days, No
      update in 30 days)
- [ ] 7.4 Implement the legend with Focus zoom, search box, camera controls,
      Reset camera, Show borders, Minimise UI
- [ ] 7.5 Implement star click → dossier slide-over with `/galaxy/{id}` deep
      links
- [ ] 7.6 Add static SVG fallback for unsupported browsers

## 8. Compare and exports

- [ ] 8.1 Implement `GET /api/portfolios/compare` deriving diffs from the
      ChangeLog
- [ ] 8.2 Implement Reporting Cut serialisation that inlines resolved
      reference text; build `GET`/`POST /api/portfolios/reporting-cuts`
- [ ] 8.3 Implement `GET /api/portfolios/compare/export?format=word`
- [ ] 8.4 Build the compare UI with date presets and Reporting Cut option
- [ ] 8.5 Build client-side Excel exports (full and PII-redacted variants)
      using `exceljs`
- [ ] 8.6 Build single-project Excel export from the dossier
- [ ] 8.7 Build the Word ownership report (filtered by role) using `docx`
- [ ] 8.8 Build the PowerPoint summary using `pptxgenjs` with stage colour
      mapping
- [ ] 8.9 Build the server-side compliance briefing
      (`GET /api/portfolios/exports/compliance-briefing`)

## 9. Community and content

- [ ] 9.1 Build `/prompts` with monthly competition banner, tag/tool
      filters, sort tabs, and the prompt card layout (with copy button)
- [ ] 9.2 Implement `POST /api/prompts`, idempotent
      `POST /api/prompts/[id]/upvote`, and
      `POST /api/prompts/[id]/comments`
- [ ] 9.3 Implement the monthly prompt-competition tabulator with tie-break
      by earliest `createdAt`
- [ ] 9.4 Build `/learning` with type filter, hashtag chips, featured
      ordering, and the playlist child renderer
- [ ] 9.5 Build `/events` with category and location filters, search, and
      the slide-over event detail at `/events/{id}`
- [ ] 9.6 Build `/help` with the ten-section grouped FAQ, expand/collapse
      controls, and cross-content search
- [ ] 9.7 Build `/profile` with role tiles, role-grouped project lists, and
      a self-service edit entry point

## 10. Background jobs

- [ ] 10.1 Implement the daily stale-data reminder job with single-email
      grouping per owner, retries with exponential backoff, and full audit
      logs
- [ ] 10.2 Implement the quarterly Reporting Cut writer
- [ ] 10.3 Implement the weekly ChangeLog compactor
- [ ] 10.4 Wire all four jobs to a scheduler (cron or CI)

## 11. Verification and rollout

- [ ] 11.1 Add a smoke test that proves every mutation route returns 401
      without `x-user-email`
- [ ] 11.2 Add per-page empty/loading/error states across portfolio,
      dossier, action plan, galaxy, prompts, learning, events, help, profile
- [ ] 11.3 Add a weekly link-check job for Ardoq/Jira/Confluence/SharePoint
      out-links and a `lastVerifiedAt` field
- [ ] 11.4 Wire PostHog events for filter use, dossier opens, exports,
      prompt votes, and submission completions
- [ ] 11.5 Validate the OpenSpec change with `openspec validate
      add-crime-portfolio-portal --strict`, then archive when work lands on
      main
