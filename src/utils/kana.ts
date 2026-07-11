const KATAKANA_START = 0x30a1
const KATAKANA_END = 0x30f6
const SCRIPT_OFFSET = 0x60
const KANA_PATTERN = /^[\u3041-\u3096\u30a1-\u30fa\u30fc]+$/u

export function normalizeKana(value: string): string {
  return Array.from(value.trim().normalize('NFKC'))
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      if (codePoint >= KATAKANA_START && codePoint <= KATAKANA_END) {
        return String.fromCodePoint(codePoint - SCRIPT_OFFSET)
      }
      return character
    })
    .join('')
}

export function validateKana(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return '请输入假名。'
  const length = Array.from(normalizeKana(trimmed)).length
  if (length > 32) return '假名不能超过 32 个字符。'
  if (!KANA_PATTERN.test(trimmed.normalize('NFKC'))) return '仅支持平假名、片假名和长音符。'
  return null
}

export function uniqueCharacters(value: string): string[] {
  return [...new Set(Array.from(value))]
}
