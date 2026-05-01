# observability Specification

## Purpose
Defines structured logging requirements so every server-side write path, scheduled job, and API request emits machine-readable JSON to stdout. Enables debugging, audit trails, and downstream log shipping without committing the portal to a specific log aggregator. PII is restricted to the resolved `userEmail`; the signed `previewAuth` cookie value is never logged.

## Requirements

### Requirement: Single JSON line per log event
The portal SHALL emit every server-side log event as a single line of valid JSON to stdout. Multi-line output, free-text logs, and `console.*` calls with non-JSON values SHALL NOT be used in production code paths (API routes, middleware, scheduled scripts).

#### Scenario: Valid JSON output
- **WHEN** any code path emits a log event via the shared logger
- **THEN** the output to stdout SHALL be exactly one line terminated by `\n`
- **AND** parsing that line as JSON SHALL succeed

#### Scenario: console.log discouraged
- **WHEN** a contributor adds `console.log` / `console.warn` / `console.error` to API route, middleware, or scheduled-script code
- **THEN** code review SHALL flag it
- **AND** the contributor SHALL switch to the shared logger

### Requirement: Mandatory event fields
Every log event SHALL include `timestamp` (ISO 8601 string), `level` (one of `debug`, `info`, `warn`, `error`), `event` (a short event name in `snake_case`), and `service` (the literal string `dts-crime-portfolio`).

#### Scenario: All required fields present
- **WHEN** any log event is emitted
- **THEN** the parsed JSON SHALL contain `timestamp`, `level`, `event`, and `service` with non-empty values
- **AND** the `service` value SHALL be `dts-crime-portfolio`

### Requirement: Request-scoped fields
When a log event is emitted in the context of an HTTP request, it SHALL carry `requestId` (UUID v4), `method`, and `path`. When the auth resolver has resolved an identity, it SHALL also carry `userEmail`. Query-parameter VALUES and request bodies SHALL NOT be logged; only query-parameter KEYS MAY be logged.

#### Scenario: Request ID consistency
- **WHEN** a single HTTP request handler emits multiple log events
- **THEN** all events SHALL carry the same `requestId`
- **AND** that `requestId` SHALL be a UUID v4

#### Scenario: PII not logged
- **WHEN** a request body contains user-supplied content (e.g. project description, prompt body, search query)
- **THEN** that content SHALL NOT appear in any log event
- **AND** only the resolved `userEmail` and request-shape metadata SHALL be carried as user identifiers

### Requirement: Singleton logger module
The portal SHALL expose a logger at `lib/logging/logger.ts` with the methods `info(event, fields?)`, `warn(event, fields?)`, `error(event, fields?)`, and `debug(event, fields?)`. Every server-side log event SHALL be emitted through this module.

#### Scenario: Logger API
- **WHEN** server-side code imports the logger from `lib/logging/logger.ts`
- **THEN** the module SHALL export a `logger` object with `info`, `warn`, `error`, `debug` methods
- **AND** each method SHALL accept an event name as the first argument and an optional fields object as the second

#### Scenario: Default level
- **WHEN** no explicit log level is configured via env
- **THEN** the logger SHALL emit `info`, `warn`, and `error` events
- **AND** SHALL suppress `debug` events
- **AND** an env var (`LOG_LEVEL`) MAY raise the threshold to `debug` for diagnostic builds

### Requirement: API route lifecycle logging
Every API route handler SHALL emit `request_start` (info) when invoked and `request_end` (info, with `status` and `durationMs`) when the handler returns. If the handler throws, a `request_error` (error, with `message` and `stack`) SHALL be logged in addition to a `request_end` reflecting the resulting HTTP status.

#### Scenario: Successful request
- **WHEN** an API route returns a 2xx response
- **THEN** exactly one `request_start` and one `request_end` event SHALL be emitted
- **AND** the `request_end` event SHALL carry `status` and a non-negative integer `durationMs`

#### Scenario: Handler throws
- **WHEN** an API route handler throws an exception
- **THEN** a `request_error` event SHALL be emitted at `error` level with `message` and `stack`
- **AND** a `request_end` event SHALL still fire with the resulting HTTP status

### Requirement: Scheduled job lifecycle logging
Standalone scripts (stale-data reminders, snapshot writer, ChangeLog compactor, prompt competition tabulator) SHALL emit `job_start` (info) at entry, `job_end` (info, with `durationMs`) at exit, and `job_error` (error, with `message` and `stack`) on failure. Each event SHALL carry a `job` field naming the script.

#### Scenario: Successful job run
- **WHEN** a scheduled script runs to completion
- **THEN** exactly one `job_start` event SHALL be emitted at start with `job` set to the script's name
- **AND** exactly one `job_end` event SHALL be emitted at finish with `durationMs` and the same `job` value

#### Scenario: Failing job
- **WHEN** a scheduled script throws
- **THEN** a `job_error` event SHALL be emitted at error level with `message`, `stack`, and `job`
- **AND** the script SHALL exit with a non-zero exit code

### Requirement: No PII beyond email
Beyond the resolved `userEmail`, no personal information about the user (full name, IP address, session identifiers, browser metadata) SHALL appear in any log event. The signed `previewAuth` cookie value SHALL NEVER be logged.

#### Scenario: Cookie not logged
- **WHEN** the preview-auth middleware verifies a cookie
- **THEN** the cookie value (signed payload) SHALL NOT appear in any log event
- **AND** only the resolved `email` MAY be logged as `userEmail`

### Requirement: Environment-aware behaviour
In test runs (`NODE_ENV=test`), the logger SHALL be silent by default to avoid polluting Vitest output. A test MAY opt in to capturing log output via a documented helper.

#### Scenario: Tests are quiet
- **WHEN** Vitest runs the suite
- **THEN** log events SHALL NOT print to stdout by default
- **AND** the test runner output SHALL remain readable
