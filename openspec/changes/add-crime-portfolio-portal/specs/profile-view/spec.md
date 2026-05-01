## ADDED Requirements

### Requirement: Profile page at /profile
The system SHALL render the signed-in user's profile at `/profile` showing
every project they are connected to, grouped by role.

#### Scenario: Page sections
- **WHEN** a Viewer navigates to `/profile`
- **THEN** the page SHALL render four role tiles in order: Delivery owner,
  Additional delivery owner, Business lead, Legal lead
- **AND** each tile SHALL display the count of matching projects
- **AND** below the tiles, the body SHALL list those projects grouped by
  role with a card per project

#### Scenario: Empty profile
- **WHEN** a Viewer is connected to no projects in any role
- **THEN** the page SHALL render an empty state directing the Viewer back
  to `/portfolio`
- **AND** SHALL include a "Submit a new project" CTA

### Requirement: Role grouping
A project SHALL appear under every role for which the signed-in user's
email matches a person reference on the project (`owner`, `business lead`,
`legal lead`, `additionalDeliveryOwners`).

#### Scenario: Multiple roles on one project
- **WHEN** the signed-in user is both the owner and the business lead of
  the same project
- **THEN** the project SHALL appear under both Delivery owner and Business
  lead tiles
- **AND** each role's count SHALL increment by one for that project

### Requirement: Self-service edit entry point
The profile page SHALL surface a direct "Open dossier" link on every
project shown under Delivery owner or Additional delivery owner, opening
the dossier in edit-ready mode when the user is also on the editor
allowlist for that project.

#### Scenario: Owner who is also editor
- **WHEN** a Viewer is the delivery owner AND is on the editor allowlist
  for a project
- **THEN** the project card SHALL show an "Edit dossier" affordance
- **AND** clicking it SHALL open the dossier with edit mode active

#### Scenario: Owner who is not editor
- **WHEN** a Viewer is the delivery owner but is NOT on the editor
  allowlist for that project
- **THEN** the project card SHALL show a read-only "Open dossier" link
- **AND** SHALL include hint text "Ask an Admin to add you as an editor"

### Requirement: Profile fetch endpoint
The system SHALL expose `GET /api/profile/projects` returning every project
referencing the calling user's email, grouped by role.

#### Scenario: Authenticated request
- **WHEN** a client calls `/api/profile/projects` and the request includes
  a valid `x-user-email` header
- **THEN** the response SHALL be JSON with keys `deliveryOwner`,
  `additionalDeliveryOwner`, `businessLead`, `legalLead`, each an array of
  project summaries

#### Scenario: Missing identity
- **WHEN** the request is missing or has an empty `x-user-email` header
- **THEN** the API SHALL respond with HTTP 401
