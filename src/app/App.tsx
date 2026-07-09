import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
const ORIENTATION_DISMISSED_KEY = 'hrl-dashboard-first-run-orientation-dismissed'

function shouldShowFirstRunOrientation(): boolean {
  try {
    return window.localStorage.getItem(ORIENTATION_DISMISSED_KEY) !== '1'
  } catch {
    return true
  }
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(element => !element.hasAttribute('aria-hidden'))
}

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
  const [mokelumneWatershedVisible, setMokelumneWatershedVisible] = useState(initial.mokelumneWatershedVisible)
  const [tuolumneWatershedVisible, setTuolumneWatershedVisible] = useState(initial.tuolumneWatershedVisible)
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
  const [aboutOpen, setAboutOpen] = useState(false)
  const [orientationOpen, setOrientationOpen] = useState(shouldShowFirstRunOrientation)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const orientationPrimaryRef = useRef<HTMLButtonElement>(null)
  const aboutCloseRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/hrl_restoration_projects.geojson`)
      .then(r => r.json() as Promise<FeatureCollection>)
      .then(d => setData(d))
      .catch(err => console.error('Failed to load hrl_restoration_projects.geojson', err))
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

  const handleToggleMokelumneWatershed = useCallback(() => {
    setMokelumneWatershedVisible(prev => {
      const next = !prev
      writeUrlState({ mokelumneWatershedVisible: next })
      return next
    })
  }, [])

  const handleToggleTuolumneWatershed = useCallback(() => {
    setTuolumneWatershedVisible(prev => {
      const next = !prev
      writeUrlState({ tuolumneWatershedVisible: next })
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
        project.project_name.toLowerCase().includes(query)
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

  const handleAboutOpen = useCallback(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    setAboutOpen(true)
  }, [])

  const handleAboutClose = useCallback(() => {
    setAboutOpen(false)
    previousFocusRef.current?.focus()
    previousFocusRef.current = null
  }, [])

  const handleOrientationDismiss = useCallback((persist: boolean) => {
    if (persist) {
      try {
        window.localStorage.setItem(ORIENTATION_DISMISSED_KEY, '1')
      } catch {
        // If storage is unavailable, dismiss for this session.
      }
    }
    setOrientationOpen(false)
  }, [])

  const handleModalKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLElement>,
    onEscape: () => void
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onEscape()
      return
    }

    if (event.key !== 'Tab') return

    const focusableElements = getFocusableElements(event.currentTarget)
    if (focusableElements.length === 0) {
      event.preventDefault()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }, [])

  useEffect(() => {
    if (orientationOpen && !aboutOpen) orientationPrimaryRef.current?.focus()
  }, [aboutOpen, orientationOpen])

  useEffect(() => {
    if (aboutOpen) aboutCloseRef.current?.focus()
  }, [aboutOpen])

  useEffect(() => {
    if (!aboutOpen && orientationOpen) previousFocusRef.current = null
  }, [aboutOpen, orientationOpen])

  const panelOpen = selectedProject !== null

  return (
    <div className={styles.shell}>
      <TopBar onAboutOpen={handleAboutOpen} />
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
          mokelumneWatershedVisible={mokelumneWatershedVisible}
          tuolumneWatershedVisible={tuolumneWatershedVisible}
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
          mokelumneWatershedVisible={mokelumneWatershedVisible}
          onToggleMokelumneWatershed={handleToggleMokelumneWatershed}
          tuolumneWatershedVisible={tuolumneWatershedVisible}
          onToggleTuolumneWatershed={handleToggleTuolumneWatershed}
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
      {orientationOpen && !aboutOpen && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.orientationDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="orientation-title"
            aria-describedby="orientation-description"
            onKeyDown={event => handleModalKeyDown(event, () => handleOrientationDismiss(false))}
          >
            <p className={styles.orientationEyebrow}>First time here?</p>
            <h2 id="orientation-title" className={styles.orientationTitle}>
              This is a public overview of HRL restoration project locations.
            </h2>
            <p id="orientation-description" className={styles.orientationText}>
              The prototype map shows early implementation and proposed Healthy Rivers
              and Landscapes restoration projects, basic descriptions, project types,
              and total project acres where available. It is meant for public, regulator,
              and partner-agency orientation, not verified habitat accounting.
            </p>
            <div className={styles.orientationActions}>
              <button
                ref={orientationPrimaryRef}
                type="button"
                className={styles.orientationPrimary}
                onClick={() => handleOrientationDismiss(true)}
              >
                Explore the map
              </button>
              <button
                type="button"
                className={styles.orientationSecondary}
                onClick={() => {
                  handleOrientationDismiss(true)
                  previousFocusRef.current = null
                  setAboutOpen(true)
                }}
              >
                Read about this map
              </button>
            </div>
          </section>
        </div>
      )}
      {aboutOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={handleAboutClose}
        >
          <section
            className={styles.aboutDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onKeyDown={event => handleModalKeyDown(event, handleAboutClose)}
            onMouseDown={event => event.stopPropagation()}
          >
            <header className={styles.aboutHeader}>
              <h2 id="about-title" className={styles.aboutTitle}>About This Dashboard</h2>
              <button
                type="button"
                ref={aboutCloseRef}
                className={styles.aboutClose}
                aria-label="Close About dialog"
                onClick={handleAboutClose}
              >
                ×
              </button>
            </header>
            <div className={styles.aboutBody}>
              <p>
                This prototype map shows early implementation and proposed habitat
                restoration projects in the Healthy Rivers and Landscapes Program.
              </p>
              <p>
                Healthy Rivers and Landscapes is a watershed-wide approach to improve
                river flows, expand habitat, and support native fish and wildlife in
                the Sacramento and San Joaquin Rivers and the Bay-Delta.
              </p>
              <p>
                The dashboard is intended as a public, regulator, and partner-agency
                overview of project locations and basic project information. It is not
                a verified habitat-accounting tool.
              </p>
              <p>
                This map is currently a prototype and all content is draft.
              </p>
              <div className={styles.aboutLinks}>
                <a
                  href="https://resources.ca.gov/Initiatives/Voluntary-Agreements-Page"
                  target="_blank"
                  rel="noreferrer"
                >
                  CNRA program page
                </a>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
