<script setup lang="ts">
/**
 * Square floating/icon button (gear, hamburger, close, back, etc.).
 *
 * Replaces the repeated `bg-surface-800/90 backdrop-blur-md border ...`
 * floating-button recipe across App.vue and the sidebar chrome.
 */
import AppIcon from './AppIcon.vue'
import type { IconName } from './icons'

withDefaults(
  defineProps<{
    icon?: IconName
    /** When true, render as the active/selected state (primary tint). */
    active?: boolean
    /** When true, use the amber farming accent instead of primary. */
    accent?: 'primary' | 'amber'
    size?: 'sm' | 'md' | 'lg'
    title?: string
    disabled?: boolean
  }>(),
  { active: false, accent: 'primary', size: 'md', disabled: false },
)

defineOptions({ inheritAttrs: false })

const sizeClass = {
  sm: 'w-7 h-7 rounded-md',
  md: 'w-9 h-9 rounded-lg',
  lg: 'w-10 h-10 rounded-xl',
} as const

const iconSize = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-5 h-5' } as const
</script>

<template>
  <button
    :title="title"
    :disabled="disabled"
    class="flex items-center justify-center border shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
    :class="[
      sizeClass[size],
      active
        ? accent === 'amber'
          ? 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/40'
          : 'text-primary-500 dark:text-primary-400 bg-primary-500/10 border-primary-500/40'
        : accent === 'amber'
          ? 'text-amber-500 dark:text-amber-400 bg-surface/90 border-default hover:bg-elevated hover:border-border-strong backdrop-blur-md active:bg-elevated'
          : 'text-muted bg-surface/90 border-default hover:text-base hover:bg-elevated hover:border-border-strong backdrop-blur-md active:bg-elevated',
    ]"
    v-bind="$attrs"
  >
    <AppIcon v-if="icon" :name="icon" :class="iconSize[size]" />
    <slot v-else />
  </button>
</template>
