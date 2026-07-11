import { describe, expect, it } from 'vitest'
import { normalizeKana, validateKana } from './kana'

describe('kana utilities', () => {
  it('normalizes half-width and full-width katakana to hiragana', () => {
    expect(normalizeKana(' カナ ')).toBe('かな')
    expect(normalizeKana('ｶﾅ')).toBe('かな')
  })

  it('keeps voiced and small kana distinct', () => {
    expect(normalizeKana('ガッコウ')).toBe('がっこう')
    expect(normalizeKana('か')).not.toBe(normalizeKana('が'))
  })

  it('rejects mixed non-kana input and long values', () => {
    expect(validateKana('ご飯')).toContain('仅支持')
    expect(validateKana('あ'.repeat(33))).toContain('32')
    expect(validateKana('')).toContain('请输入')
  })
})
