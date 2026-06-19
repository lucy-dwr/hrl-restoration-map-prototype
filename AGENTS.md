# AGENTS.md

This file explains how to work in the repo. The product, design, data, and architectural decisions live in [`SPEC.md`](SPEC.md).

Read `SPEC.md` before writing code. Treat its Decision Log as canonical, and do not reverse a logged decision without proposing a superseding entry.

## Current Implementation Status

The prototype is substantially built. What exists:

- Full-bleed MapLibre map rendering project polygons from `public/data/projects.geojson`, with project-type colour symbology, hover tooltip, and click-to-inspect selection.
- Top bar (HRL identity + About link placeholder).
- Filter-aware headline tiles strip (project count, total submitted acreage, early-implementation count).
- Right-side detail panel with type badges, description, overview, acreage breakdown, target species, funding sources, and zoom-to-project action.
- Left-rail panel with Layers and Projects tabs. The Layers tab has basemap radio controls, per-type visibility checkboxes, Sacramento and San Joaquin watershed toggles, a Delta legal-boundary toggle, and a stream-network toggle. The Projects tab has search, system and early-implementation filters, an accessible project list, project selection/zoom actions, and fit-to-visible-projects.
- Sacramento watershed boundary layer (`public/data/sacramento-watershed.geojson`) sourced from USGS WBD HUC4 1802.
- San Joaquin watershed boundary layer (`public/data/san-joaquin-watershed.geojson`) sourced from USGS WBD HUC4 1804.
- Sacramento-San Joaquin Delta legal boundary layer (`public/data/delta-boundary.geojson`) sourced from the DWR `i03_LegalDeltaBoundary` ArcGIS service.
- California stream-network base layer (`public/data/streams.pmtiles`) built from NHDPlus V2 (VPU 18), served as vector tiles via the `pmtiles://` protocol with zoom-dependent reveal by Strahler stream order and dynamic labels for named mainstems / major tributaries.
- Quiet light basemap with MapLibre-rendered DEM hillshade terrain context, plus optional Esri World Imagery inspection mode.
- URL state encoding map centre/zoom, selected project, hidden types, basemap mode, boundary visibility, and stream-network visibility as query parameters.
- Design tokens in `src/styles/tokens.css`; WCAG-AA-passing colour contrast for all text.

**Not yet built (v1 requirements):** About/methodology page, download data affordance. The project-list non-map equivalent exists, but still needs broader keyboard/screen-reader audit coverage before calling accessibility complete.

## Repository Layout

```text
hrl-restoration-map-prototype/
├── AGENTS.md                  # Coding-agent and contribution instructions
├── SPEC.md                    # Umbrella product and architecture spec
├── README.md                  # Human-facing setup and contribution overview
├── data/
│   └── source/                # Local prototype source data, including GeoPackage files
├── public/
│   └── data/
│       ├── projects.geojson   # Generated from GeoPackage via scripts/convert-gpkg.py
│       ├── sacramento-watershed.geojson  # Fetched from USGS WBD via scripts/fetch-watershed.py
│       ├── san-joaquin-watershed.geojson  # Fetched from USGS WBD via scripts/fetch-watershed.py
│       ├── delta-boundary.geojson  # Fetched from DWR via scripts/fetch-delta-boundary.py
│       └── streams.pmtiles    # Built from NHDPlus V2 via scripts/fetch-streams.py
├── schemas/
│   └── hrl/                   # Vendored LinkML schema release used by the prototype
├── src/
│   ├── app/                   # App.tsx, App.module.css, main.tsx
│   ├── components/
│   │   ├── detail-panel/      # Click-to-inspect project panel
│   │   ├── layer-panel/       # Collapsible layer toggle rail
│   │   ├── tiles/             # Headline metric tiles
│   │   └── top-bar/           # Programme identity and navigation bar
│   ├── data/                  # types.ts — ProjectProperties and related types
│   ├── features/
│   │   └── map/               # MapLibre map component and project-type colour palette
│   ├── lib/                   # url-state.ts — URL read/write utilities
│   └── styles/                # global.css, tokens.css
├── tests/                     # (not yet populated)
└── scripts/
    ├── convert-gpkg.py        # Converts source GeoPackage to public/data/projects.geojson
    ├── fetch-watershed.py     # Fetches Sacramento and San Joaquin HUC4 boundaries from USGS WBD
    ├── fetch-delta-boundary.py # Fetches Sacramento-San Joaquin Delta legal boundary from DWR
    ├── fetch-streams.py       # Builds California stream network PMTiles from NHDPlus V2
    └── requirements.txt       # Python deps for the data-prep scripts
```

