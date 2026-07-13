# Healthy Rivers and Landscapes Restoration Dashboard — Specification

**Status:** v0.2 draft  
**Working repo name:** `hrl-restoration-map-prototype`  
**Related repos:**

- `hrl-data-infrastructure` — pipelines, storage, and publication architecture at `lucy-dwr.github.io/hrl-data-infrastructure`
- `hrl-docs` — companion documentation site at `lucy-dwr.github.io/hrl-docs`

---

## 0. How to use this document

This is the source of truth for product, design, data, and engineering decisions on the Healthy Rivers and Landscapes Restoration Dashboard. It is written for the HRL data team, partner agencies, contributors, and reviewers who need to understand what the dashboard is meant to be.

The Decision Log at the end is the canonical record of what is settled. Do not reverse a logged decision without recording a superseding decision.

This document is intentionally an umbrella spec. It points to future sub-specs (see Section 16) that will be elaborated as work progresses. Repository workflow, coding-agent instructions, and contribution mechanics live in [`AGENTS.md`](AGENTS.md).

This repo is currently a **local prototype**, not the production dashboard. The production architecture described here is the target direction, but Azure hosting, published snapshot manifests, and the full `hrl-data-infrastructure` serving contract are not set up yet. Current development should run locally from data and generated assets stored in this repo.

---

## 1. Purpose

The Healthy Rivers and Landscapes Restoration Dashboard is the public-facing surface of the Healthy Rivers and Landscapes (HRL) Science Program. Its job is to:

1. **Make the work feel real.** A map-first interface that shows where HRL restoration projects are happening, so partners, the regulator, and the public can see the program as a tangible thing in the world rather than as a set of documents.
2. **Show progress at a high level.** Headline metrics that communicate what the program is achieving without requiring the visitor to read a report. The current prototype labels the schema's total project acreage field as total project acres; the production target can evolve toward verified acres restored or under restoration once canonical data are available.
3. **Provide a foundation for future capability.** The dashboard is expected to evolve over the eight-year program horizon to incorporate (a) narrative storytelling about specific projects and watersheds, and (b) science, monitoring, and adaptive-management views derived from the HRL data infrastructure.

The dashboard is not a research tool and not an analyst exploration environment.

---

## 2. Audiences

Three audiences, in priority order of design weight:

1. **HRL program agencies** — technically literate, want to see their projects represented accurately, will use the dashboard to communicate to their own leadership and partners.
2. **State Water Resources Control Board (regulator)** — needs to see credible, defensible evidence of program commitments and progress. 
3. **General public** — generally non-technical. Needs an immediate sense of "what is this program and what has it done?" Will likely not read documentation.

Design implication: the dashboard must be visually polished enough for the public, technically credible enough for the regulator, and accurate enough for the partner agencies — in that order of what is hardest to get right.

Public-facing interface copy should use plain language written for an 8th-grade reading audience. Technical terms are acceptable when they are necessary for accuracy, but surrounding text should be short, concrete, and easy to scan.

---

## 3. Scope

### 3.1 Current prototype

- Run locally with Vite.
- Use a local GeoPackage as the current source dataset.
- Use the vendored LinkML schema release in `schemas/hrl/linkml/` as the prototype data contract.
- Validate and normalize against `RestorationProjectSubmission`, not the future canonical record shape.
- Include scripts that convert the GeoPackage into browser-readable static data.
- Render restoration project features on a MapLibre map.
- Support a small set of representative interactions: layer visibility, click-to-inspect, and headline metrics where the source data support them.
- Treat Azure Blob, related Azure infrastructure, and published snapshot manifests as future production concerns, not prototype prerequisites.

**Implementation status as of v0.2:**

| Feature | Status |
|---|---|
| Map with project polygons, hover tooltip, and project-type colour symbology | ✅ |
| Top bar | ✅ |
| Headline progress tiles | ✅ |
| Click-to-inspect detail panel | ✅ |
| Layer toggle panel with project types, HRL tributary watersheds, Delta/bypass boundaries, and stream network | ✅ |
| Map / imagery basemap toggle | ✅ |
| Searchable/filterable project list and non-map browsing equivalent | ✅ prototype |
| Fit-to-visible-projects and zoom-to-project map actions | ✅ |
| URL-encoded state | ✅ |
| Concise About popup | ✅ |
| First-run orientation overlay with persistent top-bar purpose text | ✅ |
| Methodology and data-source context | ✅ |
| Download data affordance | ✅ prototype |

### 3.2 v1 production target

- Full-bleed map of the Sacramento River watershed and Bay-Delta.
- All HRL restoration project locations rendered as map features, with project-type symbology.
- Project types supported in v1 follow `ProjectTypeEnum` in the vendored LinkML schema:
  - Bypass floodplain habitat
  - Fish food production
  - Fish passage improvement
  - Fish screen installation or improvement
  - Rearing habitat
  - Spawning habitat
  - Tidal habitat
  - Tributary floodplain habitat
  - Other
- Headline progress tiles, anchored in the prototype by total project acreage where available.
- Click-to-inspect for any project (project name, type, project stage, lead entity, system, acreage where available).
- Layer toggling for project types, HRL tributary watersheds, and reference boundaries.
- URL-encoded state (center, zoom, active layers, selected project, time range if applicable).
- "Download data" affordances linking back to canonical datasets in the HRL data infrastructure.
- Concise "About this dashboard" popup, plus fuller methodology and data-source context before production launch.
- Accessibility: WCAG 2.2 Level AA conformance, with selected WCAG 2.2 Level AAA criteria where applicable.
- Static deploy to Azure Blob.

### 3.3 Potential future features

- Time-aware layers (project start, completion, monitoring milestones).
- Watershed summary views.
- Optional monitoring data overlays (water quality, fish, vegetation) where data are available and approved for public display.
- Scrollytelling chapter(s) — one or two flagship project narratives.
- Advanced search and saved filtering beyond the prototype project-list filters.
- Full adaptive management views: synthesis of monitoring data tied to project actions.
- Multi-chapter storytelling integrated with the main map.
- Possible saved-view / subscription functionality (deferred — only if real demand emerges).

