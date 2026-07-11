<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; description: string }>()
</script>

<template>
  <header class="mb-8 max-w-3xl">
    <p class="eyebrow">{{ eyebrow }}</p>
    <h1 class="page-title mt-3">{{ title }}</h1>
    <p class="muted mt-4 max-w-2xl">{{ description }}</p>
  </header>
</template>
