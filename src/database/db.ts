import Dexie, { type Table } from 'dexie'
import type { AppSettings, IndexPosting, Relation, Word } from '@/models'

export class KanaGraphDatabase extends Dexie {
  words!: Table<Word, string>
  postings!: Table<IndexPosting, [string, string]>
  relations!: Table<Relation, string>
  settings!: Table<AppSettings, string>

  constructor(name = 'KanaGraph') {
    super(name)
    this.version(1).stores({
      words: 'id, normalizedKana, learnedAt, updatedAt',
      postings: '[token+wordId], token, wordId, tokenLength, [token+learnedAt]',
      relations: 'id, sourceId, targetId, score, updatedAt',
      settings: 'id',
    })
  }
}

export const db = new KanaGraphDatabase()
