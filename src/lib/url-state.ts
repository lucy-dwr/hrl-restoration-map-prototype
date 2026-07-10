// URL state encoding/decoding for the HRL Dashboard.
//
// Schema:
//   ?lat=38.4000&lng=-121.8000&zoom=7.00
//   &basemap=imagery                         (absent = map)
//   &selected=project-3
//   &hidden=spawning+habitat,tidal+habitat   (comma-separated type keys)
//   &visibleTributaries=american,putah       (comma-separated visible HRL tributary keys)
//   &delta=1                                 (absent = hidden; "1" = visible)
//   &yolobypass=1                            (absent = hidden; "1" = visible)
//   &sutterbypass=1                          (absent = hidden; "1" = visible)
//   &streams=0                               (absent = visible; "0" = hidden)

export type BasemapMode = 'map' | 'imagery'

const TRIBUTARY_KEYS = [
  'sacramento',
  'american',
  'feather',
  'yuba',
  'putah',
  'mokelumne',
  'tuolumne',
]

export interface UrlState {
  lat: number
  lng: number
  zoom: number
  hasUrlState: boolean
  basemap: BasemapMode
  selected: string | null
  hiddenTypes: Set<string>
  visibleTributaries: Set<string>
  deltaBoundaryVisible: boolean
  yoloBypassVisible: boolean
  sutterBypassVisible: boolean
  streamsVisible: boolean
}

const DEFAULTS: UrlState = {
  lat: 38.4,
  lng: -121.8,
  zoom: 7,
  hasUrlState: false,
  basemap: 'map',
  selected: null,
  hiddenTypes: new Set(),
  visibleTributaries: new Set(),
  deltaBoundaryVisible: false,
  yoloBypassVisible: false,
  sutterBypassVisible: false,
  streamsVisible: true,
}

export function readUrlState(): UrlState {
  const p = new URLSearchParams(window.location.search)

  const lat = parseFloat(p.get('lat') ?? '')
  const lng = parseFloat(p.get('lng') ?? '')
  const zoom = parseFloat(p.get('zoom') ?? '')
  const hidden = p.get('hidden') ?? ''
  let visibleTributaries = new Set(
    (p.get('visibleTributaries') ?? '').split(',').filter(Boolean)
  )

  // Backward compatibility for shared prototype URLs from older watershed
  // implementations that defaulted tributary watersheds on.
  if (p.has('hiddenTributaries')) {
    const hiddenTributaries = new Set(
      (p.get('hiddenTributaries') ?? '').split(',').filter(Boolean)
    )
    visibleTributaries = new Set(
      TRIBUTARY_KEYS.filter(key => !hiddenTributaries.has(key))
    )
  }

  if (p.get('sacramento') === '0') visibleTributaries.delete('sacramento')
  if (p.get('mokelumne') === '0') visibleTributaries.delete('mokelumne')
  if (p.get('tuolumne') === '0') visibleTributaries.delete('tuolumne')

  return {
    lat: Number.isFinite(lat) ? lat : DEFAULTS.lat,
    lng: Number.isFinite(lng) ? lng : DEFAULTS.lng,
    zoom: Number.isFinite(zoom) ? zoom : DEFAULTS.zoom,
    hasUrlState: window.location.search.length > 1,
    basemap: p.get('basemap') === 'imagery' ? 'imagery' : DEFAULTS.basemap,
    selected: p.get('selected') ?? null,
    hiddenTypes: new Set(hidden ? hidden.split(',').filter(Boolean) : []),
    visibleTributaries,
    deltaBoundaryVisible: p.get('delta') === '1',
    yoloBypassVisible: p.get('yolobypass') === '1',
    sutterBypassVisible: p.get('sutterbypass') === '1',
    streamsVisible: p.get('streams') !== '0',
  }
}

export function writeUrlState(state: Partial<UrlState>): void {
  const p = new URLSearchParams(window.location.search)

  if (state.lat !== undefined) p.set('lat', state.lat.toFixed(4))
  if (state.lng !== undefined) p.set('lng', state.lng.toFixed(4))
  if (state.zoom !== undefined) p.set('zoom', state.zoom.toFixed(2))

  if (state.basemap !== undefined) {
    if (state.basemap === 'map') p.delete('basemap')
    else p.set('basemap', state.basemap)
  }

  if ('selected' in state) {
    if (state.selected) p.set('selected', state.selected)
    else p.delete('selected')
  }

  if (state.hiddenTypes !== undefined) {
    if (state.hiddenTypes.size > 0) {
      p.set('hidden', [...state.hiddenTypes].join(','))
    } else {
      p.delete('hidden')
    }
  }

  if (state.visibleTributaries !== undefined) {
    p.delete('sacramento')
    p.delete('mokelumne')
    p.delete('tuolumne')
    p.delete('hiddenTributaries')
    if (state.visibleTributaries.size > 0) {
      p.set('visibleTributaries', [...state.visibleTributaries].join(','))
    } else {
      p.delete('visibleTributaries')
    }
  }

  if (state.deltaBoundaryVisible !== undefined) {
    if (state.deltaBoundaryVisible) p.set('delta', '1')
    else p.delete('delta')
  }

  if (state.yoloBypassVisible !== undefined) {
    if (state.yoloBypassVisible) p.set('yolobypass', '1')
    else p.delete('yolobypass')
  }

  if (state.sutterBypassVisible !== undefined) {
    if (state.sutterBypassVisible) p.set('sutterbypass', '1')
    else p.delete('sutterbypass')
  }

  if (state.streamsVisible !== undefined) {
    if (state.streamsVisible) p.delete('streams')
    else p.set('streams', '0')
  }

  history.replaceState(null, '', p.toString() ? `?${p.toString()}` : window.location.pathname)
}
