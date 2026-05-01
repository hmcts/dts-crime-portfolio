## ADDED Requirements

### Requirement: Events page at /events
The system SHALL render a searchable list of events at `/events` filterable
by Category and Location. Each event card SHALL show title, date/time, and
location.

#### Scenario: Default view
- **WHEN** a Viewer navigates to `/events`
- **THEN** the page SHALL list events whose `startsAt` is in the future
- **AND** events SHALL be ordered by `startsAt` ascending

#### Scenario: Empty state
- **WHEN** there are no future events
- **THEN** the page SHALL render an empty state with a magnifier icon and
  helper copy

### Requirement: Filters
The page SHALL provide Category and Location dropdowns plus a free-text
search across event titles and bodies.

#### Scenario: Filter combination
- **WHEN** a Viewer selects category "Workshop" and types "AI" in search
- **THEN** the result set SHALL be events with category "Workshop" whose
  title or body contains "AI" (case-insensitive)

#### Scenario: Location filter
- **WHEN** a Viewer selects location "London"
- **THEN** only events whose `location` matches "London" SHALL be shown

### Requirement: Event detail
Clicking an event card SHALL open the event's full detail with title,
category, location, start/end times, and Portable Text body.

#### Scenario: Opening an event
- **WHEN** a Viewer clicks an event card
- **THEN** the event detail SHALL open in a slide-over modal
- **AND** the URL SHALL update to `/events/{id}` for deep-linking

### Requirement: Events fetch endpoint
The system SHALL expose `GET /api/events?category=&location=` returning
events filtered by the supplied query params.

#### Scenario: Combined query
- **WHEN** a client calls `/api/events?category=Workshop&location=London`
- **THEN** the response SHALL contain only events matching both filters
- **AND** SHALL exclude events whose `endsAt` is in the past
