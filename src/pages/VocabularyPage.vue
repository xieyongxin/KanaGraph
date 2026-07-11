<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import type { Relation, Word, WordInput } from '@/models'
import { db } from '@/database/db'
import { useWordsStore } from '@/stores/words'

const store = useWordsStore()
const editing = ref<Word | null>(null)
const viewing = ref<Word | null>(null)
const relations = ref<Array<{ relation: Relation; word?: Word }>>([])
const form = ref<WordInput>({ kana: '', kanji: '', meaning: '' })
const error = ref('')
const saving = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => store.load())
watch(
  () => store.search,
  () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => store.load(), 180)
  },
)

function openEdit(word: Word): void {
  editing.value = word
  form.value = { kana: word.kana, kanji: word.kanji, meaning: word.meaning }
  error.value = ''
}

async function saveEdit(): Promise<void> {
  if (!editing.value) return
  saving.value = true
  error.value = ''
  try {
    await store.update(editing.value.id, form.value)
    editing.value = null
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '更新失败。'
  } finally {
    saving.value = false
  }
}

async function remove(word: Word): Promise<void> {
  if (!window.confirm(`确定删除“${word.kana}”吗？相关索引和关系也会被删除。`)) return
  await store.remove(word.id)
}

async function viewRelations(word: Word): Promise<void> {
  viewing.value = word
  const found = await store.relations(word.id)
  relations.value = await Promise.all(
    found.map(async (relation) => ({
      relation,
      word: await db.words.get(relation.sourceId === word.id ? relation.targetId : relation.sourceId),
    })),
  )
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Vocabulary book"
      title="你的词汇本"
      description="按学习时间整理所有词条。编辑假名时，KanaGraph 会自动重建该词的索引与关系。"
    />

    <section class="card overflow-hidden">
      <div
        class="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-stone-800"
      >
        <div class="relative w-full max-w-md">
          <span class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-stone-400">⌕</span>
          <input
            v-model="store.search"
            class="input pl-10"
            placeholder="搜索假名、汉字或释义"
            aria-label="搜索词汇"
          />
        </div>
        <p class="text-sm text-stone-500">共 {{ store.total }} 个词</p>
      </div>

      <div v-if="store.words.length" class="divide-y divide-stone-100 dark:divide-stone-800">
        <article
          v-for="word in store.words"
          :key="word.id"
          class="flex flex-col gap-4 p-5 transition hover:bg-stone-50/70 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:hover:bg-stone-950/30"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 class="text-xl font-semibold text-stone-900 dark:text-white">{{ word.kana }}</h2>
              <span v-if="word.kanji" class="text-sm text-stone-500">{{ word.kanji }}</span>
            </div>
            <p v-if="word.meaning" class="mt-1 truncate text-sm text-stone-600 dark:text-stone-400">
              {{ word.meaning }}
            </p>
            <p class="mt-2 text-xs text-stone-400">学习于 {{ formatDate(word.learnedAt) }}</p>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <button class="btn-secondary" type="button" @click="viewRelations(word)">查看关系</button>
            <button class="btn-secondary" type="button" @click="openEdit(word)">编辑</button>
            <button class="btn-danger" type="button" @click="remove(word)">删除</button>
          </div>
        </article>
        <div v-if="store.hasMore" class="p-6 text-center">
          <button class="btn-secondary" :disabled="store.loading" @click="store.load(false)">
            {{ store.loading ? '加载中…' : '加载更多' }}
          </button>
        </div>
      </div>
      <div v-else class="grid min-h-80 place-items-center p-8 text-center">
        <div>
          <div
            class="mx-auto grid size-16 place-items-center rounded-full bg-amber-50 text-2xl dark:bg-amber-950/40"
          >
            文
          </div>
          <p class="mt-5 font-medium text-stone-800 dark:text-stone-200">
            {{ store.search ? '没有匹配的词汇' : '词汇本还是空的' }}
          </p>
          <RouterLink v-if="!store.search" to="/" class="btn-primary mt-5">学习第一个词</RouterLink>
        </div>
      </div>
    </section>

    <div
      v-if="editing"
      class="fixed inset-0 z-60 grid place-items-center bg-stone-950/45 p-4 backdrop-blur-sm"
      @click.self="editing = null"
    >
      <form class="card w-full max-w-lg p-6 sm:p-8" @submit.prevent="saveEdit">
        <div class="flex items-start justify-between">
          <div>
            <p class="eyebrow">Edit word</p>
            <h2 class="mt-2 text-2xl font-semibold">编辑词条</h2>
          </div>
          <button type="button" class="text-2xl text-stone-400" aria-label="关闭" @click="editing = null">
            ×
          </button>
        </div>
        <div class="mt-6 space-y-4">
          <div>
            <label class="field-label" for="edit-kana">假名</label
            ><input id="edit-kana" v-model="form.kana" class="input" maxlength="32" />
          </div>
          <div>
            <label class="field-label" for="edit-kanji">汉字</label
            ><input id="edit-kanji" v-model="form.kanji" class="input" maxlength="80" />
          </div>
          <div>
            <label class="field-label" for="edit-meaning">释义</label
            ><textarea
              id="edit-meaning"
              v-model="form.meaning"
              class="input min-h-24 resize-y"
              maxlength="500"
            />
          </div>
          <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
        </div>
        <div class="mt-7 flex justify-end gap-3">
          <button type="button" class="btn-secondary" @click="editing = null">取消</button
          ><button class="btn-primary" :disabled="saving">{{ saving ? '保存中…' : '保存修改' }}</button>
        </div>
      </form>
    </div>

    <div
      v-if="viewing"
      class="fixed inset-0 z-60 grid place-items-center bg-stone-950/45 p-4 backdrop-blur-sm"
      @click.self="viewing = null"
    >
      <section class="card max-h-[85vh] w-full max-w-xl overflow-auto p-6 sm:p-8">
        <div class="flex items-start justify-between">
          <div>
            <p class="eyebrow">Relations</p>
            <h2 class="mt-2 text-2xl font-semibold">{{ viewing.kana }} 的关系</h2>
          </div>
          <button type="button" class="text-2xl text-stone-400" aria-label="关闭" @click="viewing = null">
            ×
          </button>
        </div>
        <div v-if="relations.length" class="mt-6 space-y-3">
          <div
            v-for="item in relations"
            :key="item.relation.id"
            class="rounded-2xl border border-stone-200 p-4 dark:border-stone-800"
          >
            <div class="flex items-center justify-between">
              <strong>{{ item.word?.kana ?? '已删除词条' }}</strong
              ><span class="tag">{{ item.relation.score }} 分</span>
            </div>
            <p class="mt-2 text-sm text-stone-500">
              共同假名：{{ item.relation.sharedKana.join('、') || '无'
              }}<span v-if="item.relation.longestSharedSubstring.length >= 2">
                · 最长片段：{{ item.relation.longestSharedSubstring }}</span
              >
            </p>
          </div>
        </div>
        <p
          v-else
          class="muted mt-8 rounded-2xl border border-dashed border-stone-200 p-8 text-center dark:border-stone-800"
        >
          还没有达到保留条件的关系。
        </p>
      </section>
    </div>
  </div>
</template>
