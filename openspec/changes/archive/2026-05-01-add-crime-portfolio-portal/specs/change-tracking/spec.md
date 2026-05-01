## ADDED Requirements

### Requirement: ChangeLog row per mutation
The system SHALL write a ChangeLog row for every successful document
mutation, in the same Sanity transaction as the mutation itself.

#### Scenario: Single field change
- **WHEN** any API route mutates one field on one document
- **THEN** the transaction SHALL include both the document update and one
  ChangeLog row `{ documentId, field, before, after, userEmail, timestamp }`
- **AND** if either write fails, neither SHALL be persisted

#### Scenario: Multi-field change
- **WHEN** an API route mutates N fields on the same document in one save
- **THEN** the transaction SHALL include N ChangeLog rows, one per field

### Requirement: ChangeLog schema
A ChangeLog document SHALL contain `documentId` (string), `documentType`
(enum of all mutable types), `field` (dotted path string), `before` (any),
`after` (any), `userEmail` (string), and `timestamp` (datetime).

#### Scenario: Field path encoding
- **WHEN** a mutation changes a nested field such as
  `tieringAssessment.dataStorage`
- **THEN** the ChangeLog row's `field` SHALL be the dotted path
  `tieringAssessment.dataStorage`
- **AND** `before` and `after` SHALL be the leaf values, not the wrapping
  objects

### Requirement: Recent Activity counts
The system SHALL derive Recent Activity counts on the portfolio and action
plan pages from ChangeLog rows in the last 30 days.

#### Scenario: Portfolio activity tile
- **WHEN** the portfolio page loads
- **THEN** the `Recent Activity {n}` tile SHALL display the count of
  ChangeLog rows whose `documentType` is `project` and whose `timestamp` is
  within the last 30 days

#### Scenario: Action plan activity
- **WHEN** the action plan page loads
- **THEN** its Recent Activity entry SHALL count ChangeLog rows where
  `documentType` is `action`, plus rows where `documentType` is `project`
  AND `field` starts with `actionPlanLinks`

### Requirement: Compare derives from ChangeLog
The compare endpoint SHALL derive its diff from ChangeLog rows rather than
from historic Sanity revisions or document versions.

#### Scenario: Field change reconstructed
- **WHEN** a project's `governanceTier` was modified twice between two
  dates
- **THEN** the compare endpoint SHALL emit one diff entry whose `before` is
  the value at the start date and whose `after` is the value at the end
  date

### Requirement: Author derived from request
The `userEmail` field on every ChangeLog row SHALL be set from the
`x-user-email` request header, never from a client-supplied body field.

#### Scenario: Trusted author
- **WHEN** a client sends a request body containing `userEmail` of a
  different user
- **THEN** the supplied value SHALL be ignored
- **AND** the row SHALL record the email from the request header

### Requirement: Compactor job
The system SHALL run a weekly job that compacts ChangeLog rows older than a
retention threshold.

#### Scenario: Old rows compacted
- **WHEN** the compactor runs and finds ChangeLog rows older than the
  retention threshold for the same `documentId` and `field`
- **THEN** the job SHALL replace contiguous runs with a single summary row
  whose `before` is the earliest value and whose `after` is the latest
- **AND** the run SHALL NOT touch rows newer than the threshold
