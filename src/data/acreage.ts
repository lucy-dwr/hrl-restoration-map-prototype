export const ACREAGE_LABEL = 'Total project acres'
export const ACREAGE_TILE_LABEL = 'total project acres'
export const ACREAGE_COMPACT_LABEL = 'acres'

export const ACREAGE_DEFINITION =
  'Total project acreage restored as habitat; each acre is counted once.'

export function formatAcreage(
  value: number | null | undefined,
  maximumFractionDigits = 0
): string {
  if (value == null) return '—'
  return value.toLocaleString('en-US', { maximumFractionDigits })
}
