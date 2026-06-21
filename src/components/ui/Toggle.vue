<script setup lang="ts">
/**
 * Accessible toggle switch. Unifies the two divergent implementations that
 * previously lived in SettingsPanel.vue and LegendPanel.vue.
 */
defineProps<{
  modelValue: boolean
  /** Accent color when on. */
  color?: 'primary' | 'green'
  disabled?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

function toggle() {
  emit('update:modelValue', true)
}
function untoggle() {
  emit('update:modelValue', false)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40"
    :class="
      modelValue
        ? color === 'green'
          ? 'bg-green-500'
          : 'bg-primary-500'
        : 'bg-faint/30'
    "
    @click="modelValue ? untoggle() : toggle()"
  >
    <span
      class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
      :class="modelValue ? 'translate-x-4' : 'translate-x-0'"
    />
  </button>
</template>
