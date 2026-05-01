## ADDED Requirements

### Requirement: Constellation map at /galaxy
The system SHALL render a zoomable, pannable canvas constellation map at
`/galaxy` where each star is a project and each constellation is a cluster
under the chosen lens.

#### Scenario: Default lens
- **WHEN** a Viewer navigates to `/galaxy` without query params
- **THEN** the lens SHALL default to Capability
- **AND** stars SHALL be grouped into one constellation per capability
- **AND** the header SHALL display `{starCount} stars · {clusterCount}
  constellations · {zoom}%`

### Requirement: Lens switcher
The galaxy view SHALL provide a "Re-cluster lens" toggle with the values
Capability, Stage, Business area, Delivery area, and Governance.

#### Scenario: Switching lens
- **WHEN** a Viewer changes the lens from Capability to Stage
- **THEN** the constellations SHALL recompute so each cluster is one stage
- **AND** the camera SHALL animate to fit all clusters on screen
- **AND** the header counts SHALL update

### Requirement: Signal overlays
The galaxy view SHALL provide overlay toggles for `Compliance gaps` (missing
risk register or DPIA), `Updated in 7 days`, and `No update in 30 days`.
Overlays SHALL annotate stars without regrouping them.

#### Scenario: Enabling Compliance gaps
- **WHEN** a Viewer enables the Compliance gaps overlay
- **THEN** stars whose project has a missing risk register or missing DPIA
  SHALL render with a red outline ring
- **AND** unaffected stars SHALL render at reduced alpha so flagged stars
  stand out

#### Scenario: Stacking overlays
- **WHEN** two overlays are enabled simultaneously
- **THEN** stars matching either condition SHALL be highlighted
- **AND** stars matching both SHALL render with both visual treatments

### Requirement: Constellation legend with focus
The galaxy view SHALL render a legend listing each constellation with a
colour swatch, name, project count, and a "Focus" button that zooms the
camera to that cluster.

#### Scenario: Focus zoom
- **WHEN** a Viewer clicks "Focus" on the "Pilot" constellation
- **THEN** the camera SHALL animate to fit that cluster's bounding box
- **AND** other constellations SHALL remain visible at reduced alpha

### Requirement: Search and shared filters
The galaxy view SHALL include a search box and the same filters as the
portfolio (stage, capability, business area, delivery area). Filter state
SHALL be shared between portfolio and galaxy via the URL query string.

#### Scenario: Filter applied from portfolio
- **WHEN** a Viewer applies a Stage filter on `/portfolio` and then navigates
  to `/galaxy`
- **THEN** the same Stage filter SHALL be active on the galaxy view
- **AND** stars not matching the filter SHALL be hidden, not greyed

### Requirement: Star click opens dossier
Clicking a star SHALL open the same project dossier slide-over used by the
portfolio, and update the URL to `/galaxy/{id}` so the dossier is linkable
from the galaxy context.

#### Scenario: Opening dossier from star
- **WHEN** a Viewer clicks a star
- **THEN** the dossier slide-over SHALL open
- **AND** the URL SHALL change to `/galaxy/{id}` without a full reload

### Requirement: Camera controls
The galaxy view SHALL support drag-to-pan, scroll-to-zoom, a dedicated zoom
slider, "Reset camera", "Show borders" (cluster bounding boxes), and
"Minimise UI" (hides legend and toolbar).

#### Scenario: Reset camera
- **WHEN** a Viewer clicks "Reset camera"
- **THEN** the camera SHALL animate back to the default view that fits all
  current constellations on screen at 100% zoom

#### Scenario: Minimise UI
- **WHEN** a Viewer clicks "Minimise UI"
- **THEN** the legend, toolbar, and overlays panel SHALL hide
- **AND** a single small "Restore UI" affordance SHALL remain visible

### Requirement: Layout cached per lens
The system SHALL precompute and cache the 2D force-directed layout per lens
in client state so switching lenses is interactive after first compute.

#### Scenario: First lens compute
- **WHEN** a lens is selected for the first time in a session
- **THEN** the layout SHALL compute on the client
- **AND** subsequent re-selection of the same lens SHALL reuse the cached
  layout without recomputation

### Requirement: Static-SVG fallback
The system SHALL detect browsers that lack canvas/WebGL support or where
canvas perf falls below an interactive threshold and SHALL render a static
SVG fallback of the current lens.

#### Scenario: Unsupported browser
- **WHEN** a Viewer's browser fails the capability check
- **THEN** the page SHALL render a static SVG with the same legend and
  overlay summary
- **AND** clicking a star SHALL still open the dossier
