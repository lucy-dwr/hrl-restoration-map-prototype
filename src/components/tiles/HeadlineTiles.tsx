import type { FeatureCollection } from 'geojson'
import {
  ACREAGE_TILE_LABEL,
  TOTAL_PROJECT_ACRES_HELP,
  formatAcreage,
  hasHrlHabitatAcreage,
  totalHrlHabitatAcreage,
} from '../../data/acreage'
import type { ProjectProperties } from '../../data/types'
import { InfoPopover } from '../info-popover/InfoPopover'
import styles from './HeadlineTiles.module.css'

interface Props {
  data: FeatureCollection | null
  totalProjectCount?: number
  layerPanelOpen?: boolean
}

export function HeadlineTiles({ data, layerPanelOpen = false }: Props) {
  if (!data) return null

  const features = data.features
  const total = features.length
  const withHrlHabitatAcreage = features.filter(
    f => hasHrlHabitatAcreage(f.properties as ProjectProperties)
  )
  const totalHrlAcreage = withHrlHabitatAcreage.reduce(
    (sum, f) => sum + totalHrlHabitatAcreage(f.properties as ProjectProperties),
    0
  )

  return (
    <div className={`${styles.strip} ${layerPanelOpen ? styles.stripWithLeftPanel : ''}`}>
      <div className={styles.metrics}>
        <div className={styles.tile}>
          <span className={styles.value}>{total}</span>
          <span className={styles.label}>projects</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.tile}>
          <span className={styles.value}>
            {withHrlHabitatAcreage.length > 0 ? formatAcreage(totalHrlAcreage) : '—'}
          </span>
          <span className={styles.labelWithHelp}>
            <span>{ACREAGE_TILE_LABEL}</span>
            <InfoPopover label="About total HRL project acres" placement="top">
              {TOTAL_PROJECT_ACRES_HELP}
            </InfoPopover>
          </span>
        </div>
      </div>
      <p className={styles.note}>
        Filters and layer selections change these totals. Project acres are for public orientation and are not final HRL habitat accounting acres.
      </p>
    </div>
  )
}
