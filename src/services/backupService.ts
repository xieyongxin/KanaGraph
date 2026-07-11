import { db } from '@/database/db'
import type { AppSettings, BackupPayload, ImportMode, Relation, Word } from '@/models'
import { DEFAULT_SETTINGS } from '@/models'
import { createPostings, generateSubstrings } from '@/services/indexing/indexingService'
import { relationPairId, scoreRelation } from '@/services/relation/relationService'

const APP_VERSION = '1.0.0'

export async function exportBackup(): Promise<BackupPayload> {
  const [words, relations, settings] = await Promise.all([
    db.words.toArray(),
    db.relations.toArray(),
    db.settings.get('app'),
  ])
  return {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    words,
    relations,
    settings: settings ?? DEFAULT_SETTINGS,
  }
}

export function parseBackup(value: unknown): BackupPayload {
  if (!value || typeof value !== 'object') throw new Error('备份文件格式无效。')
  const payload = value as Partial<BackupPayload>
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.words) || !payload.settings) {
    throw new Error('备份版本不受支持或缺少必要数据。')
  }
  for (const word of payload.words) {
    if (!word.id || !word.kana || !word.normalizedKana || !Number.isFinite(word.learnedAt)) {
      throw new Error('备份中包含无效词条。')
    }
  }
  return payload as BackupPayload
}

function wordKey(word: Pick<Word, 'normalizedKana' | 'kanji' | 'meaning'>): string {
  return `${word.normalizedKana}\u0000${word.kanji ?? ''}\u0000${word.meaning ?? ''}`
}

async function restoreDerivedData(words: Word[]): Promise<void> {
  const ordered = [...words].sort((a, b) => a.learnedAt - b.learnedAt)
  const wordById = new Map(ordered.map((word) => [word.id, word]))
  const tokenWords = new Map<string, Set<string>>()
  const postings = [] as ReturnType<typeof createPostings>
  const relations = new Map<string, Relation>()

  for (const word of ordered) {
    const tokens = generateSubstrings(word.normalizedKana)
    const candidateIds = new Set<string>()
    tokens.forEach((token) => tokenWords.get(token)?.forEach((id) => candidateIds.add(id)))
    const matches = [...candidateIds]
      .map((id) => wordById.get(id))
      .filter((candidate): candidate is Word => Boolean(candidate))
      .map((candidate) => ({ candidate, ...scoreRelation(word.normalizedKana, candidate.normalizedKana) }))
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
    matches.forEach((match) => {
      const [sourceId, targetId] = [word.id, match.candidate.id].sort()
      const id = relationPairId(sourceId, targetId)
      relations.set(id, {
        id,
        sourceId,
        targetId,
        score: match.score,
        sharedKana: match.sharedKana,
        sharedSubstrings: match.sharedSubstrings,
        longestSharedSubstring: match.longestSharedSubstring,
        boundaryAligned: match.boundaryAligned,
        createdAt: word.learnedAt,
        updatedAt: word.updatedAt,
      })
    })
    postings.push(...createPostings(word))
    tokens.forEach((token) => {
      const ids = tokenWords.get(token) ?? new Set<string>()
      ids.add(word.id)
      tokenWords.set(token, ids)
    })
  }

  await db.transaction('rw', db.words, db.postings, db.relations, async () => {
    await Promise.all([db.words.clear(), db.postings.clear(), db.relations.clear()])
    if (ordered.length) await db.words.bulkAdd(ordered)
    if (postings.length) await db.postings.bulkAdd(postings)
    const relationRows = [...relations.values()]
    if (relationRows.length) await db.relations.bulkAdd(relationRows)
  })
}

export async function importBackup(payloadValue: unknown, mode: ImportMode): Promise<void> {
  const payload = parseBackup(payloadValue)
  const currentWords = mode === 'merge' ? await db.words.toArray() : []
  const merged = new Map(currentWords.map((word) => [wordKey(word), word]))
  payload.words.forEach((word) => {
    if (!merged.has(wordKey(word))) merged.set(wordKey(word), word)
  })
  const settings: AppSettings = { ...DEFAULT_SETTINGS, ...payload.settings, id: 'app' }

  await restoreDerivedData([...merged.values()])
  await db.settings.put(settings)
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.words, db.postings, db.relations, db.settings, async () => {
    await Promise.all([db.words.clear(), db.postings.clear(), db.relations.clear(), db.settings.clear()])
  })
}
