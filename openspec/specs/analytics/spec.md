# analytics Specification

## Purpose
TBD - created by archiving change add-analytics-capability. Update Purpose after archive.
## Requirements
### Requirement: Consent gate before any analytics load
The portal SHALL NOT load the PostHog SDK, set any analytics cookie, send
any event, or contact the analytics ingest endpoint until the signed-in
user has actively given consent in the current browser.

#### Scenario: First visit, no consent yet
- **WHEN** a Viewer loads any portal page for the first time in a browser
  with no prior analytics consent decision
- **THEN** the page SHALL render fully without loading the PostHog SDK
- **AND** no `analytics` cookies, localStorage keys, or `IndexedDB`
  entries SHALL be created
- **AND** a consent banner SHALL be visible above the fold offering
  "Accept analytics" and "Decline" controls

#### Scenario: Visitor declines
- **WHEN** a Viewer clicks "Decline" on the consent banner
- **THEN** a `analyticsConsent: declined` value SHALL be persisted in
  localStorage with no expiry shorter than 12 months
- **AND** the PostHog SDK SHALL NOT be loaded for the rest of the session
- **AND** the banner SHALL hide

#### Scenario: Visitor accepts
- **WHEN** a Viewer clicks "Accept analytics"
- **THEN** a `analyticsConsent: granted` value SHALL be persisted in
  localStorage with the same expiry
- **AND** the PostHog SDK SHALL be loaded asynchronously after consent
- **AND** a single `consent_granted` event SHALL fire with no PII

### Requirement: Self-service opt-out inside the portal
The portal SHALL expose a self-service control under `/profile` that
toggles analytics consent at any time, regardless of the banner state.

#### Scenario: Toggling off after acceptance
- **WHEN** a Viewer who previously accepted opens `/profile` and toggles
  analytics off
- **THEN** the stored consent value SHALL flip to `declined`
- **AND** any in-flight PostHog requests SHALL be cancelled
- **AND** subsequent page navigations SHALL NOT load the SDK
- **AND** an in-page confirmation SHALL state "Analytics is off — no events
  will be sent from this browser"

#### Scenario: Toggling on after decline
- **WHEN** a Viewer who previously declined toggles analytics on
- **THEN** the stored consent value SHALL flip to `granted`
- **AND** the SDK SHALL load and a single `consent_granted` event SHALL fire

### Requirement: Closed event catalogue
The portal SHALL only emit events whose names appear in a closed catalogue
defined in source. Adding a new event SHALL require a code change reviewed
against this spec.

The catalogue SHALL include exactly the following events with the listed
property keys:

- `page_view` — `{ page, section }`
- `filter_applied` — `{ page, filterKey, valueCount }`
- `dossier_opened` — `{ projectId, source }` where `source` is one of
  `portfolio`, `galaxy`, `profile`, `direct_link`
- `export_generated` — `{ format, kind, redacted, projectCount }` where
  `format` is one of `excel`, `word`, `pptx` and `kind` is one of
  `portfolio`, `single_project`, `ownership`, `compliance`, `compare`
- `prompt_upvoted` — `{ promptId }`
- `prompt_commented` — `{ promptId }`
- `submission_started` — `{ entry }`
- `submission_completed` — `{ projectId, calculatedTier }`
- `galaxy_lens_changed` — `{ lens }`
- `galaxy_overlay_toggled` — `{ overlay, enabled }`
- `consent_granted` — `{}`

#### Scenario: Adding an undeclared event fails review
- **WHEN** a contributor adds a call to the analytics client with an event
  name not in the catalogue
- **THEN** a TypeScript compile error SHALL prevent the build, because the
  event-name parameter SHALL be typed as a union of the catalogue names
- **AND** CI SHALL fail before merge

#### Scenario: Property typing
- **WHEN** the analytics client is invoked for `export_generated`
- **THEN** the call SHALL be type-checked to require exactly `format`,
  `kind`, `redacted`, and `projectCount` properties
- **AND** unknown extra properties SHALL be rejected at the type layer

### Requirement: PII minimisation in event properties
Event properties SHALL NOT contain raw email addresses, person names,
project descriptions, prompt bodies, free-text search queries, or any
field whose value is authored by users.

