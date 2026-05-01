# email-reminders Specification

## Purpose
TBD - created by archiving change add-crime-portfolio-portal. Update Purpose after archive.
## Requirements
### Requirement: Daily stale-data reminder job
The system SHALL run a daily job that finds projects with no update in the
last N days and sends a personalised reminder email to each project's
delivery owner via GOV.UK Notify.

#### Scenario: Single owner with multiple stale projects
- **WHEN** the job runs and finds three stale projects all owned by the
  same delivery owner
- **THEN** that owner SHALL receive exactly one email
- **AND** the email body SHALL list all three projects with deep links to
  their dossiers

#### Scenario: Configurable threshold
- **WHEN** the staleness threshold is set to N days in configuration
- **THEN** a project SHALL be flagged stale if `lastUpdatedAt` is older
  than N days OR if `lastUpdatedAt` is unset and `createdAt` is older than
  N days

### Requirement: GOV.UK Notify integration
The job SHALL send via GOV.UK Notify using a single template and
substitutions for owner name, project list, and portal URL.

#### Scenario: Successful send
- **WHEN** the job sends an email and Notify responds with 200/201
- **THEN** the job SHALL log a `reminderSend` document with `ownerEmail`,
  `projects`, `notifyMessageId`, and `sentAt`

#### Scenario: Notify failure
- **WHEN** the job's Notify call fails (network error or non-2xx response)
- **THEN** the job SHALL retry up to three times with exponential backoff
- **AND** if all retries fail, log a `reminderSendFailure` document with
  `ownerEmail`, `error`, and `failedAt`
- **AND** continue processing other owners

### Requirement: Audit trail of sends
Every reminder send (success or failure) SHALL be logged to Sanity for
audit. The audit log SHALL be queryable to show the most recent reminder
sent to a given owner.

#### Scenario: Querying recent sends
- **WHEN** an Admin queries `reminderSend` documents for a specific
  `ownerEmail`
- **THEN** the response SHALL include the most recent send across all
  successful and failed attempts

### Requirement: Idempotent same-day re-runs
The job SHALL be idempotent within a single day: a re-run on the same date
SHALL NOT send a second reminder to the same owner.

#### Scenario: Same-day re-run
- **WHEN** the job runs at 09:00 and again at 14:00 on the same date
- **THEN** the second run SHALL find no owners requiring email because the
  audit log already records a same-day send for each
- **AND** SHALL NOT call Notify

### Requirement: Opt-out respected
Persons may have an `emailOptOut: true` flag. The job SHALL NOT send
reminders to opted-out owners.

#### Scenario: Opted-out owner
- **WHEN** a delivery owner has `emailOptOut: true` on their Person
  document and they own stale projects
- **THEN** the job SHALL skip them
- **AND** SHALL log a `reminderSkipped` document with reason
  `emailOptOut`

