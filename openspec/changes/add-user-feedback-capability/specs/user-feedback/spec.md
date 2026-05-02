## ADDED Requirements

### Requirement: In-product feedback widget on every authenticated page
The portal SHALL expose a feedback widget on every authenticated page,
reachable from the primary chrome (a persistent button or a menu item
that does not require horizontal scrolling, modal interaction, or
hover-only affordance to find).

#### Scenario: Widget visible to a Viewer
- **WHEN** a Viewer loads any authenticated page
- **THEN** the widget control SHALL be present in the primary chrome
- **AND** activating it SHALL open the submission form without a full
  page navigation
- **AND** the widget SHALL be operable by keyboard alone

#### Scenario: Widget visible regardless of role
- **WHEN** an Editor or Admin loads any authenticated page
- **THEN** the widget SHALL behave identically to the Viewer experience
- **AND** the role SHALL NOT change which feedback types are offered

#### Scenario: Widget hidden on unauthenticated pages
- **WHEN** an unauthenticated visitor lands on `/preview-auth` or
  another public page
- **THEN** the widget SHALL NOT render — feedback intake requires an
  authenticated session

### Requirement: Submission form fields and constraints
The submission form SHALL collect a feedback type, a free-text body,
optional screenshot, and optional opt-in for follow-up.

#### Scenario: Selecting a type
- **WHEN** the submitter opens the widget
- **THEN** the type selector SHALL offer exactly the values `bug`,
  `idea`, `improvement`, `question`
- **AND** SHALL require a selection before submission is enabled
- **AND** SHALL NOT remember a prior selection across sessions

#### Scenario: Free-text body
- **WHEN** the submitter writes a body
- **THEN** the field SHALL accept up to 10,000 characters
- **AND** SHALL show a remaining-character counter once the body
  exceeds 8,000 characters
- **AND** SHALL reject submission when empty or whitespace-only

#### Scenario: Optional screenshot
- **WHEN** the submitter attaches a screenshot
- **THEN** the file SHALL be a PNG or JPEG no larger than 2 MB
- **AND** any other file type or oversized file SHALL be rejected
  client-side AND server-side
- **AND** the server SHALL strip EXIF metadata before storing or
  forwarding

#### Scenario: Submitter consent for follow-up
- **WHEN** the submitter ticks the optional "follow up with me" box
- **THEN** the submission SHALL include the submitter's email so the
  closing notification can reach them
- **AND** when the box is unticked, the email SHALL NOT be stored on
  the ticket

#### Scenario: PII reminder copy
- **WHEN** the widget is open
- **THEN** an inline notice SHALL remind the submitter not to include
  personal data
- **AND** the notice copy SHALL be sourced from Sanity so HMCTS
  information governance can edit it without a code release

### Requirement: Auto-captured context with identity scrubbed
On submission, the intake API SHALL capture the page URL, user agent,
and a non-identifying app version fingerprint, but SHALL NOT store the
submitter's email address inside the GitHub ticket body.

#### Scenario: Context captured by default
- **WHEN** a submission is created
- **THEN** the ticket body SHALL include `page`, `userAgent`, and
  `appVersion` fields populated from the request context
- **AND** the role of the submitter (`viewer` | `editor` | `admin`)
  SHALL be included so the agent can reason about access expectations

#### Scenario: Email scrubbed from ticket body
- **WHEN** the request carries `x-user-email`
- **THEN** the intake API SHALL NOT write the email into the ticket
  body or any field visible in the GitHub UI
- **AND** the email SHALL be retained inside the portal's own store
  ONLY when the submitter consented to follow-up (see prior requirement)

#### Scenario: Context omitted on user request
- **WHEN** the submitter unticks an "include current page context" box
  on the widget
- **THEN** the ticket body SHALL omit `page`, `userAgent`, and
  `appVersion`
- **AND** the role field SHALL still be included (it is not
  identifying)

### Requirement: GitHub Project ticket lifecycle
Every submission SHALL be converted into a GitHub Project ticket on a
dedicated board with the columns `New`, `Triage`, `Needs Human
Review`, `In Progress`, `Ready for Approval`, and `Done`. Tickets SHALL
move through these columns according to the rules below.

#### Scenario: New tickets land in New
- **WHEN** the intake API creates a ticket
- **THEN** the ticket SHALL be placed in the `New` column with no
  assignee
- **AND** the ticket body SHALL include a structured header section
  the agent can parse deterministically (type, page, app version,
  submitter role, consent flag)