### 3.5 Explicitly out of scope

- User accounts or authentication in v1.
- Direct upload of data through the dashboard.
- Editing of project records through the dashboard.
- Real-time streaming data.

---

## 4. Information architecture

A four-tier progressive-disclosure staircase. Each tier is reachable from the one before it without leaving the page.

1. **Ambient.** What the visitor sees on first load: basemap, default project layer, headline tiles. Answers "what is this?" in five seconds.
2. **Browsing.** Toggle layers, change region, change time window. Answers "what kinds of work is HRL doing, and where?"
3. **Inspection.** Click a project. A right-side detail panel opens with project metadata, key stats, photos if available, link to canonical record. Answers "what is this specific project?"
4. **Deep dive.** Open methodology, download data, see multimedia, or read a flagship narrative. Answers "how do I trust this, and where do I learn more?"

Every piece of content must be assigned to a tier. If a piece of content cannot be assigned, it does not belong in v1.

---

## 5. Layout system

- **Full-bleed map.** The map fills the viewport. Chrome sits on top of it as floating panels.
- **Top bar.** Thin (≈48px). Dashboard identity left; "Download data" and "About" actions right. No primary navigation lives here.
- **Left rail.** ≈360px, collapsible. Layer toggles, filters, legend. Default-open on desktop, default-collapsed on mobile.
- **Bottom tile strip.** Headline progress tiles currently show visible project count and total project acres where available. Confirmed position: bottom-centre of the map area (Decision 22). Avoids conflict with the left layer panel and bottom-right navigation controls.
- **Right detail panel.** ≈400px, opens on selection, closes on dismiss. Renders project detail (tier 3). Pushes the map left rather than overlaying it on desktop; overlays on mobile.
- **No persistent footer.** Footer information lives in About/methodology surfaces.

Responsive breakpoints (initial proposal):

- ≥1280px: full layout as described.
- 768–1279px: left rail collapses to icon strip; tiles move to top of left rail when expanded.
- <768px: bottom-sheet pattern for layer controls; tiles in a horizontally scrolling strip below the top bar; detail panel becomes a bottom sheet.

---

## 6. Visual system

### 6.1 Basemap

Custom MapLibre style. Desaturated, low-contrast, designed to recede behind data layers. Two variants:

- **Light** (default) — warm pale base, muted hydrography, restrained labels, and MapLibre-rendered DEM hillshade terrain context.
- **Dark** — optional, deferred to near-future if there is demand.
- **Satellite/aerial imagery** — prototype optional toggle using Esri World Imagery, visually subdued so project and context layers remain primary (Decision 27).

Prototype tile source: OpenFreeMap Positron style (Decision 19) with local style overrides for a quiet paper-map feel, plus AWS Terrarium DEM tiles for hillshade terrain and Esri World Imagery for optional imagery inspection. Production target: Protomaps tiles served from Azure Blob, which fits the Azure-Blob-as-substrate decision and avoids per-request tile fees.

### 6.2 Data palette

- Project-type colors for `ProjectTypeEnum` values, chosen for hue separation at typical zoom, and re-tested for color-vision deficiency (deuteranopia and protanopia).
- One sequential ramp for any quantitative overlay (e.g., acres).
- One diverging ramp reserved for any future change-over-time layer.
- Reserved colors: a single accent for selection state and a single muted gray for "out of scope" features.
- Prototype UI chrome uses a light-touch HRL-inspired palette drawn from the public HRL site: deep teal for primary accents, restrained olive/gold for context, and blue-grey hydrography so streams read as base-map context rather than project data.

The prototype palette is implemented in `src/features/map/project-colors.ts`. Formal documentation with colour vision deficiency rationale still to be written in a `palette.md` sub-spec.

### 6.3 Typography

- One open-source sans-serif typeface for the entire UI. Recommended candidates (decide in design review): Inter, IBM Plex Sans, or Source Sans 3. Prototype currently uses the system-ui stack pending final typeface selection.
- Type scale: 6 sizes (11–22px) defined in `src/styles/tokens.css` as CSS custom properties. No ad-hoc font sizes in components.
- Map labels follow the MapLibre style; UI typography is the typeface above.

### 6.4 Iconography

- One open-source icon set. Recommended: Lucide or Phosphor. Use the same set throughout to avoid stylistic drift.

---

## 7. Interaction patterns

### 7.1 Hover

- Map features show a lightweight tooltip with at most three facts: project name, project type, and a single key stat (acres).
- Tooltips are readable in <1 second. No charts, no images, no long copy.
- Hover state must be visually distinct from selection state.

### 7.2 Click

- Clicking a feature commits a selection and opens the right detail panel (Tier 3).
- Selection is reflected in the URL (see Section 8).
- Clicking the map background dismisses the selection.

### 7.3 Coordinated views

The map, the tile strip, and any chart panels are views over a single shared application state. Filtering the time window updates all three. Hovering a tile highlights matching features on the map. This is an architectural commitment, not a stretch goal — it is the single biggest reason the reference dashboards feel polished.

### 7.4 Layer logic

- Layers are independently toggleable.
- Project-type layers default ON. HRL tributary watershed outlines, the Delta legal boundary, and Yolo/Sutter bypass boundaries default OFF because they are reference context. The stream network defaults ON.
- Layer order is fixed and not user-configurable in v1 (defer drag-to-reorder).

### 7.5 Project browsing and filtering

- The left rail includes a Projects tab that is the prototype's non-map browsing equivalent for project records.
- Project list search currently matches project name, lead entity, system, project type, project stage, and target species.
- Project list filters currently include system and early-implementation status, and they coordinate with project-type layer visibility.
- The map, project list, and headline tiles are coordinated over the same filtered project set.
- Users can zoom to an individual project from the list or detail panel, and can fit the map to all currently visible projects.

### 7.6 Scale-dependent project symbology

