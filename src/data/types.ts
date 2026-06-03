export interface ProjectProperties {
  project_name: string
  project_description: string
  project_stage: string[]
  lead_entity: string
  contractors: string[] | null
  early_implementation: boolean
  construction_start_year: number
  construction_completion_year: number
  construction_completion_year_comments: string | null
  estimated_budget: number | null
  estimated_budget_comments: string | null
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
  display_name: string
  display_acreage: number | null
  display_stage: string
}
