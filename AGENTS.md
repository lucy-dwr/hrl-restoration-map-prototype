# AGENTS.md

This file explains how to work in the repo. The product, design, data, and architectural decisions live in [`SPEC.md`](SPEC.md).

Read `SPEC.md` before writing code. Treat its Decision Log as canonical, and do not reverse a logged decision without proposing a superseding entry.

## Current Implementation Status

The prototype is substantially built. What exists:

- Full-bleed MapLibre map rendering project polygons from `public/data/hrl_restoration_projects.geojson`, with project-type colour symbology, hover tooltip, and click-to-inspect selection.
- Top bar branded as "Healthy Rivers and Landscapes Restoration Dashboard" with a Download data menu and About popup.
- Filter-aware headline tiles strip (project count and total submitted acreage).
- Right-side detail panel with type badges, description, overview, acreage breakdown, target species, funding sources, and zoom-to-project action.
- Left-rail panel with Layers and Projects tabs. The Layers tab has basemap radio controls, per-type visibility checkboxes, Sacramento, Mokelumne, and Tuolumne watershed toggles, Delta legal-boundary and Yolo/Sutter bypass-boundary toggles, and a stream-network toggle. The Projects tab has search, system and early-implementation filters, an accessible project list, project selection/zoom actions, and fit-to-visible-projects.
- Sacramento watershed boundary layer (`public/data/sacramento-watershed.geojson`) sourced from USGS WBD HUC4 1802.
- Mokelumne watershed boundary layer (`public/data/mokelumne-watershed.geojson`) sourced from USGS WBD HUC8 18040012.
- Tuolumne watershed boundary layer (`public/data/tuolumne-watershed.geojson`) sourced from USGS WBD HUC8 18040009.
- Sacramento-San Joaquin Delta legal boundary layer (`public/data/delta-boundary.geojson`) sourced from the DWR `i03_LegalDeltaBoundary` ArcGIS service.
- Yolo and Sutter bypass boundary layers (`public/data/yolo-bypass-boundary.geojson`, `public/data/sutter-bypass-boundary.geojson`) sourced from the DWR `i12_Flood_Bypasses_2014` ArcGIS service for representational context.
- California stream-network base layer (`public/data/streams.pmtiles`) built from NHDPlus V2 (VPU 18), served as vector tiles via the `pmtiles://` protocol with zoom-dependent reveal by Strahler stream order and dynamic labels for named mainstems / major tributaries.
- Quiet light basemap with MapLibre-rendered DEM hillshade terrain context, HRL-inspired accessible UI palette, blue-grey hydrography, and optional Esri World Imagery inspection mode.
- URL state encoding map centre/zoom, selected project, hidden types, basemap mode, boundary visibility, and stream-network visibility as query parameters.
- Design tokens in `src/styles/tokens.css`; WCAG-AA-passing colour contrast for all text.

**Not yet built (v1 requirements):** Full methodology page. A concise About popup, the project-list non-map equivalent, and the download data affordance exist, but still need broader keyboard/screen-reader audit coverage before calling accessibility complete.

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
│       ├── hrl_restoration_projects.geojson  # Generated from GeoPackage via scripts/convert-gpkg.py
│       ├── hrl_restoration_projects.gpkg  # Generated public GeoPackage download via scripts/convert-gpkg.py
│       ├── hrl_restoration_projects.csv  # Generated public non-spatial CSV download via scripts/convert-gpkg.py
│       ├── sacramento-watershed.geojson  # Fetched from USGS WBD via scripts/fetch-watershed.py
│       ├── mokelumne-watershed.geojson  # Fetched from USGS WBD via scripts/fetch-watershed.py
│       ├── tuolumne-watershed.geojson  # Fetched from USGS WBD via scripts/fetch-watershed.py
│       ├── delta-boundary.geojson  # Fetched from DWR via scripts/fetch-delta-boundary.py
│       ├── yolo-bypass-boundary.geojson  # Fetched from DWR via scripts/fetch-bypass-boundaries.py
│       ├── sutter-bypass-boundary.geojson  # Fetched from DWR via scripts/fetch-bypass-boundaries.py
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
    ├── convert-gpkg.py        # Converts source GeoPackage to public/data/hrl_restoration_projects.*
    ├── fetch-watershed.py     # Fetches Sacramento HUC4 plus Mokelumne and Tuolumne HUC8 boundaries from USGS WBD
    ├── fetch-delta-boundary.py # Fetches Sacramento-San Joaquin Delta legal boundary from DWR
    ├── fetch-bypass-boundaries.py # Fetches Yolo and Sutter bypass boundaries from DWR
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
2. Run `python scripts/convert-gpkg.py` to convert the relevant layer into `public/data/hrl_restoration_projects.geojson`, `public/data/hrl_restoration_projects.gpkg`, and `public/data/hrl_restoration_projects.csv`. Normalise and validate fields against `RestorationProjectSubmission` during conversion.
3. Run `python scripts/fetch-watershed.py` to fetch and simplify the Sacramento HUC4, Mokelumne HUC8, and Tuolumne HUC8 watershed boundaries from the USGS WBD REST service and write them to `public/data/sacramento-watershed.geojson`, `public/data/mokelumne-watershed.geojson`, and `public/data/tuolumne-watershed.geojson`.
4. Run `python scripts/fetch-delta-boundary.py` to fetch and simplify the Sacramento-San Joaquin Delta legal boundary from the DWR ArcGIS service and write it to `public/data/delta-boundary.geojson`.
5. Run `python scripts/fetch-bypass-boundaries.py` to fetch and simplify the representational Yolo and Sutter bypass boundaries from the DWR `i12_Flood_Bypasses_2014` ArcGIS service and write them to `public/data/yolo-bypass-boundary.geojson` and `public/data/sutter-bypass-boundary.geojson`.
6. Run `python scripts/fetch-streams.py` to build the California stream-network base layer from NHDPlus V2 (VPU 18) and write it to `public/data/streams.pmtiles`. This script needs the Python deps in `scripts/requirements.txt` plus the `tippecanoe` CLI.
7. Use MapLibre's GeoJSON source for vector features that are small enough; use PMTiles vector tiles (read via the `pmtiles://` protocol) for large base layers such as the stream network.

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