#### Scenario: Project identity is an ID
- **WHEN** a `dossier_opened` event fires
- **THEN** the property `projectId` SHALL be the Sanity document ID
- **AND** the project name, description, owner email, and stage label SHALL
  NOT appear in the event payload

#### Scenario: Filter values are bucketed
- **WHEN** a `filter_applied` event fires for a free-text search
- **THEN** the event SHALL carry `valueCount` (the number of selected
  values, or `1` for a non-empty search) but SHALL NOT carry the raw
  search string

#### Scenario: Prompt content stays out
- **WHEN** a `prompt_upvoted` event fires
- **THEN** only `promptId` SHALL be sent
- **AND** the prompt body, summary, and author email SHALL NOT be sent

### Requirement: User identification by stable hash
The portal SHALL identify the user to PostHog with `userId = sha256(email +
serverPepper)` where `serverPepper` is a deployment secret. The raw email
SHALL NEVER be sent to PostHog.

#### Scenario: Identify call after consent
- **WHEN** consent is granted and the SDK has loaded
- **THEN** the portal SHALL call `posthog.identify(userId)` once per
  session with the hashed identifier
- **AND** SHALL NOT call `identify` with the email address

#### Scenario: Pepper rotation
- **WHEN** an Admin rotates `serverPepper`
- **THEN** subsequent identify calls SHALL produce a new `userId` per user
- **AND** historic events from the previous pepper SHALL remain associated
  with the previous identifier

### Requirement: Same-origin ingest proxy (optional but supported)
The portal SHALL support routing PostHog traffic through a same-origin
Next.js API route at `/api/analytics/ingest` so HMCTS can choose to keep
all browser traffic same-origin and to enable a self-hosted or EU-region
PostHog backend without browser CORS.

#### Scenario: Proxy enabled by config
- **WHEN** the environment variable `ANALYTICS_INGEST_MODE` is set to
  `proxy`
- **THEN** the analytics client SHALL POST events to
  `/api/analytics/ingest` instead of the PostHog public ingest URL
- **AND** the API route SHALL forward the body to the configured PostHog
  ingest URL with the project key attached server-side

#### Scenario: Proxy disabled
- **WHEN** `ANALYTICS_INGEST_MODE` is unset or `direct`
- **THEN** the analytics client SHALL POST events directly to the
  PostHog ingest URL using the public project key

#### Scenario: Proxy strips identity headers
- **WHEN** the proxy forwards a request
- **THEN** it SHALL NOT forward the `x-user-email` header to PostHog
- **AND** it SHALL drop the original client IP if `ANALYTICS_DROP_IP=true`

### Requirement: No PII in URLs
The portal SHALL NOT emit `page_view` events whose `page` property contains
an email, project name, or any free-text path segment authored by a user.

#### Scenario: Dossier URL bucketed
- **WHEN** a Viewer opens `/portfolio/abc123` and a `page_view` event fires
- **THEN** the `page` property SHALL be the route template
  `/portfolio/[id]`
- **AND** the `projectId` SHALL be carried in `section` only if it is the
  Sanity document ID, never a slug or name

### Requirement: Opt-out is honoured by the server proxy
The same-origin ingest proxy SHALL drop any incoming request that lacks an
`analyticsConsent=granted` cookie without forwarding it to PostHog.

#### Scenario: Missing consent at the proxy
- **WHEN** the proxy receives a POST without an `analyticsConsent=granted`
  cookie
- **THEN** the proxy SHALL respond with HTTP 204 and SHALL NOT contact
  PostHog
- **AND** the response SHALL include a `Cache-Control: no-store` header

### Requirement: Privacy notice copy is content-managed
The consent banner copy and the privacy-notice link SHALL be sourced from
Sanity so HMCTS information governance can update wording without a code
release.

#### Scenario: Updating banner copy
- **WHEN** an Admin edits the analytics privacy notice content in Sanity
- **THEN** the next portal request SHALL render the updated banner copy
- **AND** existing consent decisions SHALL remain in force (an edit to the
  notice SHALL NOT silently re-prompt every Viewer)

