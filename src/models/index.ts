export type ThemePreference = 'system' | 'light' | 'dark'
export type SensitivityPreset = 'loose' | 'balanced' | 'strict' | 'custom'

export interface Word {
  id: string
  kana: string
  normalizedKana: string
  kanji?: string
  meaning?: string
  learnedAt: number
  updatedAt: number
}

export interface WordInput {
  kana: string
  kanji?: string
  meaning?: string
}

export interface IndexPosting {
  token: string
  wordId: string
  tokenLength: number
  learnedAt: number
}

export interface RelationExplanation {
  sharedKana: string[]
  sharedSubstrings: string[]
  longestSharedSubstring: string
  boundaryAligned: boolean
}

export interface Relation extends RelationExplanation {
  id: string
  sourceId: string
  targetId: string
  score: number
  createdAt: number
  updatedAt: number
}

export interface RelationMatch extends RelationExplanation {
  word: Word
  score: number
}

export interface RelationSensitivity {
  liveMinScore: number
  graphMinScore: number
  maxEdges: number
}

export interface AppSettings extends RelationSensitivity {
  id: 'app'
  preset: SensitivityPreset
  theme: ThemePreference
}

export interface LearnWordResult {
  word: Word
  relations: RelationMatch[]
}

export interface WordListQuery {
  search?: string
  offset?: number
  limit?: number
}

export interface WordListResult {
  items: Word[]
  total: number
  hasMore: boolean
}

export interface GraphNode {
  word: Word
  depth: number
}

export interface RelationNeighborhood {
  nodes: GraphNode[]
  relations: Relation[]
}

export interface BackupPayload {
  schemaVersion: 1
  appVersion: string
  exportedAt: string
  words: Word[]
  settings: AppSettings
  relations: Relation[]
}

export type ImportMode = 'replace' | 'merge'

export const SENSITIVITY_PRESETS: Record<Exclude<SensitivityPreset, 'custom'>, RelationSensitivity> = {
  loose: { liveMinScore: 20, graphMinScore: 20, maxEdges: 30 },
  balanced: { liveMinScore: 30, graphMinScore: 40, maxEdges: 20 },
  strict: { liveMinScore: 50, graphMinScore: 60, maxEdges: 10 },
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  preset: 'loose',
  theme: 'system',
  ...SENSITIVITY_PRESETS.loose,
}
