import type { ProjectProperties } from './types'

export const ACREAGE_LABEL = 'Project acres'
export const ACREAGE_TILE_LABEL = 'total HRL project acres'
export const ACREAGE_COMPACT_LABEL = 'acres'

export const HRL_HABITAT_ACREAGE_FIELDS = [
  'acreage_bypass_floodplain',
  'acreage_fish_food',
  'acreage_tributary_floodplain',
  'acreage_tributary_rearing',
  'acreage_tributary_spawning',
  'acreage_tidal_wetland',
] as const satisfies readonly (keyof ProjectProperties)[]

export const ACREAGE_DEFINITION =
  'Acres reported for this project by HRL participating entities. These values are for public orientation and are not final HRL habitat accounting acres.'

export const PROJECT_ACRES_HELP =
  'Acres reported for this project by HRL participating entities. These values are for public orientation and are not final HRL habitat accounting acres. They may include aquatic, transitional, and terrestrial areas, so they may differ from the listed aquatic habitat type acres or the mapped footprint.'

export const TOTAL_PROJECT_ACRES_HELP =
  'Sum of the reported acres for HRL habitat types: bypass floodplain, fish food production, tributary floodplain, tributary rearing, tributary spawning, and tidal wetland. The total includes projects selected by the current filters and layer selections. These values are for public orientation and are not final HRL habitat accounting acres.'

export const HABITAT_TYPE_ACRES_HELP =
  'Reported acres by aquatic habitat category. These category values may not add up to total project acres because project acres may include other areas, such as terrestrial habitat, and because habitat category values are not final HRL habitat accounting acres.'

export function formatAcreage(
  value: number | null | undefined,
  maximumFractionDigits = 0
): string {
  if (value == null) return '—'
  return value.toLocaleString('en-US', { maximumFractionDigits })
}

export function totalHrlHabitatAcreage(project: ProjectProperties): number {
  return HRL_HABITAT_ACREAGE_FIELDS.reduce(
    (sum, field) => sum + (project[field] ?? 0),
    0
  )
}

export function hasHrlHabitatAcreage(project: ProjectProperties): boolean {
  return HRL_HABITAT_ACREAGE_FIELDS.some(field => project[field] != null)
}
