# portfolio-management Specification

## Purpose
TBD - created by archiving change add-crime-portfolio-portal. Update Purpose after archive.
## Requirements
### Requirement: Portfolio card grid
The system SHALL render the portfolio at `/portfolio` as a filterable grid of
project cards, with a header summary stating `Showing X of Y projects`, an
"Export to Excel ({n})" button, and a "New Project" CTA.

#### Scenario: Default view
- **WHEN** a Viewer navigates to `/portfolio` without filters
- **THEN** the page SHALL list every published project as a card
- **AND** the summary SHALL read `Showing {total} of {total} projects`
- **AND** each card SHALL show group · directorate breadcrumb, stage pill,
  title, truncated description, capability tag, business area tag, linked
  actions count, delivery owner, and "Last updated dd/mm/yyyy" or "No updates
  yet"

#### Scenario: Empty portfolio
- **WHEN** the portfolio contains no published projects
- **THEN** the page SHALL render an iconographic empty state
- **AND** show a "New Project" CTA as the next action

### Requirement: Multi-select filters
The system SHALL provide multi-select dropdown filters for Stage, Delivery
area (Group + Directorate paired), Business area, Owner, Capability,
Governance tier, and Action plan, plus a free-text "Search projects" input
and a "Clear filters" reset.

#### Scenario: Applying a single filter
- **WHEN** a Viewer selects one or more values in the Stage filter
- **THEN** only projects whose `projectStage` matches one of the selected
  values SHALL be shown
- **AND** the summary SHALL update to `Showing X of Y projects`

#### Scenario: Combining filters
- **WHEN** filters are active in two or more dropdowns
- **THEN** the result set SHALL be the intersection of all active filters
- **AND** the search text SHALL be applied as a substring match against
  project name and description on the filtered set

#### Scenario: Clearing filters
- **WHEN** a Viewer clicks "Clear filters"
- **THEN** all filter dropdowns SHALL reset to empty
- **AND** the search text SHALL be cleared
- **AND** the result set SHALL match the default view

### Requirement: Stat strip
The portfolio header SHALL include three tiles linking to context: `Action
Plan {n}`, `Recent Activity {n}`, and `Risk Themes {n}`, where `{n}` is the
live count of items in each domain.

#### Scenario: Stat tile counts
- **WHEN** the portfolio page loads
- **THEN** each tile SHALL display the current count
- **AND** clicking `Action Plan {n}` SHALL navigate to `/action-plan`
- **AND** clicking `Recent Activity {n}` SHALL navigate to a recent-activity
  view scoped to the last 30 days

### Requirement: Stage pills are first-class
Stage pills (`idea`, `scan`, `pilot`, `scale`, `stalled`, `sunset`) SHALL use
a single colour and label mapping shared by the portfolio cards, the dossier
header, and every export.

#### Scenario: Stage pill consistency
- **WHEN** a project is rendered in any of: portfolio card, dossier,
  Excel export, PowerPoint summary
- **THEN** the stage pill SHALL use the same colour, label, and casing
- **AND** the source of truth SHALL be a shared TypeScript enum

### Requirement: Card click opens dossier with deep link
Clicking a project card SHALL open the project dossier as a slide-over modal
and SHALL push `/portfolio/{id}` into browser history so dossier URLs are
linkable.

#### Scenario: Opening a dossier
- **WHEN** a Viewer clicks a project card
- **THEN** the dossier slide-over SHALL open with the project's data
- **AND** the URL SHALL change to `/portfolio/{id}` without a full reload

#### Scenario: Direct dossier URL
- **WHEN** a Viewer navigates directly to `/portfolio/{id}`
- **THEN** the portfolio grid SHALL render in the background
- **AND** the dossier SHALL open over it on first paint

