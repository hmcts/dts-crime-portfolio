## ADDED Requirements

### Requirement: Dossier slide-over panel
The system SHALL render the project dossier as a slide-over panel headed
`PROJECT DOSSIER` with a `Projects {n}` switcher and a close control. The
panel SHALL be deep-linkable at `/portfolio/{id}`.

#### Scenario: Panel layout
- **WHEN** a Viewer opens any project dossier
- **THEN** the panel SHALL show, in order: title, stage pill, capability
  pill, Excel export button for the single project, description prose,
  delivery area chips, business area chips, people row, governance and
  assurance row, action plan link chips, and updates timeline
- **AND** the panel SHALL trap focus while open
- **AND** pressing Escape or clicking the close control SHALL close it

#### Scenario: Project switcher
- **WHEN** a Viewer clicks the `Projects {n}` switcher inside an open dossier
- **THEN** the system SHALL show a list of every project in the current
  filtered portfolio
- **AND** selecting another project SHALL replace the dossier contents and
  update the URL to that project's `/portfolio/{id}`

### Requirement: People row
The dossier SHALL render a People row showing Delivery owner, Business lead,
and Legal lead, each with name, email, and avatar.

#### Scenario: All roles present
- **WHEN** a project has all three role references populated
- **THEN** each role SHALL render with the person's name, email, and avatar

#### Scenario: Missing role
- **WHEN** a project has no `legalLead` reference
- **THEN** the Legal lead slot SHALL render a dashed neutral pill labelled
  "Not yet assigned"

### Requirement: Governance and assurance row
The dossier SHALL render a Governance and assurance row with chips for Risk
register, Governance (with body and tier), DPIA, ATRS, and Ethics framework.

#### Scenario: Compliance signal
- **WHEN** a chip's underlying field is populated and complete
- **THEN** the chip SHALL render with a green tick and the value text

#### Scenario: Compliance gap
- **WHEN** a chip's underlying field is missing, "unknown", or "in progress"
- **THEN** the chip SHALL render as a dashed neutral pill so the gap is
  visible at a glance
- **AND** the chip SHALL include a tooltip explaining what is required

### Requirement: Action plan link chips
The dossier SHALL render every linked Action as a chip showing
`{actionNo} {truncated action name}…`. Clicking a chip SHALL navigate to
`/action-plan` with that action selected.

#### Scenario: Linked actions present
- **WHEN** a project has one or more `actionPlanLinks`
- **THEN** each linked action SHALL render as a chip in the order stored
- **AND** clicking a chip SHALL navigate to `/action-plan?action={actionNo}`

#### Scenario: No linked actions
- **WHEN** a project has no `actionPlanLinks`
- **THEN** the Action Plan Links section SHALL show an empty-state hint and,
  for an Editor, an inline "Link to action plan" affordance

### Requirement: Updates timeline
The dossier SHALL render `updates` as a vertical timeline ordered newest
first, each entry showing timestamp, title, author, and Portable Text body.

#### Scenario: Timeline rendering
- **WHEN** a Viewer opens a project with multiple updates
- **THEN** updates SHALL appear newest first
- **AND** each entry SHALL render Portable Text using the same renderer used
  by exports
- **AND** timestamps SHALL display in `dd/mm/yyyy HH:mm` format

#### Scenario: No updates yet
- **WHEN** a project has no entries in `updates`
- **THEN** the timeline SHALL show an empty state reading "No updates yet"
- **AND** for an Editor, an inline "Add update" affordance SHALL be visible

### Requirement: Tooltip explainers on jargon
The dossier SHALL accompany every label that uses internal jargon (Delivery
area, Business area, Governance tier, Risk register, DPIA, ATRS, Ethics
framework) with an `i` icon that, on click or focus, opens an explainer
drawn from Sanity.

#### Scenario: Opening an explainer
- **WHEN** a Viewer clicks the `i` icon next to "DPIA"
- **THEN** an inline tooltip SHALL open with the current explainer text
- **AND** the tooltip SHALL be reachable by keyboard via Tab + Enter