Current project geometries are entirely polygons, so small footprints are sub-pixel at the default statewide extent (Round 1 feedback R1-08: small projects were invisible and familiar areas could look empty until zooming in). Each polygon project gets a low-zoom overview marker in addition to its true footprint:

- The marker sits at a guaranteed-interior "point on surface" of the polygon's largest part — the area centroid when it falls inside the shape, otherwise the midpoint of the widest interior scanline span — rather than a bounding-box or area centroid alone, either of which can land outside a concave or crescent footprint.
- The marker and the true polygon fill/outline cross-fade on a per-project schedule derived from the footprint's real-world size, so a large restoration polygon sheds its marker as soon as it is legible on screen while a small fish-passage or fish-screen project keeps its marker until much closer zoom. A fixed zoom threshold could not serve both well.
- A zoom-reactive on-map hint and a first-run overlay sentence (Section 12) tell users that points expand into mapped boundaries on zoom-in.

Implemented in `src/features/map/Map.tsx`. Fade timing constants are tunable (`CENTROID_FADE_TARGET_PX`, `CENTROID_FADE_MIN_START`, `CENTROID_FADE_SPAN_ZOOM`) and were set through visual iteration rather than a fixed formula; revisit them if the project dataset's size distribution changes materially.

---

## 8. URL state

URL state is a v1 requirement. Without it the dashboard cannot be used as a communication tool with the Science Committee, the regulator, or the press.

What gets encoded:

- Map center (lat, lng) and zoom.
- Active layers.
- Time window (if applicable).
- Selected feature ID.
- Active filters (project type, project stage, system, target species, lead entity).

**Prototype encoding (Decision 20):** all prototype state uses plain human-readable query parameters — no base64 blob. The implemented schema:

```
?lat=38.4000&lng=-121.8000&zoom=7.00   # map centre and zoom
&selected=project-3                     # display_id of selected feature (absent = none)
&hidden=spawning+habitat,tidal+habitat  # comma-separated hidden project types (absent = all visible)
&visibleTributaries=american,putah      # comma-separated visible HRL tributary watershed keys
&delta=1                                # Delta legal boundary visible (absent = hidden)
&yolobypass=1                           # Yolo Bypass boundary visible (absent = hidden)
&sutterbypass=1                         # Sutter Bypass boundary visible (absent = hidden)
&streams=0                              # stream-network layer hidden (absent = visible)
&basemap=imagery                        # imagery basemap selected (absent = map)
```

Implemented in `src/lib/url-state.ts`. Current project list search, system filter, and early-implementation filter are local UI state rather than URL-encoded state; encoding those filters remains a v1 hardening task. A `url-state.md` sub-spec would document the full encoding contract for future consumers (e.g., when filter arrays grow large enough to warrant a base64 blob).

---

## 9. Data model

### 9.1 Prototype project record

The current prototype record is `RestorationProjectSubmission` from `schemas/hrl/linkml/hrl_restoration_project.yaml`. It inherits the shared fields from `RestorationProjectRecord` and intentionally excludes program-assigned canonical fields such as `project_id` and `update_date`.

Required submission fields:

```yaml
project_name: string
project_description: string             # 500 character maximum
project_stage: list<ProjectStageEnum>
contact_name: string
contact_email: string
lead_entity: string
early_implementation: boolean
construction_start_year: integer        # 2018-2035
construction_completion_year: integer   # 2018-2040
estimated_budget: integer
funding_secured: integer
system: SystemEnum
project_type: list<ProjectTypeEnum>
target_species: list<TargetSpeciesEnum>
geometry: GeoJSON geometry              # from the GeoPackage geometry column
```

Optional submission fields:

```yaml
contractors: list<string>
construction_completion_year_comments: string
estimated_budget_comments: string
funding_gap: integer
funding_sources: list<string>
acreage: decimal
acreage_bypass_floodplain: decimal
acreage_fish_food: decimal
acreage_tributary_floodplain: decimal
acreage_tributary_rearing: decimal
acreage_tributary_spawning: decimal
acreage_tidal_wetland: decimal
```

Submission fields with `list<...>` values may arrive in the GeoPackage as semicolon-delimited strings and should be normalized into arrays during conversion to GeoJSON.

Frontend-only derived fields may be added to generated GeoJSON when useful, but they must be clearly derived from submission data. The current prototype keeps derived fields minimal:

```yaml
display_id: string                 # stable local slug or generated feature id for URL state
```

Do not require `project_id`, `update_date`, canonical funding-gap calculations, or other `RestorationProjectCanonicalRecord` fields until the validation/ingestion pipeline exists.

### 9.2 Map use of submission fields

Recommended map use:

- **Geometry:** Render project footprints or locations from the GeoPackage geometry column. Accept polygon, multipolygon, point, and multipoint inputs.
- **Primary labels:** Use `project_name`.
- **Symbology:** Use `project_type`. Because `project_type` is multivalued, derive a primary type for color/symbol assignment from the reported habitat-specific acreage fields: use the listed project type with the largest reported acreage, fall back to the first listed type when none of the listed types has type-specific acreage, and use fish passage or fish screen types as primary only when no listed acreage-bearing habitat type is available. Expose all types in details and filters.
- **Filters:** Start with `project_type`, `project_stage`, `system`, `target_species`, `early_implementation`, and construction year ranges.
- **Headline metrics:** Use `acreage` as the prototype total acreage metric where present. Habitat-specific acreage fields can support secondary metrics or breakdowns.
- **Hover tooltip:** Keep to `project_name`, primary `project_type`, `system`, and `acreage` if available.
- **Detail panel:** Include `project_name`, `project_description`, `lead_entity`, `project_stage` labeled as "Current project stage," `project_type`, `target_species`, `system`, anticipated construction years, acreage fields, and funding sources if appropriate. Preserve and display all submitted current-stage values where more than one is present.
- **Non-map interface:** Include the same searchable/filterable project records and detail fields needed to complete all essential map workflows.
- **Accessible downloads:** Provide public project downloads as GeoJSON, GeoPackage, and a tabular CSV export of non-geometry fields.

