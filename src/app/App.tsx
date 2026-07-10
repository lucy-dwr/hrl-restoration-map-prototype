import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { Map } from '../features/map/Map'
import { TopBar } from '../components/top-bar/TopBar'
import { HeadlineTiles } from '../components/tiles/HeadlineTiles'
import { DetailPanel } from '../components/detail-panel/DetailPanel'
import { LayerPanel } from '../components/layer-panel/LayerPanel'
import { PROJECT_LAYER_TYPES, TRIBUTARY_WATERSHEDS } from '../data/layer-options'
import type { BoundaryFocusTarget } from '../data/layer-options'
import type { ProjectProperties } from '../data/types'
import type { BasemapMode } from '../lib/url-state'
import { readUrlState, writeUrlState } from '../lib/url-state'
import styles from './App.module.css'

const initial = readUrlState()
const ORIENTATION_DISMISSED_KEY = 'hrl-dashboard-first-run-orientation-dismissed'
const DATA_LAST_UPDATED = 'June 19, 2026'
const PUBLIC_CONTACT_EMAIL = 'HealthyRiversandLandscapes@resources.ca.gov'

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

function assignedTypes(project: ProjectProperties): string[] {
  return Array.isArray(project.project_type) && project.project_type.length > 0
    ? project.project_type
    : ['other']
}

function hasVisibleProjectType(project: ProjectProperties, hiddenTypes: Set<string>): boolean {
  return assignedTypes(project).some(type => !hiddenTypes.has(type))
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}

interface ActiveFilterChip {
  id: string
  label: string
}

