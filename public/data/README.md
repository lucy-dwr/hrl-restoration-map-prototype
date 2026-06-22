# Generated Data

Generated browser-readable data for the local prototype lives here.

Start with `hrl_restoration_projects.geojson`, `hrl_restoration_projects.gpkg`,
and `hrl_restoration_projects.csv` generated from the GeoPackage in
`data/source/` and validated against the vendored LinkML
`RestorationProjectSubmission` schema. If GeoJSON becomes too large or slow,
replace or supplement it with generated vector tiles.

The project downloads are the public-facing project data objects. GeoJSON is the
browser map source and preserves multivalued fields as arrays. GeoPackage keeps
geometry and stores multivalued fields as semicolon-delimited strings for GIS
tools. CSV is non-spatial and contains attributes only.

Context layers are generated separately: `sacramento-watershed.geojson`,
`mokelumne-watershed.geojson`, and `tuolumne-watershed.geojson` from the USGS
WBD service with smoothed prototype simplification,
`delta-boundary.geojson` from the DWR legal Delta boundary service,
`yolo-bypass-boundary.geojson` and `sutter-bypass-boundary.geojson` from the
DWR flood bypasses service, and `streams.pmtiles` from NHDPlus V2 source data.

Files here should be reproducible from source data and conversion scripts.
