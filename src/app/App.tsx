import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { Map } from '../features/map/Map'
import { TopBar } from '../components/top-bar/TopBar'
import { HeadlineTiles } from '../components/tiles/HeadlineTiles'
import { DetailPanel } from '../components/detail-panel/DetailPanel'
import { LayerPanel } from '../components/layer-panel/LayerPanel'
import type { ProjectProperties } from '../data/types'
import type { BasemapMode } from '../lib/url-state'
import { readUrlState, writeUrlState } from '../lib/url-state'
import styles from './App.module.css'

const initial = readUrlState()

function listIncludes(values: string[] | null | undefined, query: string): boolean {
  if (!Array.isArray(values)) return false
  return values.some(value => value.toLowerCase().includes(query))
}

function primaryType(project: ProjectProperties): string {
  return Array.isArray(project.project_type) && project.project_type.length > 0
    ? project.project_type[0]
    : 'other'
}

export function App() {
  const [data, setData] = useState<FeatureCollection | null>(null)
  const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(initial.selected)
  const [selectedProject, setSelectedProject] = useState<ProjectProperties | null>(null)
  const [basemap, setBasemap] = useState<BasemapMode>(initial.basemap)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(initial.hiddenTypes)
  const [sacramentoWatershedVisible, setSacramentoWatershedVisible] = useState(initial.sacramentoWatershedVisible)
  const [sanJoaquinWatershedVisible, setSanJoaquinWatershedVisible] = useState(initial.sanJoaquinWatershedVisible)
  const [deltaBoundaryVisible, setDeltaBoundaryVisible] = useState(initial.deltaBoundaryVisible)
  const [yoloBypassVisible, setYoloBypassVisible] = useState(initial.yoloBypassVisible)
  const [sutterBypassVisible, setSutterBypassVisible] = useState(initial.sutterBypassVisible)
  const [streamsVisible, setStreamsVisible] = useState(initial.streamsVisible)
  const [projectSearch, setProjectSearch] = useState('')
  const [systemFilter, setSystemFilter] = useState('')
  const [earlyOnly, setEarlyOnly] = useState(false)
  const [projectFocusRequest, setProjectFocusRequest] = useState<{ displayId: string; seq: number } | null>(null)
  const [fitVisibleRequest, setFitVisibleRequest] = useState(0)
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

  const handleProjectSelectFromList = useCallback((displayId: string) => {
    handleProjectSelect(displayId)
    setProjectFocusRequest({ displayId, seq: Date.now() })
  }, [handleProjectSelect])

  const handleProjectDeselect = useCallback(() => {
    setSelectedDisplayId(null)
    setSelectedProject(null)
    writeUrlState({ selected: null })
  }, [])

  const handleMoveEnd = useCallback((lat: number, lng: number, zoom: number) => {
    writeUrlState({ lat, lng, zoom })
  }, [])

  const handleBasemapChange = useCallback((next: BasemapMode) => {
    setBasemap(next)
    writeUrlState({ basemap: next })
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

  const handleToggleSacramentoWatershed = useCallback(() => {
    setSacramentoWatershedVisible(prev => {
      const next = !prev
      writeUrlState({ sacramentoWatershedVisible: next })
      return next
    })
  }, [])

  const handleToggleSanJoaquinWatershed = useCallback(() => {
    setSanJoaquinWatershedVisible(prev => {
      const next = !prev
      writeUrlState({ sanJoaquinWatershedVisible: next })
      return next
    })
  }, [])

  const handleToggleDeltaBoundary = useCallback(() => {
    setDeltaBoundaryVisible(prev => {
      const next = !prev
      writeUrlState({ deltaBoundaryVisible: next })
      return next
    })
  }, [])

  const handleToggleYoloBypass = useCallback(() => {
    setYoloBypassVisible(prev => {
      const next = !prev
      writeUrlState({ yoloBypassVisible: next })
      return next
    })
  }, [])

  const handleToggleSutterBypass = useCallback(() => {
    setSutterBypassVisible(prev => {
      const next = !prev
      writeUrlState({ sutterBypassVisible: next })
      return next
    })
  }, [])

  const handleToggleStreams = useCallback(() => {
    setStreamsVisible(prev => {
      const next = !prev
      writeUrlState({ streamsVisible: next })
      return next
    })
  }, [])

  const projects = useMemo(() => (
    data
      ? data.features.map(f => f.properties as ProjectProperties)
      : []
  ), [data])

  const systemOptions = useMemo(() => (
    [...new Set(projects.map(project => project.system).filter(Boolean))].sort()
  ), [projects])

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase()
    return projects.filter(project => {
      if (hiddenTypes.has(primaryType(project))) return false
      if (systemFilter && project.system !== systemFilter) return false
      if (earlyOnly && !project.early_implementation) return false
      if (!query) return true

      return (
        project.display_name.toLowerCase().includes(query)
        || project.project_name.toLowerCase().includes(query)
        || project.lead_entity.toLowerCase().includes(query)
        || project.system.toLowerCase().includes(query)
        || listIncludes(project.project_type, query)
        || listIncludes(project.project_stage, query)
        || listIncludes(project.target_species, query)
      )
    })
  }, [earlyOnly, hiddenTypes, projectSearch, projects, systemFilter])

  const filteredDisplayIds = useMemo(() => (
    new Set(filteredProjects.map(project => project.display_id))
  ), [filteredProjects])

  const filteredData = useMemo<FeatureCollection | null>(() => {
    if (!data) return null
    return {
      ...data,
      features: data.features.filter(f => (
        filteredDisplayIds.has((f.properties as ProjectProperties).display_id)
      )),
    }
  }, [data, filteredDisplayIds])

  const handleFitVisibleProjects = useCallback(() => {
    setFitVisibleRequest(prev => prev + 1)
  }, [])

  const handleZoomToSelectedProject = useCallback(() => {
    if (!selectedDisplayId) return
    setProjectFocusRequest({ displayId: selectedDisplayId, seq: Date.now() })
  }, [selectedDisplayId])

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
          basemap={basemap}
          visibleDisplayIds={filteredDisplayIds}
          projectFocusRequest={projectFocusRequest}
          fitVisibleRequest={fitVisibleRequest}
          selectedDisplayId={selectedDisplayId}
          sacramentoWatershedVisible={sacramentoWatershedVisible}
          sanJoaquinWatershedVisible={sanJoaquinWatershedVisible}
          deltaBoundaryVisible={deltaBoundaryVisible}
          yoloBypassVisible={yoloBypassVisible}
          sutterBypassVisible={sutterBypassVisible}
          streamsVisible={streamsVisible}
          initialCenter={[initial.lng, initial.lat]}
          initialZoom={initial.zoom}
          onProjectSelect={handleProjectSelect}
          onProjectDeselect={handleProjectDeselect}
          onMoveEnd={handleMoveEnd}
        />
        <HeadlineTiles data={filteredData} totalProjectCount={projects.length} />
        <LayerPanel
          basemap={basemap}
          onBasemapChange={handleBasemapChange}
          projects={filteredProjects}
          totalProjectCount={projects.length}
          selectedDisplayId={selectedDisplayId}
          projectSearch={projectSearch}
          onProjectSearchChange={setProjectSearch}
          systemFilter={systemFilter}
          systemOptions={systemOptions}
          onSystemFilterChange={setSystemFilter}
          earlyOnly={earlyOnly}
          onEarlyOnlyChange={setEarlyOnly}
          onProjectSelect={handleProjectSelectFromList}
          onZoomToProject={handleProjectSelectFromList}
          onFitVisibleProjects={handleFitVisibleProjects}
          hiddenTypes={hiddenTypes}
          onToggleType={handleToggleType}
          sacramentoWatershedVisible={sacramentoWatershedVisible}
          onToggleSacramentoWatershed={handleToggleSacramentoWatershed}
          sanJoaquinWatershedVisible={sanJoaquinWatershedVisible}
          onToggleSanJoaquinWatershed={handleToggleSanJoaquinWatershed}
          deltaBoundaryVisible={deltaBoundaryVisible}
          onToggleDeltaBoundary={handleToggleDeltaBoundary}
          yoloBypassVisible={yoloBypassVisible}
          onToggleYoloBypass={handleToggleYoloBypass}
          sutterBypassVisible={sutterBypassVisible}
          onToggleSutterBypass={handleToggleSutterBypass}
          streamsVisible={streamsVisible}
          onToggleStreams={handleToggleStreams}
          open={layerPanelOpen}
          onToggleOpen={() => setLayerPanelOpen(o => !o)}
        />
      </div>
      {panelOpen && selectedProject && (
        <DetailPanel
          project={selectedProject}
          onClose={handleProjectDeselect}
          onZoomToProject={handleZoomToSelectedProject}
        />
      )}
    </div>
  )
}