export function App() {
  const [data, setData] = useState<FeatureCollection | null>(null)
  const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(initial.selected)
  const [selectedProject, setSelectedProject] = useState<ProjectProperties | null>(null)
  const [basemap, setBasemap] = useState<BasemapMode>(initial.basemap)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(initial.hiddenTypes)
  const [visibleTributaries, setVisibleTributaries] = useState<Set<string>>(initial.visibleTributaries)
  const [deltaBoundaryVisible, setDeltaBoundaryVisible] = useState(initial.deltaBoundaryVisible)
  const [yoloBypassVisible, setYoloBypassVisible] = useState(initial.yoloBypassVisible)
  const [sutterBypassVisible, setSutterBypassVisible] = useState(initial.sutterBypassVisible)
  const [streamsVisible, setStreamsVisible] = useState(initial.streamsVisible)
  const [projectSearch, setProjectSearch] = useState('')
  const [systemFilter, setSystemFilter] = useState('')
  const [earlyOnly, setEarlyOnly] = useState(false)
  const [projectFocusRequest, setProjectFocusRequest] = useState<{ displayId: string; seq: number } | null>(null)
  const [boundaryFocusRequest, setBoundaryFocusRequest] = useState<{ target: BoundaryFocusTarget; seq: number } | null>(null)
  const [fitVisibleRequest, setFitVisibleRequest] = useState(0)
  const [layerPanelOpen, setLayerPanelOpen] = useState(true)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const [orientationOpen, setOrientationOpen] = useState(shouldShowFirstRunOrientation)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const orientationPrimaryRef = useRef<HTMLButtonElement>(null)
  const aboutCloseRef = useRef<HTMLButtonElement>(null)
  const methodologyCloseRef = useRef<HTMLButtonElement>(null)

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

  const handleShowAllProjectTypes = useCallback(() => {
    const next = new Set<string>()
    setHiddenTypes(next)
    writeUrlState({ hiddenTypes: next })
  }, [])

  const handleHideAllProjectTypes = useCallback(() => {
    const next = new Set(PROJECT_LAYER_TYPES)
    setHiddenTypes(next)
    writeUrlState({ hiddenTypes: next })
  }, [])

  const handleToggleTributaryWatershed = useCallback((systemKey: string) => {
    setVisibleTributaries(prev => {
      const next = new Set(prev)
      if (next.has(systemKey)) next.delete(systemKey)
      else next.add(systemKey)
      writeUrlState({ visibleTributaries: next })
      return next
    })
  }, [])

  const handleShowAllTributaryWatersheds = useCallback(() => {
    const nextTributaries = new Set(TRIBUTARY_WATERSHEDS.map(watershed => watershed.key))
    setVisibleTributaries(nextTributaries)
    writeUrlState({ visibleTributaries: nextTributaries })
  }, [])

  const handleHideAllTributaryWatersheds = useCallback(() => {
    const nextTributaries = new Set<string>()
    setVisibleTributaries(nextTributaries)
    writeUrlState({ visibleTributaries: nextTributaries })
  }, [])

  const handleShowAllReferenceBoundaries = useCallback(() => {
    setDeltaBoundaryVisible(true)
    setYoloBypassVisible(true)
    setSutterBypassVisible(true)
    writeUrlState({
      deltaBoundaryVisible: true,
      yoloBypassVisible: true,
      sutterBypassVisible: true,
    })
  }, [])

  const handleHideAllReferenceBoundaries = useCallback(() => {
    setDeltaBoundaryVisible(false)
    setYoloBypassVisible(false)
    setSutterBypassVisible(false)
    writeUrlState({
      deltaBoundaryVisible: false,
      yoloBypassVisible: false,
      sutterBypassVisible: false,
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
      if (!hasVisibleProjectType(project, hiddenTypes)) return false
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

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    const query = projectSearch.trim()

    if (query) {
      chips.push({ id: 'search', label: `Search: "${query}"` })
    }

    if (systemFilter) {
      chips.push({ id: 'system', label: `System: ${systemFilter}` })
    }

    if (earlyOnly) {
      chips.push({ id: 'early', label: 'Early implementation' })
    }

    const hiddenTypeLabels = [...hiddenTypes].sort()
    if (hiddenTypeLabels.length === PROJECT_LAYER_TYPES.length) {
      chips.push({ id: 'hidden-types-all', label: 'All project types hidden' })
    } else if (hiddenTypeLabels.length >= 4) {
      chips.push({
        id: 'hidden-types-summary',
        label: `${hiddenTypeLabels.length} project types hidden`,
      })
    } else {
      hiddenTypeLabels.forEach(type => {
        chips.push({ id: `hidden-type-${type}`, label: `Hidden: ${capitalize(type)}` })
      })
    }

    return chips
  }, [earlyOnly, hiddenTypes, projectSearch, systemFilter])

  const handleFitVisibleProjects = useCallback(() => {
    setFitVisibleRequest(prev => prev + 1)
  }, [])

  const handleZoomToBoundary = useCallback((target: BoundaryFocusTarget) => {
    if (target.kind === 'tributary') {
      setVisibleTributaries(prev => {
        if (prev.has(target.key)) return prev
        const next = new Set(prev)
        next.add(target.key)
        writeUrlState({ visibleTributaries: next })
        return next
      })
    } else if (target.kind === 'delta') {
      setDeltaBoundaryVisible(prev => {
        if (prev) return prev
        writeUrlState({ deltaBoundaryVisible: true })
        return true
      })
    } else if (target.kind === 'yolo-bypass') {
      setYoloBypassVisible(prev => {
        if (prev) return prev
        writeUrlState({ yoloBypassVisible: true })
        return true
      })
    } else if (target.kind === 'sutter-bypass') {
      setSutterBypassVisible(prev => {
        if (prev) return prev
        writeUrlState({ sutterBypassVisible: true })
        return true
      })
    }

    setBoundaryFocusRequest({ target, seq: Date.now() })
  }, [])

  const handleResetProjectFilters = useCallback(() => {
    const resetHiddenTypes = new Set<string>()
    setProjectSearch('')
    setSystemFilter('')
    setEarlyOnly(false)
    setHiddenTypes(resetHiddenTypes)
    writeUrlState({ hiddenTypes: resetHiddenTypes })
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

  const handleMethodologyOpen = useCallback(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    setMethodologyOpen(true)
  }, [])

  const handleMethodologyClose = useCallback(() => {
    setMethodologyOpen(false)
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
    if (orientationOpen && !aboutOpen && !methodologyOpen) orientationPrimaryRef.current?.focus()
  }, [aboutOpen, methodologyOpen, orientationOpen])

  useEffect(() => {
    if (aboutOpen) aboutCloseRef.current?.focus()
  }, [aboutOpen])

  useEffect(() => {
    if (methodologyOpen) methodologyCloseRef.current?.focus()
  }, [methodologyOpen])

  useEffect(() => {
    if (!aboutOpen && !methodologyOpen && orientationOpen) previousFocusRef.current = null
  }, [aboutOpen, methodologyOpen, orientationOpen])

  const panelOpen = selectedProject !== null

  return (
    <div className={styles.shell}>
      <TopBar onAboutOpen={handleAboutOpen} onMethodologyOpen={handleMethodologyOpen} />
      <div
        className={styles.mapWrapper}
        style={{ right: panelOpen ? 'var(--detail-panel-width)' : '0px' }}
      >
        <Map
          data={data}
          basemap={basemap}
          visibleDisplayIds={filteredDisplayIds}
          fitProjectsOnInitialLoad={!initial.hasUrlState}
          projectFocusRequest={projectFocusRequest}
          boundaryFocusRequest={boundaryFocusRequest}
          fitVisibleRequest={fitVisibleRequest}
          selectedDisplayId={selectedDisplayId}
          visibleTributaries={visibleTributaries}
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
        <HeadlineTiles
          data={filteredData}
          totalProjectCount={projects.length}
          layerPanelOpen={layerPanelOpen}
        />
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
          activeFilterChips={activeFilterChips}
          onResetFilters={handleResetProjectFilters}
          hiddenTypes={hiddenTypes}
          onToggleType={handleToggleType}
          onShowAllProjectTypes={handleShowAllProjectTypes}
          onHideAllProjectTypes={handleHideAllProjectTypes}
          visibleTributaries={visibleTributaries}
          onToggleTributaryWatershed={handleToggleTributaryWatershed}
          onShowAllTributaryWatersheds={handleShowAllTributaryWatersheds}
          onHideAllTributaryWatersheds={handleHideAllTributaryWatersheds}
          onZoomToBoundary={handleZoomToBoundary}
          onShowAllReferenceBoundaries={handleShowAllReferenceBoundaries}
          onHideAllReferenceBoundaries={handleHideAllReferenceBoundaries}
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
      {orientationOpen && !aboutOpen && !methodologyOpen && (
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
              The map shows early implementation and proposed Healthy Rivers and
              Landscapes restoration projects, basic descriptions, project types, and
              submitted project acres where available. It is meant for public,
              regulator, and partner agency orientation, not verified habitat accounting.
            </p>
            <p className={styles.orientationText}>
              Zoomed out, each project shows as a colored point. Zoom in to reveal its
              mapped boundary.
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
                This map shows early implementation and proposed habitat restoration
                projects in the Healthy Rivers and Landscapes Program.
              </p>
              <p>
                Healthy Rivers and Landscapes is a watershed-wide approach to improve
                river flows, expand habitat, and support native fish and wildlife in
                the Sacramento and San Joaquin Rivers and the Bay-Delta.
              </p>
              <p>
                The dashboard is intended as a public, regulator, and partner agency
                overview of project locations and basic project information. It is not
                a verified habitat accounting tool.
              </p>
              <p>
                Project information was submitted by HRL participating entities and
                checked against the HRL restoration project schema. The last dataset
                update shown here was {DATA_LAST_UPDATED}.
              </p>
              <div className={styles.aboutLinks}>
                <button
                  type="button"
                  className={styles.aboutInlineButton}
                  onClick={() => {
                    setAboutOpen(false)
                    setMethodologyOpen(true)
                  }}
                >
                  Read methodology
                </button>
                <a
                  href="https://resources.ca.gov/Initiatives/Voluntary-Agreements-Page"
                  target="_blank"
                  rel="noreferrer"
                >
                  CNRA program page
                </a>
                <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>
                  Contact HRL
                </a>
              </div>
            </div>
          </section>
        </div>
      )}
      {methodologyOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={handleMethodologyClose}
        >
          <section
            className={styles.methodologyDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="methodology-title"
            onKeyDown={event => handleModalKeyDown(event, handleMethodologyClose)}
            onMouseDown={event => event.stopPropagation()}
          >
            <header className={styles.aboutHeader}>
              <div>
                <h2 id="methodology-title" className={styles.aboutTitle}>Methodology and Data Sources</h2>
              </div>
              <button
                type="button"
                ref={methodologyCloseRef}
                className={styles.aboutClose}
                aria-label="Close methodology dialog"
                onClick={handleMethodologyClose}
              >
                ×
              </button>
            </header>
            <div className={styles.methodologyBody}>
              <section>
                <h3>What this dashboard shows</h3>
                <p>
                  The Healthy Rivers and Landscapes Restoration Dashboard shows
                  locations and basic descriptions for early implementation and
                  proposed HRL restoration projects. It is designed as a public
                  overview for program partners, regulators, and interested members of
                  the public.
                </p>
                <p>
                  The dashboard is not a verified habitat accounting tool, a regulatory
                  determination, or a substitute for project-specific planning,
                  permitting, or monitoring documents.
                </p>
              </section>
              <section>
                <h3>Data source</h3>
                <p>
                  Project information was submitted by HRL participating entities. The
                  dataset includes project names, locations, descriptions, lead
                  entities, river systems, project types, project stages, target 
                  species, funding sources, construction timing, and acreage values.
                </p>
                <p>
                  The last dataset update shown in this dashboard was {DATA_LAST_UPDATED}.
                </p>
              </section>
              <section>
                <h3>Review and standardization</h3>
                <p>
                  Submitted project data were checked against the HRL restoration
                  project schema, which defines required fields, allowed values, and
                  field types. During processing, multivalue fields were normalized
                  and browser-readable files were generated for the dashboard.
                </p>
                <p>
                  This validation confirms that submitted records follow the expected
                  data structure. It does not independently verify every project fact,
                  acreage estimate, construction date, budget value, or other
                  reported information.
                </p>
              </section>
              <section>
                <h3>How to interpret values</h3>
                <dl className={styles.methodologyTerms}>
                  <div>
                    <dt>Project acres</dt>
                    <dd>
                      These are acres reported for the project by HRL participating
                      entities. They are useful for a high-level map summary. They
                      are not final HRL habitat-accounting acres.
                    </dd>
                  </div>
                  <div>
                    <dt>Project type</dt>
                    <dd>
                      Project type describes the main kind of restoration work. A
                      project can have more than one type; the map uses one main type
                      for color.
                      <span className={styles.termListLabel}>Possible values:</span>
                      <ul>
                        <li>Bypass floodplain habitat</li>
                        <li>Fish food production</li>
                        <li>Fish passage improvement</li>
                        <li>Fish screen installation or improvement</li>
                        <li>Rearing habitat</li>
                        <li>Spawning habitat</li>
                        <li>Tidal habitat</li>
                        <li>Tributary floodplain habitat</li>
                        <li>Other</li>
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>Project stage</dt>
                    <dd>
                      Project stage shows where the project is in planning,
                      construction, or follow-up work. A project can have more than
                      one stage.
                      <span className={styles.termListLabel}>Possible values:</span>
                      <ul>
                        <li>Concept/feasibility</li>
                        <li>CEQA</li>
                        <li>Permitting</li>
                        <li>Design</li>
                        <li>Construction</li>
                        <li>Post-construction monitoring and science</li>
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>Target species</dt>
                    <dd>
                      Target species are the species the project is meant to support,
                      as submitted by HRL participating entities. They are not a
                      finding that the project has already helped those species.
                    </dd>
                  </div>
                </dl>
              </section>
              <section>
                <h3>Context layers</h3>
                <p>
                  HRL tributary watershed boundaries are generated from the USGS
                  Watershed Boundary Dataset for Sacramento, American, Feather,
                  Yuba, Putah, Mokelumne, and Tuolumne systems. Delta and bypass
                  context layers are generated from California Department of Water
                  Resources spatial services. The stream network is generated from
                  USGS NHDPlus V2 and displayed as vector tiles. These layers provide
                  geographic context.
                </p>
              </section>
              <section>
                <h3>Downloads and contact</h3>
                <p>
                  The Download data menu provides the public project dataset as
                  GeoJSON, GeoPackage, and a non-spatial CSV. The files are generated
                  from the same standardized project dataset used by the dashboard.
                </p>
                <p>
                  Questions about the dashboard or the public project dataset can be
                  sent to <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>.
                </p>
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
