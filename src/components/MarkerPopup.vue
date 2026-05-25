<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { MARKER_TYPE_CONFIG, getItemById } from '@/types'
import { resolveAssetUrl } from '@/config'

const store = useMarkerStore()

const galleryRef = ref<HTMLElement | null>(null)

function onGalleryWheel(e: WheelEvent) {
  if (!galleryRef.value) return
  e.preventDefault()
  galleryRef.value.scrollLeft += e.deltaY
}

const allImages = computed(() => {
  const m = store.selectedMarker
  if (!m) return []
  const list: string[] = []
  if (m.image) list.push(resolveAssetUrl('./' + m.image))
  if (m.images) list.push(...m.images.map((p) => p.startsWith('data:') ? p : resolveAssetUrl('./' + p)))
  return list
})

const itemImages = computed(() => {
  const m = store.selectedMarker
  if (!m || !m.relatedItems) return []
  const list: string[] = []
  for (const itemId of m.relatedItems) {
    const item = getItemById(itemId)
    if (item?.image) list.push(resolveAssetUrl('./' + item.image))
  }
  return list
})

// ── Image preview (gallery + zoom/pan) ──
const previewIndex = ref(-1)
const previewScale = ref(1)
const previewTranslate = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const panTranslateStart = ref({ x: 0, y: 0 })
const previewRef = ref<HTMLElement | null>(null)

// touch state
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchStartDist = ref(0)
const touchStartScale = ref(1)
const swipeHandled = ref(false)

const previewDirectUrl = ref<string | null>(null)

const previewOpen = computed(() => previewIndex.value >= 0 || previewDirectUrl.value !== null)
const previewSrc = computed(() => {
  if (previewDirectUrl.value) return previewDirectUrl.value
  if (previewIndex.value >= 0) return allImages.value[previewIndex.value] || ''
  return ''
})
const isDirectPreview = computed(() => previewDirectUrl.value !== null)
const relatedItems = computed(() => {
  const m = store.selectedMarker
  if (!m || !m.relatedItems || m.relatedItems.length === 0) return []
  return m.relatedItems.map((id) => getItemById(id)).filter(Boolean) as { id: string; name: string; image?: string }[]
})

const hasMultipleImages = computed(() => allImages.value.length > 1)
const canGoPrev = computed(() => previewIndex.value > 0)
const canGoNext = computed(() => previewIndex.value < allImages.value.length - 1)

const imageStyle = computed(() => ({
  transform: `translate(${previewTranslate.value.x}px, ${previewTranslate.value.y}px) scale(${previewScale.value})`,
  transition: isPanning.value ? 'none' : 'transform 0.2s ease-out',
  cursor: previewScale.value > 1 ? (isPanning.value ? 'grabbing' : 'grab') : 'zoom-in',
}))

function openPreviewAt(index: number) {
  previewIndex.value = index
  resetZoom()
}

function openItemPreview(url: string) {
  previewDirectUrl.value = url
  resetZoom()
}

function closePreview() {
  previewIndex.value = -1
  previewDirectUrl.value = null
}

function resetZoom() {
  previewScale.value = 1
  previewTranslate.value = { x: 0, y: 0 }
}

function zoomIn() {
  zoomTo(previewScale.value * 1.5)
}

function zoomOut() {
  zoomTo(previewScale.value / 1.5)
}

function zoomTo(newScale: number) {
  const clamped = Math.min(Math.max(newScale, 0.5), 5)
  previewScale.value = clamped
  if (clamped === 1) {
    previewTranslate.value = { x: 0, y: 0 }
  }
}

function prevImage() {
  if (canGoPrev.value) {
    previewIndex.value--
    resetZoom()
  }
}

function nextImage() {
  if (canGoNext.value) {
    previewIndex.value++
    resetZoom()
  }
}

