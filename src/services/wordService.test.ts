import { describe, expect, it } from 'vitest'
import { db } from '@/database/db'
import {
  deleteWord,
  getRelationNeighborhood,
  learnWord,
  listWords,
  previewRelations,
  updateWord,
} from './wordService'

describe('word service', () => {
  it('learns words, creates postings, persists relations and previews through the index', async () => {
    const first = await learnWord({ kana: 'ごはん', kanji: 'ご飯' })
    const second = await learnWord({ kana: 'はな', kanji: '花' })
    expect(await db.words.count()).toBe(2)
    expect(await db.postings.where('wordId').equals(first.word.id).count()).toBe(6)
    expect(await db.relations.count()).toBe(1)
    expect(second.relations[0]?.score).toBe(20)
    const preview = await previewRelations('はら', { minScore: 20 })
    expect(preview.map((item) => item.word.id)).toContain(first.word.id)
  })

  it('allows homophones but rejects an exact duplicate', async () => {
    await learnWord({ kana: 'はし', kanji: '橋', meaning: '桥' })
    await expect(learnWord({ kana: 'ハシ', kanji: '箸', meaning: '筷子' })).resolves.toBeDefined()
    await expect(learnWord({ kana: 'はし', kanji: '橋', meaning: '桥' })).rejects.toThrow('已经学习')
  })

  it('rebuilds derived data when kana changes and cascades on delete', async () => {
    const word = (await learnWord({ kana: 'はな' })).word
    await learnWord({ kana: 'ごはん' })
    await updateWord(word.id, { kana: 'ありがたい' })
    expect(await db.postings.where('token').equals('ありが').count()).toBe(1)
    expect(await db.postings.where('token').equals('はな').count()).toBe(0)
    await deleteWord(word.id)
    expect(await db.postings.where('wordId').equals(word.id).count()).toBe(0)
    expect(await db.relations.where('sourceId').equals(word.id).count()).toBe(0)
    expect(await db.relations.where('targetId').equals(word.id).count()).toBe(0)
  })

  it('lists words in reverse learning order and builds a filtered neighborhood', async () => {
    const first = (await learnWord({ kana: 'ごはん', meaning: '米饭' })).word
    await learnWord({ kana: 'はな', meaning: '花' })
    const third = (await learnWord({ kana: 'ありがたい', meaning: '难得' })).word
    await learnWord({ kana: 'ありがとう', meaning: '谢谢' })

    const page = await listWords({ limit: 2 })
    expect(page.items).toHaveLength(2)
    expect(page.items[0]?.learnedAt).toBeGreaterThanOrEqual(page.items[1]?.learnedAt ?? 0)
    expect(page.hasMore).toBe(true)
    const searched = await listWords({ search: '米饭' })
    expect(searched.items.map((word) => word.id)).toEqual([first.id])

    const neighborhood = await getRelationNeighborhood(third.id, 1, { minScore: 90, maxEdges: 10 })
    expect(neighborhood.nodes.map((node) => node.word.kana)).toEqual(
      expect.arrayContaining(['ありがたい', 'ありがとう']),
    )
    expect(neighborhood.relations[0]?.score).toBe(95)
  })
})
