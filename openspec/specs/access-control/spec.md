# access-control Specification

## Purpose
TBD - created by archiving change add-crime-portfolio-portal. Update Purpose after archive.
## Requirements
### Requirement: Identity from x-user-email header
Every API route SHALL resolve the calling user's identity from the
`x-user-email` request header injected by the upstream auth proxy. The app
SHALL NOT store sessions, tokens, or credentials.

#### Scenario: Header present
- **WHEN** an API route receives a request with a non-empty
  `x-user-email` header containing a valid email
- **THEN** the route SHALL resolve identity to that email
- **AND** subsequent role checks SHALL evaluate against that email

#### Scenario: Header missing
- **WHEN** an API route receives a request with no `x-user-email` header,
  an empty value, or a value that is not a syntactically valid email
- **THEN** the route SHALL respond with HTTP 401
- **AND** SHALL NOT mutate any document

#### Scenario: Smoke test asserts gating
- **WHEN** an automated smoke test issues a request to any mutation route
  without the header
- **THEN** the response SHALL be HTTP 401
- **AND** the test SHALL fail any deployment where mutations succeed
  without the header

### Requirement: Three-role model
The system SHALL recognise three roles: Viewer (anyone admitted by the
proxy), Editor (per-project allowlist mapping email → project IDs), and
Admin (flat allowlist of emails).

#### Scenario: Viewer default
- **WHEN** a request arrives with a valid email that is NOT on the editor
  or admin allowlists
- **THEN** the user SHALL be a Viewer
- **AND** SHALL be authorised for read endpoints, public submission, prompt
  upvotes, and prompt comments

#### Scenario: Editor on a specific project
- **WHEN** a request arrives with an email mapped to project X in the
  editor allowlist
- **THEN** the user SHALL be an Editor for project X
- **AND** SHALL be authorised to mutate project X via
  `PATCH /api/portfolios/[id]` and the edit-studio routes
- **AND** SHALL NOT be authorised to mutate other projects

#### Scenario: Admin
- **WHEN** a request arrives with an email on the Admin allowlist
- **THEN** the user SHALL be an Admin
- **AND** SHALL be authorised for every mutation route, snapshot creation,
  action plan progress edits, and editor allowlist management

### Requirement: Editor-access endpoint
The system SHALL expose `GET /api/portfolios/editor-access` returning the
roles applicable to the calling user, including which project IDs they can
edit.

#### Scenario: Response shape
- **WHEN** an authenticated user calls `/api/portfolios/editor-access`
- **THEN** the response SHALL be JSON `{ isAdmin: boolean, editableProjects:
  string[] }`
- **AND** the client SHALL use this to decide whether to render edit
  affordances

### Requirement: Allowlist management (Admin)
The system SHALL allow Admins to add or remove emails from the editor
allowlist via an admin route. The route SHALL be protected by the same
header-based identity check.

#### Scenario: Admin adds an editor
- **WHEN** an Admin POSTs `{ email, projectId }` to the allowlist
  management route
- **THEN** the editor allowlist SHALL gain `email → projectId`
- **AND** a ChangeLog entry SHALL be written recording the change

#### Scenario: Non-admin denied
- **WHEN** any non-admin posts to the allowlist management route
- **THEN** the API SHALL respond with HTTP 403
- **AND** SHALL NOT mutate the allowlist

### Requirement: Single auth resolver
Every API route SHALL begin by invoking a single shared auth resolver
helper that returns the user's email and roles, or short-circuits with the
appropriate HTTP error.

#### Scenario: Shared resolver invocation
- **WHEN** any new API route is added
- **THEN** its first executable line SHALL be a call to the shared resolver
- **AND** a lint rule or test SHALL fail if a route file is added without
  this call

