#!/usr/bin/env python3
"""
Convert the HRL restoration projects GeoPackage to browser-readable GeoJSON.

Usage:
    python3 scripts/convert-gpkg.py

Reads:  data/source/2026-06-03_v01.gpkg  (restoration_projects layer)
Writes: public/data/projects.geojson     (WGS84 / EPSG:4326)

Normalizes multivalued fields from semicolon-delimited strings to arrays.
Strips private fields. Adds display_* derived fields.
Validates required RestorationProjectSubmission fields and emits warnings.
"""

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
GPKG = REPO_ROOT / "data/source/2026-06-03_v01.gpkg"
LAYER = "restoration_projects"
OUT = REPO_ROOT / "public/data/projects.geojson"

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

    # Derived display fields
    props["display_id"] = f"project-{fid}"
    props["display_name"] = props.get("project_name")
    props["display_acreage"] = props.get("acreage")
    stages = props.get("project_stage")
    props["display_stage"] = stages[0] if stages else None

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


if __name__ == "__main__":
    main()
