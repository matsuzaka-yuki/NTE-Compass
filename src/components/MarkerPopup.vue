<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { MARKER_TYPE_CONFIG, getItemById, TIME_OPTIONS, WEATHER_OPTIONS, iconClass } from '@/types'
import { resolveAssetUrl } from '@/config'
// Lazy-load the panorama viewer so pannellum (~840KB) only downloads when a
// user actually opens a panorama, not on first paint.
const PanoramaViewer = defineAsyncComponent(() => import('./PanoramaViewer.vue'))

const store = useMarkerStore()

const galleryRef = ref<HTMLElement | null>(null)

// ── Image loading state ──
const markerImageKey = computed(() => store.selectedMarkerId ?? '__none__')
const imagesReady = ref(false)
watch(() => store.selectedMarkerId, () => {
  imagesReady.value = false
  // Close preview overlay when switching markers to avoid showing wrong image
  previewIndex.value = -1
  previewDirectUrl.value = null
})

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

// ── Panorama ──
const panoramaRef = ref<InstanceType<typeof PanoramaViewer> | null>(null)
const showPanorama = ref(false)
const panoramaUrl = computed(() => {
  const m = store.selectedMarker
  if (!m || !m.panoramaImage) return ''
  const p = m.panoramaImage
  return p.startsWith('data:') ? p : resolveAssetUrl('./' + p)
})
const hasPanorama = computed(() => !!panoramaUrl.value)
const panoramaAudio = computed(() => {
  const m = store.selectedMarker
  return m?.audioFile || ''
})
const panoramaLinks = computed(() => {
  const m = store.selectedMarker
  return m?.panoramaLinks || []
})

function openPanorama() {
  showPanorama.value = true
  // call playAudio() synchronously within the click event
  // so the browser allows autoplay (must be in user-gesture context)
  panoramaRef.value?.playAudio()
}

/** Navigate from one panorama to another via hotspot click */
function navigatePanorama(targetMarkerId: string) {
  const target = store.getMarkerById(targetMarkerId)
  if (target) {
    store.selectMarker(target.id)
  }
}

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
const isMobileRouteMode = computed(() => {
  return window.innerWidth < 768 && store.showRouteView
})

const isDesktopRouteMode = computed(() => {
  return window.innerWidth >= 768 && store.showRouteView
})

const cardStyle = computed(() => {
  if (isMobileRouteMode.value) {
    return {
      right: '12px',
      bottom: '16px',
    }
  }
  if (isDesktopRouteMode.value) {
    return {
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
    }
  }
  const pos = store.selectedMarkerScreenPos
  if (!pos) return { display: 'none' }
  return {
    left: pos.x + 'px',
    top: pos.y + 'px',
    transform: 'translate(-50%, calc(-100% - 20px))',
  }
})

const popupPrimaryType = computed(() => {
  const m = store.selectedMarker
  return m ? m.types[0] : null
})

const popupTypeStats = computed(() => {
  const m = store.selectedMarker
  if (!m) return null
  const primary = m.types[0]
  return primary ? store.typeStats[primary] : null
})

const relatedItems = computed(() => {
  const m = store.selectedMarker
  if (!m || !m.relatedItems || m.relatedItems.length === 0) return []
  return m.relatedItems.map((id) => getItemById(id)).filter(Boolean) as { id: string; name: string; image?: string }[]
})

const timeInfo = computed(() => {
  const t = store.selectedMarker?.time
  if (!t) return null
  return TIME_OPTIONS.find(o => o.value === t) ?? null
})

