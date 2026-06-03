import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, Feature } from 'geojson'
import { TYPE_MATCH_EXPR } from './project-colors'
import styles from './Map.module.css'

interface TooltipState {
  x: number
  y: number
  name: string
  types: string
  acreage: number | null
}

interface ProjectProperties {
  project_name?: string
  project_type?: string[]
  display_name?: string
  display_acreage?: number | null
  display_types?: string
  primary_type?: string
}

function addPrimaryType(raw: FeatureCollection): FeatureCollection {
  return {
    ...raw,
    features: raw.features.map((f: Feature) => {
      const p = (f.properties ?? {}) as ProjectProperties
      const types: string[] = Array.isArray(p.project_type)
        ? p.project_type
        : p.project_type
          ? [p.project_type]
          : []
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

export function Map() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const hoveredIdRef = useRef<number | string | undefined>(undefined)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      // Positron: desaturated light basemap, no API key required
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-121.8, 38.4],
      zoom: 7,
    })

    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      fetch('/data/projects.geojson')
        .then(r => r.json())
        .then((raw: FeatureCollection) => {
          const data = addPrimaryType(raw)

          map.addSource('projects', {
            type: 'geojson',
            data,
            generateId: true,
          })

          map.addLayer({
            id: 'projects-fill',
            type: 'fill',
            source: 'projects',
            paint: {
              'fill-color': TYPE_MATCH_EXPR,
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hovered'], false],
                0.8,
                0.55,
              ],
            },
          })

          map.addLayer({
            id: 'projects-outline',
            type: 'line',
            source: 'projects',
            paint: {
              'line-color': TYPE_MATCH_EXPR,
              'line-width': [
                'case',
                ['boolean', ['feature-state', 'hovered'], false],
                2.5,
                1,
              ],
              'line-opacity': 0.9,
            },
          })
        })
        .catch(err => console.error('Failed to load projects.geojson', err))
    })

    map.on('mousemove', 'projects-fill', e => {
      if (!e.features?.length) return
      const feature = e.features[0]

      if (hoveredIdRef.current !== undefined) {
        map.setFeatureState(
          { source: 'projects', id: hoveredIdRef.current },
          { hovered: false },
        )
      }
      hoveredIdRef.current = feature.id as number | string | undefined
      if (hoveredIdRef.current !== undefined) {
        map.setFeatureState(
          { source: 'projects', id: hoveredIdRef.current },
          { hovered: true },
        )
      }

      const p = (feature.properties ?? {}) as ProjectProperties & Record<string, unknown>
      setTooltip({
        x: e.point.x,
        y: e.point.y,
        name: String(p.display_name ?? p.project_name ?? ''),
        types: String(p.display_types ?? ''),
        acreage: typeof p.display_acreage === 'number' ? p.display_acreage : null,
      })

      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', 'projects-fill', () => {
      if (hoveredIdRef.current !== undefined) {
        map.setFeatureState(
          { source: 'projects', id: hoveredIdRef.current },
          { hovered: false },
        )
      }
      hoveredIdRef.current = undefined
      setTooltip(null)
      map.getCanvas().style.cursor = ''
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

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
