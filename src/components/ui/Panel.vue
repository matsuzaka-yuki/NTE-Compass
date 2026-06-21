<script setup lang="ts">
/**
 * Frosted surface panel — the base container for popovers, dropdowns, and
 * floating panels. Auto-inverts with the theme.
 */
withDefaults(
  defineProps<{
    /** Extra elevation (more opaque, used for popovers over the map). */
    elevated?: boolean
    radius?: 'md' | 'lg' | 'xl' | '2xl'
  }>(),
  { elevated: false, radius: 'xl' },
)

const radiusClass = {
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
} as const
</script>

<template>
  <div
    class="border shadow-2xl backdrop-blur-xl"
    :class="[
      radiusClass[radius],
      elevated ? 'bg-overlay/95' : 'bg-surface/95',
      'border-default',
    ]"
  >
    <slot />
  </div>
</template>
