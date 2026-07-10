export const PROJECT_LAYER_TYPES = [
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

export const TRIBUTARY_WATERSHEDS = [
  { key: 'sacramento', label: 'Sacramento', color: '#8f8798' },
  { key: 'american', label: 'American', color: '#a77484' },
  { key: 'feather', label: 'Feather', color: '#9a854e' },
  { key: 'yuba', label: 'Yuba', color: '#7f8a55' },
  { key: 'putah', label: 'Putah', color: '#b08362' },
  { key: 'mokelumne', label: 'Mokelumne', color: '#9087ae' },
  { key: 'tuolumne', label: 'Tuolumne', color: '#a78355' },
]

export type BoundaryFocusTarget =
  | { kind: 'tributary'; key: string }
  | { kind: 'delta' }
  | { kind: 'yolo-bypass' }
  | { kind: 'sutter-bypass' }
