import type { IndexPosting, Word } from '@/models'

export function generateSubstrings(value: string): string[] {
  const characters = Array.from(value)
  const tokens = new Set<string>()
  for (let start = 0; start < characters.length; start += 1) {
    for (let end = start + 1; end <= characters.length; end += 1) {
      tokens.add(characters.slice(start, end).join(''))
    }
  }
  return [...tokens].sort((a, b) => Array.from(b).length - Array.from(a).length || a.localeCompare(b))
}

export function createPostings(word: Word): IndexPosting[] {
  return generateSubstrings(word.normalizedKana).map((token) => ({
    token,
    wordId: word.id,
    tokenLength: Array.from(token).length,
    learnedAt: word.learnedAt,
  }))
}
