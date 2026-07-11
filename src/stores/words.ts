import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LearnWordResult, Relation, Word, WordInput } from '@/models'
import {
  countWords,
  deleteWord,
  getWordRelations,
  learnWord,
  listWords,
  updateWord,
} from '@/services/wordService'

export const useWordsStore = defineStore('words', () => {
  const words = ref<Word[]>([])
  const total = ref(0)
  const loading = ref(false)
  const search = ref('')
  const pageSize = 30
  const hasMore = computed(() => words.value.length < total.value)

  async function load(reset = true): Promise<void> {
    loading.value = true
    try {
      const offset = reset ? 0 : words.value.length
      const result = await listWords({ search: search.value, offset, limit: pageSize })
      words.value = reset ? result.items : [...words.value, ...result.items]
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  async function learn(input: WordInput): Promise<LearnWordResult> {
    const result = await learnWord(input)
    total.value = await countWords()
    words.value = [result.word, ...words.value]
    return result
  }

  async function update(id: string, input: WordInput): Promise<LearnWordResult> {
    const result = await updateWord(id, input)
    const index = words.value.findIndex((word) => word.id === id)
    if (index >= 0) words.value[index] = result.word
    return result
  }

  async function remove(id: string): Promise<void> {
    await deleteWord(id)
    words.value = words.value.filter((word) => word.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  async function relations(id: string): Promise<Relation[]> {
    return getWordRelations(id)
  }

  return { words, total, loading, search, hasMore, load, learn, update, remove, relations }
})
