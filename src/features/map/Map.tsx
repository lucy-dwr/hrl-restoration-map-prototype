import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import type { FeatureCollection, Feature, Geometry, Position } from 'geojson'
import { TYPE_MATCH_EXPR } from './project-colors'
import { ACREAGE_LABEL, formatAcreage } from '../../data/acreage'
import type { BoundaryFocusTarget } from '../../data/layer-options'
import type { ProjectProperties } from '../../data/types'
import type { BasemapMode } from '../../lib/url-state'
import styles from './Map.module.css'

// Register the pmtiles:// protocol once so MapLibre can read the streams archive
// as a vector source. addProtocol is global; guard against double registration
// under React strict-mode / fast refresh.
let pmtilesRegistered = false
function ensurePmtilesProtocol() {
  if (pmtilesRegistered) return
  maplibregl.addProtocol('pmtiles', new Protocol().tile)
  pmtilesRegistered = true
}

function setPaint(map: maplibregl.Map, layerId: string, property: string, value: unknown) {
  if (!map.getLayer(layerId)) return
  map.setPaintProperty(layerId, property, value)
}

function setVisibility(map: maplibregl.Map, layerId: string, visible: boolean) {
  if (!map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

const LIGHT_BASEMAP_FILL_LAYERS = [
  'subtle-terrain-shading',
  'park',
  'water',
  'landcover_ice_shelf',
  'landcover_glacier',
  'landuse_residential',
  'landcover_wood',
  'building',
  'waterway',
  'water_name_point_label',
  'water_name_line_label',
  'waterway_line_label',
]

const ROAD_LINE_LAYERS = [
  'highway_motorway_subtle',
  'highway_motorway_casing',
  'highway_motorway_inner',
  'highway_motorway_bridge_casing',
  'highway_motorway_bridge_inner',
  'highway_major_subtle',
  'highway_major_casing',
  'highway_major_inner',
  'highway_minor',
  'highway_path',
  'tunnel_motorway_casing',
  'tunnel_motorway_inner',
]

const LABEL_LAYERS = [
  'label_city',
  'label_city_capital',
  'label_town',
  'label_village',
  'label_state',
  'label_other',
  'highway-name-major',
  'highway-name-minor',
  'highway-name-path',
]

const PROJECT_AREA_LAYERS = ['projects-fill', 'projects-outline']
const PROJECT_POINT_LAYERS = ['projects-point-path', 'projects-point-marker']
// Overview markers give every project a guaranteed minimum on-screen size at low
// zoom, where the true polygon footprints are sub-pixel. They cross-fade out as
// zoom increases and the footprints become legible.
const PROJECT_CENTROID_LAYERS = ['projects-centroid-marker']
const PROJECT_FILTERED_LAYERS = [
  ...PROJECT_AREA_LAYERS,
  ...PROJECT_POINT_LAYERS,
  ...PROJECT_CENTROID_LAYERS,
]
const PROJECT_INTERACTIVE_LAYERS = [
  'projects-fill',
  'projects-point-path',
  'projects-point-marker',
  'projects-centroid-marker',
]
const PROJECT_SELECTED_LAYERS = [
  'projects-selected-outer-halo',
  'projects-selected-halo',
  'projects-selected-point-path-backing',
  'projects-selected-point-path-halo',
  'projects-selected-point-halo',
  'projects-selected-point',
  'projects-selected-centroid-halo',
  'projects-selected-centroid',
]

// Overview markers cross-fade into the polygon footprints on a per-feature
// schedule: each centroid carries fade_start / fade_end zooms derived from its
// footprint size (see fadeZoomsForFeature), so a large restoration polygon sheds
// its dot as soon as it is legible while a tiny fish-passage sliver keeps its dot
// far longer. The fade factor is 1 below fade_start and 0 above fade_end.
//
// `zoom` must be the direct input of a top-level interpolate, so the per-feature
// timing lives in the interpolate outputs, sampled at fixed integer zoom stops.
// Must sit at or below the smallest possible fade_start (CENTROID_FADE_MIN_START)
// so that zooming out past a large polygon's fade window clamps to full opacity
// rather than freezing it mid-fade.
const CENTROID_FADE_MIN_ZOOM = 5
const CENTROID_FADE_MAX_ZOOM = 17

// Below this zoom most projects still render as overview dots, so surface the
// "zoom in to see boundaries" hint; above it the footprints have resolved.
const ZOOM_HINT_HIDE_ZOOM = 10.5

function centroidFadeFactorAt(zoom: number): maplibregl.ExpressionSpecification {
  return [
    'max', 0,
    ['min', 1,
      ['/',
        ['-', ['get', 'fade_end'], zoom],
        ['max', 0.001, ['-', ['get', 'fade_end'], ['get', 'fade_start']]],
      ],
    ],
  ] as unknown as maplibregl.ExpressionSpecification
}

// Scale a base opacity (a constant or a feature-state expression) by each
// feature's own fade factor across the fixed zoom stops.
function centroidFadeOpacity(
  base: number | maplibregl.ExpressionSpecification
): maplibregl.ExpressionSpecification {
  const stops: unknown[] = []
  for (let zoom = CENTROID_FADE_MIN_ZOOM; zoom <= CENTROID_FADE_MAX_ZOOM; zoom += 1) {
    stops.push(zoom, ['*', base, centroidFadeFactorAt(zoom)])
  }
  return ['interpolate', ['linear'], ['zoom'], ...stops] as unknown as maplibregl.ExpressionSpecification
}

const BOUNDARY_DATA_PATHS = {
  tributaries: 'data/hrl-tributary-watersheds.geojson',
  delta: 'data/delta-boundary.geojson',
  'yolo-bypass': 'data/yolo-bypass-boundary.geojson',
  'sutter-bypass': 'data/sutter-bypass-boundary.geojson',
} as const

const SELECTED_PROJECT_CONTRAST_COLOR = '#102f34'
const SELECTED_PROJECT_HALO_COLOR = '#ffffff'

const TRIBUTARY_WATERSHED_COLOR_EXPR = [
  'match',
  ['get', 'system_key'],
  'sacramento', '#8f8798',
  'american', '#a77484',
  'feather', '#9a854e',
  'yuba', '#7f8a55',
  'putah', '#b08362',
  'mokelumne', '#9087ae',
  'tuolumne', '#a78355',
  '#8c837b',
] as unknown as maplibregl.ExpressionSpecification

const TRIBUTARY_WATERSHED_FILL_OPACITY_EXPR = [
  'match',
  ['get', 'system_key'],
  'sacramento', 0.05,
  0.06,
] as unknown as maplibregl.ExpressionSpecification

const TRIBUTARY_WATERSHED_LINE_OPACITY_EXPR = [
  'match',
  ['get', 'system_key'],
  'sacramento', 0.68,
  0.74,
] as unknown as maplibregl.ExpressionSpecification

const AREA_GEOMETRY_FILTER = ['==', ['geometry-type'], 'Polygon'] as unknown as maplibregl.FilterSpecification
const NON_ACREAGE_PRIMARY_TYPES = new Set([
  'fish passage improvement',
  'fish screen installation or improvement',
])

interface HoveredMapFeature {
  source: string
  id: number | string
}

function addImageryBasemap(map: maplibregl.Map) {
  if (!map.getSource('imagery-basemap')) {
    map.addSource('imagery-basemap', {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    })
  }

  if (!map.getLayer('imagery-basemap')) {
    map.addLayer(
      {
        id: 'imagery-basemap',
        type: 'raster',
        source: 'imagery-basemap',
        paint: {
          'raster-opacity': 1,
          'raster-saturation': -0.16,
          'raster-contrast': -0.08,
          'raster-brightness-min': 0.08,
          'raster-brightness-max': 0.94,
        },
      },
      'park'
    )
  }
}

function addSubtleTerrainShading(map: maplibregl.Map) {
  if (map.getLayer('subtle-terrain-shading')) return
  if (!map.getSource('terrain-dem')) {
    map.addSource('terrain-dem', {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 12,
      encoding: 'terrarium',
      attribution: 'Terrain: AWS Terrain Tiles',
    })
  }

  map.addLayer(
    {
      id: 'subtle-terrain-shading',
      type: 'hillshade',
      source: 'terrain-dem',
      paint: {
        'hillshade-exaggeration': [
          'interpolate', ['linear'], ['zoom'],
          4, 0.72,
          8, 0.58,
          10, 0.34,
          12.5, 0,
        ],
        'hillshade-shadow-color': 'rgba(68, 72, 66, 0.34)',
        'hillshade-highlight-color': 'rgba(255, 255, 255, 0.5)',
        'hillshade-accent-color': 'rgba(116, 122, 106, 0.16)',
        'hillshade-illumination-direction': 315,
      },
    },
    'waterway'
  )
}

function quietBasemap(map: maplibregl.Map) {
  setPaint(map, 'background', 'background-color', '#fbfbf5')
  addImageryBasemap(map)
  addSubtleTerrainShading(map)

  setPaint(map, 'park', 'fill-color', '#eef3e5')
  setPaint(map, 'park', 'fill-opacity', 0.46)
  setPaint(map, 'landcover_wood', 'fill-color', '#e8efe1')
  setPaint(map, 'landcover_wood', 'fill-opacity', 0.38)
  setPaint(map, 'landuse_residential', 'fill-color', '#f4f5ef')
  setPaint(map, 'landuse_residential', 'fill-opacity', 0.32)
  setPaint(map, 'landcover_glacier', 'fill-opacity', 0.18)
  setPaint(map, 'landcover_ice_shelf', 'fill-opacity', 0.18)

  setPaint(map, 'water', 'fill-color', '#e8f3f2')
  setPaint(map, 'water', 'fill-opacity', 0.72)
  setPaint(map, 'waterway', 'line-color', '#b8d7d5')
  setPaint(map, 'waterway', 'line-opacity', 0.22)

  for (const layerId of ROAD_LINE_LAYERS) {
    setPaint(map, layerId, 'line-color', '#dedfd4')
    setPaint(map, layerId, 'line-opacity', 0.38)
  }

  setPaint(map, 'building', 'fill-color', '#f0f1eb')
  setPaint(map, 'building', 'fill-outline-color', '#e4e6dc')
  setPaint(map, 'boundary_2', 'line-color', '#bec8bc')
  setPaint(map, 'boundary_2', 'line-opacity', 0.4)
  setPaint(map, 'boundary_3', 'line-color', '#c9d0c4')
  setPaint(map, 'boundary_disputed', 'line-color', '#c9d0c4')

  for (const layerId of LABEL_LAYERS) {
    setPaint(map, layerId, 'text-color', '#40575a')
    setPaint(map, layerId, 'text-halo-color', '#fbfbf5')
    setPaint(map, layerId, 'text-halo-width', 1.2)
  }
}

function syncBasemapMode(map: maplibregl.Map, mode: BasemapMode) {
  const imagery = mode === 'imagery'
  setVisibility(map, 'imagery-basemap', imagery)

  for (const layerId of LIGHT_BASEMAP_FILL_LAYERS) {
    setVisibility(map, layerId, !imagery)
  }

  for (const layerId of ROAD_LINE_LAYERS) {
    setVisibility(map, layerId, true)
    setPaint(map, layerId, 'line-opacity', imagery ? 0.28 : 0.42)
  }

  for (const layerId of LABEL_LAYERS) {
    setPaint(map, layerId, 'text-color', imagery ? '#f6f2e8' : '#40575a')
    setPaint(map, layerId, 'text-halo-color', imagery ? '#102f34' : '#fbfbf5')
    setPaint(map, layerId, 'text-halo-width', imagery ? 1.6 : 1.2)
  }
}

interface TooltipState {
  x: number
  y: number
  name: string
  types: string
  acreage: number | null
}

function eachPosition(coords: unknown, visit: (position: Position) => void) {
  if (!Array.isArray(coords)) return
  if (
    coords.length >= 2
    && typeof coords[0] === 'number'
    && typeof coords[1] === 'number'
  ) {
    visit(coords as Position)
    return
  }
  for (const child of coords) eachPosition(child, visit)
}

function extendBounds(bounds: maplibregl.LngLatBounds, geometry: Geometry | null) {
  if (!geometry) return
  if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries) extendBounds(bounds, child)
    return
  }
  eachPosition(geometry.coordinates, position => {
    bounds.extend([position[0], position[1]])
  })
}

