import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import type { FeatureCollection, Feature, Geometry, Position } from 'geojson'
import { TYPE_MATCH_EXPR } from './project-colors'
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
const PROJECT_FILTERED_LAYERS = [...PROJECT_AREA_LAYERS, ...PROJECT_POINT_LAYERS]
const PROJECT_INTERACTIVE_LAYERS = ['projects-fill', 'projects-point-path', 'projects-point-marker']
const PROJECT_SELECTED_LAYERS = [
  'projects-selected-halo',
  'projects-selected-outline',
  'projects-selected-point-path-fill',
  'projects-selected-point-path-halo',
  'projects-selected-point-path',
  'projects-selected-point-halo',
  'projects-selected-point',
]

const AREA_GEOMETRY_FILTER = ['==', ['geometry-type'], 'Polygon'] as unknown as maplibregl.FilterSpecification

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

function layerSelectionFilter(
  layerId: string,
  selectedDisplayId: string | null
): maplibregl.FilterSpecification {
  const selectionFilter = (
    selectedDisplayId
      ? ['==', ['get', 'display_id'], selectedDisplayId]
      : ['==', ['get', 'display_id'], '']
  )

  if (layerId.startsWith('projects-selected-point')) {
    return selectionFilter as unknown as maplibregl.FilterSpecification
  }

  return ['all', AREA_GEOMETRY_FILTER, selectionFilter] as unknown as maplibregl.FilterSpecification
}

