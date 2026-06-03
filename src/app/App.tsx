import { useCallback, useEffect, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { Map } from '../features/map/Map'
import { TopBar } from '../components/top-bar/TopBar'
import { HeadlineTiles } from '../components/tiles/HeadlineTiles'
import { DetailPanel } from '../components/detail-panel/DetailPanel'
import { LayerPanel } from '../components/layer-panel/LayerPanel'
import type { ProjectProperties } from '../data/types'
import { readUrlState, writeUrlState } from '../lib/url-state'
import styles from './App.module.css'

const initial = readUrlState()

export function App() {
  const [data, setData] = useState<FeatureCollection | null>(null)
  const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(initial.selected)
  const [selectedProject, setSelectedProject] = useState<ProjectProperties | null>(null)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(initial.hiddenTypes)
  const [watershedVisible, setWatershedVisible] = useState(initial.watershedVisible)
  const [layerPanelOpen, setLayerPanelOpen] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/projects.geojson`)
      .then(r => r.json() as Promise<FeatureCollection>)
      .then(d => setData(d))
      .catch(err => console.error('Failed to load projects.geojson', err))
  }, [])

  // Restore selected project from URL after data loads
  useEffect(() => {
    if (!data || !selectedDisplayId || selectedProject) return
    const feature = data.features.find(
      f => (f.properties as ProjectProperties).display_id === selectedDisplayId
    )
    if (feature) setSelectedProject(feature.properties as ProjectProperties)
  }, [data, selectedDisplayId, selectedProject])

  const handleProjectSelect = useCallback((displayId: string) => {
    if (!data) return
    const feature = data.features.find(
      f => (f.properties as ProjectProperties).display_id === displayId
    )
    if (!feature) return
    setSelectedDisplayId(displayId)
    setSelectedProject(feature.properties as ProjectProperties)
    writeUrlState({ selected: displayId })
  }, [data])

  const handleProjectDeselect = useCallback(() => {
    setSelectedDisplayId(null)
    setSelectedProject(null)
    writeUrlState({ selected: null })
  }, [])

  const handleMoveEnd = useCallback((lat: number, lng: number, zoom: number) => {
    writeUrlState({ lat, lng, zoom })
  }, [])

  const handleToggleType = useCallback((type: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      writeUrlState({ hiddenTypes: next })
      return next
    })
  }, [])

  const handleToggleWatershed = useCallback(() => {
    setWatershedVisible(prev => {
      const next = !prev
      writeUrlState({ watershedVisible: next })
      return next
    })
  }, [])

  const panelOpen = selectedProject !== null

  return (
    <div className={styles.shell}>
      <TopBar />
      <div
        className={styles.mapWrapper}
        style={{ right: panelOpen ? 'var(--detail-panel-width)' : '0px' }}
      >
        <Map
          data={data}
          selectedDisplayId={selectedDisplayId}
          hiddenTypes={hiddenTypes}
          watershedVisible={watershedVisible}
          initialCenter={[initial.lng, initial.lat]}
          initialZoom={initial.zoom}
          onProjectSelect={handleProjectSelect}
          onProjectDeselect={handleProjectDeselect}
          onMoveEnd={handleMoveEnd}
        />
        <HeadlineTiles data={data} />
        <LayerPanel
          hiddenTypes={hiddenTypes}
          onToggleType={handleToggleType}
          watershedVisible={watershedVisible}
          onToggleWatershed={handleToggleWatershed}
          open={layerPanelOpen}
          onToggleOpen={() => setLayerPanelOpen(o => !o)}
        />
      </div>
      {panelOpen && selectedProject && (
        <DetailPanel project={selectedProject} onClose={handleProjectDeselect} />
      )}
    </div>
  )
}
