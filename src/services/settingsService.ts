import { db } from '@/database/db'
import { DEFAULT_SETTINGS, SENSITIVITY_PRESETS, type AppSettings, type SensitivityPreset } from '@/models'

export async function getSettings(): Promise<AppSettings> {
  const stored = await db.settings.get('app')
  if (stored) return stored
  await db.settings.put(DEFAULT_SETTINGS)
  return { ...DEFAULT_SETTINGS }
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const safe: AppSettings = {
    ...settings,
    id: 'app',
    liveMinScore: Math.max(0, Math.min(100, Math.round(settings.liveMinScore))),
    graphMinScore: Math.max(0, Math.min(100, Math.round(settings.graphMinScore))),
    maxEdges: Math.max(1, Math.min(30, Math.round(settings.maxEdges))),
  }
  await db.settings.put(safe)
  return safe
}

export function settingsForPreset(
  current: AppSettings,
  preset: Exclude<SensitivityPreset, 'custom'>,
): AppSettings {
  return { ...current, preset, ...SENSITIVITY_PRESETS[preset] }
}
