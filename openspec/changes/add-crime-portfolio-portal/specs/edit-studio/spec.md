## ADDED Requirements

### Requirement: Inline edit affordances by role
The dossier SHALL show inline edit affordances on every editable section if
and only if the current user is an Editor for the open project or an Admin.
Viewers SHALL NOT see edit affordances.

#### Scenario: Editor on assigned project
- **WHEN** a user whose email is on the editor allowlist for project X opens
  the dossier for project X
- **THEN** every editable section SHALL display an inline pencil icon
- **AND** clicking a pencil icon SHALL switch that section into edit mode

#### Scenario: Editor on unassigned project
- **WHEN** a user is an Editor only for project Y but opens the dossier for
  project X
- **THEN** the dossier SHALL render in read-only mode with no pencil icons

#### Scenario: Admin
- **WHEN** an Admin opens any dossier
- **THEN** every editable section SHALL display an inline pencil icon

### Requirement: Portable Text editor for updates
Project progress updates SHALL be authored in Portable Text using Sanity's
editor, supporting headings, bold/italic, links, lists, and inline images.

#### Scenario: Adding an update
- **WHEN** an Editor clicks "Add update"
- **THEN** a Portable Text editor SHALL open with empty title and body
- **AND** clicking "Save" SHALL append a new update with `timestamp`,
  `authorEmail` (from the request header), `title`, and `body`

#### Scenario: Editing an existing update
- **WHEN** an Editor clicks the pencil on an existing update entry
- **THEN** the same Portable Text editor SHALL open pre-populated with the
  current title and body
- **AND** saving SHALL replace the title and body but preserve the original
  `timestamp` and `authorEmail`

### Requirement: ChangeLog write per save
Every save in the edit studio SHALL write one ChangeLog row per modified
field in the same Sanity transaction as the document update.

#### Scenario: Single field update
- **WHEN** an Editor changes only `description` and saves
- **THEN** the API SHALL write the document mutation and one ChangeLog row
  `{ documentId, field: "description", before, after, userEmail, timestamp }`
  in a single Sanity transaction

#### Scenario: Multi-field update
- **WHEN** an Editor changes `description` and `governanceTier` in the same
  save
- **THEN** the API SHALL write two ChangeLog rows in the same transaction

#### Scenario: Failed save rolls back log
- **WHEN** the document mutation fails
- **THEN** no ChangeLog rows SHALL be written
- **AND** the user SHALL see an error toast with retry guidance

### Requirement: lastUpdatedAt is automatic
On every save, the API SHALL set `lastUpdatedAt` on the project document to
the current server timestamp. This field SHALL NOT be editable in the UI.

#### Scenario: Save updates timestamp
- **WHEN** an Editor saves any change to a project
- **THEN** `lastUpdatedAt` SHALL be set to `now()` server-side
- **AND** the dossier and portfolio card SHALL reflect the new timestamp on
  next render

### Requirement: Last-write-wins concurrency
The edit studio SHALL use last-write-wins concurrency for v1. Two concurrent
saves on the same document SHALL both succeed; the later save overwrites.

#### Scenario: Concurrent edits
- **WHEN** Editor A and Editor B both load the same dossier and save changes
  to overlapping fields within seconds of each other
- **THEN** both writes SHALL succeed
- **AND** the document SHALL reflect the value from the save that arrived
  later
- **AND** the ChangeLog SHALL contain entries for both saves in arrival order
