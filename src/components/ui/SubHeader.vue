<script setup lang="ts">
/**
 * Sticky sub-view header bar. Replaces the 6 repeated
 * `flex-shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b ...` headers
 * across route views, category list, and detail overlay.
 */
withDefaults(defineProps<{ bordered?: boolean }>(), { bordered: true })
</script>

<template>
  <div
    class="flex flex-shrink-0 items-center gap-2 px-4 py-1.5"
    :class="bordered ? 'border-b border-default bg-overlay/80' : ''"
  >
    <slot />
  </div>
</template>
