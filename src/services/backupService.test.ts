import { describe, expect, it } from 'vitest'
import { db } from '@/database/db'
import { exportBackup, importBackup } from './backupService'
import { learnWord } from './wordService'

describe('backup service', () => {
  it('exports and restores authoritative words while rebuilding derived data', async () => {
    await learnWord({ kana: 'ごはん', kanji: 'ご飯' })
    await learnWord({ kana: 'はな', kanji: '花' })
    const backup = await exportBackup()
    await db.words.clear()
    await importBackup(backup, 'replace')
    expect(await db.words.count()).toBe(2)
    expect(await db.postings.count()).toBeGreaterThan(0)
    expect(await db.relations.count()).toBe(1)
  })

  it('merges without duplicating complete entries', async () => {
    await learnWord({ kana: 'ごはん', kanji: 'ご飯' })
    const backup = await exportBackup()
    await learnWord({ kana: 'はな', kanji: '花' })
    await importBackup(backup, 'merge')
    expect(await db.words.count()).toBe(2)
  })
})
