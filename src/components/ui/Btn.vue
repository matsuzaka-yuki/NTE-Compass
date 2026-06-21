<script setup lang="ts">
/**
 * Button with theme-aware variants.
 *
 * Variants:
 *   primary   — solid indigo (selection / main action)
 *   secondary — bordered neutral surface
 *   ghost     — borderless, subtle hover
 *   danger    — translucent red (delete)
 *   success   — translucent green (done)
 *
 * Sizes: sm | md | lg.
 */
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { variant: 'secondary', size: 'md', block: false, disabled: false, type: 'button' },
)

defineOptions({ inheritAttrs: false })
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
    :class="[
      {
        sm: 'text-xs px-2.5 py-1',
        md: 'text-sm px-3 py-1.5',
        lg: 'text-sm px-4 py-2.5',
      }[size],
      {
        primary: 'bg-primary-600 text-white hover:bg-primary-500',
        secondary: 'bg-elevated text-base border border-default hover:bg-surface',
        ghost: 'text-muted hover:text-base hover:bg-elevated',
        danger: 'bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/25 hover:bg-red-500/25',
        success: 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30 hover:bg-green-500/30',
      }[variant],
      block && 'w-full',
    ]"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>
