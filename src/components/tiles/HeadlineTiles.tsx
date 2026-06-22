import type { FeatureCollection } from 'geojson'
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
      <div className={styles.tile}>
        <span className={styles.value}>{total}</span>
        <span className={styles.label}>projects</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.tile}>
        <span className={styles.value}>
          {withAcreage.length > 0
            ? totalAcreage.toLocaleString('en-US', { maximumFractionDigits: 0 })
            : '—'}
        </span>
        <span className={styles.label}>acres</span>
      </div>
    </div>
  )
}