Do not add new top-level implementation directories unless the need is clear and consistent with the spec.

## Technical Defaults

Use the stack decisions in `SPEC.md` Section 10:

- React with Vite
- TypeScript in strict mode
- MapLibre GL JS for map rendering
- deck.gl for heavy or analytical layers
- CSS modules or vanilla-extract; no runtime CSS-in-JS
- React context plus URL-as-source-of-truth first; consider Zustand only if complexity warrants it
- Vitest for unit tests and Playwright for critical end-to-end paths
- pnpm as the package manager

This is currently a local prototype. Do not assume Azure Blob, published snapshot manifests, or `hrl-data-infrastructure` serving outputs exist yet.

## Prototype Data Workflow

The current source dataset is a GeoPackage. The app should not try to load the GeoPackage directly in the browser.

The current schema contract is the vendored LinkML schema in `schemas/hrl/linkml/hrl_restoration_project.yaml`. For now, use the `RestorationProjectSubmission` class. Do not require fields that only exist on `RestorationProjectCanonicalRecord`, such as program-assigned canonical fields, until the Azure validation/ingestion pipeline exists.

Use this workflow until the production data infrastructure exists:

1. Put the source GeoPackage under `data/source/`.
2. Run `python scripts/convert-gpkg.py` to convert the relevant layer into `public/data/projects.geojson`. Normalise and validate fields against `RestorationProjectSubmission` during conversion.
3. Run `python scripts/fetch-watershed.py` to fetch and simplify the Sacramento HUC4 and San Joaquin HUC4 watershed boundaries from the USGS WBD REST service and write them to `public/data/sacramento-watershed.geojson` and `public/data/san-joaquin-watershed.geojson`.
4. Run `python scripts/fetch-delta-boundary.py` to fetch and simplify the Sacramento-San Joaquin Delta legal boundary from the DWR ArcGIS service and write it to `public/data/delta-boundary.geojson`.
5. Run `python scripts/fetch-streams.py` to build the California stream-network base layer from NHDPlus V2 (VPU 18) and write it to `public/data/streams.pmtiles`. This script needs the Python deps in `scripts/requirements.txt` plus the `tippecanoe` CLI.
6. Use MapLibre's GeoJSON source for vector features that are small enough; use PMTiles vector tiles (read via the `pmtiles://` protocol) for large base layers such as the stream network.

Prefer a repeatable conversion command over hand-edited generated data. Generated files in `public/data/` should be replaceable by re-running the scripts above. The stream network is the first layer that moved to vector tiles because the raw NHDPlus flowline set is far too large to ship as GeoJSON.

If schema-derived TypeScript types or validators are added, generate them from the vendored LinkML schema rather than maintaining duplicate handwritten frontend schema definitions.

## Coding Conventions

- Files and directories: `kebab-case` for most files; `PascalCase` only for React component files
- TypeScript identifiers: `camelCase` for variables and functions, `PascalCase` for types and components, `SCREAMING_SNAKE_CASE` for compile-time constants
- Data fields: `snake_case` end-to-end to match `hrl-data-infrastructure`
- Use two-space indentation
- Rely on Prettier for formatting
- Prefer explicit imports over default imports for components
- Do not use `any`; use `unknown` and narrow
