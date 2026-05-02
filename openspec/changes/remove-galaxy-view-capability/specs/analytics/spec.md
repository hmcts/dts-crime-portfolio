## MODIFIED Requirements

### Requirement: Closed event catalogue
The portal SHALL only emit events whose names appear in a closed catalogue
defined in source. Adding a new event SHALL require a code change reviewed
against this spec.

The catalogue SHALL include exactly the following events with the listed
property keys:

- `page_view` — `{ page, section }`
- `filter_applied` — `{ page, filterKey, valueCount }`
- `dossier_opened` — `{ projectId, source }` where `source` is one of
  `portfolio`, `profile`, `direct_link`
- `export_generated` — `{ format, kind, redacted, projectCount }` where
  `format` is one of `excel`, `word`, `pptx` and `kind` is one of
  `portfolio`, `single_project`, `ownership`, `compliance`, `compare`
- `prompt_upvoted` — `{ promptId }`
- `prompt_commented` — `{ promptId }`
- `submission_started` — `{ entry }`
- `submission_completed` — `{ projectId, calculatedTier }`
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
