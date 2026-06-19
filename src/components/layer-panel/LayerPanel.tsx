import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ProjectProperties } from '../../data/types'
import { PROJECT_TYPE_COLORS, FALLBACK_COLOR } from '../../features/map/project-colors'
import type { BasemapMode } from '../../lib/url-state'
import styles from './LayerPanel.module.css'

const ALL_TYPES = [
  'bypass floodplain habitat',
  'fish food production',
  'fish passage improvement',
  'fish screen installation or improvement',
  'rearing habitat',
  'spawning habitat',
  'tidal habitat',
  'tributary floodplain habitat',
  'other',
]

const DISABLED_SWATCH = '#cbd3cc'
const CONTEXT_LAYER_COLORS = {
  sacramentoWatershed: '#4f8f8b',
  mokelumneWatershed: '#7b8f34',
  tuolumneWatershed: '#b07812',
  deltaBoundary: '#00504b',
  yoloBypass: '#d6901a',
  sutterBypass: '#8e8934',
  streams: '#5f9faa',
}

type LayerSectionId = 'basemap' | 'projectTypes' | 'boundaries' | 'hydrography'

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}

interface CollapsibleSectionProps {
  id: LayerSectionId
  label: string
  expanded: boolean
  onToggle: (id: LayerSectionId) => void
  children: ReactNode
}

function CollapsibleSection({
  id,
  label,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const panelId = `${id}-section`

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => onToggle(id)}
      >
        <span className={styles.sectionLabel}>{label}</span>
        <span
          className={expanded ? styles.disclosureOpen : styles.disclosure}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div id={panelId} className={styles.sectionContent}>
          {children}
        </div>
      )}
    </div>
  )
}

interface Props {
  basemap: BasemapMode
  onBasemapChange: (mode: BasemapMode) => void
  projects: ProjectProperties[]
  totalProjectCount: number
  selectedDisplayId: string | null
  projectSearch: string
  onProjectSearchChange: (value: string) => void
  systemFilter: string
  systemOptions: string[]
  onSystemFilterChange: (value: string) => void
  earlyOnly: boolean
  onEarlyOnlyChange: (value: boolean) => void
  onProjectSelect: (displayId: string) => void
  onZoomToProject: (displayId: string) => void
  onFitVisibleProjects: () => void
  hiddenTypes: Set<string>
  onToggleType: (type: string) => void
  sacramentoWatershedVisible: boolean
  onToggleSacramentoWatershed: () => void
  mokelumneWatershedVisible: boolean
  onToggleMokelumneWatershed: () => void
  tuolumneWatershedVisible: boolean
  onToggleTuolumneWatershed: () => void
  deltaBoundaryVisible: boolean
  onToggleDeltaBoundary: () => void
  yoloBypassVisible: boolean
  onToggleYoloBypass: () => void
  sutterBypassVisible: boolean
  onToggleSutterBypass: () => void
  streamsVisible: boolean
  onToggleStreams: () => void
  open: boolean
  onToggleOpen: () => void
}

