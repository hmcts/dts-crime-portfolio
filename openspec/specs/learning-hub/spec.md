# learning-hub Specification

## Purpose
TBD - created by archiving change add-crime-portfolio-portal. Update Purpose after archive.
## Requirements
### Requirement: Learning page at /learning
The system SHALL render a learning hub at `/learning` as a tag-filterable
card grid with type filters `All`, `Videos`, `Playlists`, `Guides` and
hashtag filters drawn from the active learning items.

#### Scenario: Default view
- **WHEN** a Viewer navigates to `/learning`
- **THEN** the page SHALL list every published learning item as a card
- **AND** the type filter SHALL default to `All`
- **AND** featured items SHALL render with a "Featured" pill

### Requirement: Card content per type
Each card SHALL show title, type pill (`Featured` / `Guide` / `Playlist` /
`Video`), reading time, level, and (for videos) a play overlay on the
thumbnail.

#### Scenario: Video thumbnail
- **WHEN** a Viewer hovers a video card
- **THEN** the play overlay SHALL transition to a hover state
- **AND** clicking the card SHALL open the content viewer with the video
  player loaded

#### Scenario: Guide card
- **WHEN** a card represents a guide
- **THEN** the type pill SHALL read "Guide"
- **AND** clicking the card SHALL open the content viewer with the
  Portable Text body

### Requirement: Tag filtering
The system SHALL surface hashtag chips drawn from the `tags` field across
all published learning items. Selecting a chip SHALL filter the grid to
items containing that tag.

#### Scenario: Multi-tag filter
- **WHEN** two hashtag chips are selected
- **THEN** only items whose `tags` array contains BOTH selected tags SHALL
  be shown

#### Scenario: Combined with type
- **WHEN** the type filter is set to `Videos` and the `#Prompting` chip is
  active
- **THEN** only video items tagged `#Prompting` SHALL be shown

### Requirement: Playlists with children
A learning item of type `playlist` SHALL hold an array of child items
referenced via `playlistChildren`. Opening a playlist SHALL render the
child items in order.

#### Scenario: Opening a playlist
- **WHEN** a Viewer opens a playlist card
- **THEN** the content viewer SHALL render the playlist title and
  description
- **AND** list each child item with its own title, type pill, and reading
  time
- **AND** clicking a child SHALL navigate to that child's content viewer

### Requirement: Learning fetch endpoint
The system SHALL expose `GET /api/learning?tag=` returning published
learning items, optionally filtered by tag.

#### Scenario: Tag filter applied
- **WHEN** a client calls `GET /api/learning?tag=%23Prompting`
- **THEN** the response SHALL contain only items whose `tags` includes
  `#Prompting`

#### Scenario: Featured first
- **WHEN** a client calls `GET /api/learning` without filters
- **THEN** featured items SHALL appear first in the response array
- **AND** within each group, items SHALL be ordered by creation date
  descending