Fields that should not be publicly displayed in the prototype without explicit approval:

- `contact_name`
- `contact_email`
- `funding_secured`
- `funding_gap`
- `estimated_budget_comments`
- `construction_completion_year_comments`
- source submission metadata such as `source_slug`, `source_agency`, `submission_version`, `source_file`, and `source_feature_number`

The schema comments explicitly mark `funding_secured` and `funding_gap` as not publicly displayed. Contact fields are operational submission metadata and should be treated as internal unless a public-contact policy is decided.

### 9.3 Layer catalog (v1)

To be elaborated in a `layer-catalog.md` sub-spec. Minimum set:

- Project locations (one logical layer, styled by project type)
- HRL tributary watersheds — prototype uses a combined USGS WBD GeoJSON layer for Sacramento HUC4 1802 plus dissolved HUC8 boundaries for American, Feather, Yuba, Putah, Mokelumne, and Tuolumne systems, with individual layer controls and no on-map watershed labels (Decisions 43 and 44)
- Sacramento-San Joaquin Delta legal boundary — prototype uses the DWR `i03_LegalDeltaBoundary` ArcGIS service, default hidden (Decision 25)
- Yolo and Sutter bypass boundaries — prototype uses the DWR `i12_Flood_Bypasses_2014` ArcGIS service for representational flood-bypass extents, default hidden (Decision 31)
- Stream network — prototype uses NHDPlus V2 VPU 18 flowlines and water polygons tiled to PMTiles, default visible, with line-following labels for named mainstems and major tributaries (Decision 26)
- Basemap (hydrography, terrain, administrative reference, optional imagery)

Additional layers under consideration (see Open Questions): administrative boundaries (county, water district, fish management zone).

### 9.4 Prototype data origin

Current prototype data starts from a local GeoPackage committed to or placed inside this repo. The browser should not read the GeoPackage directly. Instead, add a script that converts the GeoPackage into static browser-readable data before the app runs.

The current machine-readable data contract is the vendored LinkML schema at `schemas/hrl/linkml/hrl_restoration_project.yaml`, copied from `lucy-dwr/hrl-restoration-schema` release `v1.0.0`. The prototype works with the `RestorationProjectSubmission` class. The `RestorationProjectCanonicalRecord` class describes a future validated/standardized dataset with program-assigned fields, but the Azure pipeline that produces that dataset does not exist yet.

Recommended prototype path:

1. Store the source GeoPackage under `data/source/`.
2. Convert it into `public/data/hrl_restoration_projects.geojson`,
   `public/data/hrl_restoration_projects.gpkg`, and
   `public/data/hrl_restoration_projects.csv`.
3. Normalize and validate project properties against `RestorationProjectSubmission` during conversion.
4. Generate small context boundaries as GeoJSON under `public/data/`.
5. Generate large context layers, such as the stream network, as PMTiles under `public/data/`.
6. Keep generated data reproducible from source data plus the vendored schema.

GeoJSON is the simplest representation for small vector features because MapLibre can read it directly and it is easy to inspect. Vector tiles are the preferred representation when feature count, geometry complexity, or load time justify them; the prototype stream-network layer uses PMTiles for this reason.

### 9.5 Production data origin

In the production target, dashboard data are snapshots produced by `hrl-data-infrastructure` pipelines and published to the Storage and Serving layer (Azure Blob). The dashboard should not read from primary sources directly. Vector tile generation via tippecanoe or equivalent is expected to become a data-infrastructure responsibility once the production data contract exists.

Data refresh cadence: TBD (see Open Questions). Likely nightly for v1.

---

## 10. Technical stack

### 10.1 Decisions

- **Framework:** React with Vite. Static SPA, no server runtime.
- **Language:** TypeScript. Strict mode enabled.
- **Map rendering:** MapLibre GL JS (open-source, no API key, fork of Mapbox GL JS pre-license-change).
- **Heavy/analytical layers:** deck.gl, composed with MapLibre.
- **Prototype data:** Local GeoPackage validated against the vendored LinkML `RestorationProjectSubmission` schema and converted to static GeoJSON for project features; large context layers may use generated PMTiles.
- **Production tile hosting:** Protomaps tiles on Azure Blob.
- **Styling:** CSS modules or vanilla-extract; no runtime CSS-in-JS. Design tokens in CSS custom properties.
- **State management:** Start with React context plus URL-as-source-of-truth via a small router. Escalate to Zustand if state complexity warrants. Do not reach for Redux.
- **Charts:** Observable Plot or Recharts for v1; revisit if performance requires.
- **Testing:** Vitest for unit; Playwright for end-to-end on the critical paths (load, select, share URL).
- **Linting / formatting:** ESLint + Prettier with a shared config.
- **Package manager:** pnpm.
- **Prototype hosting:** Local Vite dev server.
- **Production hosting:** Azure Blob static website. Optional Azure Front Door or Cloudflare in front for caching and HTTPS.

### 10.2 Why not other options

- **Esri / ArcGIS Online viewers.** Visual quality and UX do not meet the bar. Vendor lock-in conflicts with the program's no-lock-in desires.
- **R-based stacks (Shiny, Quarto with R).** Excluded by maintainer preference.
- **Streamlit / Dash / Panel.** Cannot easily match the visual quality required for a public + regulator audience.
- **Observable Framework.** Strong fit considered; the team is choosing React/Vite to invest in the long-term stack and not pay a migration cost in Year 2 or 3.
- **Quarto Dashboards.** Layout primitives ("panel of charts") do not fit a map-first, full-bleed layout.

---

## 11. Integration with `hrl-data-infrastructure`

The production dashboard is downstream of the four-layer data architecture and reads only from the Storage and Serving layer.

For the current prototype, that infrastructure is not available. Use the local GeoPackage workflow in Section 9.4 instead.

