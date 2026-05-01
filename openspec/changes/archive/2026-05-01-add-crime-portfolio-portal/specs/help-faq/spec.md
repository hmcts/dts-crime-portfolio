## ADDED Requirements

### Requirement: Help page at /help
The system SHALL render a grouped FAQ at `/help` with the following ten
sections in order: `1. Getting started`, `2. Using AI tools effectively`,
`3. Acceptable use`, `4. Context and knowledge`, `5. Data security and
privacy`, `6. Copyright`, `7. Ethics and public service values`,
`8. Environment`, `9. Workforce and responsibility`, `10. Overall AI
strategy and portfolio`.

#### Scenario: Section order
- **WHEN** a Viewer navigates to `/help`
- **THEN** the page SHALL render the ten sections in the order specified
- **AND** within each section, FAQ entries SHALL be ordered by the `number`
  field ascending

#### Scenario: Footer contact
- **WHEN** the page renders
- **THEN** the footer SHALL display a contact card with a support email
  drawn from Sanity

### Requirement: Expandable Q&A panels
Each FAQ entry SHALL render as an expand/collapse panel. The question SHALL
be the panel header; the Portable Text answer SHALL be the body.

#### Scenario: Expand single panel
- **WHEN** a Viewer clicks an FAQ question
- **THEN** that panel SHALL expand to reveal the answer
- **AND** other panels SHALL remain in their current state

#### Scenario: Expand all
- **WHEN** a Viewer clicks "Expand all"
- **THEN** every panel on the page SHALL expand
- **AND** the control SHALL change to "Collapse all"

### Requirement: Cross-content search
The page SHALL include a search box that filters FAQ entries by substring
match against question text AND answer text.

#### Scenario: Search filter
- **WHEN** a Viewer types "DPIA" in the search box
- **THEN** only FAQ entries whose question or answer contains "DPIA"
  (case-insensitive) SHALL remain visible
- **AND** matching panels SHALL auto-expand to show context

#### Scenario: Empty result
- **WHEN** the search query matches no FAQ entries
- **THEN** the page SHALL show an empty state with a "Clear search"
  affordance

### Requirement: Help fetch endpoint
The system SHALL expose `GET /api/help` returning every published FAQ entry
grouped by section.

#### Scenario: Grouped response
- **WHEN** a client calls `/api/help`
- **THEN** the response SHALL be JSON with one key per section
- **AND** each value SHALL be an array of `{ number, question, answer }`
  ordered by `number` ascending
