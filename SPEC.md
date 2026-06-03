# HRL Dashboard — Specification

**Status:** v0.1 draft  
**Working repo name:** `hrl-restoration-map-prototype`  
**Related repos:**

- `hrl-data-infrastructure` — pipelines, storage, and publication architecture at `lucy-dwr.github.io/hrl-data-infrastructure`
- `hrl-docs` — companion documentation site at `lucy-dwr.github.io/hrl-docs`

---

## 0. How to use this document

This is the source of truth for product, design, data, and engineering decisions on the HRL Dashboard. It is written for the HRL data team, partner agencies, contributors, and reviewers who need to understand what the dashboard is meant to be.

The Decision Log at the end is the canonical record of what is settled. Do not reverse a logged decision without recording a superseding decision.

This document is intentionally an umbrella spec. It points to future sub-specs (see Section 16) that will be elaborated as work progresses. Repository workflow, coding-agent instructions, and contribution mechanics live in [`AGENTS.md`](AGENTS.md).

This repo is currently a **local prototype**, not the production dashboard. The production architecture described here is the target direction, but Azure hosting, published snapshot manifests, and the full `hrl-data-infrastructure` serving contract are not set up yet. Current development should run locally from data and generated assets stored in this repo.

---

## 1. Purpose

The HRL Dashboard is the public-facing surface of the Healthy Rivers and Landscapes (HRL) Science Program. Its job is to:

1. **Make the work feel real.** A map-first interface that shows where HRL restoration projects are happening, so partners, the regulator, and the public can see the program as a tangible thing in the world rather than as a set of documents.
2. **Show progress at a high level.** Headline metrics that communicate what the program is achieving without requiring the visitor to read a report. The current prototype uses submitted project acreage where available; the production target can evolve toward verified acres restored or under restoration once canonical data are available.
3. **Provide a foundation for future capability.** The dashboard is expected to evolve over the eight-year program horizon to incorporate (a) narrative storytelling about specific projects and watersheds, and (b) science, monitoring, and adaptive-management views derived from the HRL data infrastructure.

The dashboard is not a research tool and not an analyst exploration environment.

---

## 2. Audiences

Three audiences, in priority order of design weight:

1. **HRL program agencies** — technically literate, want to see their projects represented accurately, will use the dashboard to communicate to their own leadership and partners.
2. **State Water Resources Control Board (regulator)** — needs to see credible, defensible evidence of program commitments and progress. 
3. **General public** — generally non-technical. Needs an immediate sense of "what is this program and what has it done?" Will likely not read documentation.

Design implication: the dashboard must be visually polished enough for the public, technically credible enough for the regulator, and accurate enough for the partner agencies — in that order of what is hardest to get right.

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
- Headline progress tiles, anchored in the prototype by submitted project acreage where available.
- Click-to-inspect for any project (project name, type, project stage, lead entity, system, acreage where available).
- Layer toggling for project types and (at minimum) one administrative boundary layer.
- URL-encoded state (center, zoom, active layers, selected project, time range if applicable).
- "Download data" affordances linking back to canonical datasets in the HRL data infrastructure.
- Methodology link / "About this dashboard" page.
- Accessibility: WCAG 2.2 Level AA conformance, with selected WCAG 2.2 Level AAA criteria where applicable.
- Static deploy to Azure Blob.

### 3.3 Potential future features

- Time-aware layers (project start, completion, monitoring milestones).
- Watershed summary views.
- Optional monitoring data overlays (water quality, fish, vegetation) where data are available and approved for public display.
- Scrollytelling chapter(s) — one or two flagship project narratives.
- Search (project name, watershed, agency).
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
- **Top bar.** Thin (≈48px). HRL identity left, search and "About" links right. No primary navigation lives here.
- **Left rail.** ≈360px, collapsible. Layer toggles, filters, legend. Default-open on desktop, default-collapsed on mobile.
- **Bottom tile strip OR top-right tile cluster.** Headline progress tiles (prototype total acreage where available is the hero; supporting tiles for project count and project-stage breakdown). Position to be confirmed against early mockups — bottom strip reads better on wide screens, top-right reads better on tall screens.
- **Right detail panel.** ≈400px, opens on selection, closes on dismiss. Renders project detail (tier 3). Pushes the map left rather than overlaying it on desktop; overlays on mobile.
- **No persistent footer.** Footer information lives in the About page.

Responsive breakpoints (initial proposal):

