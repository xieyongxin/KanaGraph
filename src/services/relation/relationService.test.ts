import { describe, expect, it } from 'vitest'
import { scoreRelation } from './relationService'

describe('scoreRelation', () => {
  it('matches the exact MVP acceptance scores', () => {
    expect(scoreRelation('ごはん', 'はな').score).toBe(20)
    expect(scoreRelation('ありがとう', 'ありがたい').score).toBe(95)
  })

  it('returns 100 for homophones with the same normalized kana', () => {
    expect(scoreRelation('はし', 'はし').score).toBe(100)
  })

  it('explains shared kana and maximal substrings', () => {
    const result = scoreRelation('ありがとう', 'ありがたい')
    expect(result.sharedKana).toEqual(['あ', 'り', 'が'])
    expect(result.longestSharedSubstring).toBe('ありが')
    expect(result.sharedSubstrings).toContain('ありが')
    expect(result.boundaryAligned).toBe(true)
  })
})
