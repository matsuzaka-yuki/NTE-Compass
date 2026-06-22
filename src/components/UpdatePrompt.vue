<script setup lang="ts">
/**
 * PWA 更新提示。当 service worker 检测到新版本时，显示一个顶部横幅
 * 引导用户刷新（因为 autoUpdate 模式下用户需要手动刷新一次应用更新）。
 */
import { ref } from 'vue'
import { Btn, AppIcon } from '@/components/ui'

const showPrompt = ref(false)
let refreshFn: (() => void) | null = null

// vite-plugin-pwa registers the SW automatically; we hook into the
// 'need-refresh' event via the virtual module.
async function setupPwaListener() {
  try {
    const { registerSW } = await import('virtual:pwa-register')
    refreshFn = registerSW({
      onNeedRefresh() {
        showPrompt.value = true
      },
    })
  } catch {
    // virtual:pwa-register only exists in build, silently ignore in dev
  }
}
setupPwaListener()

function refresh() {
  refreshFn?.()
}
function dismiss() {
  showPrompt.value = false
}
</script>

<template>
  <Transition name="update-slide">
    <div
      v-if="showPrompt"
      class="fixed top-3 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 rounded-xl border border-default bg-elevated/95 backdrop-blur-xl px-4 py-2.5 shadow-2xl"
    >
      <AppIcon name="info" class="h-4 w-4 text-primary-500" />
      <span class="text-sm text-base">有新版本可用</span>
      <div class="flex items-center gap-1.5">
        <Btn size="sm" variant="ghost" @click="dismiss">稍后</Btn>
        <Btn size="sm" variant="primary" @click="refresh">刷新</Btn>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.update-slide-enter-active,
.update-slide-leave-active {
  transition: all 0.3s ease;
}
.update-slide-enter-from,
.update-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px);
}
</style>
