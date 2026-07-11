import { describe, expect, it } from 'vitest'
import { db } from '@/database/db'
import type { Word } from '@/models'
import { createPostings } from '@/services/indexing/indexingService'
import { previewRelations } from '@/services/wordService'

describe('10,000-word indexed search benchmark', () => {
  it('returns a bounded result set through postings without scanning the words table', async () => {
    const now = Date.now()
    const words: Word[] = Array.from({ length: 10_000 }, (_, index) => {
      return {
        id: `benchmark-${index.toString().padStart(5, '0')}`,
        kana: 'あ',
        normalizedKana: 'あ',
        learnedAt: now + index,
        updatedAt: now + index,
      }
    })
    await db.words.bulkAdd(words)
    await db.postings.bulkAdd(words.flatMap(createPostings))

    const startedAt = performance.now()
    const matches = await previewRelations('あ', { minScore: 20, limit: 10 })
    const elapsed = performance.now() - startedAt

    expect(matches.length).toBeLessThanOrEqual(10)
    expect(elapsed).toBeLessThan(1_000)
  }, 30_000)
})
