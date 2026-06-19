# Generated Data

Generated browser-readable data for the local prototype lives here.

Start with `projects.geojson` generated from the GeoPackage in `data/source/` and validated against the vendored LinkML `RestorationProjectSubmission` schema. If GeoJSON becomes too large or slow, replace or supplement it with generated vector tiles.

Context layers are generated separately: `sacramento-watershed.geojson` and
`san-joaquin-watershed.geojson` from the USGS WBD service,
`delta-boundary.geojson` from the DWR legal Delta boundary service,
`yolo-bypass-boundary.geojson` and `sutter-bypass-boundary.geojson` from the
DWR flood bypasses service, and `streams.pmtiles` from NHDPlus V2 source data.

Files here should be reproducible from source data and conversion scripts.