// zoom centered on cursor
function onPreviewWheel(e: WheelEvent) {
  e.preventDefault()
  const factor = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.min(Math.max(previewScale.value * factor, 0.5), 5)

  const rect = previewRef.value!.getBoundingClientRect()
  const cx = e.clientX - rect.left - rect.width / 2
  const cy = e.clientY - rect.top - rect.height / 2

  const ratio = newScale / previewScale.value
  previewTranslate.value = {
    x: cx - ratio * (cx - previewTranslate.value.x),
    y: cy - ratio * (cy - previewTranslate.value.y),
  }
  previewScale.value = newScale
}

// pan
function onPanStart(e: MouseEvent) {
  if (previewScale.value <= 1) return
  e.preventDefault()
  isPanning.value = true
  panStart.value = { x: e.clientX, y: e.clientY }
  panTranslateStart.value = { ...previewTranslate.value }
}

function onPanMove(e: MouseEvent) {
  if (!isPanning.value) return
  previewTranslate.value = {
    x: panTranslateStart.value.x + (e.clientX - panStart.value.x),
    y: panTranslateStart.value.y + (e.clientY - panStart.value.y),
  }
}

function onPanEnd() {
  isPanning.value = false
}

// double-click: toggle fit ↔ 2.5×
function onDoubleClick(e: MouseEvent) {
  if (previewScale.value > 1.1) {
    resetZoom()
  } else {
    const rect = previewRef.value!.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const newScale = 2.5
    const ratio = newScale / previewScale.value
    previewTranslate.value = {
      x: cx - ratio * (cx - previewTranslate.value.x),
      y: cy - ratio * (cy - previewTranslate.value.y),
    }
    previewScale.value = newScale
  }
}

// backdrop: close when fit, zoom out when zoomed
function onBackdropClick() {
  if (previewScale.value > 1.1) {
    resetZoom()
  } else {
    closePreview()
  }
}

// ── Touch handlers ──
function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    touchStartDist.value = Math.hypot(dx, dy)
    touchStartScale.value = previewScale.value
    swipeHandled.value = true
  } else if (e.touches.length === 1) {
    touchStartX.value = e.touches[0].clientX
    touchStartY.value = e.touches[0].clientY
    swipeHandled.value = false
    if (previewScale.value > 1) {
      isPanning.value = true
      panStart.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      panTranslateStart.value = { ...previewTranslate.value }
    }
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2) {
    e.preventDefault()
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    if (touchStartDist.value > 0) {
      previewScale.value = Math.min(
        Math.max(touchStartScale.value * (dist / touchStartDist.value), 0.5),
        5
      )
    }
    swipeHandled.value = true
  } else if (e.touches.length === 1 && isPanning.value) {
    e.preventDefault()
    previewTranslate.value = {
      x: panTranslateStart.value.x + (e.touches[0].clientX - panStart.value.x),
      y: panTranslateStart.value.y + (e.touches[0].clientY - panStart.value.y),
    }
    swipeHandled.value = true
  }
}

function onTouchEnd(_e: TouchEvent) {
  if (isPanning.value) {
    isPanning.value = false
    return
  }
  if (swipeHandled.value || previewScale.value > 1) return
  const dx = (_e.changedTouches[0]?.clientX || 0) - touchStartX.value
  const dy = (_e.changedTouches[0]?.clientY || 0) - touchStartY.value
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) prevImage()
    else nextImage()
  }
}

// keyboard
function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'Escape': closePreview(); break
    case 'ArrowLeft': prevImage(); break
    case 'ArrowRight': nextImage(); break
    case '+': case '=': zoomIn(); break
    case '-': zoomOut(); break
    case '0': resetZoom(); break
  }
}

