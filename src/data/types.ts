export interface ProjectProperties {
  project_name: string
  project_description: string
  project_stage: string[]
  lead_entity: string
  contractors: string[] | null
  early_implementation: boolean
  construction_start_year: number
  construction_completion_year: number
  estimated_budget: number | null
  funding_sources: string[] | null
  system: string
  project_type: string[]
  acreage: number | null
  acreage_bypass_floodplain: number | null
  acreage_fish_food: number | null
  acreage_tributary_floodplain: number | null
  acreage_tributary_rearing: number | null
  acreage_tributary_spawning: number | null
  acreage_tidal_wetland: number | null
  target_species: string[]
  display_id: string
}
