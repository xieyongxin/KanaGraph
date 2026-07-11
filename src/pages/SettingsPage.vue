<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import type { ImportMode, SensitivityPreset, ThemePreference } from '@/models'
import { clearAllData, exportBackup, importBackup } from '@/services/backupService'
import { useSettingsStore } from '@/stores/settings'

const store = useSettingsStore()
const status = ref('')
const error = ref('')
const busy = ref(false)
const importMode = ref<ImportMode>('merge')

const presetLabels: Record<Exclude<SensitivityPreset, 'custom'>, { title: string; description: string }> = {
  loose: { title: '宽松', description: '保留单假名弱关联，适合词汇较少时。' },
  balanced: { title: '均衡', description: '减少常见假名带来的噪声。' },
  strict: { title: '严格', description: '只突出明显相似的连续片段。' },
}
const themes: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

async function setCustom(field: 'liveMinScore' | 'graphMinScore' | 'maxEdges', value: number): Promise<void> {
  await store.updateSensitivity({
    liveMinScore: field === 'liveMinScore' ? value : store.settings.liveMinScore,
    graphMinScore: field === 'graphMinScore' ? value : store.settings.graphMinScore,
    maxEdges: field === 'maxEdges' ? value : store.settings.maxEdges,
  })
}

async function downloadBackup(): Promise<void> {
  const payload = await exportBackup()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `kanagraph-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  status.value = '备份已导出。'
}

async function uploadBackup(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (
    !window.confirm(
      importMode.value === 'replace' ? '覆盖恢复会清除当前所有词汇，确定继续吗？' : '确定合并这个备份吗？',
    )
  )
    return
  busy.value = true
  error.value = ''
  try {
    await importBackup(JSON.parse(await file.text()) as unknown, importMode.value)
    await store.initialize()
    status.value = '备份导入完成，索引与关系已重新生成。'
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '导入失败。'
  } finally {
    busy.value = false
    input.value = ''
  }
}

async function clearData(): Promise<void> {
  if (!window.confirm('这会永久删除当前浏览器中的全部 KanaGraph 数据。建议先导出备份。')) return
  if (!window.confirm('再次确认：删除后无法撤销，是否继续？')) return
  await clearAllData()
  await store.initialize()
  status.value = '本地数据已清空。'
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Preferences & privacy"
      title="设置"
      description="调整关联灵敏度、外观和本地数据。所有设置同样保存在 IndexedDB 中。"
    />
    <div class="grid gap-6 lg:grid-cols-2">
      <section class="card p-6 sm:p-8">
        <p class="eyebrow">Relation sensitivity</p>
        <h2 class="mt-2 text-xl font-semibold">关联灵敏度</h2>
        <div class="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            v-for="(item, preset) in presetLabels"
            :key="preset"
            type="button"
            class="rounded-2xl border p-4 text-left transition"
            :class="
              store.settings.preset === preset
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                : 'border-stone-200 hover:border-stone-300 dark:border-stone-700'
            "
            @click="store.setPreset(preset)"
          >
            <strong class="block text-sm">{{ item.title }}</strong
            ><span class="mt-2 block text-xs leading-5 text-stone-500">{{ item.description }}</span>
          </button>
        </div>
        <details class="mt-6 rounded-2xl border border-stone-200 p-5 dark:border-stone-800">
          <summary class="cursor-pointer text-sm font-medium">
            高级设置
            <span v-if="store.settings.preset === 'custom'" class="ml-2 text-emerald-600">自定义</span>
          </summary>
          <div class="mt-6 space-y-6">
            <label class="block"
              ><span class="flex justify-between text-sm"
                ><span>实时提示最低分</span><strong>{{ store.settings.liveMinScore }}</strong></span
              ><input
                class="mt-3 w-full accent-emerald-700"
                type="range"
                min="0"
                max="100"
                step="5"
                :value="store.settings.liveMinScore"
                @change="setCustom('liveMinScore', Number(($event.target as HTMLInputElement).value))"
            /></label>
            <label class="block"
              ><span class="flex justify-between text-sm"
                ><span>图谱最低分</span><strong>{{ store.settings.graphMinScore }}</strong></span
              ><input
                class="mt-3 w-full accent-emerald-700"
                type="range"
                min="0"
                max="100"
                step="5"
                :value="store.settings.graphMinScore"
                @change="setCustom('graphMinScore', Number(($event.target as HTMLInputElement).value))"
            /></label>
            <label class="block"
              ><span class="flex justify-between text-sm"
                ><span>每词最多显示边数</span><strong>{{ store.settings.maxEdges }}</strong></span
              ><input
                class="mt-3 w-full accent-emerald-700"
                type="range"
                min="1"
                max="30"
                :value="store.settings.maxEdges"
                @change="setCustom('maxEdges', Number(($event.target as HTMLInputElement).value))"
            /></label>
          </div>
        </details>
      </section>

      <section class="card p-6 sm:p-8">
        <p class="eyebrow">Appearance</p>
        <h2 class="mt-2 text-xl font-semibold">外观</h2>
        <div class="mt-6 grid grid-cols-3 gap-3">
          <button
            v-for="theme in themes"
            :key="theme.value"
            type="button"
            class="rounded-2xl border px-3 py-4 text-sm font-medium"
            :class="
              store.settings.theme === theme.value
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                : 'border-stone-200 dark:border-stone-700'
            "
            @click="store.setTheme(theme.value)"
          >
            {{ theme.label }}
          </button>
        </div>
        <div class="mt-8 rounded-2xl bg-stone-50 p-5 dark:bg-stone-950/50">
          <p class="text-sm font-medium">隐私说明</p>
          <p class="muted mt-2">
            KanaGraph
            不创建账号、不加载分析脚本，也不会上传你的词汇。清理浏览器数据会删除本地内容，请定期导出备份。
          </p>
        </div>
      </section>

      <section class="card p-6 sm:p-8 lg:col-span-2">
        <p class="eyebrow">Backup & restore</p>
        <h2 class="mt-2 text-xl font-semibold">备份与恢复</h2>
        <div class="mt-6 grid gap-6 md:grid-cols-2">
          <div class="rounded-2xl border border-stone-200 p-5 dark:border-stone-800">
            <h3 class="font-medium">导出 JSON 备份</h3>
            <p class="muted mt-2">备份词汇、设置和关系信息，不包含任何账号或云端数据。</p>
            <button class="btn-primary mt-5" @click="downloadBackup">导出备份</button>
          </div>
          <div class="rounded-2xl border border-stone-200 p-5 dark:border-stone-800">
            <h3 class="font-medium">导入 JSON 备份</h3>
            <div class="mt-4 flex gap-4 text-sm">
              <label class="flex items-center gap-2"
                ><input
                  v-model="importMode"
                  type="radio"
                  value="merge"
                  class="accent-emerald-700"
                />合并导入</label
              ><label class="flex items-center gap-2"
                ><input
                  v-model="importMode"
                  type="radio"
                  value="replace"
                  class="accent-emerald-700"
                />覆盖恢复</label
              >
            </div>
            <label class="btn-secondary mt-5 cursor-pointer"
              ><input
                class="sr-only"
                type="file"
                accept="application/json,.json"
                :disabled="busy"
                @change="uploadBackup"
              />{{ busy ? '正在重建数据…' : '选择备份文件' }}</label
            >
          </div>
        </div>
        <div
          class="mt-6 flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800"
        >
          <div>
            <h3 class="font-medium text-red-700 dark:text-red-300">清空本地数据</h3>
            <p class="muted mt-1">永久删除词汇、索引、关系与设置。</p>
          </div>
          <button class="btn-danger" @click="clearData">清空全部数据</button>
        </div>
        <p v-if="status" class="mt-5 text-sm text-emerald-700 dark:text-emerald-400" role="status">
          ✓ {{ status }}
        </p>
        <p v-if="error" class="mt-5 text-sm text-red-600" role="alert">{{ error }}</p>
      </section>
    </div>
  </div>
</template>
