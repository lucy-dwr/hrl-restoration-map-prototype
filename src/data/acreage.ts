export const ACREAGE_LABEL = 'Project acres'
export const ACREAGE_TILE_LABEL = 'total project acres'
export const ACREAGE_COMPACT_LABEL = 'acres'

export const ACREAGE_DEFINITION =
  'Acres reported for this project by HRL participating entities. These values are for public orientation and are not final HRL habitat accounting acres.'

export const PROJECT_ACRES_HELP =
  'Acres reported for this project by HRL participating entities. These values are for public orientation and are not final HRL habitat accounting acres. They may include aquatic, transitional, and terrestrial areas, so they may differ from the listed aquatic habitat type acres or the mapped footprint.'

export const TOTAL_PROJECT_ACRES_HELP =
  'Total project acres for projects included by the current filters and layer selections. These values are for public orientation and are not final HRL habitat accounting acres.'

export const HABITAT_TYPE_ACRES_HELP =
  'Reported acres by aquatic habitat category. These category values may not add up to total project acres because project acres may include other areas, such as terrestrial habitat, and because habitat category values are not final HRL habitat accounting acres.'

export function formatAcreage(
  value: number | null | undefined,
  maximumFractionDigits = 0
): string {
  if (value == null) return '—'
  return value.toLocaleString('en-US', { maximumFractionDigits })
}