function boundsForFeatures(features: Feature[]): maplibregl.LngLatBounds | null {
  const bounds = new maplibregl.LngLatBounds()
  for (const feature of features) extendBounds(bounds, feature.geometry)
  return bounds.isEmpty() ? null : bounds
}

function fitFeatureBounds(map: maplibregl.Map, features: Feature[], maxZoom = 12) {
  const bounds = boundsForFeatures(features)
  if (!bounds) return
  map.fitBounds(bounds, {
    padding: { top: 96, right: 80, bottom: 176, left: 360 },
    maxZoom,
    duration: 650,
  })
}

async function loadBoundaryData(
  cache: Map<string, Promise<FeatureCollection>>,
  cacheKey: keyof typeof BOUNDARY_DATA_PATHS
): Promise<FeatureCollection> {
  const existing = cache.get(cacheKey)
  if (existing) return existing

  const request = fetch(`${import.meta.env.BASE_URL}${BOUNDARY_DATA_PATHS[cacheKey]}`)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load ${BOUNDARY_DATA_PATHS[cacheKey]}`)
      return response.json() as Promise<FeatureCollection>
    })

  cache.set(cacheKey, request)
  return request
}

function boundaryFeaturesForTarget(
  data: FeatureCollection,
  target: BoundaryFocusTarget
): Feature[] {
  if (target.kind !== 'tributary') return data.features

  return data.features.filter(feature => (
    (feature.properties as Record<string, unknown> | null)?.['system_key'] === target.key
  ))
}

function layerVisibilityFilter(
  layerId: string,
  visibleDisplayIds: Set<string>,
  allVisible: boolean
): maplibregl.FilterSpecification | null {
  const sourceFilter = PROJECT_AREA_LAYERS.includes(layerId) ? AREA_GEOMETRY_FILTER : null
  if (allVisible) return sourceFilter ?? null

  const visibilityFilter = (
    visibleDisplayIds.size > 0
      ? ['in', ['get', 'display_id'], ['literal', [...visibleDisplayIds]]]
      : ['==', ['get', 'display_id'], '']
  )

  if (!sourceFilter) return visibilityFilter as unknown as maplibregl.FilterSpecification
  return ['all', sourceFilter, visibilityFilter] as unknown as maplibregl.FilterSpecification
}

function tributaryVisibilityFilter(visibleTributaries: Set<string>): maplibregl.FilterSpecification {
  if (visibleTributaries.size === 0) {
    return ['==', ['get', 'system_key'], ''] as unknown as maplibregl.FilterSpecification
  }

  return [
    'match',
    ['get', 'system_key'],
    [...visibleTributaries],
    true,
    false,
  ] as unknown as maplibregl.FilterSpecification
}

function layerSelectionFilter(
  layerId: string,
  selectedDisplayId: string | null
): maplibregl.FilterSpecification {
  const selectionFilter = (
    selectedDisplayId
      ? ['==', ['get', 'display_id'], selectedDisplayId]
      : ['==', ['get', 'display_id'], '']
  )

  // Point and centroid layers draw from single-point sources, so they must not
  // carry the polygon-only geometry filter that the fill/outline layers use.
  if (layerId.startsWith('projects-selected-point') || layerId.includes('centroid')) {
    return selectionFilter as unknown as maplibregl.FilterSpecification
  }

  return ['all', AREA_GEOMETRY_FILTER, selectionFilter] as unknown as maplibregl.FilterSpecification
}

function projectSourceForLayer(layerId: string): string {
  if (layerId.includes('point-path')) return 'project-point-paths'
  if (layerId.includes('point-marker') || layerId === 'projects-selected-point') {
    return 'project-point-markers'
  }
  if (layerId.includes('centroid')) return 'project-centroids'
  return 'projects'
}

// MapLibre serializes array properties to JSON strings in event handlers.
function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string' && value.startsWith('[')) {
    try { return JSON.parse(value) as string[] } catch { /* fall through */ }
  }
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

function acreageForProjectType(project: ProjectProperties, type: string): number | null {
  switch (type) {
    case 'bypass floodplain habitat':
      return project.acreage_bypass_floodplain
    case 'fish food production':
      return project.acreage_fish_food
    case 'rearing habitat':
      return project.acreage_tributary_rearing
    case 'spawning habitat':
      return project.acreage_tributary_spawning
    case 'tidal habitat':
      return project.acreage_tidal_wetland
    case 'tributary floodplain habitat':
      return project.acreage_tributary_floodplain
    default:
      return null
  }
}

function fallbackPrimaryType(types: string[]): string {
  if (types.length === 0) return 'other'
  if (types.length === 1) return types[0]

  return types.find(type => !NON_ACREAGE_PRIMARY_TYPES.has(type)) ?? types[0]
}

function primaryType(project: ProjectProperties, types: string[]): string {
  let primary: string | null = null
  let primaryAcreage = Number.NEGATIVE_INFINITY

  for (const type of types) {
    const acreage = acreageForProjectType(project, type)
    if (acreage == null) continue
    if (acreage > primaryAcreage) {
      primary = type
      primaryAcreage = acreage
    }
  }

  return primary ?? fallbackPrimaryType(types)
}

function addPrimaryType(raw: FeatureCollection): FeatureCollection {
  return {
    ...raw,
    features: raw.features.map((f: Feature) => {
      const p = (f.properties ?? {}) as ProjectProperties
      const types = parseList(p.project_type)
      return {
        ...f,
        properties: {
          ...f.properties,
          primary_type: primaryType(p, types),
          display_types: types.length > 0 ? types.join(', ') : 'unknown',
        },
      }
    }),
  }
}

function positionsForGeometry(geometry: Geometry | null): Position[] {
  const positions: Position[] = []
  if (!geometry) return positions
  if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries) positions.push(...positionsForGeometry(child))
    return positions
  }
  eachPosition(geometry.coordinates, position => positions.push(position))
  return positions
}

function singlePointFeatures(raw: FeatureCollection): Feature[] {
  return raw.features.filter(feature => feature.geometry?.type === 'Point')
}

function multiPointFeatures(raw: FeatureCollection): Feature[] {
  return raw.features.filter(feature => feature.geometry?.type === 'MultiPoint')
}

function dedupePositions(positions: Position[]): Position[] {
  const seen = new Set<string>()
  const unique: Position[] = []
  for (const position of positions) {
    const key = `${position[0].toFixed(7)},${position[1].toFixed(7)}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(position)
  }
  return unique
}