function projectSourceForLayer(layerId: string): string {
  if (layerId.includes('point-path')) return 'project-point-paths'
  if (layerId.includes('point-marker') || layerId === 'projects-selected-point') {
    return 'project-point-markers'
  }
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
          primary_type: types[0] ?? 'other',
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
  projectFocusRequest: { displayId: string; seq: number } | null
  fitVisibleRequest: number
  selectedDisplayId: string | null
  sacramentoWatershedVisible: boolean
  mokelumneWatershedVisible: boolean
  tuolumneWatershedVisible: boolean
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
  projectFocusRequest,
  fitVisibleRequest,
  selectedDisplayId,
  sacramentoWatershedVisible,
  mokelumneWatershedVisible,
  tuolumneWatershedVisible,
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
  const onProjectSelectRef = useRef(onProjectSelect)
  const onProjectDeselectRef = useRef(onProjectDeselect)
  const onMoveEndRef = useRef(onMoveEnd)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

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
        name: String(p['display_name'] ?? p['project_name'] ?? ''),
        types: String(p['display_types'] ?? ''),
        acreage: typeof p['display_acreage'] === 'number' ? p['display_acreage'] : null,
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

    // Sacramento watershed boundary (HUC4 1802, below projects)
    map.addSource('sacramento-watershed', {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/sacramento-watershed.geojson`,
    })
    map.addLayer({
      id: 'sacramento-watershed-fill',
      type: 'fill',
      source: 'sacramento-watershed',
      paint: { 'fill-color': '#7fb6b2', 'fill-opacity': 0.035 },
    })
    map.addLayer({
      id: 'sacramento-watershed-outline',
      type: 'line',
      source: 'sacramento-watershed',
      paint: { 'line-color': '#4f8f8b', 'line-width': 1.6, 'line-opacity': 0.68 },
    })

    // Mokelumne watershed boundary (WBD HUC8 18040012, below projects)
    map.addSource('mokelumne-watershed', {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/mokelumne-watershed.geojson`,
    })
    map.addLayer({
      id: 'mokelumne-watershed-fill',
      type: 'fill',
      source: 'mokelumne-watershed',
      paint: { 'fill-color': '#b5ae42', 'fill-opacity': 0.04 },
    })
    map.addLayer({
      id: 'mokelumne-watershed-outline',
      type: 'line',
      source: 'mokelumne-watershed',
      paint: { 'line-color': '#7b8f34', 'line-width': 1.8, 'line-opacity': 0.84 },
    })

    // Tuolumne watershed boundary (WBD HUC8 18040009, below projects)
    map.addSource('tuolumne-watershed', {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/tuolumne-watershed.geojson`,
    })
    map.addLayer({
      id: 'tuolumne-watershed-fill',
      type: 'fill',
      source: 'tuolumne-watershed',
      paint: { 'fill-color': '#e7a53d', 'fill-opacity': 0.04 },
    })
    map.addLayer({
      id: 'tuolumne-watershed-outline',
      type: 'line',
      source: 'tuolumne-watershed',
      paint: { 'line-color': '#b07812', 'line-width': 1.8, 'line-opacity': 0.84 },
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
          'case',
          ['boolean', ['feature-state', 'hovered'], false],
          ['interpolate', ['linear'], ['zoom'], 5, 8, 10, 18, 14, 34],
          ['interpolate', ['linear'], ['zoom'], 5, 6, 10, 14, 14, 28],
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
          'case',
          ['boolean', ['feature-state', 'hovered'], false],
          ['interpolate', ['linear'], ['zoom'], 5, 5.5, 10, 7, 14, 8.5],
          ['interpolate', ['linear'], ['zoom'], 5, 4, 10, 5.5, 14, 7],
        ],
        'circle-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.95, 0.78],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hovered'], false], 2.2, 1.5],
        'circle-stroke-opacity': 0.92,
      },
    })

    map.addLayer({
      id: 'projects-selected-halo',
      type: 'line',
      source: 'projects',
      filter: layerSelectionFilter('projects-selected-halo', null),
      paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.95 },
    })
    map.addLayer({
      id: 'projects-selected-outline',
      type: 'line',
      source: 'projects',
      filter: layerSelectionFilter('projects-selected-outline', null),
      paint: { 'line-color': TYPE_MATCH_EXPR, 'line-width': 2.5, 'line-opacity': 1 },
    })
    map.addLayer({
      id: 'projects-selected-point-path-fill',
      type: 'line',
      source: 'project-point-paths',
      filter: layerSelectionFilter('projects-selected-point-path-fill', null),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': TYPE_MATCH_EXPR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 8, 10, 18, 14, 34],
        'line-opacity': 0.36,
      },
    })
    map.addLayer({
      id: 'projects-selected-point-path-halo',
      type: 'line',
      source: 'project-point-paths',
      filter: layerSelectionFilter('projects-selected-point-path-halo', null),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 4.6, 10, 8.5, 14, 13],
        'line-opacity': 0.72,
      },
    })
    map.addLayer({
      id: 'projects-selected-point-path',
      type: 'line',
      source: 'project-point-paths',
      filter: layerSelectionFilter('projects-selected-point-path', null),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': TYPE_MATCH_EXPR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.4, 10, 2.2, 14, 3],
        'line-opacity': 0.9,
      },
    })
    map.addLayer({
      id: 'projects-selected-point-halo',
      type: 'circle',
      source: 'project-point-markers',
      filter: layerSelectionFilter('projects-selected-point-halo', null),
      paint: {
        'circle-color': '#ffffff',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8, 10, 10, 14, 12],
        'circle-opacity': 0.92,
      },
    })
    map.addLayer({
      id: 'projects-selected-point',
      type: 'circle',
      source: 'project-point-markers',
      filter: layerSelectionFilter('projects-selected-point', null),
      paint: {
        'circle-color': TYPE_MATCH_EXPR,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4.8, 10, 6.6, 14, 8.5],
        'circle-opacity': 0.98,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.6,
        'circle-stroke-opacity': 0.96,
      },
    })
  }, [data, mapLoaded])

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

  // Fit the map to currently visible/filtered projects
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !data || fitVisibleRequest === 0) return
    const features = data.features.filter(f => (
      visibleDisplayIds.has((f.properties as ProjectProperties).display_id)
    ))
    fitFeatureBounds(mapRef.current, features, 11)
  }, [data, fitVisibleRequest, mapLoaded, visibleDisplayIds])

  // Sync Sacramento watershed visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('sacramento-watershed-fill')) return
    const vis = sacramentoWatershedVisible ? 'visible' : 'none'
    map.setLayoutProperty('sacramento-watershed-fill', 'visibility', vis)
    map.setLayoutProperty('sacramento-watershed-outline', 'visibility', vis)
  }, [data, sacramentoWatershedVisible, mapLoaded])

  // Sync Mokelumne watershed visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('mokelumne-watershed-fill')) return
    const vis = mokelumneWatershedVisible ? 'visible' : 'none'
    map.setLayoutProperty('mokelumne-watershed-fill', 'visibility', vis)
    map.setLayoutProperty('mokelumne-watershed-outline', 'visibility', vis)
  }, [data, mokelumneWatershedVisible, mapLoaded])

  // Sync Tuolumne watershed visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('tuolumne-watershed-fill')) return
    const vis = tuolumneWatershedVisible ? 'visible' : 'none'
    map.setLayoutProperty('tuolumne-watershed-fill', 'visibility', vis)
    map.setLayoutProperty('tuolumne-watershed-outline', 'visibility', vis)
  }, [data, tuolumneWatershedVisible, mapLoaded])

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
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 14, top: tooltip.y - 14 }}
        >
          <strong className={styles.tooltipName}>{tooltip.name}</strong>
          <span className={styles.tooltipType}>{tooltip.types}</span>
          {tooltip.acreage != null && (
            <span className={styles.tooltipAcreage}>
              {tooltip.acreage.toLocaleString()} ac
            </span>
          )}
        </div>
      )}
    </div>
  )
}