- ≥1280px: full layout as described.
- 768–1279px: left rail collapses to icon strip; tiles move to top of left rail when expanded.
- <768px: bottom-sheet pattern for layer controls; tiles in a horizontally scrolling strip below the top bar; detail panel becomes a bottom sheet.

---

## 6. Visual system

### 6.1 Basemap

Custom MapLibre style. Desaturated, low-contrast, designed to recede behind data layers. Two variants:

- **Light** (default) — warm pale base, muted hydrography, restrained labels.
- **Dark** — optional, deferred to near-future if there is demand.

Prototype tile source: use a simple MapLibre-compatible basemap that works locally without Azure setup. Production target: Protomaps tiles served from Azure Blob, which fits the Azure-Blob-as-substrate decision and avoids per-request tile fees.

### 6.2 Data palette

- Project-type colors for `ProjectTypeEnum` values, chosen for hue separation at typical zoom, and re-tested for color-vision deficiency (deuteranopia and protanopia).
- One sequential ramp for any quantitative overlay (e.g., acres).
- One diverging ramp reserved for any future change-over-time layer.
- Reserved colors: a single accent for selection state and a single muted gray for "out of scope" features.

To be defined in a `palette.md` sub-spec with hex values and rationale.

### 6.3 Typography

- One open-source sans-serif typeface for the entire UI. Recommended candidates (decide in design review): Inter, IBM Plex Sans, or Source Sans 3.
- Type scale: 4–5 sizes, defined in a single CSS custom property block. No ad-hoc font sizes in components.
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
- Project-type layers default ON; administrative-boundary layers default OFF (except a single light watershed boundary).
- Layer order is fixed and not user-configurable in v1 (defer drag-to-reorder).

---

## 8. URL state

URL state is a v1 requirement. Without it the dashboard cannot be used as a communication tool with the Science Committee, the regulator, or the press.

What gets encoded:

- Map center (lat, lng) and zoom.
- Active layers.
- Time window (if applicable).
- Selected feature ID.
- Active filters (project type, project stage, system, target species, lead entity).

Encoding approach to be confirmed in a `url-state.md` sub-spec. Initial preference: human-readable query params for low-cardinality state (e.g., `?layers=tidal,riparian&type=wetland`) and a single base64-encoded blob for high-cardinality state (e.g., bbox, filter arrays). Avoid an opaque single-blob approach for everything.

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

Frontend-only derived fields may be added to generated GeoJSON when useful, but they must be clearly derived from submission data. Useful prototype derivations include:

```yaml
display_id: string                 # stable local slug or generated feature id for URL state
display_name: string               # usually project_name
display_acreage: decimal | null    # acreage when present, otherwise null
display_stage: string              # concise label derived from project_stage
```

Do not require `project_id`, `update_date`, canonical funding-gap calculations, or other `RestorationProjectCanonicalRecord` fields until the validation/ingestion pipeline exists.

### 9.2 Map use of submission fields

Recommended map use:

- **Geometry:** Render project footprints or locations from the GeoPackage geometry column. Accept polygon, multipolygon, point, and multipoint inputs.
- **Primary labels:** Use `project_name`.
- **Symbology:** Use `project_type`. Because `project_type` is multivalued, choose a documented primary type for color/symbol assignment and expose all types in details and filters.
- **Filters:** Start with `project_type`, `project_stage`, `system`, `target_species`, `early_implementation`, and construction year ranges.
- **Headline metrics:** Use `acreage` as the prototype total acreage metric where present. Habitat-specific acreage fields can support secondary metrics or breakdowns.
- **Hover tooltip:** Keep to `project_name`, primary `project_type`, `system`, and `acreage` if available.
- **Detail panel:** Include `project_name`, `project_description`, `lead_entity`, `project_stage`, `project_type`, `target_species`, `system`, construction years, acreage fields, funding sources if appropriate, and comments fields where they help interpretation.
- **Non-map interface:** Include the same searchable/filterable project records and detail fields needed to complete all essential map workflows.
- **Accessible downloads:** Provide the generated GeoJSON and, when appropriate, a tabular CSV export of non-geometry fields.

Fields that should not be publicly displayed in the prototype without explicit approval:

- `contact_name`
- `contact_email`
- `funding_secured`
- `funding_gap`

The schema comments explicitly mark `funding_secured` and `funding_gap` as not publicly displayed. Contact fields are operational submission metadata and should be treated as internal unless a public-contact policy is decided.

### 9.3 Layer catalog (v1)

To be elaborated in a `layer-catalog.md` sub-spec. Minimum set:

- Project locations (one logical layer, styled by project type)
- Watershed boundary (single layer, default light styling)
- Basemap (hydrography, terrain, administrative reference)

