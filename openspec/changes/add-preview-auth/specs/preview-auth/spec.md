## ADDED Requirements

### Requirement: Activated only outside production
The preview-auth middleware SHALL be active if and only if the deployment
environment variable `APP_ENVIRONMENT` is set to `preview` or `local`. In
production it SHALL be inert and the upstream auth proxy described in
`access-control` SHALL remain the sole identity source.

#### Scenario: Preview deployment
- **WHEN** the app starts with `APP_ENVIRONMENT=preview`
- **THEN** the preview-auth middleware SHALL run on every request before
  any API route or page handler
- **AND** the production upstream-proxy expectation SHALL be relaxed (no
  401 if the inbound `x-user-email` header is missing on the first hit)

#### Scenario: Production deployment
- **WHEN** the app starts with `APP_ENVIRONMENT=production`
- **THEN** the preview-auth middleware SHALL NOT execute
- **AND** the email-entry page at `/preview-auth` SHALL return HTTP 404
- **AND** the sign-out route SHALL return HTTP 404

#### Scenario: Build-time guard
- **WHEN** a CI build is triggered with `APP_ENVIRONMENT=production`
- **THEN** the build SHALL fail if any code path imports the preview-auth
  middleware into the production bundle
- **AND** the build SHALL fail if `PREVIEW_AUTH_COOKIE_SECRET` is set
  alongside `APP_ENVIRONMENT=production`

### Requirement: Email-entry page
The preview environment SHALL expose a single-page form at `/preview-auth`
that prompts for an email address and posts it back to a same-origin
handler.

#### Scenario: First visit with no cookie
- **WHEN** a visitor opens any URL in the preview environment without a
  `previewAuth` cookie
- **THEN** the middleware SHALL respond with HTTP 302 to `/preview-auth`
- **AND** the page SHALL render an email input, a "Continue" button, and
  a banner explaining this is a non-production preview

#### Scenario: Submitting a syntactically valid email
- **WHEN** the visitor submits an email matching a basic RFC-5322
  validation
- **THEN** the handler SHALL set a `previewAuth` cookie containing the
  email and an HMAC-SHA256 signature using `PREVIEW_AUTH_COOKIE_SECRET`
- **AND** the cookie SHALL be `HttpOnly`, `Secure`, `SameSite=Lax`, and
  scoped to the deployment domain
- **AND** the handler SHALL respond with HTTP 302 to the original URL
  the visitor first requested, defaulting to `/portfolio`

#### Scenario: Invalid email
- **WHEN** the visitor submits an empty value or a value that fails
  validation
- **THEN** the page SHALL re-render with an inline error
- **AND** SHALL NOT set the cookie

### Requirement: Header injection from cookie
For every request after the cookie is set, the middleware SHALL verify
the cookie's signature, extract the email, and rewrite the request's
`x-user-email` header to that email before any downstream handler runs.

#### Scenario: Valid cookie present
- **WHEN** a request arrives with a `previewAuth` cookie whose HMAC
  signature is valid for the configured secret
- **THEN** the middleware SHALL set `x-user-email` on the forwarded
  request to the cookie's email
- **AND** the auth resolver and every downstream API route SHALL behave
  exactly as they would in production with the upstream proxy

#### Scenario: Cookie signature mismatch
- **WHEN** a request arrives with a `previewAuth` cookie whose signature
  does not validate
- **THEN** the middleware SHALL clear the cookie
- **AND** SHALL respond with HTTP 302 to `/preview-auth`

### Requirement: Inbound header is overwritten, not appended
The middleware SHALL overwrite any `x-user-email` header that arrives
from the client with the value derived from the signed cookie. A client
SHALL NOT be able to spoof identity by setting the header directly.

#### Scenario: Client supplies its own header
- **WHEN** a request arrives with both a valid `previewAuth` cookie for
  `alice@hmcts.net` and a client-set `x-user-email: bob@hmcts.net` header
- **THEN** the middleware SHALL overwrite the header to
  `alice@hmcts.net` before forwarding
- **AND** downstream handlers SHALL never observe `bob@hmcts.net`

#### Scenario: No cookie, client supplies header
- **WHEN** a request arrives with no `previewAuth` cookie but a
  client-set `x-user-email` header
- **THEN** the middleware SHALL strip the inbound header
- **AND** SHALL respond with HTTP 302 to `/preview-auth`

### Requirement: Sign-out
The preview environment SHALL expose `POST /preview-auth/sign-out` which
clears the `previewAuth` cookie and redirects to `/preview-auth`.

#### Scenario: Sign-out from any page
- **WHEN** a visitor clicks the "Sign out" control in the preview banner
- **THEN** the handler SHALL clear the `previewAuth` cookie by setting
  it with `Max-Age=0`
- **AND** SHALL respond with HTTP 302 to `/preview-auth`

### Requirement: Visual preview banner
Every page rendered in the preview environment SHALL display a persistent
banner reading "Preview environment — not production. Test data only."
with a sign-out control.

#### Scenario: Banner present in preview
- **WHEN** any page is rendered with `APP_ENVIRONMENT=preview`
- **THEN** the banner SHALL be visible above the main content area
- **AND** the banner SHALL include the signed-in email and a "Sign out"
  button posting to `/preview-auth/sign-out`

#### Scenario: Banner absent in production
- **WHEN** any page is rendered with `APP_ENVIRONMENT=production`
- **THEN** the banner SHALL NOT render

### Requirement: Cookie lifetime
The signed `previewAuth` cookie SHALL have a `Max-Age` no longer than 7
days. Re-entry of the email SHALL be required after expiry.

#### Scenario: Cookie expired
- **WHEN** a request arrives with a `previewAuth` cookie whose
  `Max-Age` has elapsed
- **THEN** the browser SHALL no longer send the cookie
- **AND** the next request SHALL be redirected to `/preview-auth`

### Requirement: Audit of preview identity
The preview environment SHALL log each new identity (first cookie issue
per email) to a `previewSession` document in the preview Sanity dataset,
recording email and timestamp.

#### Scenario: First sign-in for an email
- **WHEN** a visitor signs in with an email never seen in the preview
  before
- **THEN** the handler SHALL write a `previewSession` document with
  `{ email, firstSeenAt }`

#### Scenario: Repeat sign-in for an email
- **WHEN** a visitor signs in with an email that already has a
  `previewSession` document
- **THEN** no new document SHALL be created
- **AND** a `lastSeenAt` field SHALL be updated on the existing document