#### Scenario: Agent claims from New
- **WHEN** an agent claims a ticket
- **THEN** the agent SHALL move it to `Triage` AND assign itself
- **AND** the move SHALL happen within 15 minutes of ticket creation
  on the agent-team's normal SLA

#### Scenario: Unclaimed ticket falls back to humans
- **WHEN** a ticket has been in `New` for more than one hour
- **THEN** an automated process SHALL move it to `Needs Human Review`
  with a comment explaining the agent SLA was missed
- **AND** the human team's notification path SHALL be triggered

#### Scenario: Ticket entering Needs Human Review
- **WHEN** an agent moves a ticket to `Needs Human Review`
- **THEN** the agent SHALL post a comment naming the reason
  (unclear scope, duplicate, sensitive-area, missing context, ...)
- **AND** the agent SHALL NOT continue work on that ticket
- **AND** the human team SHALL be notified

#### Scenario: Ticket entering In Progress
- **WHEN** the agent moves a ticket to `In Progress`
- **THEN** the agent SHALL first post a plan comment naming
  (1) the proposed change, (2) affected files or areas, (3)
  acceptance criteria, (4) risks or open questions
- **AND** the plan SHALL be visible to humans before any code is
  written

#### Scenario: Ticket entering Ready for Approval
- **WHEN** the agent moves a ticket to `Ready for Approval`
- **THEN** a PR SHALL exist that links the ticket
- **AND** CI on the PR SHALL be passing
- **AND** the PR description SHALL reference the original feedback
  text and list the acceptance criteria
- **AND** the human team SHALL be notified

#### Scenario: Ticket closed on merge
- **WHEN** a human merges the linked PR
- **THEN** the agent SHALL move the ticket to `Done` AND post a
  closing comment summarising what shipped
- **AND** when the submitter consented to follow-up, the agent SHALL
  send a single closing notification to the submitter
- **AND** the ticket body SHALL gain a `shippedSummary` field for
  later use by the (currently deferred) public changelog

### Requirement: Human merge gate
Branch protection on `main` SHALL block any merge by an agent identity.
A human team member SHALL be the merging actor on every PR that
reaches `main`, regardless of how the PR was authored.

#### Scenario: Agent attempts to merge
- **WHEN** an agent identity attempts to merge a PR into `main`
- **THEN** the GitHub branch protection rule SHALL reject the merge
- **AND** the PR SHALL remain open
- **AND** the ticket SHALL NOT move to `Done`

#### Scenario: Human approves and merges
- **WHEN** a human reviewer approves an agent-authored PR and clicks
  merge
- **THEN** the merge SHALL be permitted
- **AND** the ticket SHALL move to `Done` per the lifecycle requirement

### Requirement: Sensitive areas auto-route to humans
The intake API SHALL inspect every submission for keywords that
indicate the submission touches authentication, billing, data
retention, or access control. Matching tickets SHALL be created
directly in `Needs Human Review` and SHALL NOT enter `New`.

#### Scenario: Authentication-related submission
- **WHEN** the submission body or context references
  authentication, sign-in, sign-out, or session
- **THEN** the ticket SHALL be created in `Needs Human Review`
- **AND** the ticket SHALL be tagged `sensitive:auth`

#### Scenario: Access-control-related submission
- **WHEN** the submission references roles, permissions, allowlists,
  or admin
- **THEN** the ticket SHALL be created in `Needs Human Review`
- **AND** the ticket SHALL be tagged `sensitive:access-control`

#### Scenario: Data-retention or billing submission
- **WHEN** the submission references retention, deletion, payment, or
  cost
- **THEN** the ticket SHALL be created in `Needs Human Review`
- **AND** the ticket SHALL be tagged accordingly
- **AND** an agent SHALL NOT move it back to `New`

### Requirement: Agent constraints on infrastructure
Agents SHALL NOT modify CI configuration, secrets, branch protection,
deploy hooks, or any file under `.github/workflows/` without first
moving the ticket to `Needs Human Review`. The same restriction
applies to `render.yaml`, the `.env.example` block describing
secrets, and any file under `infra/` if introduced.

#### Scenario: Agent considers a workflow change
- **WHEN** an agent's plan includes a change to a file under
  `.github/workflows/` or `render.yaml`
- **THEN** the agent SHALL move the ticket to `Needs Human Review`
  with a comment naming the file
- **AND** the agent SHALL NOT open a PR until a human moves the
  ticket back to `In Progress`

#### Scenario: Agent considers a secret change
- **WHEN** the requested change implies introducing or rotating a
  secret
