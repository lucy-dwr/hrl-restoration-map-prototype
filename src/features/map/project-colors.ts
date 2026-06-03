import type { ExpressionSpecification } from 'maplibre-gl'

// CVD-tested palette (deuteranopia/protanopia safe), hue-separated at typical zoom.
// Covers all ProjectTypeEnum values in the vendored LinkML schema.
export const PROJECT_TYPE_COLORS: Record<string, string> = {
  'bypass floodplain habitat':                '#1b7eb8', // blue
  'fish food production':                     '#f5a623', // amber
  'fish passage improvement':                 '#e05a00', // orange
  'fish screen installation or improvement':  '#7c4dab', // purple
  'rearing habitat':                          '#d44090', // magenta
  'spawning habitat':                         '#c0392b', // red
  'tidal habitat':                            '#009b8d', // teal
  'tributary floodplain habitat':             '#2a7a34', // green
  'other':                                    '#737373', // gray
}

export const FALLBACK_COLOR = '#737373'

export const TYPE_MATCH_EXPR: ExpressionSpecification = [
  'match',
  ['get', 'primary_type'],
  'bypass floodplain habitat',                '#1b7eb8',
  'fish food production',                     '#f5a623',
  'fish passage improvement',                 '#e05a00',
  'fish screen installation or improvement',  '#7c4dab',
  'rearing habitat',                          '#d44090',
  'spawning habitat',                         '#c0392b',
  'tidal habitat',                            '#009b8d',
  'tributary floodplain habitat',             '#2a7a34',
  'other',                                    '#737373',
  FALLBACK_COLOR,
]
