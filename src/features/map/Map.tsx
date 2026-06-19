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
  setPaint(map, 'background', 'background-color', '#fafaf7')
  addImageryBasemap(map)
  addSubtleTerrainShading(map)

  setPaint(map, 'park', 'fill-color', '#f2f4ef')
  setPaint(map, 'park', 'fill-opacity', 0.42)
  setPaint(map, 'landcover_wood', 'fill-color', '#eef1ec')
  setPaint(map, 'landcover_wood', 'fill-opacity', 0.35)
  setPaint(map, 'landuse_residential', 'fill-color', '#f4f4f0')
  setPaint(map, 'landuse_residential', 'fill-opacity', 0.32)
  setPaint(map, 'landcover_glacier', 'fill-opacity', 0.18)
  setPaint(map, 'landcover_ice_shelf', 'fill-opacity', 0.18)

  setPaint(map, 'water', 'fill-color', '#edf3f5')
  setPaint(map, 'water', 'fill-opacity', 0.68)
  setPaint(map, 'waterway', 'line-color', '#cbdde4')
  setPaint(map, 'waterway', 'line-opacity', 0.18)

  for (const layerId of ROAD_LINE_LAYERS) {
    setPaint(map, layerId, 'line-color', '#deded8')
    setPaint(map, layerId, 'line-opacity', 0.42)
  }

  setPaint(map, 'building', 'fill-color', '#f1f1ed')
  setPaint(map, 'building', 'fill-outline-color', '#e6e6df')
  setPaint(map, 'boundary_2', 'line-color', '#c9c9c2')
  setPaint(map, 'boundary_2', 'line-opacity', 0.42)
  setPaint(map, 'boundary_3', 'line-color', '#d1d1ca')
  setPaint(map, 'boundary_disputed', 'line-color', '#d1d1ca')

  for (const layerId of LABEL_LAYERS) {
    setPaint(map, layerId, 'text-color', '#4e4e49')
    setPaint(map, layerId, 'text-halo-color', '#fafaf7')
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
    setPaint(map, layerId, 'text-color', imagery ? '#f4f0e8' : '#4e4e49')
    setPaint(map, layerId, 'text-halo-color', imagery ? '#171915' : '#fafaf7')
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

interface MapProps {
  data: FeatureCollection | null
  basemap: BasemapMode
  visibleDisplayIds: Set<string>
  projectFocusRequest: { displayId: string; seq: number } | null
  fitVisibleRequest: number
  selectedDisplayId: string | null
  sacramentoWatershedVisible: boolean
  sanJoaquinWatershedVisible: boolean
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
  sanJoaquinWatershedVisible,
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
  const hoveredIdRef = useRef<number | string | undefined>(undefined)
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

    map.on('mousemove', 'projects-fill', e => {
      if (!e.features?.length) return
      const feature = e.features[0]

      if (hoveredIdRef.current !== undefined) {
        map.setFeatureState({ source: 'projects', id: hoveredIdRef.current }, { hovered: false })
      }
      hoveredIdRef.current = feature.id as number | string | undefined
      if (hoveredIdRef.current !== undefined) {
        map.setFeatureState({ source: 'projects', id: hoveredIdRef.current }, { hovered: true })
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
    })

    map.on('mouseleave', 'projects-fill', () => {
      if (hoveredIdRef.current !== undefined) {
        map.setFeatureState({ source: 'projects', id: hoveredIdRef.current }, { hovered: false })
      }
      hoveredIdRef.current = undefined
      setTooltip(null)
      map.getCanvas().style.cursor = ''
    })

    map.on('click', 'projects-fill', e => {
      featureClickedRef.current = true
      if (!e.features?.length) return
      const displayId = String(e.features[0].properties?.['display_id'] ?? '')
      if (displayId) onProjectSelectRef.current(displayId)
    })

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
      paint: { 'fill-color': '#6f9fbd', 'fill-opacity': 0.04 },
    })
    map.addLayer({
      id: 'sacramento-watershed-outline',
      type: 'line',
      source: 'sacramento-watershed',
      paint: { 'line-color': '#3f7f9f', 'line-width': 1.8, 'line-opacity': 0.82 },
    })

    // San Joaquin watershed boundary (HUC4 1804, below projects)
    map.addSource('san-joaquin-watershed', {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/san-joaquin-watershed.geojson`,
    })
    map.addLayer({
      id: 'san-joaquin-watershed-fill',
      type: 'fill',
      source: 'san-joaquin-watershed',
      paint: { 'fill-color': '#83a976', 'fill-opacity': 0.04 },
    })
    map.addLayer({
      id: 'san-joaquin-watershed-outline',
      type: 'line',
      source: 'san-joaquin-watershed',
      paint: { 'line-color': '#5f8e57', 'line-width': 1.8, 'line-opacity': 0.84 },
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
      paint: { 'fill-color': '#817094', 'fill-opacity': 0.035 },
    })
    map.addLayer({
      id: 'delta-boundary-outline',
      type: 'line',
      source: 'delta-boundary',
      paint: {
        'line-color': '#72528f',
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
      paint: { 'fill-color': '#b86b31', 'fill-opacity': 0.045 },
    })
    map.addLayer({
      id: 'yolo-bypass-boundary-outline',
      type: 'line',
      source: 'yolo-bypass-boundary',
      paint: {
        'line-color': '#a45d2b',
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
      paint: { 'fill-color': '#b8942b', 'fill-opacity': 0.045 },
    })
    map.addLayer({
      id: 'sutter-bypass-boundary-outline',
      type: 'line',
      source: 'sutter-bypass-boundary',
      paint: {
        'line-color': '#9b7a23',
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
        'line-color': '#4f9ac1',
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
        'fill-color': '#c5e3ed',
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
        'line-color': '#5f9fb8',
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
        'text-color': '#276f91',
        'text-halo-color': '#fafaf7',
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
        'text-color': '#3c7f9e',
        'text-halo-color': '#fafaf7',
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

    map.addLayer({
      id: 'projects-fill',
      type: 'fill',
      source: 'projects',
      paint: {
        'fill-color': TYPE_MATCH_EXPR,
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hovered'], false], 0.75, 0.5],
      },
    })
    map.addLayer({
      id: 'projects-outline',
      type: 'line',
      source: 'projects',
      paint: {
        'line-color': TYPE_MATCH_EXPR,
        'line-width': ['case', ['boolean', ['feature-state', 'hovered'], false], 2, 1],
        'line-opacity': 0.9,
      },
    })

    const noMatch = ['==', ['get', 'display_id'], ''] as unknown as maplibregl.FilterSpecification
    map.addLayer({
      id: 'projects-selected-halo',
      type: 'line',
      source: 'projects',
      filter: noMatch,
      paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.95 },
    })
    map.addLayer({
      id: 'projects-selected-outline',
      type: 'line',
      source: 'projects',
      filter: noMatch,
      paint: { 'line-color': TYPE_MATCH_EXPR, 'line-width': 2.5, 'line-opacity': 1 },
    })
  }, [data, mapLoaded])

  // Sync project filters
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('projects-fill')) return

    if (!data || visibleDisplayIds.size === data.features.length) {
      map.setFilter('projects-fill', null)
      map.setFilter('projects-outline', null)
    } else {
      const filter = (
        visibleDisplayIds.size > 0
          ? ['in', ['get', 'display_id'], ['literal', [...visibleDisplayIds]]]
          : ['==', ['get', 'display_id'], '']
      ) as unknown as maplibregl.FilterSpecification
      map.setFilter('projects-fill', filter)
      map.setFilter('projects-outline', filter)
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

  // Sync San Joaquin watershed visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('san-joaquin-watershed-fill')) return
    const vis = sanJoaquinWatershedVisible ? 'visible' : 'none'
    map.setLayoutProperty('san-joaquin-watershed-fill', 'visibility', vis)
    map.setLayoutProperty('san-joaquin-watershed-outline', 'visibility', vis)
  }, [data, sanJoaquinWatershedVisible, mapLoaded])

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

    const filter = (
      selectedDisplayId
        ? ['==', ['get', 'display_id'], selectedDisplayId]
        : ['==', ['get', 'display_id'], '']
    ) as unknown as maplibregl.FilterSpecification

    map.setFilter('projects-selected-halo', filter)
    map.setFilter('projects-selected-outline', filter)
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
