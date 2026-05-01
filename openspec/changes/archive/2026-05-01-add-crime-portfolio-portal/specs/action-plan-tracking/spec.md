## ADDED Requirements

### Requirement: Action plan page at /action-plan
The system SHALL render a delivery tracker for the published AI strategy at
`/action-plan` with three strand summary tiles and a two-pane action list /
action detail layout below.

#### Scenario: Page layout
- **WHEN** a Viewer navigates to `/action-plan`
- **THEN** the header SHALL show three strand cards (`1. Strengthen our
  Foundations`, `2. Embed AI across the Justice System`, `3. Invest in our
  people and partners`)
- **AND** below the strand cards, the page SHALL show "Export to Excel
  ({n})", "Export to Word ({n})", and "Recent Activity {n}" controls
- **AND** the body SHALL be a two-pane layout with the action list on the
  left and the detail pane on the right

### Requirement: Strand summary tiles
Each strand card SHALL display the strand name, a stacked progress bar
broken down by `progressStatus`, and a count per status.

#### Scenario: Counts per status
- **WHEN** the page loads
- **THEN** each strand card SHALL show counts for `Completed`, `Significant
  progress`, `Some progress`, and `Gap / More work needed`
- **AND** the stacked bar SHALL be proportional to those counts
- **AND** clicking the bar segment for a status SHALL filter the action list
  to that status within that strand

### Requirement: Action list with status pills
The left pane SHALL list every Action grouped by strand, each row showing
`actionNo`, `name`, and a coloured status pill.

#### Scenario: Selecting an action
- **WHEN** a Viewer clicks an action row
- **THEN** the right detail pane SHALL render that action's full data
- **AND** the URL SHALL update to `/action-plan?action={actionNo}`

#### Scenario: Deep link
- **WHEN** a Viewer navigates to `/action-plan?action=2.6`
- **THEN** action `2.6` SHALL be selected on first paint
- **AND** the list SHALL scroll the selected row into view

### Requirement: Action detail with linked projects
The right detail pane SHALL show the selected action's `description`,
`summaryOfProgress`, `priority`, `progressStatus`, an out-link to the
published strategy, and a list of linked projects resolved by reverse
reference from `Project.actionPlanLinks`.

#### Scenario: Linked projects shown
- **WHEN** an action is selected and projects link to it
- **THEN** the detail pane SHALL list each linked project as a chip
  containing the project name and stage pill
- **AND** clicking a chip SHALL open the project dossier as a slide-over

#### Scenario: No linked projects
- **WHEN** an action is selected and no projects link to it
- **THEN** the linked projects section SHALL show an empty state
- **AND** for an Admin, an inline "Find projects to link" affordance SHALL
  be visible

### Requirement: Admin progress editing
The system SHALL allow Admins to edit `summaryOfProgress` (Portable Text)
and `progressStatus` for any action via `PATCH /api/action-plan/[actionNo]`.

#### Scenario: Successful update
- **WHEN** an Admin saves a new `progressStatus` for action `2.6`
- **THEN** the API SHALL persist the change
- **AND** write a ChangeLog row with `documentId` of the action
- **AND** the strand summary tile counts SHALL update on next render

#### Scenario: Non-admin denied
- **WHEN** an Editor or Viewer calls `PATCH /api/action-plan/[actionNo]`
- **THEN** the API SHALL respond with HTTP 403
- **AND** SHALL NOT mutate any document

### Requirement: Recent Activity feed
The action plan page SHALL include a Recent Activity entry that aggregates
ChangeLog rows whose `documentId` is an Action or whose target is a Project
linked to one or more Actions.

#### Scenario: Activity count
- **WHEN** the page loads
- **THEN** the "Recent Activity {n}" header control SHALL display the count
  of qualifying ChangeLog rows in the last 30 days
- **AND** clicking the control SHALL open a panel listing those rows
  newest-first
