<script setup lang="ts">
/**
 * Colored marker-type pill / toggle chip.
 *
 * The type's own color (from MARKER_TYPE_CONFIG[t].color) is applied via the
 * `:style` binding so each marker type keeps its identity color. The
 * selected/unselected state is conveyed by opacity + border, keeping the
 * frame neutral.
 */
import { computed } from 'vue'
import { MARKER_TYPE_CONFIG } from '@/types'
import type { MarkerType } from '@/types'

const props = withDefaults(
  defineProps<{
    type: MarkerType
    selected?: boolean
    count?: number
    compact?: boolean
  }>(),
  { selected: false, compact: false },
)

const cfg = computed(() => MARKER_TYPE_CONFIG[props.type])
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 rounded-full border transition-all"
    :class="[
      compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
      selected
        ? 'border-current'
        : 'border-default opacity-60 hover:opacity-100',
    ]"
    :style="selected ? { color: cfg.color, backgroundColor: cfg.bgColor } : { color: cfg.color }"
  >
    <span>{{ cfg.label }}</span>
    <span
      v-if="count !== undefined"
      class="font-mono text-[10px] tabular-nums"
      :class="selected ? 'opacity-80' : 'opacity-60'"
    >{{ count }}</span>
  </button>
</template>
