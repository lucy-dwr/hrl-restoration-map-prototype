#!/usr/bin/env python3
"""
Fetch Yolo Bypass and Sutter Bypass flood-control boundary polygons from the
California Department of Water Resources flood bypasses ArcGIS service,
simplify them, and write browser-readable GeoJSON files to public/data/.

These are representational flood-bypass extents from DWR's i12_Flood_Bypasses_2014
layer, not legal boundaries.

Usage:
    python scripts/fetch-bypass-boundaries.py
"""

import json
import math
import pathlib
import urllib.parse
import urllib.request

from shapely.geometry import mapping, shape
from shapely.ops import unary_union

DATA_DIR = pathlib.Path(__file__).parent.parent / "public" / "data"

BYPASS_SERVICE_URL = (
    "https://utility.arcgis.com/usrsvcs/servers/5d56a0c6d8414b29a4769c0c4fbe8536/"
    "rest/services/InlandWaters/i12_Flood_Bypasses_2014/MapServer/0/query"
)

BYPASSES = [
    {
        "feature_name": "Yolo Bypass",
        "label": "Yolo Bypass boundary",
        "output": DATA_DIR / "yolo-bypass-boundary.geojson",
        "dissolve": False,
    },
    {
        "feature_name": "Sutter Bypass",
        "label": "Sutter Bypass boundary",
        "output": DATA_DIR / "sutter-bypass-boundary.geojson",
        "dissolve": True,
    },
]

SIMPLIFY_EPSILON = 0.0003  # ~30 m in decimal degrees; preserves levee-scale shape
COORD_PRECISION = 5


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


def simplify_ring(ring):
    if len(ring) < 4:
        return ring

    is_closed = ring[0] == ring[-1]
    pts = ring[:-1] if is_closed else ring
    simplified = rdp(pts, SIMPLIFY_EPSILON)

    if is_closed and simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return simplified


def round_coords(ring, precision):
    return [[round(c, precision) for c in pt] for pt in ring]


def simplify_geometry(geom):
    geom_type = geom["type"]
    if geom_type == "Polygon":
        geom["coordinates"] = [
            round_coords(simplify_ring(ring), COORD_PRECISION)
            for ring in geom["coordinates"]
        ]
    elif geom_type == "MultiPolygon":
        geom["coordinates"] = [
            [
                round_coords(simplify_ring(ring), COORD_PRECISION)
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


def dissolve_features(features, config):
    if not config.get("dissolve"):
        return features

    dissolved = unary_union([shape(feature["geometry"]) for feature in features])
    source_objectids = [
        str(feature.get("properties", {}).get("OBJECTID"))
        for feature in features
        if feature.get("properties", {}).get("OBJECTID") is not None
    ]
    area_acres = sum(
        feature.get("properties", {}).get("Area_Acres") or 0
        for feature in features
    )

    first_props = dict(features[0].get("properties", {}))
    first_props["OBJECTID"] = ",".join(source_objectids)
    first_props["Area_Acres"] = area_acres
    first_props["source_feature_count"] = len(features)

    return [
        {
            "type": "Feature",
            "id": config["feature_name"],
            "geometry": mapping(dissolved),
            "properties": first_props,
        }
    ]


def fetch_bypass(config):
    print(f"Fetching {config['label']} from DWR i12_Flood_Bypasses_2014 ...")
    params = urllib.parse.urlencode(
        {
            "where": f"Feature_Name='{config['feature_name']}'",
            "outFields": "OBJECTID,Region,Area_Acres,Feature_Name,Year_2012,Year_2014",
            "f": "geojson",
            "outSR": "4326",
        }
    )
    with urllib.request.urlopen(f"{BYPASS_SERVICE_URL}?{params}") as resp:
        data = json.load(resp)

    features = data.get("features", [])
    if not features:
        raise RuntimeError(f"No features returned for {config['feature_name']}.")

    features = dissolve_features(features, config)

    total_pts = 0
    for feature in features:
        simplify_geometry(feature["geometry"])
        total_pts += count_points(feature["geometry"])
        props = feature.setdefault("properties", {})
        props["name"] = config["label"]
        props["source_service"] = "DWR i12_Flood_Bypasses_2014"
        props["source_note"] = "Representation only; does not constitute a legal boundary."

    output = config["output"]
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)

    size_kb = output.stat().st_size // 1024
    print(f"Written {output} -- {len(features)} feature(s), {total_pts} points, {size_kb} KB")


def main():
    for config in BYPASSES:
        fetch_bypass(config)


if __name__ == "__main__":
    main()
