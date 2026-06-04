<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick, computed } from 'vue'
import 'pannellum'
import 'pannellum/build/pannellum.css'
import { resolveAssetUrl } from '@/config'

const props = defineProps<{
  src: string
  visible: boolean
  name?: string
  audio?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const viewerContainer = ref<HTMLDivElement | null>(null)
let viewer: Pannellum.Viewer | null = null
const isMobile = 'ontouchstart' in window || window.innerWidth < 768
const defaultHfov = isMobile ? 50 : 100

// ── Audio ──
const audioRef = ref<HTMLAudioElement | null>(null)
const isMuted = ref(false)

const audioUrl = computed(() => {
  if (!props.audio) return ''
  // ensure URL is properly encoded (handles Chinese filenames etc.)
  const path = resolveAssetUrl('./' + props.audio)
  try {
    const url = new URL(path, window.location.origin)
    return url.href
  } catch {
    return path
  }
})

function toggleMute() {
  isMuted.value = !isMuted.value
  if (audioRef.value) {
    audioRef.value.muted = isMuted.value
  }
}

function playAudio() {
  if (!audioRef.value) return
  audioRef.value.muted = isMuted.value
  audioRef.value.volume = 0.5
  audioRef.value.play().catch((e) => {
    console.warn('[Panorama] Audio play failed:', e.message)
  })
}

function stopAudio() {
  if (audioRef.value) {
    try {
      audioRef.value.pause()
    } catch { /* ignore */ }
  }
}

// expose so parent can call playAudio() synchronously from a click handler
defineExpose({ playAudio })

// ── Camera Shake ──
const shakeEnabled = ref(true)
let shakeRafId: number | null = null
let shakeBaseYaw = 0
let shakeBasePitch = 0
let shakeStartTime = 0
let prevShakeYaw = 0
let prevShakePitch = 0

/** Multi-frequency sine waves for natural handheld shake */
function computeShake(t: number): { yaw: number; pitch: number } {
  return {
    yaw: Math.sin(t * 2.1 + 1.7) * 0.35 + Math.sin(t * 4.3) * 0.2 + Math.sin(t * 1.0 + 3.2) * 0.15,
    pitch: Math.sin(t * 2.5 + 0.4) * 0.25 + Math.sin(t * 3.7 + 2.1) * 0.15 + Math.sin(t * 1.4 + 1.8) * 0.1,
  }
}

function tickShake(timestamp: number) {
  if (!shakeEnabled.value || !viewer) {
    shakeRafId = null
    return
  }

  const elapsed = (timestamp - shakeStartTime) / 1000
  const shake = computeShake(elapsed)

  // Detect user drag: if the viewer position deviates from our expected
  // (base + lastOffset), the user dragged — so recalibrate the base.
  const currentYaw = viewer.getYaw()
  const currentPitch = viewer.getPitch()
  const expectedYaw = shakeBaseYaw + prevShakeYaw
  const expectedPitch = shakeBasePitch + prevShakePitch

  if (Math.abs(currentYaw - expectedYaw) > 0.15) {
    shakeBaseYaw = currentYaw - prevShakeYaw
  }
  if (Math.abs(currentPitch - expectedPitch) > 0.1) {
    shakeBasePitch = currentPitch - prevShakePitch
  }

  viewer.setYaw(shakeBaseYaw + shake.yaw, false)
  viewer.setPitch(shakeBasePitch + shake.pitch, false)

  prevShakeYaw = shake.yaw
  prevShakePitch = shake.pitch

  shakeRafId = requestAnimationFrame(tickShake)
}

function startShake() {
  if (!viewer) return
  shakeBaseYaw = viewer.getYaw()
  shakeBasePitch = viewer.getPitch()
  shakeStartTime = performance.now()
  prevShakeYaw = 0
  prevShakePitch = 0
  shakeRafId = requestAnimationFrame(tickShake)
}

function stopShake() {
  if (shakeRafId !== null) {
    cancelAnimationFrame(shakeRafId)
    shakeRafId = null
  }
}

function toggleShake() {
  shakeEnabled.value = !shakeEnabled.value
  if (shakeEnabled.value) {
    startShake()
  } else {
    stopShake()
  }
}

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
    if (shakeEnabled.value) startShake()
  })
}

function destroyViewer() {
  stopShake()
  if (viewer) {
    try {
      viewer.destroy()
    } catch { /* ignore */ }
    viewer = null
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    playAudio()
    nextTick(() => {
      initViewer()
    })
  } else {
    stopShake()
    destroyViewer()
    stopAudio()
  }
})

onUnmounted(() => {
  destroyViewer()
  stopAudio()
})
</script>

<template>
  <!-- Hidden audio element — always mounted so play() can be called from parent's click handler -->
  <audio
    v-if="audioUrl"
    ref="audioRef"
    :src="audioUrl"
    loop
    preload="auto"
    class="hidden"
  />

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
            <!-- Audio toggle button -->
            <button
              v-if="audio"
              @click="toggleMute"
              class="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              :class="isMuted ? 'bg-white/10 text-white/40 hover:bg-white/15' : 'bg-white/15 text-white hover:bg-white/20'"
              :title="isMuted ? '打开音乐' : '关闭音乐'"
            >
              <svg v-if="isMuted" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2"/>
              </svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>
            <!-- Shake toggle button -->
            <button
              @click="toggleShake"
              class="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              :class="shakeEnabled ? 'bg-white/20 text-white hover:bg-white/25' : 'bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/70'"
              :title="shakeEnabled ? '关闭镜头抖动' : '开启镜头抖动'"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                <!-- Camera body -->
                <rect x="2" y="5" width="16" height="12" rx="3" />
                <circle cx="10" cy="11" r="2.5" />
                <path d="M18 8h2.5a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5H18" />
                <!-- Shake motion lines: left -->
                <path d="M0 9l1.5-1.5" />
                <path d="M0 11h2" />
                <path d="M0 13l1.5 1.5" />
              </svg>
            </button>
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