const weatherInfo = computed(() => {
  const w = store.selectedMarker?.weather
  if (!w) return null
  return WEATHER_OPTIONS.find(o => o.value === w) ?? null
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
    <Transition :name="isMobileRouteMode ? 'bottomsheet' : isDesktopRouteMode ? 'slideright' : 'popup'">
      <div
        v-if="store.selectedMarker"
        class="fixed inset-0 z-30 pointer-events-none"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 pointer-events-auto"
          @click="store.selectMarker(null)"
        ></div>

        <!-- Card - positioned above marker (normal), right side (desktop route), or bottom-right corner (mobile route) -->
        <div
          v-if="store.selectedMarkerScreenPos || isMobileRouteMode || isDesktopRouteMode"
          class="absolute pointer-events-auto"
          :style="cardStyle"
        >
          <!-- Card body: rounded + overflow clipped -->
          <div
            class="relative bg-overlay/95 backdrop-blur-xl border border-default shadow-2xl overflow-hidden"
            :class="isMobileRouteMode ? 'w-[220px] max-w-[80vw] max-h-[65vh] rounded-2xl' : 'w-[280px] max-w-[92vw] max-h-[80vh] rounded-2xl'"
          >
            <!-- Close button -->
            <button
              @click="store.selectMarker(null)"
              class="absolute z-10 flex items-center justify-center rounded-full bg-elevated/80 hover:bg-surface text-muted hover:text-base transition-colors"
              :class="isMobileRouteMode ? 'top-2 right-2 w-5 h-5' : 'top-3 right-3 w-7 h-7'"
            >
              <svg :class="isMobileRouteMode ? 'w-3 h-3' : 'w-4 h-4'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div :class="isMobileRouteMode ? 'max-h-[65vh] overflow-y-auto' : 'max-h-[80vh] overflow-y-auto'">
              <!-- Image gallery -->
              <div
                v-if="allImages.length > 0"
                :key="markerImageKey"
                class="w-full bg-surface overflow-hidden rounded-t-2xl"
              >
            <!-- Single image -->
            <template v-if="allImages.length === 1">
              <!-- Loading skeleton -->
              <div
                v-if="!imagesReady"
                class="w-full aspect-video bg-elevated animate-pulse flex items-center justify-center"
              >
                <svg class="w-8 h-8 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </div>
              <div
                v-show="imagesReady"
                class="w-full aspect-video cursor-pointer relative"
                @click="openPreviewAt(0)"
              >
                <img
                  :src="allImages[0]"
                  :alt="store.selectedMarker!.name"
                  class="w-full h-full object-cover"
                  @load="imagesReady = true"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
                <!-- Frosted glass fade overlay -->
                <div :class="isMobileRouteMode ? 'absolute inset-x-0 bottom-0 h-10 pointer-events-none frosted-fade' : 'absolute inset-x-0 bottom-0 h-16 pointer-events-none frosted-fade'"></div>
                <!-- Icon + Name overlay at bottom-left -->
                <div :class="isMobileRouteMode ? 'absolute bottom-1.5 left-2 flex items-center gap-1.5' : 'absolute bottom-2 left-3 flex items-center gap-2'">
                  <img
                    v-if="popupPrimaryType"
                    :src="resolveAssetUrl(MARKER_TYPE_CONFIG[popupPrimaryType].iconUrl)"
                    :alt="MARKER_TYPE_CONFIG[popupPrimaryType].label"
                    :class="isMobileRouteMode ? 'w-4 h-4 rounded-full object-cover flex-shrink-0' : 'w-5 h-5 rounded-full object-cover flex-shrink-0'"
                  />
                  <h3 :class="isMobileRouteMode ? 'text-sm font-bold text-white truncate' : 'text-base font-bold text-white truncate'">{{ store.selectedMarker.name }}</h3>
                </div>
              </div>
            </template>

            <!-- Multi-image gallery -->
            <template v-else>
              <!-- Loading skeleton -->
              <div
                v-if="!imagesReady"
                :class="isMobileRouteMode ? 'flex gap-1 p-1.5' : 'flex gap-1.5 p-2'"
              >
                <div
                  v-for="i in Math.min(allImages.length, 6)"
                  :key="'skeleton-'+i"
                  :class="isMobileRouteMode ? 'flex-shrink-0 w-16 aspect-video rounded-md bg-elevated animate-pulse' : 'flex-shrink-0 w-24 aspect-video rounded-lg bg-elevated animate-pulse'"
                ></div>
              </div>
              <div
                v-show="imagesReady"
                ref="galleryRef"
                :class="isMobileRouteMode ? 'flex gap-1 p-1.5 overflow-x-auto no-scrollbar' : 'flex gap-1.5 p-2 overflow-x-auto no-scrollbar'"
                @wheel="onGalleryWheel"
              >
                <div
                  v-for="(img, idx) in allImages"
                  :key="idx"
                  :class="isMobileRouteMode ? 'flex-shrink-0 w-16 aspect-video rounded-md overflow-hidden border border-default cursor-pointer hover:border-border-strong transition-colors' : 'flex-shrink-0 w-24 aspect-video rounded-lg overflow-hidden border border-default cursor-pointer hover:border-border-strong transition-colors'"
                  @click="openPreviewAt(idx)"
                >
                  <img
                    :src="img"
                    :alt="`${store.selectedMarker!.name} - ${idx + 1}`"
                    class="w-full h-full object-cover"
                    @load="imagesReady = true"
                    @error="($event.target as HTMLImageElement).style.display = 'none'"
                  />
                </div>
              </div>
            </template>
          </div>

          <!-- Content -->
          <div :class="isMobileRouteMode ? 'p-2 space-y-1.5' : 'p-3 space-y-2'">
            <!-- Name (hidden when single-image overlay shows it) -->
            <div v-if="allImages.length !== 1" :class="isMobileRouteMode ? 'flex items-center gap-1.5' : 'flex items-center gap-2'">
              <img
                v-if="popupPrimaryType"
                :src="resolveAssetUrl(MARKER_TYPE_CONFIG[popupPrimaryType].iconUrl)"
                :alt="MARKER_TYPE_CONFIG[popupPrimaryType].label"
                :class="[iconClass(popupPrimaryType), isMobileRouteMode ? 'w-4 h-4 rounded-full object-cover flex-shrink-0' : 'w-5 h-5 rounded-full object-cover flex-shrink-0']"
              />
              <h3 :class="isMobileRouteMode ? 'text-sm font-bold text-base truncate' : 'text-base font-bold text-base truncate'">{{ store.selectedMarker.name }}</h3>
            </div>

<!-- Description -->
            <p
              v-if="store.selectedMarker.description"
              :class="isMobileRouteMode ? 'text-[10px] text-muted leading-relaxed max-h-[80px] overflow-y-auto' : 'text-xs text-muted leading-relaxed max-h-[136px] overflow-y-auto'"
            >
              {{ store.selectedMarker.description }}
            </p>

            <!-- Time & Weather -->
            <div
              v-if="timeInfo || weatherInfo"
              :class="isMobileRouteMode ? 'flex items-center gap-2' : 'flex items-center gap-3'"
            >
              <span
                v-if="timeInfo"
                :class="isMobileRouteMode ? 'inline-flex items-center gap-1 text-[10px] text-muted' : 'inline-flex items-center gap-1 text-xs text-muted'"
                :title="'时间：' + timeInfo.label"
              >
                <span class="text-sm">{{ timeInfo.icon }}</span>
                {{ timeInfo.label }}
              </span>
              <span
                v-if="weatherInfo"
                :class="isMobileRouteMode ? 'inline-flex items-center gap-1 text-[10px] text-muted' : 'inline-flex items-center gap-1 text-xs text-muted'"
                :title="'天气：' + weatherInfo.label"
              >
                <span class="text-sm">{{ weatherInfo.icon }}</span>
                {{ weatherInfo.label }}
              </span>
            </div>

            <!-- Refresh time -->
            <div
              v-if="store.selectedMarker.refreshTime"
              :class="isMobileRouteMode ? 'flex items-center gap-1 text-[10px]' : 'flex items-center gap-1.5 text-xs'"
              :style="popupPrimaryType ? { color: MARKER_TYPE_CONFIG[popupPrimaryType].color } : {}"
            >
              <svg :class="isMobileRouteMode ? 'w-3 h-3' : 'w-3.5 h-3.5'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ store.selectedMarker.refreshTime }}
            </div>

            <!-- Related items -->
            <div
              v-if="relatedItems.length > 0"
              :class="isMobileRouteMode ? 'flex flex-wrap gap-1' : 'flex flex-wrap gap-1.5'"
            >
              <div
                v-for="item in relatedItems"
                :key="item.id"
                :class="isMobileRouteMode ? 'flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-elevated/60 border border-default text-[10px] text-muted' : 'flex items-center gap-1 px-2 py-1 rounded-lg bg-elevated/60 border border-default text-xs text-muted'"
              >
                <img
                  v-if="item.image"
                  :src="resolveAssetUrl('./' + item.image)"
                  :alt="item.name"
                  :class="isMobileRouteMode ? 'w-3 h-3 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity' : 'w-4 h-4 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity'"
                  @click.stop="openItemPreview(resolveAssetUrl('./' + item.image!))"
                />
                {{ item.name }}
              </div>
            </div>

            <!-- Related quest -->
            <div
              v-if="store.selectedMarker.relatedQuest"
              :class="isMobileRouteMode ? 'text-[10px] text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg px-2 py-1' : 'text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg px-3 py-1.5'"
            >
              关联任务：{{ store.selectedMarker.relatedQuest }}
            </div>

            <!-- Panorama button -->
            <button
              v-if="hasPanorama"
              @click="openPanorama"
              :class="isMobileRouteMode ? 'w-full mt-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25' : 'w-full mt-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25'"
            >
              <svg :class="isMobileRouteMode ? 'w-3.5 h-3.5' : 'w-4 h-4'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              查看全景图
            </button>

            <!-- Action buttons (editor mode) -->
            <template v-if="store.isAnyEditMode">
              <button
                @click="store.startEditMarker(store.selectedMarker!.id)"
                :class="isMobileRouteMode ? 'w-full mt-0.5 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1 bg-primary-500/15 text-primary-600 dark:text-primary-300 border border-primary-500/30 hover:bg-primary-500/25' : 'w-full mt-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 bg-primary-500/15 text-primary-600 dark:text-primary-300 border border-primary-500/30 hover:bg-primary-500/25'"
              >
                <svg :class="isMobileRouteMode ? 'w-3.5 h-3.5' : 'w-4 h-4'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑标记
              </button>
              <button
                @click="store.deleteMarker(store.selectedMarker!.id)"
                :class="isMobileRouteMode ? 'w-full mt-1 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1 bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/25 hover:bg-red-500/25' : 'w-full mt-1.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/25 hover:bg-red-500/25'"
              >
                <svg :class="isMobileRouteMode ? 'w-3.5 h-3.5' : 'w-4 h-4'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除此标记
              </button>
            </template>

            <!-- Bottom bar (viewer mode): type badges + found button -->
            <div v-else :class="isMobileRouteMode ? 'flex items-center gap-1.5 mt-0.5 min-w-0' : 'flex items-center gap-2 mt-1 min-w-0'">
              <!-- Single type: compact label + stats -->
              <template v-if="store.selectedMarker.types.length === 1 && popupPrimaryType">
                <span
                  :class="isMobileRouteMode ? 'relative inline-flex items-center px-1 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0' : 'relative inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0'"
                  :style="{
                    backgroundColor: MARKER_TYPE_CONFIG[popupPrimaryType].bgColor,
                    color: MARKER_TYPE_CONFIG[popupPrimaryType].color,
                  }"
                >
                  {{ MARKER_TYPE_CONFIG[popupPrimaryType].label }}
                  <span
                    v-if="store.selectedMarker.counts?.[popupPrimaryType]"
                    :class="isMobileRouteMode ? 'absolute -top-1 -right-1 inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-[8px] font-bold leading-none' : 'absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none'"
                  >{{ store.selectedMarker.counts[popupPrimaryType] }}</span>
                </span>
                <span v-if="popupTypeStats" :class="isMobileRouteMode ? 'text-[10px] text-faint font-mono flex-shrink-0' : 'text-xs text-faint font-mono flex-shrink-0'">
                  {{ popupTypeStats.found }}/{{ popupTypeStats.total }}
                </span>
              </template>
              <!-- Multi-type: scrollable badges -->
              <div
                v-else
                :class="isMobileRouteMode ? 'flex gap-0.5 overflow-x-auto no-scrollbar min-w-0 flex-1 py-1' : 'flex gap-1 overflow-x-auto no-scrollbar min-w-0 flex-1 py-1.5'"
                @wheel.prevent="($event.currentTarget as HTMLElement).scrollLeft += $event.deltaY"
              >
                <span
                  v-for="t in store.selectedMarker.types"
                  :key="t"
                  :class="isMobileRouteMode ? 'relative inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] rounded-full border flex-shrink-0' : 'relative inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full border flex-shrink-0'"
                  :style="{
                    backgroundColor: MARKER_TYPE_CONFIG[t].bgColor,
                    color: MARKER_TYPE_CONFIG[t].color,
                    borderColor: MARKER_TYPE_CONFIG[t].color + '44',
                  }"
                >
                  <img
                    :src="resolveAssetUrl(MARKER_TYPE_CONFIG[t].iconUrl)"
                    :alt="MARKER_TYPE_CONFIG[t].label"
                    :class="[iconClass(t), isMobileRouteMode ? 'w-2.5 h-2.5 rounded-full object-cover' : 'w-3 h-3 rounded-full object-cover']"
                  />
                  {{ MARKER_TYPE_CONFIG[t].label }}
                  <span
                    v-if="store.selectedMarker.counts?.[t]"
                    :class="isMobileRouteMode ? 'absolute -top-1 -right-1 inline-flex items-center justify-center w-3 h-3 rounded-full bg-red-500 text-white text-[8px] font-bold leading-none' : 'absolute -top-1 -right-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none'"
                  >{{ store.selectedMarker.counts[t] }}</span>
                </span>
              </div>
              <button
                @click="store.toggleFound(store.selectedMarker!.id)"
                :class="[
                  isMobileRouteMode ? 'ml-auto py-0.5 px-1.5 rounded-md text-[10px]' : 'ml-auto py-1 px-2.5 rounded-lg text-xs',
                  'font-medium transition-all flex items-center gap-1 flex-shrink-0',
                  store.isFound(store.selectedMarker!.id)
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 hover:bg-green-500/25'
                    : 'bg-primary-500/15 text-primary-600 dark:text-primary-300 border border-primary-500/30 hover:bg-primary-500/25',
                ]"
              >
                <svg v-if="store.isFound(store.selectedMarker!.id)" :class="isMobileRouteMode ? 'w-3 h-3' : 'w-3.5 h-3.5'" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ store.isFound(store.selectedMarker!.id) ? '已找到' : '标记找到' }}
              </button>
            </div>
          </div>
          </div>
        </div>
        <!-- Arrow pointing down to the marker (hidden in mobile route mode) -->
        <div
          v-if="!isMobileRouteMode && !isDesktopRouteMode"
          class="absolute left-1/2 -bottom-1.5 w-3 h-3 bg-overlay/95 border border-default border-t-transparent border-l-transparent rotate-45 -translate-x-1/2"
        ></div>
      </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Panorama viewer -->
  <PanoramaViewer
    ref="panoramaRef"
    :src="panoramaUrl"
    :visible="showPanorama"
    :name="store.selectedMarker?.name"
    :audio="panoramaAudio"
    :links="panoramaLinks"
    @close="showPanorama = false"
    @navigate="navigatePanorama"
  />

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
            class="text-white/80 text-sm font-mono bg-elevated rounded-full px-3 py-1"
          >
            {{ previewIndex + 1 }} / {{ allImages.length }}
          </span>
          <span v-else></span>
          <button
            @click="closePreview"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur hover:bg-black/70 text-white transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Prev button -->
        <button
          v-if="canGoPrev && !isDirectPreview"
          class="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 backdrop-blur hover:bg-black/70 text-white transition-colors"
          @click.stop="prevImage"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- Image -->
        <img
          :key="previewSrc"
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
          class="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 backdrop-blur hover:bg-black/70 text-white transition-colors"
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
            class="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-elevated transition-colors text-lg font-medium"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>
          <button
            @click.stop="resetZoom"
            class="text-white/80 text-sm font-mono px-3 py-1 hover:text-base transition-colors"
          >
            {{ Math.round(previewScale * 100) }}%
          </button>
          <button
            @click.stop="zoomIn"
            class="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-elevated transition-colors text-lg font-medium"
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

