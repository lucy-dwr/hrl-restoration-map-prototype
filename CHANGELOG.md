# Changelog

All notable changes to this project will be documented in this file.

This project follows the general structure of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where
applicable.

## [Unreleased Working]

### Added

- Added open-source project metadata to `package.json`, including MIT license
  metadata, repository URL, issue URL, and README homepage.
- Added `CONTRIBUTING.md` with development setup, data workflow, coding
  standards, and pull request guidance.
- Added `CODE_OF_CONDUCT.md`, adapted from Contributor Covenant 3.0.
- Added Sacramento and San Joaquin watershed context layers, the
  Sacramento-San Joaquin Delta legal boundary, and NHDPlus V2 stream-network
  PMTiles with dynamic labels for named mainstems and major tributaries.
- Added a quiet light basemap with DEM hillshade terrain context and an optional
  Esri World Imagery basemap mode.
- Added a Projects tab with search, system and early-implementation filters,
  accessible project browsing, project selection, zoom-to-project, and
  fit-to-visible-projects actions.
- Added filter-aware headline metric tiles.

### Changed

- Expanded URL state to include basemap mode and context-layer visibility.
- Updated layer controls to include basemap, watershed, Delta boundary, and
  hydrography controls.

## [0.1.0] - 2026-06-03

### Added

- Added React, Vite, TypeScript, and MapLibre GL JS prototype application.
- Added full-bleed map rendering for restoration project polygons from
  `public/data/projects.geojson`.
- Added project-type color symbology, hover tooltip, and click-to-inspect
  project selection.
- Added top bar, headline metric tiles, and right-side project detail panel.
- Added left-rail layer controls with project-type visibility toggles and a
  Sacramento watershed boundary toggle.
- Added Sacramento watershed boundary data generated from USGS WBD HUC4 1802.
- Added URL state for map center, zoom, selected project, hidden project types,
  and watershed visibility.
- Added prototype data conversion and watershed-fetching scripts.
- Added GitHub Pages deployment workflow.
- Added repository instructions, product specification, and prototype-status
  README disclaimer.

### Changed

- Improved DOM order, text contrast, and reduced-motion handling for WCAG 2.2 AA
  alignment.

### Known Gaps

- Project list accessibility exists at prototype level but still needs broader
  keyboard and screen-reader audit coverage.
- About and methodology page is not yet built.
- Download data affordance is not yet built.