export function LayerPanel({
  basemap,
  onBasemapChange,
  projects,
  totalProjectCount,
  selectedDisplayId,
  projectSearch,
  onProjectSearchChange,
  systemFilter,
  systemOptions,
  onSystemFilterChange,
  earlyOnly,
  onEarlyOnlyChange,
  onProjectSelect,
  onZoomToProject,
  onFitVisibleProjects,
  hiddenTypes,
  onToggleType,
  sacramentoWatershedVisible,
  onToggleSacramentoWatershed,
  mokelumneWatershedVisible,
  onToggleMokelumneWatershed,
  tuolumneWatershedVisible,
  onToggleTuolumneWatershed,
  deltaBoundaryVisible,
  onToggleDeltaBoundary,
  yoloBypassVisible,
  onToggleYoloBypass,
  sutterBypassVisible,
  onToggleSutterBypass,
  streamsVisible,
  onToggleStreams,
  open,
  onToggleOpen,
}: Props) {
  const [activeTab, setActiveTab] = useState<'layers' | 'projects'>('layers')
  const [collapsedSections, setCollapsedSections] = useState<Set<LayerSectionId>>(() => new Set())

  function toggleLayerSection(section: LayerSectionId) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  function isLayerSectionExpanded(section: LayerSectionId): boolean {
    return !collapsedSections.has(section)
  }

  return (
    <div className={styles.root}>
      {open ? (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.title}>Layers</span>
            <button
              className={styles.toggleBtn}
              onClick={onToggleOpen}
              aria-label="Collapse layer panel"
            >
              ←
            </button>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Layer panel views">
            <button
              className={activeTab === 'layers' ? styles.tabActive : styles.tab}
              type="button"
              role="tab"
              aria-selected={activeTab === 'layers'}
              onClick={() => setActiveTab('layers')}
            >
              Layers
            </button>
            <button
              className={activeTab === 'projects' ? styles.tabActive : styles.tab}
              type="button"
              role="tab"
              aria-selected={activeTab === 'projects'}
              onClick={() => setActiveTab('projects')}
            >
              Projects
            </button>
          </div>

          {activeTab === 'layers' ? (
            <div className={styles.scrollBody}>
              <CollapsibleSection
                id="basemap"
                label="Basemap"
                expanded={isLayerSectionExpanded('basemap')}
                onToggle={toggleLayerSection}
              >
                <label className={styles.row}>
                  <input
                    type="radio"
                    name="basemap"
                    className={styles.checkbox}
                    checked={basemap === 'map'}
                    onChange={() => onBasemapChange('map')}
                  />
                  <span className={styles.typeLabel}>Map</span>
                </label>
                <label className={styles.row}>
                  <input
                    type="radio"
                    name="basemap"
                    className={styles.checkbox}
                    checked={basemap === 'imagery'}
                    onChange={() => onBasemapChange('imagery')}
                  />
                  <span className={styles.typeLabel}>Imagery</span>
                </label>
              </CollapsibleSection>

              <div className={styles.divider} />

              <CollapsibleSection
                id="projectTypes"
                label="Project types"
                expanded={isLayerSectionExpanded('projectTypes')}
                onToggle={toggleLayerSection}
              >
                {ALL_TYPES.map(type => {
                  const visible = !hiddenTypes.has(type)
                  const color = PROJECT_TYPE_COLORS[type] ?? FALLBACK_COLOR
                  return (
                    <label key={type} className={styles.row}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={visible}
                        onChange={() => onToggleType(type)}
                      />
                      <span
                        className={styles.dot}
                        style={{ background: visible ? color : DISABLED_SWATCH }}
                      />
                      <span className={styles.typeLabel} style={{ color: visible ? undefined : 'var(--text-tertiary)' }}>
                        {capitalize(type)}
                      </span>
                    </label>
                  )
                })}
              </CollapsibleSection>

              <div className={styles.divider} />

              <CollapsibleSection
                id="boundaries"
                label="Boundaries"
                expanded={isLayerSectionExpanded('boundaries')}
                onToggle={toggleLayerSection}
              >
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={sacramentoWatershedVisible}
                    onChange={onToggleSacramentoWatershed}
                  />
                  <span
                    className={styles.dot}
                    style={{
                      background: sacramentoWatershedVisible
                        ? CONTEXT_LAYER_COLORS.sacramentoWatershed
                        : DISABLED_SWATCH,
                      borderRadius: 2,
                    }}
                  />
                  <span className={styles.typeLabel} style={{ color: sacramentoWatershedVisible ? undefined : 'var(--text-tertiary)' }}>
                    Sacramento watershed
                  </span>
                </label>
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={mokelumneWatershedVisible}
                    onChange={onToggleMokelumneWatershed}
                  />
                  <span
                    className={styles.dot}
                    style={{
                      background: mokelumneWatershedVisible
                        ? CONTEXT_LAYER_COLORS.mokelumneWatershed
                        : DISABLED_SWATCH,
                      borderRadius: 2,
                    }}
                  />
                  <span className={styles.typeLabel} style={{ color: mokelumneWatershedVisible ? undefined : 'var(--text-tertiary)' }}>
                    Mokelumne watershed
                  </span>
                </label>
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={tuolumneWatershedVisible}
                    onChange={onToggleTuolumneWatershed}
                  />
                  <span
                    className={styles.dot}
                    style={{
                      background: tuolumneWatershedVisible
                        ? CONTEXT_LAYER_COLORS.tuolumneWatershed
                        : DISABLED_SWATCH,
                      borderRadius: 2,
                    }}
                  />
                  <span className={styles.typeLabel} style={{ color: tuolumneWatershedVisible ? undefined : 'var(--text-tertiary)' }}>
                    Tuolumne watershed
                  </span>
                </label>
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={deltaBoundaryVisible}
                    onChange={onToggleDeltaBoundary}
                  />
                  <span
                    className={styles.dot}
                    style={{
                      background: deltaBoundaryVisible
                        ? CONTEXT_LAYER_COLORS.deltaBoundary
                        : DISABLED_SWATCH,
                      borderRadius: 2,
                    }}
                  />
                  <span className={styles.typeLabel} style={{ color: deltaBoundaryVisible ? undefined : 'var(--text-tertiary)' }}>
                    Legal Delta boundary
                  </span>
                </label>
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={yoloBypassVisible}
                    onChange={onToggleYoloBypass}
                  />
                  <span
                    className={styles.dot}
                    style={{
                      background: yoloBypassVisible
                        ? CONTEXT_LAYER_COLORS.yoloBypass
                        : DISABLED_SWATCH,
                      borderRadius: 2,
                    }}
                  />
                  <span className={styles.typeLabel} style={{ color: yoloBypassVisible ? undefined : 'var(--text-tertiary)' }}>
                    Yolo Bypass boundary
                  </span>
                </label>
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={sutterBypassVisible}
                    onChange={onToggleSutterBypass}
                  />
                  <span
                    className={styles.dot}
                    style={{
                      background: sutterBypassVisible
                        ? CONTEXT_LAYER_COLORS.sutterBypass
                        : DISABLED_SWATCH,
                      borderRadius: 2,
                    }}
                  />
                  <span className={styles.typeLabel} style={{ color: sutterBypassVisible ? undefined : 'var(--text-tertiary)' }}>
                    Sutter Bypass boundary
                  </span>
                </label>
              </CollapsibleSection>

              <div className={styles.divider} />

              <CollapsibleSection
                id="hydrography"
                label="Hydrography"
                expanded={isLayerSectionExpanded('hydrography')}
                onToggle={toggleLayerSection}
              >
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={streamsVisible}
                    onChange={onToggleStreams}
                  />
                  <span
                    className={styles.dot}
                    style={{
                      background: streamsVisible ? CONTEXT_LAYER_COLORS.streams : DISABLED_SWATCH,
                      borderRadius: 2,
                    }}
                  />
                  <span className={styles.typeLabel} style={{ color: streamsVisible ? undefined : 'var(--text-tertiary)' }}>
                    Stream network
                  </span>
                </label>
              </CollapsibleSection>
            </div>
          ) : (
            <div className={styles.scrollBody}>
              <div className={styles.section}>
                <h3 className={styles.sectionLabel}>Find projects</h3>
                <input
                  className={styles.searchInput}
                  type="search"
                  value={projectSearch}
                  placeholder="Search name, lead, type"
                  onChange={e => onProjectSearchChange(e.target.value)}
                />
                <select
                  className={styles.select}
                  value={systemFilter}
                  onChange={e => onSystemFilterChange(e.target.value)}
                >
                  <option value="">All systems</option>
                  {systemOptions.map(system => (
                    <option key={system} value={system}>{system}</option>
                  ))}
                </select>
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={earlyOnly}
                    onChange={e => onEarlyOnlyChange(e.target.checked)}
                  />
                  <span className={styles.typeLabel}>Early implementation only</span>
                </label>
                <button
                  type="button"
                  className={styles.fitButton}
                  onClick={onFitVisibleProjects}
                  disabled={projects.length === 0}
                >
                  Fit visible projects
                </button>
                <div className={styles.resultCount}>
                  {projects.length} of {totalProjectCount} projects
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.projectList} role="list">
                {projects.length === 0 ? (
                  <p className={styles.emptyState}>No projects match the current filters.</p>
                ) : (
                  projects.map(project => {
                    const types = Array.isArray(project.project_type) ? project.project_type : []
                    return (
                      <div
                        key={project.display_id}
                        className={project.display_id === selectedDisplayId ? styles.projectItemSelected : styles.projectItem}
                        role="listitem"
                      >
                        <button
                          type="button"
                          className={styles.projectSelect}
                          onClick={() => onProjectSelect(project.display_id)}
                        >
                          <span className={styles.projectName}>{project.display_name}</span>
                          <span className={styles.projectMeta}>
                            {project.system}
                            {project.display_acreage != null
                              ? ` · ${project.display_acreage.toLocaleString()} ac`
                              : ''}
                          </span>
                          {types.length > 0 && (
                            <span className={styles.projectTypes}>
                              {types.map(capitalize).join(', ')}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          className={styles.projectZoom}
                          onClick={() => onZoomToProject(project.display_id)}
                          aria-label={`Zoom to ${project.display_name}`}
                        >
                          Zoom
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          className={styles.collapsed}
          onClick={onToggleOpen}
          aria-label="Expand layer panel"
        >
          <span className={styles.collapsedIcon}>☰</span>
          <span className={styles.collapsedLabel}>Layers</span>
        </button>
      )}
    </div>
  )
}
