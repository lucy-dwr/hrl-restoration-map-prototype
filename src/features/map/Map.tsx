import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, Feature } from 'geojson'
import { TYPE_MATCH_EXPR } from './project-colors'
import type { ProjectProperties } from '../../data/types'
import styles from './Map.module.css'

interface TooltipState {
  x: number
  y: number
  name: string
  types: string
  acreage: number | null
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
  selectedDisplayId: string | null
  hiddenTypes: Set<string>
  watershedVisible: boolean
  initialCenter: [number, number]
  initialZoom: number
  onProjectSelect: (displayId: string) => void
  onProjectDeselect: () => void
  onMoveEnd: (lat: number, lng: number, zoom: number) => void
}

export function Map({
  data,
  selectedDisplayId,
  hiddenTypes,
  watershedVisible,
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

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: initialCenter,
      zoom: initialZoom,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.on('load', () => setMapLoaded(true))

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

  // Add watershed + project source/layers once both data and map are ready
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !data) return
    const map = mapRef.current
    if (map.getSource('projects')) return

    // Watershed boundary (below projects)
    map.addSource('watershed', {
      type: 'geojson',
      data: `${import.meta.env.BASE_URL}data/watershed.geojson`,
    })
    map.addLayer({
      id: 'watershed-fill',
      type: 'fill',
      source: 'watershed',
      paint: { 'fill-color': '#5b9bd5', 'fill-opacity': 0.06 },
    })
    map.addLayer({
      id: 'watershed-outline',
      type: 'line',
      source: 'watershed',
      paint: { 'line-color': '#4a8cc4', 'line-width': 1.5, 'line-opacity': 0.5 },
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

  // Sync hidden types filter
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('projects-fill')) return

    if (hiddenTypes.size === 0) {
      map.setFilter('projects-fill', null)
      map.setFilter('projects-outline', null)
    } else {
      const filter = ['!', ['in', ['get', 'primary_type'], ['literal', [...hiddenTypes]]]] as unknown as maplibregl.FilterSpecification
      map.setFilter('projects-fill', filter)
      map.setFilter('projects-outline', filter)
    }
  }, [hiddenTypes, mapLoaded])

  // Sync watershed visibility
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    if (!map.getLayer('watershed-fill')) return
    const vis = watershedVisible ? 'visible' : 'none'
    map.setLayoutProperty('watershed-fill', 'visibility', vis)
    map.setLayoutProperty('watershed-outline', 'visibility', vis)
  }, [watershedVisible, mapLoaded])

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
