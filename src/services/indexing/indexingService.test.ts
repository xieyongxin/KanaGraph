import { describe, expect, it } from 'vitest'
import { generateSubstrings } from './indexingService'

describe('generateSubstrings', () => {
  it('creates every unique continuous substring in longest-first order', () => {
    const tokens = generateSubstrings('ごはん')
    expect(tokens).toEqual(expect.arrayContaining(['ご', 'は', 'ん', 'ごは', 'はん', 'ごはん']))
    expect(tokens).toHaveLength(6)
    expect(tokens[0]).toBe('ごはん')
  })

  it('deduplicates repeated substrings', () => {
    expect(generateSubstrings('ここ')).toEqual(expect.arrayContaining(['ここ', 'こ']))
    expect(generateSubstrings('ここ')).toHaveLength(2)
  })
})