- The production dashboard does not run data-infrastructure pipelines.
- The dashboard does not write project data.
- The production dashboard's build step pulls a versioned snapshot manifest from Azure Blob and resolves the URIs of the latest published datasets.
- Each released production version of the dashboard pins to a snapshot manifest version, so a deployed dashboard is reproducible.

The exact contract between the two repos lives in a `data-contract.md` sub-spec, owned jointly by both repos.

---

## 12. First-run experience

- The dashboard loads with the project-locations layer visible, headline tiles populated, and, when no shared URL state is present, the map auto-fit to the bounds of all currently visible projects (capped at zoom 9). A shared URL's exact centre and zoom are honoured instead of being overridden by this auto-fit.
- Because most projects still render as low-zoom overview markers at that initial extent (see Section 7.6), a zoom-reactive on-map hint reads "Projects shown as points — zoom in to see boundaries" while it is true, and disappears once footprints have resolved.
- The prototype implements a first-visit overlay, dismissable and remembered via local storage, that frames the dashboard as a public overview of early implementation and proposed Healthy Rivers and Landscapes restoration project locations. The overlay states that the dashboard shows basic descriptions, project types, and total project acres where available, that it is not a verified habitat-accounting tool, and that projects shown as points expand into their mapped boundaries on zoom-in.
- The top bar carries persistent compact purpose text: "Explore early implementation and proposed restoration project locations and basic descriptions." The About control is labeled "About this map" for discoverability.
- The top bar includes a Methodology control. The methodology surface describes the whole-dataset provenance story: project information was submitted by HRL participating entities, checked against the HRL restoration project schema, last updated June 19, 2026, and published as dashboard data/downloads without exposing project-level source fields.
- No tour or guided walkthrough in v1 (defer to near-future).

---

## 13. Accessibility, performance, internationalization

- **Accessibility target:** This product will be designed to exceed minimum compliance and manifest disability access as a core public-service requirement. The application must conform to WCAG 2.2 Level AA and should meet selected WCAG 2.2 Level AAA criteria where applicable, especially for contrast, readability, instructions, help, and cognitive accessibility.
- **Interface accessibility:** All custom interface components must use native HTML controls where possible or follow WAI-ARIA Authoring Practices. All interactive elements must be keyboard-reachable and screen-reader-labeled.
- **Non-map equivalent:** Because the product is an interactive mapping application, all essential map content and workflows must also be available through an equivalent keyboard-accessible, screen-reader-readable, non-map interface, including searchable/filterable project lists, project detail views, summary statistics, and accessible data downloads.
- **Prototype non-map equivalent status:** The current prototype includes a searchable/filterable Projects tab, list-driven selection, fit-to-visible-projects, zoom-to-project actions, and public data downloads. A fuller assistive-technology audit remains pending.
- **No visual-only essentials:** No essential information may be conveyed only through color, hover, spatial position, pointer interaction, animation, or visual interpretation of the map.
- **Performance budgets (initial):**
  - Time-to-interactive on a recent laptop on broadband: <3s.
  - Initial JS bundle (gzipped): <300KB.
  - Total transferred bytes on first load: <2MB excluding map tiles.
- **Internationalization:** English only in v1. Spanish support is a near-future candidate; design copy and component structure should not preclude it.

---

## 14. Implementation conventions

The implementation conventions for contributors and coding agents live in [`AGENTS.md`](AGENTS.md). That file covers repository layout, coding style, and prototype data workflow.

This spec records the decisions those conventions must support; `AGENTS.md` explains how to apply them while working in the repo.

---

## 15. Reference dashboards

Annotated list. Use these as design and behavior references during implementation.

