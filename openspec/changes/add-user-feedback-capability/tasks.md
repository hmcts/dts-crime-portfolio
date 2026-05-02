## 1. Decisions before implementation

- [ ] 1.1 Confirm Open Question 1 (submitter identity handling) — default
      is "no automated PII redaction; widget copy warns submitters"
- [ ] 1.2 Confirm Open Question 2 (agent-team SLA) — default is "15 min
      to claim; 1 h to `Needs Human Review` if unclaimed"
- [ ] 1.3 Confirm Open Question 3 (public changelog) — default is "defer;
      Done tickets carry `shippedSummary` for later"
- [ ] 1.4 Confirm Open Question 4 (scope vs Help/FAQ) — default is
      "widget does not search FAQ; accept some duplication"
- [ ] 1.5 Confirm Open Question 5 (sensitive-area auto-route keywords)

## 2. GitHub Project board and repo configuration

- [ ] 2.1 Create the GitHub Project board with the six columns named in
      the spec (`New`, `Triage`, `Needs Human Review`, `In Progress`,
      `Ready for Approval`, `Done`)
- [ ] 2.2 Decide whether tickets live on `hmcts/dts-crime-portfolio` or
      a dedicated `hmcts/dts-crime-portfolio-feedback` repo
- [ ] 2.3 Configure branch protection on `main` to require at least one
      human reviewer; verify agent identities cannot satisfy the rule
- [ ] 2.4 Create the GitHub App or fine-grained PAT for the intake API;
      scope it to the chosen repo only and rotate quarterly
- [ ] 2.5 Add the GitHub credential to Render env as
      `FEEDBACK_GITHUB_TOKEN` and document in `.env.example` and
      `architecture/deployment.md`

## 3. Widget and intake API

- [ ] 3.1 Implement the widget component, persistent in the primary
      chrome on every authenticated page (Viewer, Editor, Admin all see
      the same widget)
- [ ] 3.2 Implement type selector (`bug` | `idea` | `improvement` |
      `question`), free-text body input, optional screenshot upload, and
      auto-captured context (page URL, user agent, app version, role)
- [ ] 3.3 Render an inline notice on the widget reminding submitters
      not to include personal data; copy lives in Sanity so it can be
      updated without a code release
- [ ] 3.4 Implement `POST /api/feedback/submit` that validates the
      payload, calls the GitHub API to create the ticket in `New`, and
      returns the ticket URL in the response body
- [ ] 3.5 Strip the auto-captured `x-user-email` header from the stored
      ticket body; record only the role and an opaque submitter ID
- [ ] 3.6 Reject submissions whose body exceeds a configurable size
      ceiling (default 10 KB) and screenshots over a configurable size
      ceiling (default 2 MB)
- [ ] 3.7 Auto-route to `Needs Human Review` if the body or context
      hits the sensitive-area keyword set (auth, billing, retention,
      access control, plus user-confirmed additions from task 1.5)

## 4. Agent contract and runtime

- [ ] 4.1 Document the agent contract in
      `docs/agent-contract-user-feedback.md` (separate from the spec —
      runtime detail, not behaviour the user observes)
- [ ] 4.2 Implement the runtime — a GitHub Actions workflow triggered
      by Project events, OR a long-lived agent runner — that:
      - claims a ticket from `New` within the SLA from task 1.2
      - moves to `Triage`, posts a triage comment, decides
        proceed/needs-human/duplicate
      - moves to `In Progress` with a plan comment, opens a feature
        branch, builds, runs `pnpm test` + `pnpm test:e2e` locally
      - opens a PR linked to the ticket, moves to `Ready for Approval`
      - on PR merge, moves to `Done` with a closing comment
- [ ] 4.3 Implement the regression-test rule from
      `openspec/specs/engineering-team/spec.md` (every defect fix adds
      a regression test) inside the agent contract; agents that skip it
      MUST move the ticket to `Needs Human Review` rather than open a
      no-test PR

## 5. Notifications

- [ ] 5.1 Submitter confirmation on submit (in-page), and optional
      follow-up on close gated by an explicit consent checkbox in the
      widget
- [ ] 5.2 Human-team notification when a ticket enters `Needs Human
      Review` or `Ready for Approval` — channel is the team's chat
      integration if one is wired, else GitHub review-request mention
- [ ] 5.3 Agent runtime triggered by GitHub Project events; document
      what is wired and what is on best-effort polling

## 6. Analytics, retention, and audit

- [ ] 6.1 Add `feedback_submitted` to the closed event catalogue in
      `openspec/specs/analytics/spec.md` carrying `{ type, ticketId }`
      only; no body, no context
- [ ] 6.2 Document retention: tickets live in GitHub indefinitely;
      submitter contact is purged from any team-side store after 90
      days regardless of ticket state
- [ ] 6.3 Add an audit row to the existing ChangeLog when an agent
      opens a PR (so the dossier-edit audit trail extends to agent
      mutations)

## 7. Observability and rollback

- [ ] 7.1 Log every intake call with request ID, type, ticket URL, and
      latency to GitHub API; surface in the existing logger
- [ ] 7.2 Add a kill-switch env var `FEEDBACK_INTAKE_ENABLED`; default
      `true`. When `false`, the widget renders a "feedback temporarily
      paused" message and the API route returns 503
- [ ] 7.3 Add a kill-switch env var `FEEDBACK_AGENTS_ENABLED`; default
      `true`. When `false`, agents stop claiming tickets — the board
      continues to receive new ones but humans handle triage directly

## 8. Validation

- [ ] 8.1 Validate this OpenSpec change with
      `openspec validate add-user-feedback-capability --strict`
- [ ] 8.2 Add e2e coverage to the Phase 4 batch in
      `decisions/2026-05-02-e2e-coverage-prioritisation.md` (widget
      visible on every authenticated page; submission creates a ticket;
      kill-switch disables the widget)
- [ ] 8.3 Hold a retro after the first ten human-merged tickets to
      confirm the agent contract is producing useful PRs and not just
      busywork; record outcomes per the team-retrospective spec
