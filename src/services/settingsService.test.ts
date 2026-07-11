import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/models'
import { getSettings, saveSettings, settingsForPreset } from './settingsService'

describe('settings service', () => {
  it('creates defaults and applies presets', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
    const strict = settingsForPreset(DEFAULT_SETTINGS, 'strict')
    expect(strict).toMatchObject({ preset: 'strict', liveMinScore: 50, graphMinScore: 60, maxEdges: 10 })
  })

  it('clamps custom values to safe ranges', async () => {
    const saved = await saveSettings({
      ...DEFAULT_SETTINGS,
      preset: 'custom',
      liveMinScore: -20,
      graphMinScore: 140,
      maxEdges: 90,
    })
    expect(saved).toMatchObject({ liveMinScore: 0, graphMinScore: 100, maxEdges: 30 })
  })
})
