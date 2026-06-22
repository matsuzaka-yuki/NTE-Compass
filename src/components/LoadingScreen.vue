<script setup lang="ts">
/**
 * 首屏加载动画。显示 logo + 脉冲光晕，收到 ready 后淡出。
 * 挂在 App.vue 最顶层，z-index 高于一切。
 */
import { resolveAssetUrl } from '@/config'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'vanished'): void }>()

function onAfterLeave() {
  emit('vanished')
}
</script>

<template>
  <Transition name="loading-fade" @after-leave="onAfterLeave">
    <div
      v-if="visible"
      class="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-bg"
    >
      <!-- Pulsing logo -->
      <div class="relative flex items-center justify-center">
        <div class="absolute h-20 w-20 rounded-2xl bg-primary-500/20 blur-xl animate-pulse"></div>
        <img
          :src="resolveAssetUrl('./logo.png')"
          alt="NTE · 夜巡"
          class="relative h-16 w-16 rounded-2xl object-cover shadow-lg"
        />
      </div>
      <!-- Brand -->
      <p class="mt-4 text-base font-semibold tracking-[0.15em] text-base">NTE · 夜巡</p>
      <!-- Loading dots -->
      <div class="mt-3 flex gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.3s]"></span>
        <span class="h-1.5 w-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.15s]"></span>
        <span class="h-1.5 w-1.5 rounded-full bg-primary-500 animate-bounce"></span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loading-fade-leave-active {
  transition: opacity 0.4s ease;
}
.loading-fade-leave-to {
  opacity: 0;
}
</style>
