## ADDED Requirements

### Requirement: Excel export of portfolio
The system SHALL allow any user to export the currently filtered portfolio
to Excel client-side. The button label SHALL read "Export to Excel ({n})"
where `{n}` is the visible project count.

#### Scenario: Full portfolio export
- **WHEN** a Viewer with no active filters clicks "Export to Excel"
- **THEN** the browser SHALL generate an `.xlsx` file using `exceljs` from
  already-fetched data
- **AND** the file SHALL contain one row per project with columns: name,
  description, stage, group, directorate, business areas, owner, business
  lead, legal lead, capability, governance tier, DPIA status, ATRS status,
  ethics framework, last updated

#### Scenario: Filtered export
- **WHEN** a Viewer applies one or more filters and clicks "Export to Excel"
- **THEN** only the filtered projects SHALL be included
- **AND** the row count SHALL match `{n}` from the button label

### Requirement: PII-redacted variant for external sharing
The Excel export SHALL offer a "PII-redacted" variant suitable for external
sharing that omits `owner.email`, `businessLead.email`, `legalLead.email`,
and `additionalDeliveryOwners[].email`.

#### Scenario: Redacted export
- **WHEN** a Viewer chooses "Export to Excel (redacted for external)"
- **THEN** the generated file SHALL contain person names but no email
  addresses
- **AND** every email column SHALL be removed entirely (not blanked)

### Requirement: Single-project Excel export from dossier
The dossier SHALL include an "Excel" button that exports just the open
project to a single-sheet `.xlsx` file.

#### Scenario: Single-project export
- **WHEN** a Viewer clicks the Excel button inside a dossier
- **THEN** the file SHALL contain one project with the same column set as
  the portfolio export

### Requirement: Word ownership report
The system SHALL allow any user to export an ownership report as Word,
filtered by role (delivery owner, business lead, legal lead).

#### Scenario: Filter by role
- **WHEN** a Viewer chooses "Word ownership report — Delivery owner"
- **THEN** the document SHALL contain one section per delivery owner
- **AND** each section SHALL list the projects they own with stage and last
  updated

### Requirement: PowerPoint summary
The system SHALL allow any user to export a presentation-ready PowerPoint
summary of the portfolio.

#### Scenario: Generated structure
- **WHEN** a Viewer clicks "Export to PowerPoint"
- **THEN** the `.pptx` file SHALL contain a title slide, one slide per
  stage with project counts and capability mix, and a tiering snapshot
  slide
- **AND** stage pill colours SHALL match the portfolio shared mapping

### Requirement: Compliance briefing (server-side)
The system SHALL expose
`GET /api/portfolios/exports/compliance-briefing` returning a Word document
listing every project with a governance gap.

#### Scenario: Briefing contents
- **WHEN** a Viewer requests the compliance briefing
- **THEN** the response SHALL be a `.docx` Word document
- **AND** it SHALL include sections for projects missing a DPIA, projects
  missing ATRS, projects missing an ethics framework declaration, and
  projects with `governanceTier` unset
- **AND** each project entry SHALL include its name, owner, and link back
  to `/portfolio/{id}`

#### Scenario: No gaps
- **WHEN** every project has full compliance values populated
- **THEN** the briefing SHALL render with each section explicitly stating
  "No projects missing this assurance"

### Requirement: Client-side generation as default
The system SHALL generate Excel, Word ownership reports, and PowerPoint
exports in the browser using `exceljs`, `docx`, and `pptxgenjs`. Only the
compliance briefing and the compare/Word briefing SHALL be generated
server-side.

#### Scenario: Browser generation
- **WHEN** a Viewer triggers any client-generated export
- **THEN** the file SHALL be assembled in the browser from already-fetched
  data
- **AND** no additional Sanity fetch SHALL be required for the export
