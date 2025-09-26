export interface Unit {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface UnitSynonym {
  id: string
  unit_id: string
  synonym: string
  created_at: string
  updated_at: string
}

export interface UnitWithSynonyms extends Unit {
  synonyms: UnitSynonym[]
}

export interface UnitFormData {
  name: string
  description?: string
}

export interface UnitSynonymFormData {
  unit_id: string
  synonym: string
}