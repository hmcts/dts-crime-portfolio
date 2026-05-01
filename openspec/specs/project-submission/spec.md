# project-submission Specification

## Purpose
TBD - created by archiving change add-crime-portfolio-portal. Update Purpose after archive.
## Requirements
### Requirement: Six-section progress-bar survey
The system SHALL host a public submission form at `/portfolio/submit`
organised in six sections (Tiering Questions, Project Basics, Ownership,
Capability, Governance, Updates) with a progress bar that reflects current
section.

#### Scenario: Navigating sections
- **WHEN** a Viewer completes section N and clicks "Next"
- **THEN** the progress bar SHALL advance to section N+1
- **AND** the data entered so far SHALL persist in client state if the user
  goes back

#### Scenario: Submitting incomplete required fields
- **WHEN** a Viewer attempts to advance past a section with required fields
  empty
- **THEN** the form SHALL block navigation
- **AND** the offending fields SHALL be flagged with inline error messages

### Requirement: Exemption banner
The submission form SHALL render an exemption banner at the top of section 1
explaining who does NOT need to complete the survey: Copilot/ChatGPT use
without PII, non-frontline use, and use that does not influence automated
justice decisions.

#### Scenario: Banner visible
- **WHEN** a Viewer opens `/portfolio/submit`
- **THEN** the exemption banner SHALL be visible above section 1
- **AND** the banner SHALL include a "Skip — my use is exempt" link that
  closes the form without submission

### Requirement: 10-question tiering assessment
Section 1 SHALL be a 10-question structured tiering assessment covering:
nature of application, reach, third-party involvement, ownership scope,
public trust implications, legal/regulatory implications, technical
complexity, automated decision-making, type of data, and data storage. Each
answer SHALL map to Tier 1, Tier 2, or Tier 3.

#### Scenario: Answer mapping
- **WHEN** a Viewer answers any of the 10 questions
- **THEN** the form SHALL associate the answer with a tier value (1, 2, or 3)
- **AND** the calculated overall tier SHALL be the maximum of all answered
  per-question tier values

#### Scenario: Real-time tier display
- **WHEN** a Viewer changes any answer in section 1
- **THEN** the calculated overall tier SHALL recompute on the client
- **AND** the running tier SHALL display in the section header

### Requirement: Inline reference creation
The submission form SHALL allow a Viewer to create a person, group, or
capability that does not yet exist by typing its name into the relevant
searchable dropdown and confirming "Create new".

#### Scenario: New person during submission
- **WHEN** a Viewer types a name not present in the People dropdown and
  selects "Create new"
- **THEN** the form SHALL hold the new entity in client state with a
  `pendingReview` flag
- **AND** on submission, the API SHALL create the Person document and link
  it to the project in the same Sanity transaction

#### Scenario: Pending review of new entities
- **WHEN** a new entity is created via submission
- **THEN** it SHALL be marked `pendingReview: true`
- **AND** SHALL NOT appear in dropdowns for other Viewers until an Admin
  approves it

### Requirement: Reference-data driven dropdowns
The submission form SHALL populate every dropdown (Group, Directorate,
Business area, People, Capability, Action) from a single
`/api/portfolios/reference-data` call made on form mount.

#### Scenario: Single round-trip on mount
- **WHEN** a Viewer opens the submission form
- **THEN** exactly one network request SHALL be issued to
  `/api/portfolios/reference-data`
- **AND** the response SHALL populate every dropdown in the form

### Requirement: Final review with recomputed tier
The final review screen SHALL display every entered value, the calculated
overall governance tier, and a "Submit" button. The server SHALL recompute
the tier server-side from the submitted answers and SHALL reject any
mismatch.

#### Scenario: Successful submission
- **WHEN** a Viewer clicks "Submit" on the review screen
- **THEN** the API SHALL recompute the tier from the submitted answers
- **AND** persist the project, any inline-created references, and a
  ChangeLog entry in a single Sanity transaction
- **AND** redirect the Viewer to `/portfolio/{id}` of the new project

#### Scenario: Tampered tier rejected
- **WHEN** the submitted overall tier does not match the server-recomputed
  tier
- **THEN** the API SHALL respond with a 400 error
- **AND** SHALL NOT persist the project

