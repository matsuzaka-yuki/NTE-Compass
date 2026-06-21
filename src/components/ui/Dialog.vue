<script setup lang="ts">
/**
 * Modal dialog shell with teleport-to-body, scrim backdrop, and enter/leave
 * transition. Replaces the 5 near-identical inline dialogs in SideBar.vue
 * (create/edit route, create/edit segment, confirm) and the data-source dialog
 * in App.vue.
 *
 * Slots:
 *   default — dialog body
 *   header  — optional title area (rendered sticky at top)
 *   footer  — optional action area (rendered sticky at bottom)
 *
 * Props control width and title; pass `@close` to handle scrim/Esc dismiss.
 */
import { onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: string
    /** Disable scrim/Esc close. */
    noDismiss?: boolean
  }>(),
  { width: '380px', noDismiss: false },
)

const emit = defineEmits<{ (e: 'close'): void }>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && !props.noDismiss) emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) document.addEventListener('keydown', onKey)
    else document.removeEventListener('keydown', onKey)
  },
)

onMounted(() => {
  if (props.open) document.addEventListener('keydown', onKey)
})
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-dialog">
      <div
        v-if="open"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0"
          :style="{ background: 'var(--scrim)' }"
          @click="!noDismiss && emit('close')"
        />
        <div
          class="relative flex flex-col max-h-[88vh] overflow-hidden rounded-2xl border border-default bg-overlay shadow-2xl"
          :style="{ width, maxWidth: '92vw' }"
        >
          <header
            v-if="title || $slots.header"
            class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-default bg-overlay/95 px-4 py-3 backdrop-blur-xl"
          >
            <slot name="header">
              <h3 class="text-sm font-medium text-base">{{ title }}</h3>
            </slot>
          </header>

          <div class="flex-1 overflow-y-auto px-4 py-3">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="sticky bottom-0 z-10 flex gap-2 border-t border-default bg-overlay/95 px-4 py-3 backdrop-blur-xl"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ui-dialog-enter-active,
.ui-dialog-leave-active {
  transition: opacity 0.2s ease;
}
.ui-dialog-enter-active > div:last-child,
.ui-dialog-leave-active > div:last-child {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.ui-dialog-enter-from,
.ui-dialog-leave-to {
  opacity: 0;
}
.ui-dialog-enter-from > div:last-child,
.ui-dialog-leave-to > div:last-child {
  transform: scale(0.96);
  opacity: 0;
}
</style>
