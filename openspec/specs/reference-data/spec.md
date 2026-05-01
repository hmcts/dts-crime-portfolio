# reference-data Specification

## Purpose
TBD - created by archiving change add-crime-portfolio-portal. Update Purpose after archive.
## Requirements
### Requirement: Single reference-data endpoint
The system SHALL expose `GET /api/portfolios/reference-data` as the single
source of dropdown options across the app. The response SHALL contain
groups, directorates, business areas, people, capabilities, and actions in
one payload.

#### Scenario: Successful fetch
- **WHEN** any client calls `GET /api/portfolios/reference-data`
- **THEN** the response SHALL be JSON with top-level keys `groups`,
  `directorates`, `businessAreas`, `people`, `capabilities`, `actions`
- **AND** each value SHALL be an array of resolved documents (id, name, and
  any join keys such as `directorate.group`)

#### Scenario: Pending entities excluded by default
- **WHEN** the endpoint is called by a Viewer or Editor
- **THEN** entities flagged `pendingReview: true` SHALL be excluded from the
  response

#### Scenario: Admin sees pending entities
- **WHEN** the endpoint is called by an Admin with query `?includePending=1`
- **THEN** the response SHALL include `pendingReview: true` entities
- **AND** SHALL annotate them with a `pendingReview` boolean field

### Requirement: Parallel resolution
The endpoint SHALL fetch each reference type in parallel from Sanity and
SHALL fail fast if any sub-fetch errors.

#### Scenario: Sub-fetch error
- **WHEN** any of the parallel Sanity queries fails
- **THEN** the endpoint SHALL respond with HTTP 502
- **AND** the error body SHALL include which reference type failed
- **AND** the client SHALL render a "Reference data unavailable" toast and
  block any form submission until retry succeeds

### Requirement: Cached client-side per session
The client SHALL cache the reference-data response in memory for the lifetime
of the page and SHALL reuse it across the submission form, the edit studio,
the portfolio filters, and the galaxy view.

#### Scenario: Single fetch per session
- **WHEN** a Viewer opens the portfolio, then opens the submission form,
  then opens the dossier and uses the edit studio in a single page session
- **THEN** exactly one network request SHALL be issued to
  `/api/portfolios/reference-data`

#### Scenario: Invalidation after inline create
- **WHEN** the submission form creates a new Person inline
- **THEN** the client cache SHALL be invalidated
- **AND** the next consumer that needs reference data SHALL refetch the
  endpoint

### Requirement: Capabilities endpoint convenience route
The system SHALL also expose `GET /api/portfolios/capabilities` returning
only the capabilities array, for use in capability-only filtered slices that
do not need the full reference-data payload.

#### Scenario: Lightweight capability fetch
- **WHEN** a client calls `GET /api/portfolios/capabilities`
- **THEN** the response SHALL be JSON `{ capabilities: [...] }`
- **AND** the capabilities array SHALL be identical in shape to the same key
  in `/api/portfolios/reference-data`

