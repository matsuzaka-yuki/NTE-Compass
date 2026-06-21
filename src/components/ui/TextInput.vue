<script setup lang="ts">
/**
 * Themed text input. Uses the semantic tokens (`bg-surface border-default
 * ... focus:border-primary-500`) so it auto-inverts with the active theme.
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  modelValue?: string
  placeholder?: string
  type?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'enter'): void
}>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <input
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    class="w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-base placeholder:text-faint transition-colors focus:border-primary-500 focus:outline-none disabled:opacity-40"
    v-bind="$attrs"
    @input="onInput"
    @keydown.enter="emit('enter')"
  />
</template>