### 9.4 Prototype data origin

Current prototype data starts from a local GeoPackage committed to or placed inside this repo. The browser should not read the GeoPackage directly. Instead, add a script that converts the GeoPackage into static browser-readable data before the app runs.

The current machine-readable data contract is the vendored LinkML schema at `schemas/hrl/linkml/hrl_restoration_project.yaml`, copied from `lucy-dwr/hrl-restoration-schema` release `v1.0.0`. The prototype works with the `RestorationProjectSubmission` class. The `RestorationProjectCanonicalRecord` class describes a future validated/standardized dataset with program-assigned fields, but the Azure pipeline that produces that dataset does not exist yet.

Recommended prototype path:

1. Store the source GeoPackage under `data/source/`.
2. Convert it into `public/data/projects.geojson` for the first prototype.
3. If the dataset becomes too large for smooth browser loading, convert it to vector tiles under `public/tiles/` instead.
4. Normalize and validate properties against `RestorationProjectSubmission` during conversion.
5. Keep generated data reproducible from the GeoPackage plus the vendored schema.

GeoJSON is the simplest first representation because MapLibre can read it directly and it is easy to inspect. Vector tiles are the next step when feature count, geometry complexity, or load time justify them.

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
- **Prototype data:** Local GeoPackage validated against the vendored LinkML `RestorationProjectSubmission` schema and converted to static GeoJSON first; vector tiles only if needed for performance.
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

- The dashboard loads with the project-locations layer visible, headline tiles populated, and the map zoomed to a default extent that frames the Sacramento River watershed and Bay-Delta.
- A first-visit overlay (dismissable, remembered via local storage) gives a one-paragraph orientation and points to the layer rail, the tiles, and the About link.
- No tour or guided walkthrough in v1 (defer to near-future).

---

## 13. Accessibility, performance, internationalization

- **Accessibility target:** This product will be designed to exceed minimum compliance and manifest disability access as a core public-service requirement. The application must conform to WCAG 2.2 Level AA and should meet selected WCAG 2.2 Level AAA criteria where applicable, especially for contrast, readability, instructions, help, and cognitive accessibility.
- **Interface accessibility:** All custom interface components must use native HTML controls where possible or follow WAI-ARIA Authoring Practices. All interactive elements must be keyboard-reachable and screen-reader-labeled.
- **Non-map equivalent:** Because the product is an interactive mapping application, all essential map content and workflows must also be available through an equivalent keyboard-accessible, screen-reader-readable, non-map interface, including searchable/filterable project lists, project detail views, summary statistics, and accessible data downloads.
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

1. `palette.md` — basemap and data palette with hex values and color-vision-deficiency notes.
2. `project-stage.md` — confirmed `ProjectStageEnum` visual treatment.
3. `layer-catalog.md` — every layer with source, schema, default state, and symbology.
4. `url-state.md` — what gets encoded, how, and the routing approach.
5. `data-contract.md` — joint contract with `hrl-data-infrastructure` for snapshot publication and consumption.
6. `data-model.md` — full project record schema and any companion tables.
7. `tiles-and-metrics.md` — exact headline tiles, their definitions, and their calculation.
8. `first-run.md` — copy and layout for the orientation overlay.
9. `accessibility.md` — WCAG conformance plan, including the non-map project list view.
10. `testing.md` — what to test, at what level, and the critical paths for end-to-end coverage.

---

## 17. Open questions

These do not block v1 scaffolding but must be resolved before v1 ship.

- **Visual identity.** HRL is a multi-agency program. Does it have its own visual identity (logo, color), or does the dashboard adopt DWR's, or a neutral HRL-specific identity to be designed?
- **Project-stage display.** How should multivalued `ProjectStageEnum` values be summarized for symbology, filters, and headline tiles?
- **Data refresh cadence.** Proposed: nightly. Confirm with `hrl-data-infrastructure` plans.
- **Prototype GeoPackage mapping.** Which layer and fields in the current GeoPackage map to `RestorationProjectSubmission`?
- **Hosting domain.** Subdomain of an existing DWR or HRL domain, or a new domain? Affects DNS, SSL, and link strategy from partner sites.
- **Photo / media policy.** Project records may include photos. What is the rights and consent process for displaying them publicly?
- **Spanish-language support timing.** Year 1 stretch goal, or deferred?
- **Analytics.** Do we instrument the dashboard for usage metrics? If so, what tool (Plausible, Matomo, none)? State-agency privacy constraints apply.

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
