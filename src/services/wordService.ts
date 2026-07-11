import Dexie from 'dexie'
import { db } from '@/database/db'
import type {
  LearnWordResult,
  Relation,
  RelationMatch,
  RelationNeighborhood,
  Word,
  WordInput,
  WordListQuery,
  WordListResult,
} from '@/models'
import { createPostings, generateSubstrings } from '@/services/indexing/indexingService'
import { relationPairId, scoreRelation } from '@/services/relation/relationService'
import { normalizeKana, validateKana } from '@/utils/kana'

const CANDIDATE_LIMIT = 500
const RELATION_RETENTION_LIMIT = 30

function cleanOptional(value?: string): string | undefined {
  const cleaned = value?.trim()
  return cleaned || undefined
}

function normalizeInput(input: WordInput): WordInput & { normalizedKana: string } {
  const error = validateKana(input.kana)
  if (error) throw new Error(error)
  return {
    kana: input.kana.trim().normalize('NFKC'),
    normalizedKana: normalizeKana(input.kana),
    kanji: cleanOptional(input.kanji),
    meaning: cleanOptional(input.meaning),
  }
}

async function candidateWords(normalizedKana: string, excludeWordId?: string): Promise<Word[]> {
  const candidateIds = new Set<string>()
  for (const token of generateSubstrings(normalizedKana)) {
    if (candidateIds.size >= CANDIDATE_LIMIT) break
    const remaining = CANDIDATE_LIMIT - candidateIds.size
    const postings = await db.postings
      .where('[token+learnedAt]')
      .between([token, Dexie.minKey], [token, Dexie.maxKey])
      .reverse()
      .limit(remaining)
      .toArray()
    for (const posting of postings) {
      if (posting.wordId !== excludeWordId) candidateIds.add(posting.wordId)
    }
  }
  const words = await db.words.bulkGet([...candidateIds])
  return words.filter((word): word is Word => Boolean(word))
}

export async function previewRelations(
  kana: string,
  options: { minScore?: number; limit?: number; excludeWordId?: string } = {},
): Promise<RelationMatch[]> {
  const normalizedKana = normalizeKana(kana)
  if (!normalizedKana || validateKana(kana)) return []
  const minScore = options.minScore ?? 20
  const limit = options.limit ?? 10
  const candidates = await candidateWords(normalizedKana, options.excludeWordId)

  return candidates
    .map((word) => ({ word, ...scoreRelation(normalizedKana, word.normalizedKana) }))
    .filter((relation) => relation.score >= minScore)
    .sort((a, b) => b.score - a.score || b.word.learnedAt - a.word.learnedAt)
    .slice(0, limit)
}

function matchesInput(word: Word, input: ReturnType<typeof normalizeInput>): boolean {
  return (
    word.normalizedKana === input.normalizedKana &&
    (word.kanji ?? '') === (input.kanji ?? '') &&
    (word.meaning ?? '') === (input.meaning ?? '')
  )
}

function matchesToRelations(word: Word, matches: RelationMatch[], now: number): Relation[] {
  return matches.slice(0, RELATION_RETENTION_LIMIT).map((match) => {
    const [sourceId, targetId] = [word.id, match.word.id].sort()
    return {
      id: relationPairId(sourceId, targetId),
      sourceId,
      targetId,
      score: match.score,
      sharedKana: match.sharedKana,
      sharedSubstrings: match.sharedSubstrings,
      longestSharedSubstring: match.longestSharedSubstring,
      boundaryAligned: match.boundaryAligned,
      createdAt: now,
      updatedAt: now,
    }
  })
}

export async function learnWord(input: WordInput): Promise<LearnWordResult> {
  const normalizedInput = normalizeInput(input)
  const sameKanaWords = await db.words
    .where('normalizedKana')
    .equals(normalizedInput.normalizedKana)
    .toArray()
  if (sameKanaWords.some((word) => matchesInput(word, normalizedInput))) {
    throw new Error('这个词条已经学习过了。')
  }

  const now = Date.now()
  const word: Word = {
    id: crypto.randomUUID(),
    kana: normalizedInput.kana,
    normalizedKana: normalizedInput.normalizedKana,
    kanji: normalizedInput.kanji,
    meaning: normalizedInput.meaning,
    learnedAt: now,
    updatedAt: now,
  }
  const matches = await previewRelations(word.kana, { minScore: 1, limit: RELATION_RETENTION_LIMIT })
  const relations = matchesToRelations(word, matches, now)

  await db.transaction('rw', db.words, db.postings, db.relations, async () => {
    await db.words.add(word)
    await db.postings.bulkAdd(createPostings(word))
    if (relations.length) await db.relations.bulkPut(relations)
  })
  return { word, relations: matches }
}

