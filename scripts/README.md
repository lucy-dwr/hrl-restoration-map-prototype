# Scripts

Repeatable local prototype data-conversion scripts. Generated outputs land in
`public/data/` and are meant to be replaceable by re-running these commands
rather than hand-edited.

Python deps for the scripts that need them are in `requirements.txt`:

```sh
python -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt
```

## `convert-gpkg.py`

Converts the source GeoPackage in `data/source/` into
`public/data/projects.geojson`, validating and normalizing properties against
`RestorationProjectSubmission` in
`schemas/hrl/linkml/hrl_restoration_project.yaml`.

## `fetch-watershed.py`

Fetches the Sacramento River HUC4 (1802) and San Joaquin HUC4 (1804) boundaries
from the USGS Watershed Boundary Dataset REST service, simplifies them, and
writes `public/data/sacramento-watershed.geojson` and
`public/data/san-joaquin-watershed.geojson`.

## `fetch-delta-boundary.py`

Fetches the Sacramento-San Joaquin Delta legal boundary from the California
Department of Water Resources `i03_LegalDeltaBoundary` ArcGIS service,
simplifies it, and writes `public/data/delta-boundary.geojson`.

## `fetch-bypass-boundaries.py`

Fetches representational Yolo Bypass and Sutter Bypass boundary polygons from
the California Department of Water Resources `i12_Flood_Bypasses_2014` ArcGIS
service, simplifies them, and writes
`public/data/yolo-bypass-boundary.geojson` and
`public/data/sutter-bypass-boundary.geojson`. These polygons are flood-bypass
context layers and do not constitute legal boundaries. The Sutter source
features are dissolved before writing so the map renders only the outer bypass
outline, without internal source-feature boundaries.

## `fetch-streams.py`

Builds the stream-network base layer from **NHDPlus V2** (California, Vector
Processing Unit 18), clips it to WBD HUC4 `1802` and `1804`, and writes it as
vector tiles to `public/data/streams.pmtiles`. The generated PMTiles archive
includes stream flowlines plus lake, reservoir, wide-river, and Bay-Delta water
polygons. Water polygons are dissolved before tiling so source-data seams do not
render as artificial boundaries inside rivers and bays.

Requires the `tippecanoe` CLI in addition to the Python deps:

```sh
brew install tippecanoe
python scripts/fetch-streams.py
```

It downloads two EPA-hosted archives (NHDSnapshot for geometry, NHDPlusAttributes
for Strahler stream order), joins flowlines on `COMID`, keeps 5th-order-and-larger
natural stream channels inside HUC4 `1802`/`1804`, adds selected NHD waterbody
polygons of at least 0.1 sq km plus wide-river and Bay-Delta area polygons, and
tags each feature with a zoom level so smaller waterbodies only appear as the
user zooms in. If the EPA download URLs 404 (the revision
numbers rotate), download the CA VPU 18 archives by hand from the
[EPA NHDPlus page](https://www.epa.gov/waterdata/get-nhdplus-national-hydrography-dataset-plus-data),
drop them in `data/source/nhdplus/`, and re-run — the script reuses anything
already present there.
