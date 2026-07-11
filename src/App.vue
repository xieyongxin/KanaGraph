<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const settingsStore = useSettingsStore()

const navigation = [
  { to: '/', label: '学习', icon: '✦' },
  { to: '/vocabulary', label: '词汇本', icon: '文' },
  { to: '/graph', label: '关系图', icon: '⌘' },
  { to: '/settings', label: '设置', icon: '◌' },
]

onMounted(() => settingsStore.initialize())
</script>

<template>
  <div class="min-h-screen">
    <header
      class="sticky top-0 z-40 border-b border-stone-200/80 bg-[#f7f6f2]/90 backdrop-blur-xl dark:border-stone-800 dark:bg-[#111310]/90"
    >
      <div class="mx-auto flex h-17 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <RouterLink to="/" class="group flex items-center gap-3" aria-label="KanaGraph 首页">
          <span
            class="grid size-9 place-items-center rounded-xl bg-emerald-800 text-sm font-semibold text-white shadow-sm transition group-hover:-rotate-3 dark:bg-emerald-500 dark:text-emerald-950"
            >か</span
          >
          <span>
            <strong
              class="block font-serif text-lg leading-none tracking-tight text-stone-900 dark:text-stone-100"
              >KanaGraph</strong
            >
            <span class="mt-1 block text-[10px] tracking-[0.16em] text-stone-500 uppercase"
              >词汇关系网络</span
            >
          </span>
        </RouterLink>

        <nav
          class="hidden items-center gap-1 rounded-2xl border border-stone-200 bg-white/70 p-1 sm:flex dark:border-stone-800 dark:bg-stone-900/70"
          aria-label="主导航"
        >
          <RouterLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="nav-link"
            :class="{ 'nav-link-active': route.path === item.to }"
          >
            <span aria-hidden="true">{{ item.icon }}</span
            >{{ item.label }}
          </RouterLink>
        </nav>
        <div
          class="rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400"
        >
          数据仅存本机
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:py-12 lg:px-8">
      <RouterView />
    </main>

    <nav
      class="fixed inset-x-4 bottom-4 z-50 grid grid-cols-4 rounded-2xl border border-stone-200 bg-white/95 p-1.5 shadow-xl shadow-stone-900/10 backdrop-blur sm:hidden dark:border-stone-700 dark:bg-stone-900/95"
      aria-label="移动端主导航"
    >
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] text-stone-500"
        :class="{
          'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300': route.path === item.to,
        }"
      >
        <span class="text-base" aria-hidden="true">{{ item.icon }}</span
        >{{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>
