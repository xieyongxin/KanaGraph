<script setup lang="ts">
import type { RelationMatch } from '@/models'

defineProps<{ match: RelationMatch; highlighted?: boolean }>()
</script>

<template>
  <article
    class="rounded-2xl border p-4 transition"
    :class="
      highlighted
        ? 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/35'
        : 'border-stone-200 bg-white/70 dark:border-stone-800 dark:bg-stone-950/35'
    "
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-baseline gap-2">
          <h3 class="text-xl font-semibold text-stone-900 dark:text-white">{{ match.word.kana }}</h3>
          <span v-if="match.word.kanji" class="text-sm text-stone-500">{{ match.word.kanji }}</span>
        </div>
        <p v-if="match.word.meaning" class="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {{ match.word.meaning }}
        </p>
      </div>
      <div
        class="grid size-12 shrink-0 place-items-center rounded-full bg-stone-900 text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-900"
      >
        {{ match.score }}
      </div>
    </div>
    <div class="mt-4 flex flex-wrap gap-2 text-xs">
      <span v-for="kana in match.sharedKana" :key="kana" class="tag">共同假名 · {{ kana }}</span>
      <span v-if="match.longestSharedSubstring.length >= 2" class="tag"
        >连续片段 · {{ match.longestSharedSubstring }}</span
      >
      <span v-if="match.boundaryAligned" class="tag">首尾位置一致</span>
    </div>
  </article>
</template>
