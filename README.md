# hrl-restoration-map-prototype

Interactive map for visualizing Healthy Rivers and Landscapes restoration
projects.

> [!WARNING]
> **Development prototype**
>
> This application is an in-development prototype. It is not an authoritative
> State of California product, official public record, regulatory filing, or
> source of legal or policy guidance. Data, design, terminology, and behavior may
> change as the Healthy Rivers and Landscapes dashboard and supporting data
> workflows mature.

## Status

This repository is currently a local prototype. Azure hosting, published
snapshot manifests, and the production HRL data-serving infrastructure are not
set up yet.

The dashboard currently includes:

- Full-bleed MapLibre map with project polygons from
  `public/data/hrl_restoration_projects.geojson`
- Project-type color symbology, hover tooltip, and click-to-inspect selection
- Top bar branded as the Healthy Rivers and Landscapes Restoration Dashboard,
  compact purpose text, headline metric tiles, and right-side project detail
  panel
- First-run orientation overlay that frames the map as a public overview of
  early implementation and proposed restoration project locations, not verified
  habitat accounting
- Concise About popup with program context and links to CNRA and HRL sources
- Methodology and data-source context describing project submissions, schema
  validation, update timing, public downloads, and contact information
- Left-rail controls with separate Layers and Projects tabs
- Searchable/filterable project list with project selection, zoom-to-project,
  and fit-to-visible-projects actions
- Filter-aware headline metric tiles
- Layer controls for project types, watershed boundaries, the Delta legal
  boundary, Yolo and Sutter bypass boundaries, the stream network, and the
  basemap
- Sacramento watershed boundary from USGS WBD HUC4 1802, plus Mokelumne and
  Tuolumne watershed boundaries from USGS WBD HUC8 18040012 and 18040009
- Sacramento-San Joaquin Delta legal boundary from DWR
- Yolo and Sutter bypass boundary context layers from DWR flood-bypass data
- California stream-network PMTiles from NHDPlus V2, including dynamic river
  labels for named mainstems and major tributaries
- Quiet light basemap with DEM hillshade terrain context, HRL-inspired
  accessible UI palette, blue-grey hydrography, and optional Esri World Imagery
  inspection mode
- URL state for map center, zoom, selected project, hidden project types,
  basemap mode, boundary visibility, and stream-network visibility
- Download data menu for public project data as GeoJSON, GeoPackage, and
  non-spatial CSV

## Quick Start

This project uses React, Vite, TypeScript, MapLibre GL JS, and pnpm.

```sh
pnpm install
pnpm run dev
```

Build the app with:

```sh
pnpm run build
```

## Data Workflow

The browser app does not load source GeoPackage files directly. Use the
repeatable data workflow:

1. Keep source GeoPackage files in `data/source/`.
2. Validate and normalize data against the vendored LinkML
   `RestorationProjectSubmission` schema in `schemas/hrl/linkml/`.
3. Run `python scripts/convert-gpkg.py` to generate
   `public/data/hrl_restoration_projects.geojson`,
   `public/data/hrl_restoration_projects.gpkg`, and
   `public/data/hrl_restoration_projects.csv`.
4. Run `python scripts/fetch-watershed.py` to generate
   `public/data/sacramento-watershed.geojson`,
   `public/data/mokelumne-watershed.geojson`, and
   `public/data/tuolumne-watershed.geojson`.
5. Run `python scripts/fetch-delta-boundary.py` to generate
   `public/data/delta-boundary.geojson`.
6. Run `python scripts/fetch-bypass-boundaries.py` to generate
   `public/data/yolo-bypass-boundary.geojson` and
   `public/data/sutter-bypass-boundary.geojson`.
7. Run `python scripts/fetch-streams.py` to generate
   `public/data/streams.pmtiles`.
8. Run the app locally with Vite.

Generated files in `public/data/` should be replaceable by re-running the
scripts.

## Repository Guide

- [SPEC.md](SPEC.md) contains product, design, data, and architecture decisions.
- [AGENTS.md](AGENTS.md) contains implementation conventions for coding agents
  and contributors.
- [beta-testing/](beta-testing/) records structured beta testing processes and
  external form content.
- [CONTRIBUTING.md](CONTRIBUTING.md) explains development workflow and pull
  request expectations.
- [CHANGELOG.md](CHANGELOG.md) records notable changes.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) describes community expectations.

## License

This project is licensed under the [MIT License](LICENSE).
