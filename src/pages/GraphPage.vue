<script setup lang="ts">
import cytoscape, { type Core, type EventObjectNode } from 'cytoscape'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import type { Relation, Word } from '@/models'
import { getRelationNeighborhood, listWords } from '@/services/wordService'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const search = ref('')
const results = ref<Word[]>([])
const center = ref<Word | null>(null)
const selected = ref<Word | null>(null)
const selectedRelations = ref<Relation[]>([])
const depth = ref(1)
const container = ref<HTMLElement | null>(null)
const loading = ref(false)
let cy: Core | null = null
let timer: ReturnType<typeof setTimeout> | undefined

watch(search, () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    if (!search.value.trim()) return (results.value = [])
    results.value = (await listWords({ search: search.value, limit: 8 })).items
  }, 150)
})
watch(depth, () => center.value && renderGraph())
watch(
  () => [settingsStore.settings.graphMinScore, settingsStore.settings.maxEdges],
  () => center.value && renderGraph(),
)

async function chooseCenter(word: Word): Promise<void> {
  center.value = word
  selected.value = word
  search.value = word.kana
  results.value = []
  await renderGraph()
}

async function renderGraph(): Promise<void> {
  if (!center.value) return
  loading.value = true
  try {
    const neighborhood = await getRelationNeighborhood(center.value.id, depth.value, {
      minScore: settingsStore.settings.graphMinScore,
      maxEdges: settingsStore.settings.maxEdges,
    })
    await nextTick()
    cy?.destroy()
    if (!container.value) return
    const wordMap = new Map(neighborhood.nodes.map((node) => [node.word.id, node.word]))
    cy = cytoscape({
      container: container.value,
      elements: [
        ...neighborhood.nodes.map(({ word, depth: nodeDepth }) => ({
          data: { id: word.id, label: word.kanji || word.kana, kana: word.kana, depth: nodeDepth },
        })),
        ...neighborhood.relations.map((relation) => ({
          data: {
            id: relation.id,
            source: relation.sourceId,
            target: relation.targetId,
            score: relation.score,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#d1fae5',
            color: '#292524',
            'border-color': '#047857',
            'border-width': 2,
            width: 58,
            height: 58,
            'font-size': 12,
            'text-valign': 'center',
            'text-halign': 'center',
          },
        },
        {
          selector: `node[id = "${center.value.id}"]`,
          style: { 'background-color': '#065f46', color: '#fff', width: 72, height: 72, 'font-size': 14 },
        },
        {
          selector: 'edge',
          style: {
            width: 'mapData(score, 20, 100, 1, 5)',
            'line-color': '#a8a29e',
            'curve-style': 'bezier',
            opacity: 0.72,
          },
        },
        { selector: 'node:selected', style: { 'border-color': '#f59e0b', 'border-width': 4 } },
      ],
      layout: { name: 'cose', animate: false, fit: true, padding: 30, nodeRepulsion: () => 7000 },
      minZoom: 0.35,
      maxZoom: 2.5,
    })
    cy.on('tap', 'node', (event: EventObjectNode) => {
      const word = wordMap.get(event.target.id())
      if (!word) return
      selected.value = word
      selectedRelations.value = neighborhood.relations.filter(
        (relation) => relation.sourceId === word.id || relation.targetId === word.id,
      )
    })
    selectedRelations.value = neighborhood.relations.filter(
      (relation) => relation.sourceId === center.value?.id || relation.targetId === center.value?.id,
    )
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  cy?.destroy()
})
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Knowledge graph"
      title="沿着词汇之间的线索探索"
      description="选择一个中心词，只展示它附近的一到两层关系。这样即使词汇持续增长，图谱仍然清晰可读。"
    />
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section class="card overflow-hidden">
        <div
          class="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6 dark:border-stone-800"
        >
          <div class="relative w-full max-w-md">
            <label class="field-label" for="graph-search">选择中心词</label>
            <input
              id="graph-search"
              v-model="search"
              class="input"
              placeholder="输入假名、汉字或释义"
              autocomplete="off"
            />
            <div
              v-if="results.length"
              class="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-700 dark:bg-stone-900"
            >
              <button
                v-for="word in results"
                :key="word.id"
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800"
                @click="chooseCenter(word)"
              >
                <span
                  ><strong>{{ word.kana }}</strong
                  ><span v-if="word.kanji" class="ml-2 text-sm text-stone-500">{{ word.kanji }}</span></span
                ><span class="text-xs text-stone-400">选择</span>
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="btn-secondary"
              :class="{ 'border-emerald-500 text-emerald-700': depth === 1 }"
              @click="depth = 1"
            >
              一层
            </button>
            <button
              class="btn-secondary"
              :class="{ 'border-emerald-500 text-emerald-700': depth === 2 }"
              @click="depth = 2"
            >
              两层
            </button>
            <button class="btn-secondary" :disabled="!center" @click="renderGraph">重新布局</button>
          </div>
        </div>
        <div
          v-if="center"
          ref="container"
          class="h-[520px] w-full bg-[radial-gradient(circle_at_center,_rgba(16,185,129,.06),_transparent_60%)]"
          aria-label="词汇关系图"
        ></div>
        <div v-else class="grid h-[520px] place-items-center p-8 text-center">
          <div>
            <div
              class="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            >
              ⌘
            </div>
            <p class="mt-5 font-medium">搜索并选择一个词，开始探索</p>
            <p class="muted mt-2">图谱不会一次加载全部词汇。</p>
          </div>
        </div>
        <p v-if="loading" class="absolute text-sm text-emerald-600">正在生成局部图谱…</p>
      </section>

      <aside class="card p-6">
        <p class="eyebrow">Selected node</p>
        <template v-if="selected">
          <h2 class="mt-3 text-3xl font-semibold">{{ selected.kana }}</h2>
          <p v-if="selected.kanji" class="mt-1 text-stone-500">{{ selected.kanji }}</p>
          <p v-if="selected.meaning" class="muted mt-4">{{ selected.meaning }}</p>
          <div class="mt-7 border-t border-stone-100 pt-5 dark:border-stone-800">
            <p class="text-sm font-medium">当前视图中的关系</p>
            <div v-if="selectedRelations.length" class="mt-3 space-y-2">
              <div
                v-for="relation in selectedRelations"
                :key="relation.id"
                class="rounded-xl bg-stone-50 p-3 dark:bg-stone-950/50"
              >
                <div class="flex justify-between text-sm">
                  <span>相似度</span><strong>{{ relation.score }}</strong>
                </div>
                <p class="mt-1 text-xs text-stone-500">共同：{{ relation.sharedKana.join('、') }}</p>
              </div>
            </div>
            <p v-else class="muted mt-3">当前阈值下没有可显示的边。</p>
          </div>
        </template>
        <p v-else class="muted mt-4">点击图中的节点查看信息。</p>
      </aside>
    </div>
  </div>
</template>
