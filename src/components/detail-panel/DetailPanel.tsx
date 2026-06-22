import type { ProjectProperties } from '../../data/types'
import { PROJECT_TYPE_COLORS, FALLBACK_COLOR } from '../../features/map/project-colors'
import styles from './DetailPanel.module.css'

interface Props {
  project: ProjectProperties
  onClose: () => void
  onZoomToProject: () => void
}

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtBudget(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}

export function DetailPanel({ project, onClose, onZoomToProject }: Props) {
  const types = Array.isArray(project.project_type) ? project.project_type : []
  const stages = Array.isArray(project.project_stage) ? project.project_stage : []
  const species = Array.isArray(project.target_species) ? project.target_species : []
  const funding = Array.isArray(project.funding_sources) ? project.funding_sources : []

  const constructionRange =
    project.construction_start_year === project.construction_completion_year
      ? `${project.construction_start_year}`
      : `${project.construction_start_year} – ${project.construction_completion_year}`

  const acreageRows: { label: string; value: number | null }[] = [
    { label: 'Bypass floodplain', value: project.acreage_bypass_floodplain },
    { label: 'Fish food production', value: project.acreage_fish_food },
    { label: 'Tributary floodplain', value: project.acreage_tributary_floodplain },
    { label: 'Tributary rearing', value: project.acreage_tributary_rearing },
    { label: 'Tributary spawning', value: project.acreage_tributary_spawning },
    { label: 'Tidal wetland', value: project.acreage_tidal_wetland },
  ].filter(r => r.value != null)

  return (
    <aside className={styles.panel} aria-label="Project details">
      <div className={styles.header}>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close project details"
        >
          ✕
        </button>
      </div>

      <div className={styles.body}>
        <h2 className={styles.projectName}>{project.project_name}</h2>
        <button className={styles.zoomBtn} onClick={onZoomToProject}>
          Zoom to project
        </button>

        <div className={styles.typeBadges}>
          {types.map(t => (
            <span
              key={t}
              className={styles.badge}
              style={{ borderColor: PROJECT_TYPE_COLORS[t] ?? FALLBACK_COLOR }}
            >
              <span
                className={styles.badgeDot}
                style={{ background: PROJECT_TYPE_COLORS[t] ?? FALLBACK_COLOR }}
              />
              {capitalize(t)}
            </span>
          ))}
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>{project.system}</span>
          {stages.length > 0 && (
            <>
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaItem}>{capitalize(stages[0])}</span>
            </>
          )}
        </div>

        {project.project_description && (
          <section className={styles.section}>
            <h3 className={styles.sectionLabel}>Description</h3>
            <p className={styles.description}>{project.project_description}</p>
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>Overview</h3>
          <dl className={styles.dl}>
            <dt>Lead entity</dt>
            <dd>{project.lead_entity}</dd>
            <dt>Construction</dt>
            <dd>{constructionRange}</dd>
            {project.estimated_budget != null && (
              <>
                <dt>Est. budget</dt>
                <dd>{fmtBudget(project.estimated_budget)}</dd>
              </>
            )}
          </dl>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>Acreage</h3>
          <div className={styles.acreageTotal}>
            {project.acreage != null
              ? <><strong>{fmt(project.acreage)}</strong> ac total</>
              : <span className={styles.muted}>Not reported</span>}
          </div>
          {acreageRows.length > 0 && (
            <dl className={styles.dl}>
              {acreageRows.map(r => (
                <>
                  <dt key={`${r.label}-dt`}>{r.label}</dt>
                  <dd key={`${r.label}-dd`}>{fmt(r.value)} ac</dd>
                </>
              ))}
            </dl>
          )}
        </section>

        {species.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionLabel}>Target species</h3>
            <ul className={styles.list}>
              {species.map(s => <li key={s}>{s}</li>)}
            </ul>
          </section>
        )}

        {funding.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionLabel}>Funding sources</h3>
            <ul className={styles.list}>
              {funding.map(f => <li key={f}>{f}</li>)}
            </ul>
          </section>
        )}
      </div>
    </aside>
  )
}
