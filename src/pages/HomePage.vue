<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import RelationCard from '@/components/RelationCard.vue'
import { useDebouncedRelations } from '@/composables/useDebouncedRelations'
import type { RelationMatch } from '@/models'
import { countWords } from '@/services/wordService'
import { useSettingsStore } from '@/stores/settings'
import { useWordsStore } from '@/stores/words'
import { validateKana } from '@/utils/kana'

const settingsStore = useSettingsStore()
const wordsStore = useWordsStore()
const kana = ref('')
const kanji = ref('')
const meaning = ref('')
const optionalOpen = ref(false)
const submitting = ref(false)
const error = ref('')
const success = ref('')
const wordCount = ref(0)
const newRelations = ref<RelationMatch[]>([])
const minScore = computed(() => settingsStore.settings.liveMinScore)
const { matches, loading } = useDebouncedRelations(kana, minScore)
const examples = ['ごはん', 'はな', 'ありがとう', 'ありがたい']

onMounted(async () => {
  wordCount.value = await countWords()
})

async function submit(): Promise<void> {
  error.value = ''
  success.value = ''
  const validationError = validateKana(kana.value)
  if (validationError) {
    error.value = validationError
    return
  }
  submitting.value = true
  try {
    const result = await wordsStore.learn({ kana: kana.value, kanji: kanji.value, meaning: meaning.value })
    success.value = `已学习：${result.word.kana}，词汇网络已更新。`
    newRelations.value = result.relations.filter((item) => item.score >= minScore.value).slice(0, 5)
    wordCount.value += 1
    kana.value = ''
    kanji.value = ''
    meaning.value = ''
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '保存失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Build your vocabulary graph"
      title="每学一个词，都让记忆多一条线索。"
      description="KanaGraph 根据假名中的共同字符和连续片段，实时发现你已经学过的相关词。关联分数只表示假名形态相似度。"
    />

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)]">
      <section class="card overflow-hidden">
        <div class="border-b border-stone-100 p-6 sm:p-8 dark:border-stone-800">
          <div class="mb-7 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-stone-900 dark:text-white">学习新词</p>
              <p class="mt-1 text-xs text-stone-500">当前已有 {{ wordCount }} 个词汇节点</p>
            </div>
            <span class="tag">宽松提示 ≥ {{ minScore }}</span>
          </div>
          <form class="space-y-5" @submit.prevent="submit">
            <div>
              <label class="field-label" for="kana">假名 <span class="text-red-500">*</span></label>
              <input
                id="kana"
                v-model="kana"
                class="input text-xl tracking-wide"
                maxlength="32"
                autocomplete="off"
                placeholder="例如：ごはん"
                aria-describedby="kana-hint"
              />
              <p id="kana-hint" class="mt-2 text-xs text-stone-500">
                支持平假名、片假名和长音符；片假名会在内部统一匹配。
              </p>
            </div>

            <button
              type="button"
              class="text-sm font-medium text-emerald-700 dark:text-emerald-400"
              @click="optionalOpen = !optionalOpen"
            >
              {{ optionalOpen ? '收起附加信息' : '＋ 添加汉字或释义（可选）' }}
            </button>
            <div v-if="optionalOpen" class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="field-label" for="kanji">汉字</label>
                <input id="kanji" v-model="kanji" class="input" maxlength="80" placeholder="ご飯" />
              </div>
              <div>
                <label class="field-label" for="meaning">释义</label>
                <input
                  id="meaning"
                  v-model="meaning"
                  class="input"
                  maxlength="500"
                  placeholder="米饭；饭食"
                />
              </div>
            </div>

            <div
              v-if="error"
              role="alert"
              class="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
            >
              {{ error }}
            </div>
            <button class="btn-primary w-full sm:w-auto" :disabled="submitting">
              <span aria-hidden="true">✦</span>{{ submitting ? '正在建立关系…' : '学习这个词' }}
            </button>
          </form>
        </div>
        <div class="bg-stone-50/70 p-6 sm:p-8 dark:bg-stone-950/30">
          <p class="mb-3 text-xs font-semibold tracking-wider text-stone-500 uppercase">可以从这些词开始</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="example in examples"
              :key="example"
              type="button"
              class="btn-secondary py-2"
              @click="kana = example"
            >
              {{ example }}
            </button>
          </div>
        </div>
      </section>

      <section class="card p-6 sm:p-8" aria-live="polite">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-stone-900 dark:text-white">实时发现关联</p>
            <p class="mt-1 text-xs text-stone-500">输入时通过本地索引查询</p>
          </div>
          <span v-if="loading" class="text-xs text-emerald-700 dark:text-emerald-400">分析中…</span>
        </div>
        <div v-if="matches.length" class="space-y-3">
          <RelationCard v-for="match in matches" :key="match.word.id" :match="match" />
        </div>
        <div
          v-else
          class="grid min-h-64 place-items-center rounded-2xl border border-dashed border-stone-200 px-6 text-center dark:border-stone-800"
        >
          <div>
            <div
              class="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            >
              ⌁
            </div>
            <p class="mt-4 font-medium text-stone-800 dark:text-stone-200">
              {{ kana ? '暂未发现达到阈值的关联' : '输入假名，关联会在这里出现' }}
            </p>
            <p class="muted mt-2">所有分析都在你的浏览器中完成。</p>
          </div>
        </div>
      </section>
    </div>

    <section
      v-if="success"
      class="card mt-6 border-emerald-200 p-6 dark:border-emerald-900"
      aria-live="polite"
    >
      <p class="font-medium text-emerald-800 dark:text-emerald-300">✓ {{ success }}</p>
      <div v-if="newRelations.length" class="mt-5 grid gap-3 md:grid-cols-2">
        <RelationCard v-for="match in newRelations" :key="match.word.id" :match="match" highlighted />
      </div>
    </section>
  </div>
</template>
