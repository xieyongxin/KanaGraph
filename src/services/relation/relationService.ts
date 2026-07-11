import type { RelationExplanation } from '@/models'
import { uniqueCharacters } from '@/utils/kana'

interface ScoredRelation extends RelationExplanation {
  score: number
}

function allCommonSubstrings(left: string, right: string): string[] {
  const leftChars = Array.from(left)
  const rightChars = Array.from(right)
  const matches = new Set<string>()
  for (let leftIndex = 0; leftIndex < leftChars.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < rightChars.length; rightIndex += 1) {
      let length = 0
      while (
        leftIndex + length < leftChars.length &&
        rightIndex + length < rightChars.length &&
        leftChars[leftIndex + length] === rightChars[rightIndex + length]
      ) {
        length += 1
        if (length >= 2) matches.add(leftChars.slice(leftIndex, leftIndex + length).join(''))
      }
    }
  }
  const ordered = [...matches].sort(
    (a, b) => Array.from(b).length - Array.from(a).length || a.localeCompare(b),
  )
  return ordered.filter(
    (candidate, index) => !ordered.slice(0, index).some((item) => item.includes(candidate)),
  )
}

function longestCommonSubstring(left: string, right: string): string {
  const leftChars = Array.from(left)
  const rightChars = Array.from(right)
  let longest = ''
  const lengths = Array.from({ length: rightChars.length + 1 }, () => 0)
  for (let leftIndex = 1; leftIndex <= leftChars.length; leftIndex += 1) {
    for (let rightIndex = rightChars.length; rightIndex >= 1; rightIndex -= 1) {
      if (leftChars[leftIndex - 1] === rightChars[rightIndex - 1]) {
        lengths[rightIndex] = lengths[rightIndex - 1] + 1
        const candidate = leftChars.slice(leftIndex - lengths[rightIndex], leftIndex).join('')
        if (Array.from(candidate).length > Array.from(longest).length) longest = candidate
      } else {
        lengths[rightIndex] = 0
      }
    }
  }
  return longest
}

export function scoreRelation(left: string, right: string): ScoredRelation {
  if (left === right) {
    return {
      score: 100,
      sharedKana: uniqueCharacters(left),
      sharedSubstrings: left.length > 1 ? [left] : [],
      longestSharedSubstring: left,
      boundaryAligned: true,
    }
  }

  const rightCharacters = new Set(Array.from(right))
  const sharedKana = uniqueCharacters(left).filter((character) => rightCharacters.has(character))
  const longestSharedSubstring = longestCommonSubstring(left, right)
  const longestLength = Array.from(longestSharedSubstring).length
  const boundaryAligned =
    longestLength > 0 &&
    ((left.startsWith(longestSharedSubstring) && right.startsWith(longestSharedSubstring)) ||
      (left.endsWith(longestSharedSubstring) && right.endsWith(longestSharedSubstring)))
  const score = Math.min(100, sharedKana.length * 5 + longestLength * 15 + (boundaryAligned ? 35 : 0))

  return {
    score,
    sharedKana,
    sharedSubstrings: allCommonSubstrings(left, right),
    longestSharedSubstring,
    boundaryAligned,
  }
}

export function relationPairId(leftId: string, rightId: string): string {
  return [leftId, rightId].sort().join('::')
}
