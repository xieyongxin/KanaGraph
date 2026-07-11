import { onBeforeUnmount, ref, type Ref, watch } from 'vue'
import type { RelationMatch } from '@/models'
import { previewRelations } from '@/services/wordService'

export function useDebouncedRelations(kana: Ref<string>, minScore: Ref<number>) {
  const matches = ref<RelationMatch[]>([])
  const loading = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let requestId = 0

  watch(
    [kana, minScore],
    () => {
      if (timer) clearTimeout(timer)
      const currentRequest = ++requestId
      if (!kana.value.trim()) {
        matches.value = []
        loading.value = false
        return
      }
      loading.value = true
      timer = setTimeout(async () => {
        try {
          const result = await previewRelations(kana.value, { minScore: minScore.value, limit: 10 })
          if (currentRequest === requestId) matches.value = result
        } finally {
          if (currentRequest === requestId) loading.value = false
        }
      }, 150)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => timer && clearTimeout(timer))
  return { matches, loading }
}
