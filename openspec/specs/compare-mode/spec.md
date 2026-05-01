# compare-mode Specification

## Purpose
TBD - created by archiving change add-crime-portfolio-portal. Update Purpose after archive.
## Requirements
### Requirement: Compare endpoint
The system SHALL expose `GET /api/portfolios/compare?from=&to=` returning a
diff of the portfolio between the `from` and `to` timestamps. The response
SHALL include three lists — `added`, `removed`, and `changed` — with
field-level diffs for each entry in `changed`.

#### Scenario: Successful compare
- **WHEN** a Viewer requests `/api/portfolios/compare?from=2026-01-01&to=
  2026-04-01`
- **THEN** the response SHALL include three arrays: `added` (projects that
  did not exist at `from` but exist at `to`), `removed` (vice versa), and
  `changed` (projects that existed in both with at least one differing
  field)
- **AND** each `changed` entry SHALL list the field paths that differ with
  `before` and `after` values

#### Scenario: Same dates
- **WHEN** `from` equals `to`
- **THEN** the API SHALL respond with empty `added`, `removed`, and
  `changed` arrays

### Requirement: Date presets and custom range
The compare UI SHALL offer presets: last 30 days, since last quarter, since
January, custom range, and against a saved Reporting Cut.

#### Scenario: Preset selection
- **WHEN** a Viewer selects "since last quarter"
- **THEN** the UI SHALL set `from` to the start of the previous calendar
  quarter and `to` to `now()`
- **AND** issue a single compare request with those dates

#### Scenario: Reporting cut comparison
- **WHEN** a Viewer selects a saved Reporting Cut from the preset dropdown
- **THEN** the UI SHALL request the diff against that snapshot using
  `?reportingCut={id}` instead of `from`
- **AND** the response SHALL diff the current portfolio against the
  serialised snapshot, not against ChangeLog history

### Requirement: ChangeLog-derived diff for date ranges
The compare endpoint SHALL derive its diff from the ChangeLog rather than
re-running queries against historic Sanity revisions.

#### Scenario: Field-level diff
- **WHEN** a project's `governanceTier` changed twice between `from` and
  `to`
- **THEN** the response SHALL show `before` as the value at `from` and
  `after` as the value at `to`
- **AND** intermediate values SHALL NOT be included

### Requirement: Snapshots capture resolved text
A `ReportingCut` SHALL serialise every project with reference text inlined
(person names, group names, capability names) so old snapshots remain
readable after references are renamed or deleted.

#### Scenario: Snapshot survives rename
- **WHEN** a Person referenced by a project is renamed after a snapshot is
  taken
- **THEN** comparing the current portfolio against that snapshot SHALL show
  the original name in the `before` value and the new name in the `after`
  value of an `owner.name` field diff

### Requirement: Word export of the diff
The system SHALL expose
`GET /api/portfolios/compare/export?from=&to=&format=word` returning a Word
"what changed" briefing of the diff.

#### Scenario: Word briefing structure
- **WHEN** a Viewer downloads the compare Word export
- **THEN** the document SHALL contain three top-level sections — Added,
  Removed, Changed — each listing affected projects
- **AND** the Changed section SHALL show field-level diffs in two-column
  before/after layout

### Requirement: Reporting cut management
The system SHALL allow Admins to create a Reporting Cut at the current
moment via `POST /api/portfolios/reporting-cuts` and SHALL list available
cuts via `GET /api/portfolios/reporting-cuts`.

#### Scenario: Admin creates a cut
- **WHEN** an Admin POSTs to `/api/portfolios/reporting-cuts` with a
  `{ name, note }` body
- **THEN** the API SHALL serialise the entire portfolio with resolved
  reference text and store it as a new `ReportingCut` document
- **AND** respond with the new cut's id and creation timestamp

#### Scenario: Non-admin denied
- **WHEN** a Viewer or Editor POSTs to `/api/portfolios/reporting-cuts`
- **THEN** the API SHALL respond with HTTP 403
- **AND** SHALL NOT create any document