function squaredDistance(a: Position, b: Position): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

function orderPositionsForPath(positions: Position[]): Position[] {
  const remaining = dedupePositions(positions)
  if (remaining.length < 2) return remaining

  const startIndex = remaining.reduce((westernmostIndex, position, index) => (
    position[0] < remaining[westernmostIndex][0] ? index : westernmostIndex
  ), 0)
  const ordered = [remaining.splice(startIndex, 1)[0]]

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1]
    const nextIndex = remaining.reduce((closestIndex, position, index) => (
      squaredDistance(current, position) < squaredDistance(current, remaining[closestIndex])
        ? index
        : closestIndex
    ), 0)
    ordered.push(remaining.splice(nextIndex, 1)[0])
  }

  return ordered
}

function representativePosition(positions: Position[]): Position | null {
  const ordered = orderPositionsForPath(positions)
  if (ordered.length === 0) return null
  return ordered[Math.floor(ordered.length / 2)]
}

function buildPointMarkerData(raw: FeatureCollection): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: singlePointFeatures(raw).flatMap(feature => {
      const position = representativePosition(positionsForGeometry(feature.geometry))
      if (!position) return []
      return [{
        ...feature,
        geometry: { type: 'Point', coordinates: position },
      }]
    }),
  }
}

// Bounding-box centre — a cheap fallback marker position when no interior point
// can be derived (e.g. degenerate geometry).
function centroidForFeature(feature: Feature): Position | null {
  const bounds = boundsForFeatures([feature])
  if (!bounds) return null
  const center = bounds.getCenter()
  return [center.lng, center.lat]
}

