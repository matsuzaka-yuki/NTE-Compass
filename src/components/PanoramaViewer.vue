<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'
import 'pannellum'
import 'pannellum/build/pannellum.css'

const props = defineProps<{
  src: string
  visible: boolean
  name?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const viewerContainer = ref<HTMLDivElement | null>(null)
let viewer: Pannellum.Viewer | null = null
const isMobile = 'ontouchstart' in window || window.innerWidth < 768
const defaultHfov = isMobile ? 50 : 100

function resetHfov() {
  if (viewer) {
    viewer.setHfov(defaultHfov)
  }
}

function initViewer() {
  if (!viewerContainer.value || !props.src) return

  destroyViewer()

  nextTick(() => {
    viewer = pannellum.viewer(viewerContainer.value!, {
      type: 'equirectangular',
      panorama: props.src,
      autoLoad: true,
      showControls: false,
      mouseZoom: true,
      compass: false,
      pitch: 0,
      yaw: 0,
      hfov: defaultHfov,
      minPitch: -90,
      maxPitch: 90,
      minHfov: isMobile ? 10 : 30,
      maxHfov: isMobile ? 90 : 120,
      hotSpotDebug: false,
    })
  })
}

function destroyViewer() {
  if (viewer) {
    try {
      viewer.destroy()
    } catch { /* ignore */ }
    viewer = null
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => initViewer())
  } else {
    destroyViewer()
  }
})

onUnmounted(() => {
  destroyViewer()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="panorama">
      <div
        v-if="visible"
        class="fixed inset-0 z-[60] bg-black"
      >
        <!-- Pannellum viewer -->
        <div ref="viewerContainer" class="w-full h-full" />

        <!-- Top bar controls -->
        <div class="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10 pointer-events-none">
          <span class="text-white/50 text-sm">拖拽以旋转 · 滚轮缩放</span>
          <div class="flex items-center gap-2 pointer-events-auto">
            <button
              @click="resetHfov"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="重置缩放"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4m0 14v4M1 12h4m14 0h4" />
              </svg>
            </button>
            <button
              @click="emit('close')"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="关闭 (Esc)"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </div>
        </div>

        <!-- Bottom: marker name -->
        <div v-if="name" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span class="text-white/50 text-sm">{{ name }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.panorama-enter-active,
.panorama-leave-active {
  transition: opacity 0.3s ease;
}
.panorama-enter-from,
.panorama-leave-to {
  opacity: 0;
}

/* Fix Pannellum control bar z-index so our overlay sits on top */
:deep(.pnlm-container) {
  height: 100% !important;
}
</style>