- **THEN** the agent SHALL move the ticket to `Needs Human Review`
- **AND** the human SHALL handle the secret change directly; the
  agent SHALL not be granted secret-write capability

### Requirement: Submitter notifications and consent
Submitters SHALL receive an immediate in-product confirmation on
submission. Closing notifications SHALL be sent only when the
submitter explicitly opted in.

#### Scenario: Confirmation on submit
- **WHEN** a submission succeeds
- **THEN** the widget SHALL show a confirmation including the ticket
  URL
- **AND** the confirmation SHALL persist until the submitter dismisses
  it

#### Scenario: Closing notification with consent
- **WHEN** a ticket reaches `Done` AND the submitter opted in
- **THEN** the agent or runtime SHALL send a single closing notification
  via the existing email channel (GOV.UK Notify)
- **AND** the message SHALL link the ticket
- **AND** SHALL NOT include the original body verbatim (the submitter
  already wrote it)

#### Scenario: Closing notification without consent
- **WHEN** a ticket reaches `Done` AND the submitter did NOT opt in
- **THEN** no closing notification SHALL be sent

### Requirement: Analytics event for submission volume
The portal SHALL emit a `feedback_submitted` event to the closed
analytics catalogue on every successful submission so the team can
measure volume and type mix.

#### Scenario: Submission emits event
- **WHEN** the intake API succeeds
- **THEN** a `feedback_submitted` event SHALL fire with properties
  `{ type, ticketId }` only
- **AND** the body, page URL, and submitter email SHALL NOT appear in
  the event payload

#### Scenario: Failed submission does not emit
- **WHEN** the intake API rejects a submission (validation error,
  GitHub upstream failure)
- **THEN** no `feedback_submitted` event SHALL fire
- **AND** the failure SHALL be logged via the existing logger

### Requirement: Kill-switches for intake and agents
The capability SHALL be guarded by two independent environment
variables so the human team can pause submission or pause agent
activity without a code change.

#### Scenario: Intake disabled
- **WHEN** `FEEDBACK_INTAKE_ENABLED=false`
- **THEN** the widget SHALL render a "feedback temporarily paused"
  message in place of the form
- **AND** `POST /api/feedback/submit` SHALL return HTTP 503 with no
  body

#### Scenario: Agents disabled
- **WHEN** `FEEDBACK_AGENTS_ENABLED=false`
- **THEN** the agent runtime SHALL stop claiming tickets
- **AND** the GitHub Project board SHALL continue to receive new
  tickets in `New`
- **AND** humans SHALL handle triage directly

#### Scenario: Both enabled is the steady state
- **WHEN** neither variable is set OR both are `true`
- **THEN** the capability SHALL operate as specified above

### Requirement: Audit trail for agent actions
Every PR opened by an agent SHALL produce a ChangeLog row in the
existing audit-trail capability so the dossier-edit audit can be
reconciled with agent activity.

#### Scenario: Agent opens a PR
- **WHEN** an agent opens a PR linked to a ticket
- **THEN** a ChangeLog row SHALL be written with `actor` set to the
  agent's identity, `action` set to `opened-pr`, and `subjectId`
  set to the ticket ID
- **AND** the row SHALL be visible in the same audit surface that
  records human edits

#### Scenario: Agent moves a ticket
- **WHEN** an agent moves a ticket between Project columns
- **THEN** a ChangeLog row SHALL be written for the column transition
- **AND** the row SHALL include the previous and new column names

### Requirement: Regression-test rule on every defect fix
When an agent opens a PR resolving a `bug`-type ticket, the PR SHALL
include at least one new test that fails on `main` and passes on the
PR branch. This restates the existing rule from the
`engineering-team` capability inside the agent contract so it is
non-optional for agent work.

#### Scenario: Agent ships a bug fix
- **WHEN** an agent's PR closes a `bug`-type ticket
- **THEN** the PR SHALL include a test that asserts the corrected
  behaviour
- **AND** the test SHALL be referenced in the PR description by file
  path
- **AND** when the PR is merged, the regression-test rule SHALL be
  considered satisfied for the closed ticket

#### Scenario: Bug fix is hard to test
- **WHEN** a defect cannot be reproduced in the current test setup
  (timing-dependent UI race, third-party flake, etc.)
- **THEN** the agent SHALL move the ticket to `Needs Human Review`
  with a comment naming the testability gap
- **AND** SHALL NOT open a PR without a regression test on its own
  authority — the exemption requires a human decision