// One outer ring plus any holes.
type PolygonPart = Position[][]

function ringSignedArea(ring: Position[]): number {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return area / 2
}

function polygonParts(geometry: Geometry | null): PolygonPart[] {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  return []
}

function largestPolygonPart(geometry: Geometry | null): PolygonPart | null {
  let best: PolygonPart | null = null
  let bestArea = Number.NEGATIVE_INFINITY
  for (const part of polygonParts(geometry)) {
    if (part.length === 0) continue
    const area = Math.abs(ringSignedArea(part[0]))
    if (area > bestArea) {
      bestArea = area
      best = part
    }
  }
  return best
}

// Even-odd ray cast.
function pointInRing(point: Position, ring: Position[]): boolean {
  let inside = false
  const [x, y] = point
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// Inside the outer ring and outside every hole.
function pointInPart(point: Position, part: PolygonPart): boolean {
  if (!pointInRing(point, part[0])) return false
  for (let h = 1; h < part.length; h++) {
    if (pointInRing(point, part[h])) return false
  }
  return true
}

function ringCentroid(ring: Position[]): Position {
  let x = 0
  let y = 0
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    x += (ring[j][0] + ring[i][0]) * f
    y += (ring[j][1] + ring[i][1]) * f
    a += f
  }
  a *= 3
  return a === 0 ? ring[0] : [x / a, y / a]
}

// Midpoint of the widest interior span where the horizontal line at `y` crosses
// the part, or null if the line misses it.
function widestInteriorSpanAt(part: PolygonPart, y: number): { x: number; width: number } | null {
  const crossings: number[] = []
  for (const ring of part) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const yi = ring[i][1]
      const yj = ring[j][1]
      if ((yi > y) !== (yj > y)) {
        crossings.push(((ring[j][0] - ring[i][0]) * (y - ring[i][1])) / (ring[j][1] - ring[i][1]) + ring[i][0])
      }
    }
  }
  crossings.sort((lhs, rhs) => lhs - rhs)
  let best: { x: number; width: number } | null = null
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const width = crossings[i + 1] - crossings[i]
    if (!best || width > best.width) best = { x: (crossings[i] + crossings[i + 1]) / 2, width }
  }
  return best
}

const POINT_ON_SURFACE_SAMPLES = 21

// A guaranteed-interior marker anchor. The area centroid of a concave or
// crescent footprint can land in a notch outside the polygon, so fall back to
// the midpoint of the widest interior scanline span across the largest part.
function pointOnSurface(geometry: Geometry | null): Position | null {
  const part = largestPolygonPart(geometry)
  if (!part || part[0].length === 0) return null

  const centroid = ringCentroid(part[0])
  if (pointInPart(centroid, part)) return centroid

  const ys = part[0].map(position => position[1])
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  let best: { x: number; y: number; width: number } | null = null
  for (let k = 1; k <= POINT_ON_SURFACE_SAMPLES; k++) {
    const y = minY + ((maxY - minY) * k) / (POINT_ON_SURFACE_SAMPLES + 1)
    const span = widestInteriorSpanAt(part, y)
    if (span && (!best || span.width > best.width)) best = { x: span.x, y, width: span.width }
  }
  return best ? [best.x, best.y] : null
}

// The dot becomes redundant once the footprint spans roughly this many pixels,
// and finishes fading out CENTROID_FADE_SPAN_ZOOM levels later. Start zoom is
// clamped so nothing fades absurdly early or lingers past the last fade stop.
// Lower target px => dots give way to polygons at lower zoom (more aggressive).
const CENTROID_FADE_TARGET_PX = 7
const CENTROID_FADE_SPAN_ZOOM = 0.5
const CENTROID_FADE_MIN_START = 7.75
const CENTROID_FADE_MAX_START = CENTROID_FADE_MAX_ZOOM - CENTROID_FADE_SPAN_ZOOM
const METERS_PER_DEGREE_LAT = 111320
// Web-mercator ground resolution (metres/pixel) at the equator, zoom 0.
const MERCATOR_METERS_PER_PIXEL_Z0 = 156543.03

// Per-feature fade window from footprint size: a larger polygon is legible at a
// lower zoom, so it sheds its overview dot earlier.
function fadeZoomsForFeature(feature: Feature): { start: number; end: number } {
  const bounds = boundsForFeatures([feature])
  if (!bounds) {
    return { start: CENTROID_FADE_MIN_START, end: CENTROID_FADE_MIN_START + CENTROID_FADE_SPAN_ZOOM }
  }
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  const lat = (sw.lat + ne.lat) / 2
  const cosLat = Math.max(0.1, Math.cos((lat * Math.PI) / 180))
  const widthMeters = Math.abs(ne.lng - sw.lng) * METERS_PER_DEGREE_LAT * cosLat
  const heightMeters = Math.abs(ne.lat - sw.lat) * METERS_PER_DEGREE_LAT
  const maxDimMeters = Math.max(widthMeters, heightMeters, 1)
  // Zoom at which maxDimMeters spans CENTROID_FADE_TARGET_PX on screen.
  const rawStart = Math.log2(
    (CENTROID_FADE_TARGET_PX * MERCATOR_METERS_PER_PIXEL_Z0 * cosLat) / maxDimMeters
  )
  const start = Math.min(CENTROID_FADE_MAX_START, Math.max(CENTROID_FADE_MIN_START, rawStart))
  return { start, end: start + CENTROID_FADE_SPAN_ZOOM }
}

