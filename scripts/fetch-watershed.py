#!/usr/bin/env python3
"""
Fetch HRL tributary watershed boundaries from the USGS Watershed Boundary
Dataset REST service, simplify them, and write a browser-readable combined
GeoJSON file to public/data/.

Usage:
    python scripts/fetch-watershed.py
"""

import json
import math
import pathlib
import urllib.request

from shapely.geometry import mapping, shape
from shapely.ops import unary_union

DATA_DIR = pathlib.Path(__file__).parent.parent / "public" / "data"
OUTPUT = DATA_DIR / "hrl-tributary-watersheds.geojson"

WBD_URL_TEMPLATE = (
    "https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer/{layer}/query"
    "?where={huc_field}%3D'{huc}'"
    "&outFields=name%2C{huc_field}"
    "&f=geojson"
    "&outSR=4326"
)

TRIBUTARY_WATERSHEDS = [
    {
        "layer": 2,
        "huc_field": "huc4",
        "huc_level": "HUC4",
        "hucs": ["1802"],
        "system_key": "sacramento",
        "system_name": "Sacramento",
        "label": "Sacramento River watershed",
    },
    {
        "layer": 4,
        "huc_field": "huc8",
        "huc_level": "HUC8",
        "hucs": ["18020111", "18020128", "18020129"],
        "system_key": "american",
        "system_name": "American",
        "label": "American River watershed",
    },
    {
        "layer": 4,
        "huc_field": "huc8",
        "huc_level": "HUC8",
        "hucs": ["18020121", "18020122", "18020123", "18020159"],
        "system_key": "feather",
        "system_name": "Feather",
        "label": "Feather River watershed",
    },
    {
        "layer": 4,
        "huc_field": "huc8",
        "huc_level": "HUC8",
        "hucs": ["18020125"],
        "system_key": "yuba",
        "system_name": "Yuba",
        "label": "Yuba River watershed",
    },
    {
        "layer": 4,
        "huc_field": "huc8",
        "huc_level": "HUC8",
        "hucs": ["18020162"],
        "system_key": "putah",
        "system_name": "Putah",
        "label": "Putah Creek watershed",
    },
    {
        "layer": 4,
        "huc_field": "huc8",
        "huc_level": "HUC8",
        "hucs": ["18040012"],
        "system_key": "mokelumne",
        "system_name": "Mokelumne",
        "label": "Mokelumne River watershed",
    },
    {
        "layer": 4,
        "huc_field": "huc8",
        "huc_level": "HUC8",
        "hucs": ["18040009"],
        "system_key": "tuolumne",
        "system_name": "Tuolumne",
        "label": "Tuolumne River watershed",
    },
]

SIMPLIFY_EPSILON = 0.0007  # ~75 m in decimal degrees — keeps watershed curves legible
COORD_PRECISION = 5        # decimal places


def point_line_dist(p, a, b):
    if a == b:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)


def rdp(pts, eps):
    """Ramer-Douglas-Peucker polyline simplification."""
    if len(pts) < 3:
        return list(pts)
    dmax, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = point_line_dist(pts[i], pts[0], pts[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def round_coords(ring, precision):
    return [[round(c, precision) for c in pt] for pt in ring]


def simplify_geometry(geom):
    geom_type = geom["type"]
    if geom_type == "Polygon":
        geom["coordinates"] = [
            round_coords(rdp(ring, SIMPLIFY_EPSILON), COORD_PRECISION)
            for ring in geom["coordinates"]
        ]
    elif geom_type == "MultiPolygon":
        geom["coordinates"] = [
            [
                round_coords(rdp(ring, SIMPLIFY_EPSILON), COORD_PRECISION)
                for ring in polygon
            ]
            for polygon in geom["coordinates"]
        ]
    else:
        raise RuntimeError(f"Unsupported geometry type: {geom_type}")


def count_points(geom):
    if geom["type"] == "Polygon":
        return sum(len(ring) for ring in geom["coordinates"])
    return sum(len(ring) for polygon in geom["coordinates"] for ring in polygon)


def fetch_watershed_geometry(config, huc):
    print(f"Fetching {config['label']} boundary for {config['huc_level']} {huc} ...")
    query = {**config, "huc": huc}
    with urllib.request.urlopen(WBD_URL_TEMPLATE.format(**query)) as resp:
        data = json.load(resp)

    features = data.get("features", [])
    if not features:
        raise RuntimeError(
            f"No features returned from USGS WBD service for "
            f"{config['huc_field'].upper()} {huc}."
        )

    feature = features[0]
    source_props = feature.get("properties", {})
    return shape(feature["geometry"]), source_props.get("name", "")


def build_watershed_feature(config):
    geometries = []
    source_names = []
    for huc in config["hucs"]:
        geometry, source_name = fetch_watershed_geometry(config, huc)
        geometries.append(geometry)
        source_names.append(source_name)

    dissolved = unary_union(geometries)
    geom = mapping(dissolved)
    simplify_geometry(geom)

    return {
        "type": "Feature",
        "geometry": geom,
        "properties": {
            "system_key": config["system_key"],
            "system_name": config["system_name"],
            "label": config["label"],
            "source_name": "; ".join(name for name in source_names if name),
            "huc": "; ".join(config["hucs"]),
            "huc_level": config["huc_level"],
            "label_feature": True,
            "source": "USGS Watershed Boundary Dataset",
        },
    }


def main():
    features = []
    for config in TRIBUTARY_WATERSHEDS:
        features.append(build_watershed_feature(config))

    out = {"type": "FeatureCollection", "features": features}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(out, f)

    total_pts = sum(count_points(feature["geometry"]) for feature in features)
    size_kb = OUTPUT.stat().st_size // 1024
    print(f"Written {OUTPUT} -- {len(features)} features, {total_pts} points, {size_kb} KB")


if __name__ == "__main__":
    main()