export async function updateWord(id: string, changes: WordInput): Promise<LearnWordResult> {
  const existing = await db.words.get(id)
  if (!existing) throw new Error('词条不存在或已被删除。')
  const normalizedInput = normalizeInput(changes)
  const sameKanaWords = await db.words
    .where('normalizedKana')
    .equals(normalizedInput.normalizedKana)
    .toArray()
  if (sameKanaWords.some((word) => word.id !== id && matchesInput(word, normalizedInput))) {
    throw new Error('相同的词条已经存在。')
  }

  const now = Date.now()
  const word: Word = {
    ...existing,
    kana: normalizedInput.kana,
    normalizedKana: normalizedInput.normalizedKana,
    kanji: normalizedInput.kanji,
    meaning: normalizedInput.meaning,
    updatedAt: now,
  }
  const kanaChanged = existing.normalizedKana !== word.normalizedKana
  if (!kanaChanged) {
    await db.words.put(word)
    return { word, relations: [] }
  }

  const matches = await previewRelations(word.kana, {
    minScore: 1,
    limit: RELATION_RETENTION_LIMIT,
    excludeWordId: id,
  })
  const relations = matchesToRelations(word, matches, now)
  await db.transaction('rw', db.words, db.postings, db.relations, async () => {
    await db.words.put(word)
    await db.postings.where('wordId').equals(id).delete()
    await db.relations.where('sourceId').equals(id).delete()
    await db.relations.where('targetId').equals(id).delete()
    await db.postings.bulkAdd(createPostings(word))
    if (relations.length) await db.relations.bulkPut(relations)
  })
  return { word, relations: matches }
}

export async function deleteWord(id: string): Promise<void> {
  await db.transaction('rw', db.words, db.postings, db.relations, async () => {
    await db.words.delete(id)
    await db.postings.where('wordId').equals(id).delete()
    await db.relations.where('sourceId').equals(id).delete()
    await db.relations.where('targetId').equals(id).delete()
  })
}

export async function listWords(query: WordListQuery = {}): Promise<WordListResult> {
  const offset = query.offset ?? 0
  const limit = query.limit ?? 30
  const search = query.search?.trim().toLocaleLowerCase()
  if (!search) {
    const total = await db.words.count()
    const items = await db.words.orderBy('learnedAt').reverse().offset(offset).limit(limit).toArray()
    return { items, total, hasMore: offset + items.length < total }
  }

  const normalizedSearch = normalizeKana(search)
  const filtered = await db.words
    .filter(
      (word) =>
        word.normalizedKana.includes(normalizedSearch) ||
        word.kana.toLocaleLowerCase().includes(search) ||
        word.kanji?.toLocaleLowerCase().includes(search) === true ||
        word.meaning?.toLocaleLowerCase().includes(search) === true,
    )
    .sortBy('learnedAt')
  filtered.reverse()
  const items = filtered.slice(offset, offset + limit)
  return { items, total: filtered.length, hasMore: offset + items.length < filtered.length }
}

async function relationsForWord(wordId: string, minScore: number, limit: number): Promise<Relation[]> {
  const [outgoing, incoming] = await Promise.all([
    db.relations.where('sourceId').equals(wordId).toArray(),
    db.relations.where('targetId').equals(wordId).toArray(),
  ])
  return [...outgoing, ...incoming]
    .filter((relation) => relation.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export async function getWordRelations(wordId: string, minScore = 0, limit = 30): Promise<Relation[]> {
  return relationsForWord(wordId, minScore, limit)
}

export async function getRelationNeighborhood(
  wordId: string,
  depth = 1,
  filters: { minScore?: number; maxEdges?: number } = {},
): Promise<RelationNeighborhood> {
  const minScore = filters.minScore ?? 20
  const maxEdges = Math.min(filters.maxEdges ?? 30, RELATION_RETENTION_LIMIT)
  const root = await db.words.get(wordId)
  if (!root) return { nodes: [], relations: [] }

  const nodes = new Map<string, { word: Word; depth: number }>([[root.id, { word: root, depth: 0 }]])
  const relations = new Map<string, Relation>()
  let frontier = [root.id]
  for (let currentDepth = 1; currentDepth <= Math.min(depth, 2); currentDepth += 1) {
    const nextIds = new Set<string>()
    for (const currentId of frontier) {
      const currentRelations = await relationsForWord(currentId, minScore, maxEdges)
      currentRelations.forEach((relation) => {
        relations.set(relation.id, relation)
        const neighborId = relation.sourceId === currentId ? relation.targetId : relation.sourceId
        if (!nodes.has(neighborId)) nextIds.add(neighborId)
      })
    }
    const neighborWords = await db.words.bulkGet([...nextIds])
    neighborWords.forEach((word) => {
      if (word) nodes.set(word.id, { word, depth: currentDepth })
    })
    frontier = neighborWords.filter((word): word is Word => Boolean(word)).map((word) => word.id)
  }
  return { nodes: [...nodes.values()], relations: [...relations.values()] }
}

export async function countWords(): Promise<number> {
  return db.words.count()
}