watch(previewOpen, (open) => {
  if (open) {
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="popup">
      <div
        v-if="store.selectedMarker"
        class="fixed inset-0 z-30 pointer-events-none"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 pointer-events-auto"
          @click="store.selectMarker(null)"
        ></div>

        <!-- Card - positioned above the marker on the map -->
        <div
          v-if="store.selectedMarkerScreenPos"
          class="absolute pointer-events-auto"
          :style="{
            left: store.selectedMarkerScreenPos.x + 'px',
            top: store.selectedMarkerScreenPos.y + 'px',
            transform: 'translate(-50%, calc(-100% - 20px))',
          }"
        >
          <!-- Card body: rounded + overflow clipped -->
          <div class="relative w-[280px] max-w-[92vw] max-h-[80vh] rounded-2xl bg-surface-800/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
            <!-- Close button -->
            <button
              @click="store.selectMarker(null)"
              class="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-surface-700/80 hover:bg-surface-600 text-slate-400 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div class="max-h-[80vh] overflow-y-auto">
              <!-- Image gallery -->
              <div
                v-if="allImages.length > 0"
                class="w-full bg-surface-900 overflow-hidden rounded-t-2xl"
              >
            <div
              v-if="allImages.length === 1"
              class="w-full aspect-video cursor-pointer"
              @click="openPreviewAt(0)"
            >
              <img
                :src="allImages[0]"
                :alt="store.selectedMarker!.name"
                class="w-full h-full object-cover"
                @error="($event.target as HTMLImageElement).style.display = 'none'"
              />
            </div>
            <div
              v-else
              ref="galleryRef"
              class="flex gap-1.5 p-2 overflow-x-auto no-scrollbar"
              @wheel="onGalleryWheel"
            >
              <div
                v-for="(img, idx) in allImages"
                :key="idx"
                class="flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden border border-white/5 cursor-pointer hover:border-white/20 transition-colors"
                @click="openPreviewAt(idx)"
              >
                <img
                  :src="img"
                  :alt="`${store.selectedMarker!.name} - ${idx + 1}`"
                  class="w-full h-full object-cover"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="p-3 space-y-2">
            <!-- Name -->
            <div class="flex items-center gap-2">
              <img
                :src="resolveAssetUrl(MARKER_TYPE_CONFIG[store.selectedMarker.type].iconUrl)"
                :alt="MARKER_TYPE_CONFIG[store.selectedMarker.type].label"
                class="w-5 h-5 rounded-full object-cover flex-shrink-0"
              />
              <h3 class="text-base font-bold text-white truncate">{{ store.selectedMarker.name }}</h3>
            </div>

            <!-- Count -->
            <div
              v-if="store.selectedMarker.count !== undefined && store.selectedMarker.count > 0"
              class="flex items-center gap-1.5 text-xs"
            >
              <span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500/20 text-red-400 font-bold text-xs">
                {{ store.selectedMarker.count }}
              </span>
              <span class="text-slate-500">数量</span>
            </div>

            <!-- Description -->
            <p
              v-if="store.selectedMarker.description"
              class="text-xs text-slate-300 leading-relaxed max-h-[136px] overflow-y-auto"
            >
              {{ store.selectedMarker.description }}
            </p>

            <!-- Refresh time -->
            <div
              v-if="store.selectedMarker.refreshTime"
              class="flex items-center gap-1.5 text-xs"
              :style="{ color: MARKER_TYPE_CONFIG[store.selectedMarker.type].color }"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ store.selectedMarker.refreshTime }}
            </div>

            <!-- Related items -->
            <div
              v-if="relatedItems.length > 0"
              class="flex flex-wrap gap-1.5"
            >
              <div
                v-for="item in relatedItems"
                :key="item.id"
                class="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300"
              >
                <img
                  v-if="item.image"
                  :src="resolveAssetUrl('./' + item.image)"
                  :alt="item.name"
                  class="w-4 h-4 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  @click.stop="openItemPreview(resolveAssetUrl('./' + item.image!))"
                />
                {{ item.name }}
              </div>
            </div>

            <!-- Related quest -->
            <div
              v-if="store.selectedMarker.relatedQuest"
              class="text-xs text-orange-400 bg-orange-400/10 rounded-lg px-3 py-1.5"
            >
              关联任务：{{ store.selectedMarker.relatedQuest }}
            </div>

            <!-- Action buttons (editor mode) -->
            <template v-if="store.isEditorMode">
              <button
                @click="store.startEditMarker(store.selectedMarker!.id)"
                class="w-full mt-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑标记
              </button>
              <button
                @click="store.deleteMarker(store.selectedMarker!.id)"
                class="w-full mt-1.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除此标记
              </button>
            </template>

            <!-- Bottom bar (viewer mode): type label + progress + action button -->
            <div v-else class="flex items-center gap-2 pt-1">
              <span
                class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0"
                :style="{
                  backgroundColor: MARKER_TYPE_CONFIG[store.selectedMarker.type].bgColor,
                  color: MARKER_TYPE_CONFIG[store.selectedMarker.type].color,
                }"
              >
                {{ MARKER_TYPE_CONFIG[store.selectedMarker.type].label }}
              </span>
              <span class="text-xs text-slate-500 font-mono flex-shrink-0">
                {{ store.typeStats[store.selectedMarker.type].found }}/{{ store.typeStats[store.selectedMarker.type].total }}
              </span>
              <button
                @click="store.toggleFound(store.selectedMarker!.id)"
                class="ml-auto py-1 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 flex-shrink-0"
                :class="
                  store.isFound(store.selectedMarker!.id)
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                    : 'bg-primary-600/20 text-primary-300 border border-primary-500/30 hover:bg-primary-600/30'
                "
              >
                <svg v-if="store.isFound(store.selectedMarker!.id)" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ store.isFound(store.selectedMarker!.id) ? '已找到' : '标记找到' }}
              </button>
            </div>
          </div>
          </div>
        </div>
        <!-- Arrow pointing down to the marker -->
        <div
          class="absolute left-1/2 -bottom-1.5 w-3 h-3 bg-surface-800/95 border border-white/10 border-t-transparent border-l-transparent rotate-45 -translate-x-1/2"
        ></div>
      </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Image preview overlay (gallery + zoom/pan) -->
  <Teleport to="body">
    <Transition name="preview">
      <div
        v-if="previewOpen"
        ref="previewRef"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm select-none touch-none"
        @click.self="onBackdropClick"
        @wheel.prevent="onPreviewWheel"
        @mousemove="onPanMove"
        @mouseup="onPanEnd"
        @mouseleave="onPanEnd"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <!-- Top bar -->
        <div class="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
          <span
            v-if="hasMultipleImages && !isDirectPreview"
            class="text-white/80 text-sm font-mono bg-white/10 rounded-full px-3 py-1"
          >
            {{ previewIndex + 1 }} / {{ allImages.length }}
          </span>
          <span v-else></span>
          <button
            @click="closePreview"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Prev button -->
        <button
          v-if="canGoPrev && !isDirectPreview"
          class="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          @click.stop="prevImage"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- Image -->
        <img
          :src="previewSrc"
          :style="imageStyle"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          @click.stop
          @dblclick="onDoubleClick"
          @mousedown="onPanStart"
          @dragstart.prevent
        />

        <!-- Next button -->
        <button
          v-if="canGoNext && !isDirectPreview"
          class="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          @click.stop="nextImage"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Bottom zoom controls -->
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/50 backdrop-blur rounded-full px-2 py-1.5">
          <button
            @click.stop="zoomOut"
            class="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors text-lg font-medium"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>
          <button
            @click.stop="resetZoom"
            class="text-white/80 text-sm font-mono px-3 py-1 hover:text-white transition-colors"
          >
            {{ Math.round(previewScale * 100) }}%
          </button>
          <button
            @click.stop="zoomIn"
            class="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors text-lg font-medium"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.2s ease;
}
.popup-enter-active > div:nth-child(2),
.popup-leave-active > div:nth-child(2) {
  transition: opacity 0.2s ease;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
}
.popup-enter-from > div:nth-child(2),
.popup-leave-to > div:nth-child(2) {
  opacity: 0;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.preview-enter-active,
.preview-leave-active {
  transition: opacity 0.2s ease;
}
.preview-enter-from,
.preview-leave-to {
  opacity: 0;
}
</style>
