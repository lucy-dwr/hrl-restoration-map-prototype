import type { FeatureCollection } from 'geojson'
import { ACREAGE_TILE_LABEL, formatAcreage } from '../../data/acreage'
import type { ProjectProperties } from '../../data/types'
import styles from './HeadlineTiles.module.css'

interface Props {
  data: FeatureCollection | null
  totalProjectCount?: number
}

export function HeadlineTiles({ data }: Props) {
  if (!data) return null

  const features = data.features
  const total = features.length
  const withAcreage = features.filter(
    f => (f.properties as ProjectProperties).acreage != null
  )
  const totalAcreage = withAcreage.reduce(
    (sum, f) => sum + ((f.properties as ProjectProperties).acreage ?? 0),
    0
  )

  return (
    <div className={styles.strip}>
      <div className={styles.metrics}>
        <div className={styles.tile}>
          <span className={styles.value}>{total}</span>
          <span className={styles.label}>projects</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.tile}>
          <span className={styles.value}>
            {withAcreage.length > 0 ? formatAcreage(totalAcreage) : '—'}
          </span>
          <span className={styles.label}>{ACREAGE_TILE_LABEL}</span>
        </div>
      </div>
      <p className={styles.note}>
        Filters change these totals. Acres are submitted by HRL entities, not confirmed habitat-accounting acres.
      </p>
    </div>
  )
}