function buildProjectCentroidData(raw: FeatureCollection): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: raw.features.flatMap(feature => {
      const type = feature.geometry?.type
      if (type !== 'Polygon' && type !== 'MultiPolygon') return []
      const position = pointOnSurface(feature.geometry) ?? centroidForFeature(feature)
      if (!position) return []
      const { start, end } = fadeZoomsForFeature(feature)
      return [{
        ...feature,
        properties: { ...feature.properties, fade_start: start, fade_end: end },
        geometry: { type: 'Point', coordinates: position },
      }]
    }),
  }
}

function buildPointPathData(raw: FeatureCollection): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: multiPointFeatures(raw).flatMap(feature => {
      const positions = orderPositionsForPath(positionsForGeometry(feature.geometry))
      if (positions.length < 2) return []
      return [{
        ...feature,
        geometry: { type: 'LineString', coordinates: positions },
      }]
    }),
  }
}

interface MapProps {
  data: FeatureCollection | null
  basemap: BasemapMode
  visibleDisplayIds: Set<string>
  fitProjectsOnInitialLoad: boolean
  projectFocusRequest: { displayId: string; seq: number } | null
  boundaryFocusRequest: { target: BoundaryFocusTarget; seq: number } | null
  fitVisibleRequest: number
  selectedDisplayId: string | null
  visibleTributaries: Set<string>
  deltaBoundaryVisible: boolean
  yoloBypassVisible: boolean
  sutterBypassVisible: boolean
  streamsVisible: boolean
  initialCenter: [number, number]
  initialZoom: number
  onProjectSelect: (displayId: string) => void
  onProjectDeselect: () => void
  onMoveEnd: (lat: number, lng: number, zoom: number) => void
}

