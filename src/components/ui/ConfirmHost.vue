<script setup lang="ts">
/**
 * Renders the global confirm dialog. Mount once in App.vue; any component can
 * then call `const { confirm } = useConfirm()` and `await confirm({...})`.
 */
import Dialog from './Dialog.vue'
import Btn from './Btn.vue'
import { confirmState, resolveConfirm } from '@/composables/useConfirm'

function onCancel() {
  resolveConfirm(false)
}
function onConfirm() {
  resolveConfirm(true)
}
</script>

<template>
  <Dialog :open="confirmState.open" width="360px" @close="onCancel">
    <p class="py-2 text-center text-sm text-muted">{{ confirmState.message }}</p>
    <template #footer>
      <Btn block size="lg" @click="onCancel">{{ confirmState.cancelLabel }}</Btn>
      <Btn
        block
        size="lg"
        :variant="confirmState.tone === 'danger' ? 'danger' : 'primary'"
        @click="onConfirm"
      >{{ confirmState.confirmLabel }}</Btn>
    </template>
  </Dialog>
</template>