- **[Cal-Adapt climate metrics map](https://cal-adapt.org/dashboard/climate-metrics-map?metric=extreme-precipitation)** — parameter-picker onboarding pattern; restrained palette; clear methodology link.
- **[Global Forest Watch map](https://www.globalforestwatch.org/map/)** — gold standard for the GFW-style full-bleed map with floating panels, layer rail, and country-level dashboards. Built by Vizzuality on Mapbox GL + React. Note the URL-state-as-base64 pattern, which we will partially borrow.
- **[Mongabay maps](https://maps.mongabay.com/)** — clean topical mapping; useful for "topic dashboard" composition.
- **[Half-Earth Project (data globe)](https://map.half-earthproject.org/dataGlobe)** — chapter-based storytelling integrated with a map. Reference for the near-future storytelling work.
- **[Resource Watch (explore)](https://resourcewatch.org/data/explore)** — Vizzuality / WRI again. Reference for multi-topic dashboard organization.
- **Kepler.gl demos ([MVT population](https://kepler.gl/demo/mvt_population), [earthquakes](https://kepler.gl/demo/earthquakes))** — reference for time-playback, brushing, and layer-config UI. Prototyping tool only, not runtime.
- **[NYT 2020 election map (Upshot)](https://www.nytimes.com/interactive/2021/upshot/2020-election-map.html)** — reference for hover-cheap, click-rich interaction and coordinated map + chart views.

---

## 16. Sub-specs to write

Each of these can become a standalone spec file when the project needs more detail. Order roughly reflects priority.

1. `palette.md` — basemap and data palette with hex values and colour vision deficiency rationale. (Prototype palette is in `src/features/map/project-colors.ts`; this sub-spec would formalise it.)
2. `project-stage.md` — confirmed `ProjectStageEnum` visual treatment.
3. `layer-catalog.md` — every layer with source, schema, default state, and symbology.
4. `url-state.md` — full encoding contract for future consumers. (Prototype implementation is in `src/lib/url-state.ts` and documented in Section 8.)
5. `data-contract.md` — joint contract with `hrl-data-infrastructure` for snapshot publication and consumption.
6. `data-model.md` — full project record schema and any companion tables.
7. `tiles-and-metrics.md` — exact headline tiles, their definitions, and their calculation.
8. `first-run.md` — copy and layout for the orientation overlay.
9. `accessibility.md` — WCAG conformance plan, known gaps, and remediation roadmap for the non-map project list view.
10. `testing.md` — what to test, at what level, and the critical paths for end-to-end coverage.

---

## 17. Open questions

These do not block v1 scaffolding but must be resolved before v1 ship.

- **Formal visual identity.** The prototype uses a light-touch HRL-inspired palette, but production still needs a decision on logo use and any formal multi-agency brand requirements.
- **Project-stage display beyond details.** The detail panel displays all `ProjectStageEnum` values as current project stage. How should multivalued stage values be summarized for symbology, filters, and headline tiles?
- **Data refresh cadence.** Proposed: nightly. Confirm with `hrl-data-infrastructure` plans.
- **Hosting domain.** Subdomain of an existing DWR or HRL domain, or a new domain? Affects DNS, SSL, and link strategy from partner sites.
- **Photo / media policy.** Project records may include photos at some point (process and management to be determined). What is the rights and consent process for displaying them publicly?
- **Spanish-language support timing.** Year 1 stretch goal, or deferred?
- **Analytics.** Do we instrument the dashboard for usage metrics? If so, what tool (Plausible, Matomo, none)? State-agency privacy constraints apply.
- **Additional boundary and reference layers.** Which administrative boundaries are useful (county, water district, fish management zone, etc.)? These decisions belong in the `layer-catalog.md` sub-spec.
- **Imagery basemap source for production.** The prototype offers Esri World Imagery as a toggle. Confirm whether that source is appropriate under state-agency constraints for production, or whether open NAIP tiles or another source should replace it.

---

## 18. Decision log

A canonical, append-only record of settled decisions. Add new entries at the bottom; do not edit historical entries (note supersession in a new entry instead).

| # | Date | Decision | Rationale |
|---|------|----------|-----------|
| 1 | v0.1 | Map-first, full-bleed layout with chrome as overlay. | Matches every reference dashboard in the set. The opposite ("map as one tile among many") is the failure mode of agency portals. |
| 2 | v0.1 | Restrained basemap, saturated data layers. | Single largest visual-quality lever; the failure mode of Esri viewers. |
| 3 | v0.1 | Four-tier progressive disclosure (ambient, browsing, inspection, deep dive). | Forces scope discipline; every piece of content must be assigned a tier. |
| 4 | v0.1 | Coordinated views (map + tiles + charts share state). | Architectural commitment, not a stretch goal — drives framework and state-management choices. |
| 5 | v0.1 | URL-encoded state is v1, not deferred. | Without it the dashboard is not shareable with the Science Committee, regulator, or press. |
| 6 | v0.1 | Stack: React + Vite + TypeScript + MapLibre GL JS + deck.gl. | Open source; matches reference dashboards; largest hiring pool; long-term maintainable over the eight-year horizon. |
| 7 | v0.1 | Kepler.gl is reference and prototyping tool only, not runtime. | Kepler's UX is analyst-facing; embedding it would conflict with the public/regulator audience design. |
| 8 | v0.1 | Production tiles served from Azure Blob via Protomaps. | Uses existing Azure substrate; avoids per-request tile fees and external vendor dependency. |
| 9 | v0.1 | Prototype hero metric uses total project acreage where available. | The submission schema provides `acreage` and habitat-specific acreage fields, but not verified acres restored; production metrics can evolve once canonical data exist. |
| 10 | v0.1 | Project types in v1 scope follow `ProjectTypeEnum` in the vendored LinkML schema. | Keeps dashboard filters and symbology aligned with the submission data contract. |
| 11 | v0.1 | Static deploy; no server runtime. | Matches eight-year, no-lock-in, low-ops posture. |
| 12 | v0.1 | English-only in v1; Spanish considered for near-future. | Scope discipline for 3–6 month timeline; do not preclude i18n in component design. |
| 13 | v0.1 | No user accounts or authentication in v1. | Out of scope. |
| 14 | v0.1 | Production dashboard reads only from `hrl-data-infrastructure` Storage and Serving layer; never from primary sources. | Preserves the four-layer architecture and the immutability of raw data. |
| 15 | v0.1 | Current repo phase is a local prototype using a local GeoPackage converted to browser-readable static data. | Azure hosting and the production data-serving contract are not available yet; the prototype needs a practical local path. |
| 16 | v0.1 | Convert the GeoPackage to GeoJSON first, then move to vector tiles only if performance requires it. | GeoJSON is easiest to inspect and wire into MapLibre; vector tiles add complexity that should be justified by dataset size or rendering performance. |
| 17 | v0.1 | Prototype validation uses the vendored `hrl-restoration-schema` `v1.0.0` LinkML schema and the `RestorationProjectSubmission` class. | The full Azure pipeline that creates canonical records is not available yet; submission fields are the current practical contract. |
| 18 | v0.1 | Accessibility target is WCAG 2.2 Level AA, selected WCAG 2.2 Level AAA criteria where applicable, and equivalent non-map access to essential map content and workflows. | Disability access is a core public-service requirement, not a minimum-compliance afterthought. |
| 19 | 2026-06-02 | Prototype basemap: OpenFreeMap Positron style (`https://tiles.openfreemap.org/styles/positron`). | Freely accessible, no API key required, desaturated light style that recedes behind data layers. Production target remains Protomaps on Azure Blob (Decision 8). |
| 20 | 2026-06-02 | URL state uses plain query parameters for all prototype state; base64 encoding deferred. | All prototype state (centre, zoom, selection, hidden types, watershed visibility) is low-cardinality; human-readable params suffice and are easier to debug and share. |
| 21 | 2026-06-02 | Sacramento watershed boundary sourced from USGS WBD REST service (HUC4 1802), simplified with Ramer-Douglas-Peucker (ε = 0.002°) to ~1800 points / 38 KB, and committed to `public/data/watershed.geojson`. | USGS WBD is the authoritative federal source; simplification makes it browser-feasible. Reproducible via `scripts/fetch-watershed.py`. Superseded by Decision 28's clearer filename. |
| 22 | 2026-06-02 | Headline tiles positioned at bottom-centre of the map area. | Avoids overlap with the left layer panel and the bottom-right MapLibre navigation controls; readable on wide screens. |
| 23 | 2026-06-02 | Minimum `--text-tertiary` colour is `#767673` (~4.6:1 on white). | Original value `#888884` (~3.6:1) failed the WCAG 2.2 AA 4.5:1 threshold for normal-sized text. The new value clears the threshold while preserving the warm neutral character of the palette. |
| 24 | 2026-06-19 | Prototype watershed context includes both Sacramento HUC4 1802 and San Joaquin HUC4 1804 boundaries from USGS WBD. | HRL project geography spans the Sacramento watershed and Bay-Delta context; the San Joaquin outline improves regional orientation without adding much data weight. |
| 25 | 2026-06-19 | Prototype includes the Sacramento-San Joaquin Delta legal boundary from the DWR `i03_LegalDeltaBoundary` ArcGIS service, default hidden. | The Delta is a key program geography, but the legal boundary is reference context rather than an ambient default layer. |
| 26 | 2026-06-19 | Prototype stream-network base layer is generated from NHDPlus V2 VPU 18 and shipped as `public/data/streams.pmtiles`, with zoom-dependent reveal by Strahler stream order. | NHDPlus V2 provides statewide California flow-network attributes needed for scale-aware rendering; PMTiles keeps the large hydrography layer browser-feasible. |
| 27 | 2026-06-19 | Prototype offers an optional Esri World Imagery basemap toggle while keeping the subdued OpenFreeMap map basemap as default. | Imagery helps users inspect real landscape context for selected areas, but the quieter map basemap remains better for first-load program communication. |
| 28 | 2026-06-19 | Sacramento watershed data and code identifiers use explicit Sacramento naming: `public/data/sacramento-watershed.geojson`, `sacramento-watershed` map source/layers, and `sacramento=0` URL state. | Adding the San Joaquin watershed made the previous generic `watershed` names ambiguous; parallel naming keeps the two HUC4 context layers clear. |
| 29 | 2026-06-19 | Prototype light basemap includes MapLibre-rendered DEM hillshade terrain context. | Terrain makes watershed structure legible without switching to a noisy topographic basemap; rendering from DEM tiles avoids the fuzzy appearance of low-resolution relief imagery. |
| 30 | 2026-06-19 | Prototype left rail includes a Projects tab with search, system and early-implementation filters, list-driven selection, zoom-to-project, and fit-to-visible-projects. | The dashboard needs a non-map browsing path before the project dataset grows; coordinating list, map, and headline tiles over one filtered project set keeps the experience coherent. |
| 31 | 2026-06-19 | Prototype includes optional Yolo and Sutter bypass boundary context layers from the DWR `i12_Flood_Bypasses_2014` service, written to `public/data/yolo-bypass-boundary.geojson` and `public/data/sutter-bypass-boundary.geojson`. | These flood bypasses are highly relevant HRL floodplain context. The DWR layer is purpose-built for flood-bypass map display, but is representational rather than legal, so the layers default hidden and are labeled as context boundaries. |
| 32 | 2026-06-19 | Prototype watershed context replaces the San Joaquin HUC4 1804 boundary with Mokelumne HUC8 18040012 and Tuolumne HUC8 18040009 boundaries from USGS WBD, while retaining Sacramento HUC4 1802. | The finer HUC8 units provide more useful project-area context than the broad San Joaquin HUC4 outline. USGS WBD is still the authoritative source, and the new layers remain reproducible through `scripts/fetch-watershed.py`. Supersedes Decision 24 for the San Joaquin boundary layer. |
| 33 | 2026-06-19 | Watershed boundaries are simplified with Ramer-Douglas-Peucker ε = 0.0007° and written with 5-decimal coordinate precision. | The earlier ε = 0.002° / 4-decimal output made the HUC outlines visibly jagged against the terrain basemap. The smaller tolerance preserves smoother watershed shape while keeping the three GeoJSON context files browser-feasible. Supersedes the simplification tolerance recorded in Decision 21. |
| 34 | 2026-06-19 | The prototype top bar uses the full name "Healthy Rivers and Landscapes Restoration Dashboard" and exposes a concise About popup instead of a separate About page. | The full name is clearer for public and regulator audiences than the HRL abbreviation alone. A compact modal provides immediate program and data-context orientation without pulling users out of the map; a fuller methodology surface remains a production requirement. |
| 35 | 2026-07-09 | The dashboard exposes dataset-level methodology and provenance context rather than project-level source fields. | The current approved public provenance story is that HRL participating entities submitted the project data, the dataset was checked against the HRL restoration project schema, and the last dataset update shown is June 19, 2026. Project-level source fields are not displayed; questions route to HealthyRiversandLandscapes@resources.ca.gov. |
| 35 | 2026-06-19 | Prototype visual styling uses a light-touch palette inspired by the public HRL site, with deep teal as the primary UI accent and blue-grey hydrography for the stream network. | The palette gives the dashboard HRL identity without overpowering project symbology. Blue-grey stream styling keeps hydrography legible as contextual base information and avoids visual competition with watershed outlines and project colours. |
| 36 | 2026-06-22 | Public project data outputs use `public/data/hrl_restoration_projects.*` filenames and are exposed through a top-bar Download data menu as GeoJSON, GeoPackage, and CSV. | Descriptive filenames are clearer than generic `projects.*` downloads, and providing GIS plus non-spatial formats makes prototype review and data QA easier without requiring production data infrastructure. |
| 37 | 2026-06-22 | Structured beta testing is documented in `beta-testing/README.md` and collected through an external form shared by email, not through an in-app feedback button or frontend persistence. | The first review round needs actionable, task-based feedback without adding backend scope or cluttering the map UI. Keeping the process in-repo makes the review protocol versioned alongside development. |
| 38 | 2026-07-08 | Prototype acreage UI labels use "submitted habitat acreage" rather than generic "acres." | The vendored submission schema defines `acreage` as total project acreage restored as habitat and says each acre should be counted once; habitat-specific acreage fields are submitted values anticipated to be verified through the HRL accounting process, not verified canonical accounting outcomes. |
| 39 | 2026-07-08 | Prototype acreage UI labels use "total project acres" for compact display, superseding Decision 38's "submitted habitat acreage" wording. | "Total project acres" aligns more closely with the schema title "Total project acreage" while avoiding dense or overly technical labels in the map tiles, tooltips, project list, and detail panel. Short helper text carries the counted-once caveat where space allows. |
| 40 | 2026-07-09 | Prototype first-run and About copy describe the mapped records as "early implementation and proposed" restoration projects and explicitly frame the dashboard as a public, regulator, and partner agency overview, not verified habitat accounting. | Round 1 reviewers showed mixed purpose clarity and some read the dashboard as an internal tracking or accounting tool. The chosen wording improves first-load orientation while avoiding unapproved Bay-Delta Update / Plan of Implementation policy language. |
| 41 | 2026-07-09 | Prototype detail-panel UI labels `project_stage` as "Current project stage" and displays all reported stage values. | The field is intended to represent current project stage. Showing all values avoids hiding multivalued records without adding a derived summary status or extra explanatory chrome to the detail pane. |
| 42 | 2026-07-09 | Prototype project fill color uses a derived primary project type based on the largest reported habitat-specific acreage among listed project types, falling back to the first listed type when no listed type has type-specific acreage. | Multivalued `project_type` records need one color, but list order alone is not a defensible primary-type rule. Fish passage and fish screen types have no habitat-specific acreage fields and should only drive primary color when no listed acreage-bearing habitat type is available. Filters and detail displays still use all submitted project types. |
| 43 | 2026-07-09 | Prototype watershed context is scoped as HRL tributary watersheds, using one combined `public/data/hrl-tributary-watersheds.geojson` source with individual controls for Sacramento, American, Feather, Yuba, Putah, Mokelumne, and Tuolumne systems. Named systems represented by multiple WBD HUC8 features are dissolved to one feature per tributary watershed. | Round 1 reviewers wanted to inspect and orient to individual tributary watersheds. A combined source keeps map code simple, while per-system controls preserve named watershed identity. Dissolving HUC8 pieces prevents internal subwatershed boundaries from reading as separate watershed outlines. Sacramento remains included because the Sacramento mainstem is an HRL tributary. Delta and bypass geographies remain separate context boundary layers rather than being forced into the tributary watershed group. |
| 44 | 2026-07-09 | HRL tributary watershed names are exposed through the layer controls and methodology text, not as on-map watershed labels. | The Sacramento River watershed is a higher-level parent geography for much of the HRL area, so an on-map label can appear to identify other local tributary watersheds at closer zooms. Removing watershed text labels avoids misleading local interpretation while keeping the boundaries available for spatial orientation. |
| 45 | 2026-07-09 | Boundary context layers default OFF on initial launch, including HRL tributary watersheds, the Delta legal boundary, and Yolo/Sutter bypass boundaries. HRL tributary watershed URL state is encoded as `visibleTributaries`, where an absent parameter means no tributary watershed boundaries are visible. | Boundary context is useful for inspection, but showing all boundary layers on first load competes with project locations, streams, and terrain. Default-off boundaries keep the ambient map simpler while preserving explicit opt-in controls for users who want watershed or reference-boundary context. |
| 46 | 2026-07-09 | Polygon projects render as low-zoom overview point markers below a per-project, footprint-size-based fade threshold, cross-fading into the true polygon fill/outline as the footprint becomes legible. Marker placement uses a guaranteed-interior "point on surface" (area centroid if interior, otherwise the widest interior scanline midpoint) rather than a bounding-box or area centroid alone. | Round 1 feedback (R1-08) found small projects invisible at the default statewide extent, making project distribution look sparser than it is. A single fixed low-zoom polygon style could not serve both large and small footprints well, so fade timing is derived per project from footprint size. Bounding-box and unconstrained area centroids can fall outside concave or crescent polygons (e.g. L-shaped bypass footprints), which would misplace a project's marker outside its own boundary. |
| 47 | 2026-07-09 | On initial load without shared URL state, the map auto-fits to the bounds of all currently visible projects (max zoom 9) instead of a fixed default extent; a shared URL's exact centre and zoom are honoured instead of being overridden by auto-fit. A zoom-reactive on-map hint and a first-run overlay sentence tell users that low-zoom points expand into mapped boundaries on zoom-in. | A data-driven initial extent serves the current and future project footprint better than a fixed frame, while preserving exact shared-URL views for communication use cases (Decision 5, Section 8). Because most projects still render as overview markers (Decision 46) at that extent, users need an explicit, self-removing cue that zooming in reveals true boundaries. |
| 48 | 2026-07-13 | The dashboard links to official CNRA and State Water Resources Control Board pages for HRL program and Bay-Delta Water Quality Control Plan context, rather than maintaining original Plan of Implementation or Bay-Delta Update explanatory text in the app. | HRL Habitat Team discussion identified the CNRA HRL website and SWRCB Bay-Delta pages as the maintained sources for this policy and regulatory context. Linking from the About and methodology surfaces addresses Round 1 feedback R1-20 while avoiding duplicate or stale policy language in the dashboard. |
| 49 | 2026-07-13 | Public UI labels use "project acres" or compact "total project acres" for acreage values, with help text explaining that the values are reported by HRL participating entities for public orientation and are not final HRL habitat accounting acres. | This keeps visible labels plain and confident while avoiding the procedural ambiguity of "submitted" in compact UI. The methodology surface can still explain provenance and validation separately. |
| 50 | 2026-07-13 | Acreage caveats appear as targeted inline help on the headline acreage tile, project detail acreage heading, and habitat-type acreage breakdown rather than in every compact map or project-list context. | Inline help addresses Round 1 acreage confusion where users are most likely to infer accounting meaning, while keeping the map, tooltip, and project list readable and non-defensive. |
