import 'fake-indexeddb/auto'
import { afterEach, beforeEach } from 'vitest'
import { db } from '@/database/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(async () => {
  await db.delete()
})
