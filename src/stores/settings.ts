import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AppSettings, SensitivityPreset, ThemePreference } from '@/models'
import { DEFAULT_SETTINGS } from '@/models'
import { getSettings, saveSettings, settingsForPreset } from '@/services/settingsService'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const ready = ref(false)
  const isDark = computed(() => {
    if (settings.value.theme === 'dark') return true
    if (settings.value.theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  function applyTheme(): void {
    document.documentElement.classList.toggle('dark', isDark.value)
    document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
  }

  async function initialize(): Promise<void> {
    settings.value = await getSettings()
    ready.value = true
    applyTheme()
  }

  async function setPreset(preset: Exclude<SensitivityPreset, 'custom'>): Promise<void> {
    settings.value = await saveSettings(settingsForPreset(settings.value, preset))
    applyTheme()
  }

  async function updateSensitivity(values: Pick<AppSettings, 'liveMinScore' | 'graphMinScore' | 'maxEdges'>) {
    settings.value = await saveSettings({ ...settings.value, ...values, preset: 'custom' })
  }

  async function setTheme(theme: ThemePreference): Promise<void> {
    settings.value = await saveSettings({ ...settings.value, theme })
    applyTheme()
  }

  return { settings, ready, isDark, initialize, setPreset, updateSensitivity, setTheme, applyTheme }
})
