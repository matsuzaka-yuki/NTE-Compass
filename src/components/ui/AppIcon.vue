<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    /** Stroke width; 2 is the default for line icons. */
    stroke?: number | string
  }>(),
  { stroke: 2 },
)

const path = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    class="inline-block shrink-0"
    :class="$attrs.class as string | undefined"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path stroke-linecap="round" stroke-linejoin="round" :d="path" />
  </svg>
</template>