export function Map({
  data,
  basemap,
  visibleDisplayIds,
  fitProjectsOnInitialLoad,
  projectFocusRequest,
  boundaryFocusRequest,
  fitVisibleRequest,
  selectedDisplayId,
  visibleTributaries,
  deltaBoundaryVisible,
  yoloBypassVisible,
  sutterBypassVisible,
  streamsVisible,
  initialCenter,
  initialZoom,
  onProjectSelect,
  onProjectDeselect,
  onMoveEnd,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const hoveredFeatureRef = useRef<HoveredMapFeature | null>(null)
  const featureClickedRef = useRef(false)
  const initialProjectFitDoneRef = useRef(false)
  const userInteractedBeforeInitialFitRef = useRef(false)
  const boundaryDataCacheRef = useRef<globalThis.Map<string, Promise<FeatureCollection>>>(new globalThis.Map())
  const onProjectSelectRef = useRef(onProjectSelect)
  const onProjectDeselectRef = useRef(onProjectDeselect)
  const onMoveEndRef = useRef(onMoveEnd)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [zoomHintVisible, setZoomHintVisible] = useState(() => initialZoom < ZOOM_HINT_HIDE_ZOOM)

  useEffect(() => { onProjectSelectRef.current = onProjectSelect }, [onProjectSelect])
  useEffect(() => { onProjectDeselectRef.current = onProjectDeselect }, [onProjectDeselect])
  useEffect(() => { onMoveEndRef.current = onMoveEnd }, [onMoveEnd])

  // Map setup — runs once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    ensurePmtilesProtocol()

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: initialCenter,
      zoom: initialZoom,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.on('load', () => {
      quietBasemap(map)
      syncBasemapMode(map, basemap)
      setMapLoaded(true)
    })

    map.on('moveend', () => {
      const c = map.getCenter()
      onMoveEndRef.current(c.lat, c.lng, map.getZoom())
    })

    // Toggle the "zoom in to see boundaries" hint. Functional update bails out
    // when unchanged, so the frequent 'zoom' event only re-renders on crossing.
    const syncZoomHint = () => {
      const visible = map.getZoom() < ZOOM_HINT_HIDE_ZOOM
      setZoomHintVisible(prev => (prev === visible ? prev : visible))
    }
    map.on('zoom', syncZoomHint)

    const markUserInteraction = () => {
      if (!initialProjectFitDoneRef.current) userInteractedBeforeInitialFitRef.current = true
    }

    map.on('dragstart', markUserInteraction)
    map.on('zoomstart', markUserInteraction)
    map.on('pitchstart', markUserInteraction)
    map.on('rotatestart', markUserInteraction)

    const handleProjectMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (!e.features?.length) return
      const feature = e.features[0]
      const source = projectSourceForLayer(feature.layer.id)

      if (hoveredFeatureRef.current) {
        map.setFeatureState(hoveredFeatureRef.current, { hovered: false })
      }
      const featureId = feature.id as number | string | undefined
      hoveredFeatureRef.current = featureId === undefined ? null : { source, id: featureId }
      if (hoveredFeatureRef.current) {
        map.setFeatureState(hoveredFeatureRef.current, { hovered: true })
      }

      const p = feature.properties as Record<string, unknown>
      setTooltip({
        x: e.point.x,
        y: e.point.y,
        name: String(p['project_name'] ?? ''),
        types: String(p['display_types'] ?? ''),
        acreage: typeof p['acreage'] === 'number' ? p['acreage'] : null,
      })

      map.getCanvas().style.cursor = 'pointer'
    }

    const handleProjectMouseLeave = () => {
      if (hoveredFeatureRef.current) {
        map.setFeatureState(hoveredFeatureRef.current, { hovered: false })
      }
      hoveredFeatureRef.current = null
      setTooltip(null)
      map.getCanvas().style.cursor = ''
    }

    const handleProjectClick = (e: maplibregl.MapLayerMouseEvent) => {
      featureClickedRef.current = true
      if (!e.features?.length) return
      const displayId = String(e.features[0].properties?.['display_id'] ?? '')
      if (displayId) onProjectSelectRef.current(displayId)
    }

    for (const layerId of PROJECT_INTERACTIVE_LAYERS) {
      map.on('mousemove', layerId, handleProjectMouseMove)
      map.on('mouseleave', layerId, handleProjectMouseLeave)
      map.on('click', layerId, handleProjectClick)
    }

    map.on('click', () => {
      if (featureClickedRef.current) {
        featureClickedRef.current = false
        return
      }
      onProjectDeselectRef.current()
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // initialCenter/initialZoom are read once — intentionally not in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync basemap mode
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    syncBasemapMode(mapRef.current, basemap)
  }, [basemap, mapLoaded])

  // Add watershed + project source/layers once both data and map are ready
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !data) return
    const map = mapRef.current
    if (map.getSource('projects')) return

    // HRL tributary watershed boundaries (USGS WBD, below projects).
    map.addSource('hrl-tributary-watersheds', {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/hrl-tributary-watersheds.geojson`,
    })
    map.addLayer({
      id: 'hrl-tributary-watersheds-fill',
      type: 'fill',
      source: 'hrl-tributary-watersheds',
      paint: {
        'fill-color': TRIBUTARY_WATERSHED_COLOR_EXPR,
        'fill-opacity': TRIBUTARY_WATERSHED_FILL_OPACITY_EXPR,
      },
    })
    map.addLayer({
      id: 'hrl-tributary-watersheds-outline',
      type: 'line',
      source: 'hrl-tributary-watersheds',
      paint: {
        'line-color': TRIBUTARY_WATERSHED_COLOR_EXPR,
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          5, 1.35,
          11, 1.9,
        ],
        'line-opacity': TRIBUTARY_WATERSHED_LINE_OPACITY_EXPR,
      },
    })
    // Sacramento-San Joaquin Delta legal boundary (DWR i03_LegalDeltaBoundary).
    map.addSource('delta-boundary', {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/delta-boundary.geojson`,
    })
    map.addLayer({
      id: 'delta-boundary-fill',
      type: 'fill',
      source: 'delta-boundary',
      paint: { 'fill-color': '#00504b', 'fill-opacity': 0.035 },
    })
    map.addLayer({
      id: 'delta-boundary-outline',
      type: 'line',
      source: 'delta-boundary',
      paint: {
        'line-color': '#00504b',
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          6, 1.6,
          11, 2.6,
        ],
        'line-opacity': 0.9,
        'line-dasharray': [2, 1.2],
      },
    })

    // Flood bypass boundaries (DWR i12_Flood_Bypasses_2014).
    // These are representational context layers, not legal boundaries.
    map.addSource('yolo-bypass-boundary', {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/yolo-bypass-boundary.geojson`,
    })
    map.addLayer({
      id: 'yolo-bypass-boundary-fill',
      type: 'fill',
      source: 'yolo-bypass-boundary',
      paint: { 'fill-color': '#e7a53d', 'fill-opacity': 0.045 },
    })
    map.addLayer({
      id: 'yolo-bypass-boundary-outline',
      type: 'line',
      source: 'yolo-bypass-boundary',
      paint: {
        'line-color': '#d6901a',
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          6, 1.5,
          11, 2.5,
        ],
        'line-opacity': 0.88,
        'line-dasharray': [2.4, 1.2],
      },
    })

    map.addSource('sutter-bypass-boundary', {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/sutter-bypass-boundary.geojson`,
    })
    map.addLayer({
      id: 'sutter-bypass-boundary-fill',
      type: 'fill',
      source: 'sutter-bypass-boundary',
      paint: { 'fill-color': '#b5ae42', 'fill-opacity': 0.045 },
    })
    map.addLayer({
      id: 'sutter-bypass-boundary-outline',
      type: 'line',
      source: 'sutter-bypass-boundary',
      paint: {
        'line-color': '#8e8934',
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          6, 1.5,
          11, 2.5,
        ],
        'line-opacity': 0.88,
        'line-dasharray': [1.2, 1.1],
      },
    })

    // Stream network (NHDPlus V2, above watershed fill, below projects).
    // Generated by scripts/fetch-streams.py; absent until that script is run,
    // in which case MapLibre logs a load error and the layer is simply empty.
    map.addSource('streams', {
      type: 'vector',
      url: `pmtiles://${import.meta.env.BASE_URL}data/streams.pmtiles`,
    })
    map.addLayer({
      id: 'streams-line',
      type: 'line',
      source: 'streams',
      'source-layer': 'streams',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#5f9faa',
        'line-opacity': 0.64,
        // Width grows with both zoom and Strahler stream order. The tile build
        // only ships 5th-order-and-larger flowlines to keep this base layer quiet.
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          5, ['interpolate', ['linear'], ['get', 'streamorder'], 5, 0.6, 8, 1.4],
          11, ['interpolate', ['linear'], ['get', 'streamorder'], 5, 1.1, 8, 2.8],
          14, ['interpolate', ['linear'], ['get', 'streamorder'], 5, 1.7, 8, 4],
        ],
      },
    })
    map.addLayer({
      id: 'stream-waterbodies-fill',
      type: 'fill',
      source: 'streams',
      'source-layer': 'waterbodies',
      paint: {
        'fill-color': '#cfe4e5',
        'fill-opacity': [
          'interpolate', ['linear'], ['zoom'],
          5, 0.62,
          10, 0.72,
        ],
      },
    })
    map.addLayer({
      id: 'stream-waterbodies-outline',
      type: 'line',
      source: 'streams',
      'source-layer': 'waterbodies',
      paint: {
        'line-color': '#7faeb3',
        'line-opacity': 0.54,
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          5, 0.4,
          12, 1.1,
        ],
      },
    })
    map.addLayer({
      id: 'streams-mainstem-label',
      type: 'symbol',
      source: 'streams',
      'source-layer': 'streams',
      minzoom: 5,
      filter: [
        'all',
        ['!=', ['get', 'gnis_name'], ''],
        ['>=', ['get', 'streamorder'], 7],
      ],
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': [
          'interpolate', ['linear'], ['zoom'],
          5, 480,
          10, 760,
        ],
        'text-field': ['get', 'gnis_name'],
        'text-font': ['Noto Sans Italic'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          5, 11,
          10, 13,
          13, 15,
        ],
        'text-max-angle': 35,
        'text-padding': 12,
        'text-rotation-alignment': 'map',
      },
      paint: {
        'text-color': '#4e7f87',
        'text-halo-color': '#fbfbf5',
        'text-halo-width': 1.6,
        'text-halo-blur': 0.4,
        'text-opacity': [
          'interpolate', ['linear'], ['zoom'],
          5, 0.72,
          8, 0.9,
        ],
      },
    })
    map.addLayer({
      id: 'streams-tributary-label',
      type: 'symbol',
      source: 'streams',
      'source-layer': 'streams',
      minzoom: 8,
      filter: [
        'all',
        ['!=', ['get', 'gnis_name'], ''],
        ['>=', ['get', 'streamorder'], 5],
        ['<', ['get', 'streamorder'], 7],
      ],
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': [
          'interpolate', ['linear'], ['zoom'],
          8, 560,
          12, 820,
        ],
        'text-field': ['get', 'gnis_name'],
        'text-font': ['Noto Sans Italic'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          8, 10.5,
          12, 13,
        ],
        'text-max-angle': 35,
        'text-padding': 10,
        'text-rotation-alignment': 'map',
      },
      paint: {
        'text-color': '#5f8d94',
        'text-halo-color': '#fbfbf5',
        'text-halo-width': 1.5,
        'text-halo-blur': 0.4,
        'text-opacity': [
          'interpolate', ['linear'], ['zoom'],
          8, 0.0,
          9, 0.78,
          12, 0.9,
        ],
      },
    })
    // Project layers
    const prepared = addPrimaryType(data)
    map.addSource('projects', { type: 'geojson', data: prepared, generateId: true })
    map.addSource('project-point-markers', {
      type: 'geojson',
      data: buildPointMarkerData(prepared),
      generateId: true,
    })
    map.addSource('project-point-paths', {
      type: 'geojson',
      data: buildPointPathData(prepared),
      generateId: true,
    })
    map.addSource('project-centroids', {
      type: 'geojson',
      data: buildProjectCentroidData(prepared),
      generateId: true,
    })

    map.addLayer({
      id: 'projects-fill',
      type: 'fill',
      source: 'projects',
      filter: AREA_GEOMETRY_FILTER,
      paint: {
        'fill-color': TYPE_MATCH_EXPR,
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.75, 0.5],
      },
    })
    map.addLayer({
      id: 'projects-outline',
      type: 'line',
      source: 'projects',
      filter: AREA_GEOMETRY_FILTER,
      paint: {
        'line-color': TYPE_MATCH_EXPR,
        'line-width': ['case', ['boolean', ['feature-state', 'hovered'], false], 2, 1],
        'line-opacity': 0.9,
      },
    })
    map.addLayer({
      id: 'projects-point-path',
      type: 'line',
      source: 'project-point-paths',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': TYPE_MATCH_EXPR,
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          5, ['case', ['boolean', ['feature-state', 'hovered'], false], 8, 6],
          10, ['case', ['boolean', ['feature-state', 'hovered'], false], 18, 14],
          14, ['case', ['boolean', ['feature-state', 'hovered'], false], 34, 28],
        ],
        'line-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.42, 0.28],
      },
    })
    map.addLayer({
      id: 'projects-point-marker',
      type: 'circle',
      source: 'project-point-markers',
      paint: {
        'circle-color': TYPE_MATCH_EXPR,
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          5, ['case', ['boolean', ['feature-state', 'hovered'], false], 5.5, 4],
          10, ['case', ['boolean', ['feature-state', 'hovered'], false], 7, 5.5],
          14, ['case', ['boolean', ['feature-state', 'hovered'], false], 8.5, 7],
        ],
        'circle-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.95, 0.78],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hovered'], false], 2.2, 1.5],
        'circle-stroke-opacity': 0.92,
      },
    })
    // Overview markers: one dot per polygon project, giving each a guaranteed
    // minimum size at low zoom. They cross-fade to nothing as the true footprint
    // becomes legible, so polygon inspection at close zoom is unaffected.
    map.addLayer({
      id: 'projects-centroid-marker',
      type: 'circle',
      source: 'project-centroids',
      paint: {
        'circle-color': TYPE_MATCH_EXPR,
        // A property may hold only one zoom-based interpolate, so the hover boost
        // rides inside the interpolate stops rather than wrapping two of them.
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          5, ['case', ['boolean', ['feature-state', 'hovered'], false], 5.5, 4],
          10, ['case', ['boolean', ['feature-state', 'hovered'], false], 7, 5.5],
          14, ['case', ['boolean', ['feature-state', 'hovered'], false], 8.5, 7],
        ],
        'circle-opacity': centroidFadeOpacity(
          ['case', ['boolean', ['feature-state', 'hovered'], false], 0.95, 0.82] as unknown as maplibregl.ExpressionSpecification
        ),
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hovered'], false], 2.2, 1.5],
        'circle-stroke-opacity': centroidFadeOpacity(0.92),
      },
    })

    map.addLayer({
      id: 'projects-selected-outer-halo',
      type: 'line',
      source: 'projects',
      filter: layerSelectionFilter('projects-selected-outer-halo', null),
      paint: {
        'line-color': SELECTED_PROJECT_CONTRAST_COLOR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 4.4, 10, 5.6, 14, 6.8],
        'line-opacity': 0.86,
      },
    })
    map.addLayer({
      id: 'projects-selected-halo',
      type: 'line',
      source: 'projects',
      filter: layerSelectionFilter('projects-selected-halo', null),
      paint: {
        'line-color': SELECTED_PROJECT_HALO_COLOR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.4, 10, 3.2, 14, 4],
        'line-opacity': 0.98,
      },
    })
    map.addLayer({
      id: 'projects-selected-point-path-backing',
      type: 'line',
      source: 'project-point-paths',
      filter: layerSelectionFilter('projects-selected-point-path-backing', null),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': SELECTED_PROJECT_CONTRAST_COLOR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 8, 10, 17, 14, 30],
        'line-opacity': 0.7,
      },
    })
    map.addLayer({
      id: 'projects-selected-point-path-halo',
      type: 'line',
      source: 'project-point-paths',
      filter: layerSelectionFilter('projects-selected-point-path-halo', null),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': SELECTED_PROJECT_HALO_COLOR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 5.4, 10, 8.8, 14, 12.5],
        'line-opacity': 0.96,
      },
    })
    map.addLayer({
      id: 'projects-selected-point-halo',
      type: 'circle',
      source: 'project-point-markers',
      filter: layerSelectionFilter('projects-selected-point-halo', null),
      paint: {
        'circle-color': SELECTED_PROJECT_CONTRAST_COLOR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8.8, 10, 11.2, 14, 13.5],
        'circle-opacity': 0.84,
      },
    })
    map.addLayer({
      id: 'projects-selected-point',
      type: 'circle',
      source: 'project-point-markers',
      filter: layerSelectionFilter('projects-selected-point', null),
      paint: {
        'circle-color': SELECTED_PROJECT_HALO_COLOR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4.8, 10, 6.6, 14, 8.6],
        'circle-opacity': 0.98,
        'circle-stroke-color': SELECTED_PROJECT_CONTRAST_COLOR,
        'circle-stroke-width': 1.4,
        'circle-stroke-opacity': 1,
      },
    })
    // Selection feedback for the overview markers, so selecting a project while
    // zoomed out is visible even though the polygon halo is still sub-pixel.
    // Fades out on the same schedule as the overview markers themselves.
    map.addLayer({
      id: 'projects-selected-centroid-halo',
      type: 'circle',
      source: 'project-centroids',
      filter: layerSelectionFilter('projects-selected-centroid-halo', null),
      paint: {
        'circle-color': SELECTED_PROJECT_CONTRAST_COLOR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8.8, 10, 11.2],
        'circle-opacity': centroidFadeOpacity(0.84),
      },
    })
    map.addLayer({
      id: 'projects-selected-centroid',
      type: 'circle',
      source: 'project-centroids',
      filter: layerSelectionFilter('projects-selected-centroid', null),
      paint: {
        'circle-color': SELECTED_PROJECT_HALO_COLOR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4.8, 10, 6.6],
        'circle-opacity': centroidFadeOpacity(0.98),
        'circle-stroke-color': SELECTED_PROJECT_CONTRAST_COLOR,
        'circle-stroke-width': 1.4,
        'circle-stroke-opacity': centroidFadeOpacity(1),
      },
    })

    if (
      fitProjectsOnInitialLoad
      && !initialProjectFitDoneRef.current
      && !userInteractedBeforeInitialFitRef.current
    ) {
      const initiallyVisibleFeatures = data.features.filter(f => (
        visibleDisplayIds.has((f.properties as ProjectProperties).display_id)
      ))
      initialProjectFitDoneRef.current = true
      fitFeatureBounds(map, initiallyVisibleFeatures, 9)
    }
  }, [data, fitProjectsOnInitialLoad, mapLoaded, visibleDisplayIds])

  // Sync project filters
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('projects-fill')) return

    const allVisible = !data || visibleDisplayIds.size === data.features.length
    for (const layerId of PROJECT_FILTERED_LAYERS) {
      map.setFilter(layerId, layerVisibilityFilter(layerId, visibleDisplayIds, allVisible))
    }
  }, [data, mapLoaded, visibleDisplayIds])

  // Zoom to a requested project
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !data || !projectFocusRequest) return
    const features = data.features.filter(f => (
      (f.properties as ProjectProperties).display_id === projectFocusRequest.displayId
    ))
    fitFeatureBounds(mapRef.current, features, 13)
  }, [data, mapLoaded, projectFocusRequest])

  // Zoom to a requested boundary
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !boundaryFocusRequest) return

    let cancelled = false
    const map = mapRef.current
    const { target } = boundaryFocusRequest
    const cacheKey = target.kind === 'tributary' ? 'tributaries' : target.kind

    loadBoundaryData(boundaryDataCacheRef.current, cacheKey)
      .then(boundaryData => {
        if (cancelled) return
        fitFeatureBounds(map, boundaryFeaturesForTarget(boundaryData, target), 10)
      })
      .catch(err => console.error('Failed to zoom to boundary', err))

    return () => { cancelled = true }
  }, [boundaryFocusRequest, mapLoaded])

  // Fit the map to currently visible/filtered projects
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !data || fitVisibleRequest === 0) return
    const features = data.features.filter(f => (
      visibleDisplayIds.has((f.properties as ProjectProperties).display_id)
    ))
    fitFeatureBounds(mapRef.current, features, 11)
  }, [data, fitVisibleRequest, mapLoaded, visibleDisplayIds])

  // Sync HRL tributary watershed visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('hrl-tributary-watersheds-fill')) return
    map.setFilter('hrl-tributary-watersheds-fill', tributaryVisibilityFilter(visibleTributaries))
    map.setFilter('hrl-tributary-watersheds-outline', tributaryVisibilityFilter(visibleTributaries))
  }, [data, visibleTributaries, mapLoaded])

  // Sync Delta legal boundary visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('delta-boundary-fill')) return
    const vis = deltaBoundaryVisible ? 'visible' : 'none'
    map.setLayoutProperty('delta-boundary-fill', 'visibility', vis)
    map.setLayoutProperty('delta-boundary-outline', 'visibility', vis)
  }, [data, deltaBoundaryVisible, mapLoaded])

  // Sync Yolo Bypass boundary visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('yolo-bypass-boundary-fill')) return
    const vis = yoloBypassVisible ? 'visible' : 'none'
    map.setLayoutProperty('yolo-bypass-boundary-fill', 'visibility', vis)
    map.setLayoutProperty('yolo-bypass-boundary-outline', 'visibility', vis)
  }, [data, yoloBypassVisible, mapLoaded])

  // Sync Sutter Bypass boundary visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('sutter-bypass-boundary-fill')) return
    const vis = sutterBypassVisible ? 'visible' : 'none'
    map.setLayoutProperty('sutter-bypass-boundary-fill', 'visibility', vis)
    map.setLayoutProperty('sutter-bypass-boundary-outline', 'visibility', vis)
  }, [data, sutterBypassVisible, mapLoaded])

  // Sync stream-network visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('streams-line')) return
    const vis = streamsVisible ? 'visible' : 'none'
    map.setLayoutProperty('stream-waterbodies-fill', 'visibility', vis)
    map.setLayoutProperty('stream-waterbodies-outline', 'visibility', vis)
    map.setLayoutProperty('streams-line', 'visibility', vis)
    map.setLayoutProperty('streams-mainstem-label', 'visibility', vis)
    map.setLayoutProperty('streams-tributary-label', 'visibility', vis)
  }, [data, streamsVisible, mapLoaded])

  // Sync selection highlight filter
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('projects-selected-halo')) return

    for (const layerId of PROJECT_SELECTED_LAYERS) {
      map.setFilter(layerId, layerSelectionFilter(layerId, selectedDisplayId))
    }
  }, [selectedDisplayId, mapLoaded])

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.container} />
      <div
        className={`${styles.zoomHint} ${zoomHintVisible ? styles.zoomHintVisible : ''}`}
        role="status"
        aria-hidden={!zoomHintVisible}
      >
        <span className={styles.zoomHintDot} aria-hidden="true" />
        Projects shown as points — zoom in to see boundaries
      </div>
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 14, top: tooltip.y - 14 }}
        >
          <strong className={styles.tooltipName}>{tooltip.name}</strong>
          <span className={styles.tooltipType}>{tooltip.types}</span>
          {tooltip.acreage != null && (
            <span className={styles.tooltipAcreage}>
              {ACREAGE_LABEL}: {formatAcreage(tooltip.acreage, 2)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
