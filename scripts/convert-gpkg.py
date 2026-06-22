#!/usr/bin/env python3
"""
Convert the HRL restoration projects GeoPackage to browser-readable GeoJSON,
a downloadable GeoPackage, and a non-spatial CSV.

Usage:
    python3 scripts/convert-gpkg.py

Reads:  data/source/2026-06-19-v01.gpkg  (restoration_projects layer)
Writes: public/data/hrl_restoration_projects.geojson
          (WGS84 / EPSG:4326, arrays normalized)
        public/data/hrl_restoration_projects.gpkg
          (WGS84 / EPSG:4326, arrays as semicolons)
        public/data/hrl_restoration_projects.csv
          (no geometry, arrays as semicolons)

Normalizes multivalued fields from semicolon-delimited strings to arrays for the
GeoJSON output. The GeoPackage and CSV outputs use semicolon-delimited strings
so that standard GIS and spreadsheet tools can read the field values without
further processing.
Strips private and public-download excluded fields. Adds display_id.
Validates required RestorationProjectSubmission fields and emits warnings.
"""

import csv
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
GPKG = REPO_ROOT / "data/source/2026-06-19-v01.gpkg"
LAYER = "restoration_projects"
OUT = REPO_ROOT / "public/data/hrl_restoration_projects.geojson"
GPKG_OUT = REPO_ROOT / "public/data/hrl_restoration_projects.gpkg"
CSV_OUT = REPO_ROOT / "public/data/hrl_restoration_projects.csv"

# Multivalued fields stored as semicolon-delimited strings in the source
# Schema annotation: submission_serialization: semicolon_delimited
MULTIVALUED_FIELDS = {
    "project_type",
    "project_stage",
    "target_species",
    "contractors",
    "funding_sources",
}

# Private fields — must not appear in the public output
PRIVATE_FIELDS = {
    "contact_name",
    "contact_email",
    "funding_secured"
}

PUBLIC_DOWNLOAD_EXCLUDED_FIELDS = {
    "source_slug",
    "source_agency",
    "submission_version",
    "source_file",
    "source_feature_number",
    "estimated_budget_comments",
    "construction_completion_year_comments",
    "funding_gap",
    "display_name",
    "display_acreage",
    "display_stage",
}

# Required public fields per RestorationProjectSubmission (geometry is implicit)
REQUIRED_PUBLIC_FIELDS = {
    "project_name",
    "project_description",
    "project_stage",
    "lead_entity",
    "early_implementation",
    "construction_start_year",
    "construction_completion_year",
    "estimated_budget",
    "system",
    "project_type",
    "target_species",
}

# Required private fields: validate presence in source before dropping
REQUIRED_PRIVATE_FIELDS = {
    "contact_name",
    "contact_email",
    "funding_secured"
}


def flatten_arrays_for_gpkg(features: list[dict]) -> list[dict]:
    """Revert array-valued fields to semicolon strings for GIS interoperability."""
    result = []
    for f in features:
        props = dict(f.get("properties") or {})
        for field in MULTIVALUED_FIELDS:
            val = props.get(field)
            if isinstance(val, list):
                props[field] = "; ".join(val) if val else None
        result.append({**f, "properties": props})
    return result


def write_gpkg(features: list[dict]) -> None:
    fc = {"type": "FeatureCollection", "features": flatten_arrays_for_gpkg(features)}
    with tempfile.NamedTemporaryFile(mode="w", suffix=".geojson", delete=False) as tf:
        json.dump(fc, tf)
        tmp_path = tf.name

    GPKG_OUT.unlink(missing_ok=True)
    try:
        result = subprocess.run(
            [
                "ogr2ogr",
                "-f", "GPKG",
                str(GPKG_OUT),
                tmp_path,
                "-nln", "restoration_projects",
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"WARNING: GPKG write failed:\n{result.stderr}", file=sys.stderr)
        else:
            print(f"Wrote {len(features)} features → {GPKG_OUT.relative_to(REPO_ROOT)}")
    finally:
        os.unlink(tmp_path)


def write_csv(features: list[dict]) -> None:
    rows = [f.get("properties") or {} for f in flatten_arrays_for_gpkg(features)]
    fieldnames: list[str] = []
    seen: set[str] = set()
    for row in rows:
        for field in row:
            if field not in seen:
                seen.add(field)
                fieldnames.append(field)

    with open(CSV_OUT, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(features)} rows → {CSV_OUT.relative_to(REPO_ROOT)}")


def split_semicolon(value: object) -> list[str] | None:
    if value is None or str(value).strip() == "":
        return None
    return [v.strip() for v in str(value).split(";") if v.strip()]


def read_source_fids() -> list[int]:
    conn = sqlite3.connect(str(GPKG))
    cur = conn.cursor()
    cur.execute(f"SELECT fid FROM {LAYER} ORDER BY fid")
    fids = [row[0] for row in cur.fetchall()]
    conn.close()
    return fids


def convert_via_ogr2ogr() -> dict:
    result = subprocess.run(
        [
            "ogr2ogr",
            "-f", "GeoJSON",
            "-t_srs", "EPSG:4326",
            "/vsistdout/",
            str(GPKG),
            LAYER,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"ERROR: ogr2ogr failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout)


def process_feature(
    feature: dict, fid: int
) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    props = dict(feature.get("properties") or {})

    # Validate required private fields before dropping
    for field in REQUIRED_PRIVATE_FIELDS:
        if props.get(field) is None:
            warnings.append(
                f"fid={fid}: required private field '{field}' is null in source"
            )

    # Drop private fields
    for field in PRIVATE_FIELDS:
        props.pop(field, None)

    # Normalize multivalued fields to arrays
    for field in MULTIVALUED_FIELDS:
        if field in props:
            props[field] = split_semicolon(props[field])

    # Validate required public fields
    for field in REQUIRED_PUBLIC_FIELDS:
        val = props.get(field)
        if val is None or val == [] or val == "":
            warnings.append(f"fid={fid}: required field '{field}' is null or empty")

    # Stable public ID for URL state and map/list selection.
    props["display_id"] = f"project-{fid}"

    for field in PUBLIC_DOWNLOAD_EXCLUDED_FIELDS:
        props.pop(field, None)

    return {**feature, "properties": props}, warnings


def main() -> None:
    if not GPKG.exists():
        print(f"ERROR: GeoPackage not found at {GPKG}", file=sys.stderr)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)

    fids = read_source_fids()
    geojson = convert_via_ogr2ogr()
    features = geojson.get("features", [])

    if len(features) != len(fids):
        print(
            f"ERROR: ogr2ogr returned {len(features)} features but source has"
            f" {len(fids)} FIDs — cannot align IDs safely",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Loaded {len(features)} features from {GPKG.name}")

    all_warnings: list[str] = []
    processed: list[dict] = []
    for feature, fid in zip(features, fids):
        feature, warnings = process_feature(feature, fid)
        processed.append(feature)
        all_warnings.extend(warnings)

    if all_warnings:
        print(f"\n{len(all_warnings)} validation warning(s):")
        for w in all_warnings:
            print(f"  WARNING: {w}")
    else:
        print("Validation: no warnings.")

    geojson["features"] = processed

    with open(OUT, "w") as f:
        json.dump(geojson, f, separators=(",", ":"))
        f.write("\n")

    print(f"\nWrote {len(processed)} features → {OUT.relative_to(REPO_ROOT)}")
    write_gpkg(processed)
    write_csv(processed)


if __name__ == "__main__":
    main()