.frosted-fade {
  background: linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  mask-image: linear-gradient(to top, black 25%, transparent 100%);
  -webkit-mask-image: linear-gradient(to top, black 25%, transparent 100%);
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

/* Bottom sheet slide-up transition (mobile route: bottom-right corner) */
.bottomsheet-enter-active,
.bottomsheet-leave-active {
  transition: opacity 0.25s ease;
}
.bottomsheet-enter-active > div:nth-child(2),
.bottomsheet-leave-active > div:nth-child(2) {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease;
}
.bottomsheet-enter-from,
.bottomsheet-leave-to {
  opacity: 0;
}
.bottomsheet-enter-from > div:nth-child(2) {
  transform: translateX(20px) translateY(20px);
  opacity: 0;
}
.bottomsheet-leave-to > div:nth-child(2) {
  transform: translateX(20px) translateY(20px);
  opacity: 0;
}

/* Desktop route mode: slide in from right */
.slideright-enter-active,
.slideright-leave-active {
  transition: opacity 0.2s ease;
}
.slideright-enter-active > div:nth-child(2),
.slideright-leave-active > div:nth-child(2) {
  transition: right 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease;
}
.slideright-enter-from,
.slideright-leave-to {
  opacity: 0;
}
.slideright-enter-from > div:nth-child(2) {
  right: -320px !important;
  opacity: 0;
}
.slideright-leave-to > div:nth-child(2) {
  right: -320px !important;
  opacity: 0;
}
</style>
