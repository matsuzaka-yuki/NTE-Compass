<script setup lang="ts">
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { MARKER_TYPE_CONFIG, MARKER_CATEGORIES, ENEMY_CLEARING_TYPES, TELEPORT_SUB_TYPES, TELEPORT_BASIC_TYPES, ALL_ITEMS, ALL_MARKER_TYPES, getIconUrl, iconClass } from '@/types'
import type { MarkerType } from '@/types'
import { resolveAssetUrl } from '@/config'
import { AppIcon } from '@/components/ui'

const store = useMarkerStore()

const detailScrollRef = ref<HTMLElement | null>(null)
const maxDescLines = ref(3)
const isMobile = ref(window.innerWidth < 768)

let ro: ResizeObserver | null = null

function recalcLines() {
  const el = detailScrollRef.value
  if (!el) return
  const h = el.clientHeight
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    const gap = 8
    const padV = 24 // pt-3 + pb-3 = 12px + 12px
    const cardH = (h - padV - gap) / 2
    const imgSize = Math.round(Math.max(32, Math.min(64, cardH * 0.55)))
    const cardW = Math.round(cardH * 2.2)
    const cardWNarrow = Math.round((cardW - gap) / 2)
    const fontSize = Math.round(Math.max(10, Math.min(14, cardH * 0.12)))
    const nameH = Math.round(fontSize * 1.5) + 4
    const availTextH = cardH - 24 - nameH
    const lineH = Math.round(fontSize * 1.4)
    maxDescLines.value = Math.max(1, Math.floor(availTextH / lineH))
    el.style.setProperty('--card-row-h', `${cardH}px`)
    el.style.setProperty('--card-img-size', `${imgSize}px`)
    el.style.setProperty('--card-width', `${cardW}px`)
    el.style.setProperty('--card-width-narrow', `${cardWNarrow}px`)
    el.style.setProperty('--card-font-size', `${fontSize}px`)
  } else {
    maxDescLines.value = 3
    el.style.removeProperty('--card-row-h')
    el.style.removeProperty('--card-img-size')
    el.style.removeProperty('--card-width')
    el.style.removeProperty('--card-width-narrow')
    el.style.removeProperty('--card-font-size')
  }
}

onMounted(() => {
  ro = new ResizeObserver(() => recalcLines())
  if (detailScrollRef.value) ro.observe(detailScrollRef.value)
})

onUnmounted(() => {
  ro?.disconnect()
})

const markerTypes = Object.keys(MARKER_TYPE_CONFIG) as MarkerType[]

const allSelected = computed(() => markerTypes.every((t) => store.selectedTypes.has(t)))

const detailType = ref<MarkerType | null>(null)
const showCategoryList = ref(false)
const categoryScrollRef = ref<HTMLElement | null>(null)
const searchExpanded = ref(false)

const searchInput = ref<HTMLInputElement | null>(null)

// Enemy clearing section state
const enemyExpanded = ref(false)
const enemyMobileView = ref(false)
const enemyTriggerRef = ref<HTMLElement | HTMLElement[] | null>(null)

// Teleport sub-group state (异象巡礼/界域/追猎/魔女之家/粉爪总行)
const teleportSubExpanded = ref(false)
const teleportSubMobileView = ref(false)
const teleportSubTriggerRef = ref<HTMLElement | HTMLElement[] | null>(null)

const categoryRows = computed(() => {
  if (!isMobile.value) return [MARKER_CATEGORIES]
  const mid = Math.ceil(MARKER_CATEGORIES.length / 2)
  return [MARKER_CATEGORIES.slice(0, mid), MARKER_CATEGORIES.slice(mid)]
})

const categoryListData = computed(() => {
  return MARKER_CATEGORIES.map((cat) => ({
    label: cat.label,
    types: cat.types.map((type) => ({
      type,
      config: MARKER_TYPE_CONFIG[type],
      selected: store.selectedTypes.has(type),
    })),
  }))
})

// Enemy clearing section computed
const enemyActiveTypes = computed(() => ENEMY_CLEARING_TYPES.filter(t => store.selectedTypes.has(t)))

const enemyCombinedStats = computed(() => {
  let found = 0
  let total = 0
  for (const item of enemyAllTypes.value) {
    found += item.foundCount
    total += item.totalCount
  }
  return { found, total }
})

const enemyAllTypes = computed(() => {
  return ENEMY_CLEARING_TYPES.map((type) => {
    const stats = store.typeStats[type]
    return {
      type,
      foundCount: stats.found,
      totalCount: stats.total,
      selected: store.selectedTypes.has(type),
    }
  })
})

const enemyPopoverStyle = computed(() => {
  const raw = enemyTriggerRef.value
  const el: HTMLElement | null = Array.isArray(raw) ? raw[0] ?? null : raw
  if (!el) return { display: 'none' }
  const rect = el.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    left: rect.left + 'px',
    top: rect.bottom + 4 + 'px',
    zIndex: 70,
  }
})

// Teleport sub-group computed
const teleportSubActiveTypes = computed(() => TELEPORT_SUB_TYPES.filter(t => store.selectedTypes.has(t)))

const teleportSubCombinedStats = computed(() => {
  let found = 0
  let total = 0
  for (const item of teleportSubAllTypes.value) {
    found += item.foundCount
    total += item.totalCount
  }
  return { found, total }
})

const teleportSubAllTypes = computed(() => {
  return TELEPORT_SUB_TYPES.map((type) => {
    const stats = store.typeStats[type]
    return {
      type,
      foundCount: stats.found,
      totalCount: stats.total,
      selected: store.selectedTypes.has(type),
    }
  })
})

const teleportSubPopoverStyle = computed(() => {
  const raw = teleportSubTriggerRef.value
  const el: HTMLElement | null = Array.isArray(raw) ? raw[0] ?? null : raw
  if (!el) return { display: 'none' }
  const rect = el.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    left: rect.left + 'px',
    top: rect.bottom + 4 + 'px',
    zIndex: 70,
  }
})

function handleTeleportSubClick() {
  if (isMobile.value) {
    teleportSubMobileView.value = true
  } else {
    teleportSubExpanded.value = !teleportSubExpanded.value
  }
}

function closeTeleportSubMobile() {
  teleportSubMobileView.value = false
}

function handleEnemyClick() {
  if (isMobile.value) {
    enemyMobileView.value = true
  } else {
    enemyExpanded.value = !enemyExpanded.value
  }
}

function closeEnemyMobile() {
  enemyMobileView.value = false
}

function openCategoryList() {
  showCategoryList.value = true
  enemyExpanded.value = false
  teleportSubExpanded.value = false
}

function closeCategoryList() {
  showCategoryList.value = false
}

function scrollToCategory(label: string) {
  const el = document.getElementById(`cat-section-${label}`)
  if (el && categoryScrollRef.value) {
    categoryScrollRef.value.scrollTo({ top: el.offsetTop - categoryScrollRef.value.offsetTop, behavior: 'smooth' })
  }
}

watch([() => store.sidebarOpen, detailType], ([open, type]) => {
  if (open && type !== null) {
    nextTick(() => {
      if (detailScrollRef.value && ro) {
        ro.observe(detailScrollRef.value)
        recalcLines()
      }
    })
  }
})

function toggleSearch() {
  searchExpanded.value = !searchExpanded.value
  if (!searchExpanded.value) {
    store.searchQuery = ''
  }
}

watch(searchExpanded, (val) => {
  if (val) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

function categoryAllSelected(types: MarkerType[]): boolean {
  return types.every((t) => store.selectedTypes.has(t))
}
function categoryAnySelected(types: MarkerType[]): boolean {
  return types.some((t) => store.selectedTypes.has(t))
}
function toggleCategory(types: MarkerType[]) {
  if (categoryAllSelected(types)) {
    for (const t of types) store.selectedTypes.delete(t)
  } else {
    for (const t of types) store.selectedTypes.add(t)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    store.deselectAllTypes()
  } else {
    store.selectAllTypes()
  }
}

const confirmVisible = ref(false)
const confirmMessage = ref('')
let confirmResolve: ((v: boolean) => void) | null = null

function showConfirm(msg: string): Promise<boolean> {
  confirmMessage.value = msg
  confirmVisible.value = true
  return new Promise((resolve) => {
    confirmResolve = resolve
  })
}

function onConfirmResult(result: boolean) {
  confirmVisible.value = false
  confirmResolve?.(result)
  confirmResolve = null
}

async function handleResetProgress() {
  const ok = await showConfirm('确定要重置所有收集进度吗？')
  if (ok) {
    store.resetProgress()
  }
}

const flatVisibleTypes = computed(() => {
  const result: { type: MarkerType; foundCount: number; totalCount: number; monsterSum?: number }[] = []
  for (const cat of MARKER_CATEGORIES) {
    for (const type of cat.types) {
      if (!store.selectedTypes.has(type)) continue
      const stats = store.typeStats[type]
      if (stats.total > 0) {
        const item: { type: MarkerType; foundCount: number; totalCount: number; monsterSum?: number } = {
          type, foundCount: stats.found, totalCount: stats.total
        }
        if (ENEMY_CLEARING_TYPES.includes(type)) {
          let sum = 0
          for (const m of store.markers) {
            if (m.types.includes(type) && m.counts) {
              sum += m.counts[type] || 0
            }
          }
          if (sum > 0) item.monsterSum = sum
        }
        result.push(item)
      }
    }
  }
  return result
})

// Overall collection progress across all selected & visible types.
const progressSummary = computed(() => {
  let found = 0
  let total = 0
  for (const item of flatVisibleTypes.value) {
    found += item.foundCount
    total += item.totalCount
  }
  return { found, total }
})

const detailMarkers = computed(() => {
  if (!detailType.value) return []
  return store.filteredMarkers.filter((m) => m.types.includes(detailType.value!))
})

const detailMarkerRows = computed(() => {
  const markers = detailMarkers.value
  if (!isMobile.value) return [markers]
  const row1: typeof markers = []
  const row2: typeof markers = []
  markers.forEach((m, i) => {
    (i % 2 === 0 ? row1 : row2).push(m)
  })
  return [row1, row2]
})

function showDetail(type: MarkerType) {
  detailType.value = type
  enemyExpanded.value = false
  enemyMobileView.value = false
  teleportSubExpanded.value = false
  teleportSubMobileView.value = false
}

function backToList() {
  detailType.value = null
  showCategoryList.value = false
  enemyExpanded.value = false
  enemyMobileView.value = false
  teleportSubExpanded.value = false
  teleportSubMobileView.value = false
}

function scrollToList(id: string) {
  store.selectMarker(id)
}

// ---- Route state ----
const routeImageOptions = computed(() => {
  const images: { url: string; label: string }[] = []
  const seen = new Set<string>()

  // 从 public/images/icons/ 目录读取图标
  for (const type of ALL_MARKER_TYPES) {
    const cfg = MARKER_TYPE_CONFIG[type]
    const url = getIconUrl(type)
    if (!seen.has(url)) {
      seen.add(url)
      images.push({ url, label: cfg.label })
    }
  }

  for (const item of ALL_ITEMS) {
    if (item.image && !seen.has(item.image)) {
      seen.add(item.image)
      images.push({ url: resolveAssetUrl(item.image), label: item.name })
    }
  }

  for (const m of store.markers) {
    const img = m.images?.[0] || m.image
    if (img && !seen.has(img)) {
      seen.add(img)
      const url = img.startsWith('data:') ? img : resolveAssetUrl('./' + img)
      images.push({ url, label: m.name })
    }
  }

  return images
})

const showCreateRouteDialog = ref(false)
const newRouteName = ref('')
const newRouteImage = ref('')

const showCreateSegmentDialog = ref(false)
const newSegmentName = ref('')

const showEditRouteDialog = ref(false)
const editRouteName = ref('')
const editRouteImage = ref('')

const showEditSegmentDialog = ref(false)
const editSegmentName = ref('')
const editingSegmentId = ref<string | null>(null)

function openCreateRouteDialog() {
  newRouteName.value = ''
  newRouteImage.value = routeImageOptions.value[0]?.url ?? ''
  showCreateRouteDialog.value = true
}

function confirmCreateRoute() {
  const name = newRouteName.value.trim()
  if (!name) return
  store.addRoute(name, newRouteImage.value || undefined)
  showCreateRouteDialog.value = false
}

function openCreateSegmentDialog() {
  newSegmentName.value = ''
  showCreateSegmentDialog.value = true
}

function confirmCreateSegment() {
  const name = newSegmentName.value.trim()
  if (!name) return
  store.finishAddSegment(name)
  showCreateSegmentDialog.value = false
}

function openEditRouteDialog() {
  if (!store.currentRoute) return
  editRouteName.value = store.currentRoute.name
  editRouteImage.value = store.currentRoute.image ?? ''
  showEditRouteDialog.value = true
}

function confirmEditRoute() {
  const name = editRouteName.value.trim()
  if (!name || !store.currentRouteId) return
  store.updateRoute(store.currentRouteId, {
    name,
    image: editRouteImage.value || undefined,
  })
  showEditRouteDialog.value = false
}

function openEditSegmentDialog(segmentId: string) {
  const route = store.currentRoute
  if (!route) return
  const seg = route.segments.find(s => s.id === segmentId)
  if (!seg) return
  editingSegmentId.value = segmentId
  editSegmentName.value = seg.name
  showEditSegmentDialog.value = true
}

function confirmEditSegment() {
  const name = editSegmentName.value.trim()
  if (!name || !editingSegmentId.value) return
  store.updateSegment(editingSegmentId.value, { name })
  showEditSegmentDialog.value = false
  editingSegmentId.value = null
}

// Segment drag-and-drop
const dragIdx = ref<number | null>(null)

function onDragStart(idx: number, e: DragEvent) {
  if (!store.isAnyEditMode) return
  dragIdx.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
  ;(e.target as HTMLElement).classList.add('opacity-50')
}

function onDragEnd(e: DragEvent) {
  dragIdx.value = null
  ;(e.target as HTMLElement).classList.remove('opacity-50')
}

function onDragOver(idx: number, e: DragEvent) {
  e.preventDefault()
  if (dragIdx.value === null || dragIdx.value === idx) return
  e.dataTransfer!.dropEffect = 'move'
}

function onDrop(idx: number, e: DragEvent) {
  e.preventDefault()
  if (dragIdx.value === null || dragIdx.value === idx) return
  store.reorderSegments(dragIdx.value, idx)
  dragIdx.value = null
}

function handleAddSegmentClick() {
  store.startAddSegment()
}

function handleFinishSegmentClick() {
  if (store.segmentTempMarkerIds.length < 2) return
  openCreateSegmentDialog()
}

function handleCancelSegmentClick() {
  store.cancelAddSegment()
}

function handleRouteClick(routeId: string) {
  store.openRouteDetail(routeId)
}

function handleBackToRouteList() {
  store.clearRouteMarkerFilter()
  store.currentRouteId = null
  store.focusMarkerIds = []
}

function handleDeleteRoute(routeId: string) {
  store.deleteRoute(routeId)
}

function handleDeleteSegment(segmentId: string) {
  store.deleteSegment(segmentId)
}

function getAllRouteMarkerIds(): string[] {
  if (!store.currentRoute) return []
  const ids = new Set<string>()
  for (const seg of store.currentRoute.segments) {
    for (const id of seg.markerIds) {
      ids.add(id)
    }
  }
  return [...ids]
}

function toggleRouteMarkerFilter() {
  if (store.routeMarkerFilterIds) {
    store.clearRouteMarkerFilter()
  } else {
    store.setRouteMarkerFilter(getAllRouteMarkerIds())
  }
}

function getMarkerName(id: string): string {
  return store.getMarkerById(id)?.name ?? id
}

function getSegmentMarkerNames(ids: string[]): string {
  return ids.map(id => getMarkerName(id)).join(' → ')
}

function getSegmentTypeStats(markerIds: string[]): { type: MarkerType; count: number }[] {
  const counts: Record<string, number> = {}
  for (const id of markerIds) {
    const m = store.getMarkerById(id)
    if (!m) continue
    for (const t of m.types) {
      counts[t] = (counts[t] || 0) + 1
    }
  }
  return Object.entries(counts)
    .map(([type, count]) => ({ type: type as MarkerType, count }))
    .sort((a, b) => b.count - a.count)
}

function getSegmentTotalCounts(markerIds: string[]): number {
  let total = 0
  for (const id of markerIds) {
    const m = store.getMarkerById(id)
    if (!m || !m.counts) continue
    for (const v of Object.values(m.counts)) {
      total += v
    }
  }
  return total
}

</script>

<template>
  <!-- Mobile open button (visible when sidebar closed) -->
  <button
    v-if="!store.sidebarOpen"
    @click="store.sidebarOpen = true"
    class="fixed bottom-6 left-6 z-30 w-10 h-10 rounded-xl bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center text-muted hover:text-base hover:border-border-strong transition-all md:hidden"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>

  <!-- Backdrop (mobile) -->
  <Transition name="fade">
    <div
      v-if="store.sidebarOpen"
      class="fixed inset-0 z-20 bg-black/40 md:hidden"
      @click="store.sidebarOpen = false"
    ></div>
  </Transition>

  <!-- Floating panel -->
  <Transition name="slide">
    <div
      v-if="store.sidebarOpen"
      class="fixed z-50 flex flex-col bg-surface/95 backdrop-blur-xl border border-default shadow-2xl inset-x-0 bottom-0 rounded-t-2xl md:h-auto md:top-3 md:bottom-3 md:left-3 md:inset-x-auto md:w-[330px] md:rounded-2xl md:overflow-hidden text-base"
      :style="isMobile ? { height: 'clamp(280px, 42dvh, 600px)' } : {}"
    >
      <!-- Mobile close button (at top edge of panel) -->
      <button
        @click="store.sidebarOpen = false"
        class="absolute left-2 z-30 w-9 h-9 rounded-lg bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center text-muted hover:text-base hover:border-border-strong transition-all md:hidden"
        style="top: -2.75rem;"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Mobile farming button: above close button when sidebar open (mobile only) -->
      <div
        v-if="store.currentRoute && store.currentSegmentIndex >= 0 && !store.isAddingSegment && !store.farmingMode"
        class="absolute left-2 z-30 md:hidden"
        style="top: -5.5rem;"
      >
        <button
          @click="store.startFarmingMode()"
          class="w-9 h-9 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 transition-all"
          title="开刷"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </div>

      <!-- Mobile farming mode: up/down buttons above close button (mobile only) -->
      <div
        v-if="store.currentRoute && store.currentSegmentIndex >= 0 && !store.isAddingSegment && store.farmingMode && !store.sidebarOpen"
        class="absolute left-2 z-30 flex flex-col gap-1.5 md:hidden"
        style="top: -8.125rem;"
      >
        <button
          @click="store.farmingPrevPair()"
          :disabled="!store.farmingCanGoPrev"
          class="w-9 h-9 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="上一组"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 15l-6-6-6 6" />
          </svg>
        </button>
        <button
          @click="store.farmingNextPair()"
          :disabled="!store.farmingCanGoNext"
          class="w-9 h-9 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="下一组"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <!-- Mobile search button (collapsed) -->
      <button
        v-if="!searchExpanded"
        @click="toggleSearch()"
        class="absolute right-2 z-30 w-9 h-9 rounded-lg bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center text-muted hover:text-base hover:border-border-strong transition-all md:hidden"
        style="top: -2.75rem;"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      <!-- Mobile search bar (expanded) -->
      <div
        v-if="searchExpanded"
        class="absolute z-30 md:hidden"
        style="top: -2.75rem; left: 3.25rem; right: 0.5rem; height: 2.25rem;"
      >
        <div class="relative w-full h-full">
          <svg
            class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="store.searchQuery"
            type="text"
            placeholder="搜索..."
            ref="searchInput"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
            class="w-full h-full pl-8 pr-7 text-xs bg-overlay/90 backdrop-blur-md border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
          />
          <button
            @click="toggleSearch()"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-muted hover:text-base transition-colors"
            title="关闭"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Fixed top section -->
      <div v-if="!store.showRouteView" class="flex-shrink-0 space-y-3" :class="{ 'p-2': !isMobile, 'p-1': isMobile && detailType === null && !showCategoryList && !enemyMobileView && !teleportSubMobileView }">
        <!-- Header -->
        <div class="flex items-center gap-2">
          <h1 v-if="!searchExpanded" class="flex items-center gap-1.5 select-none whitespace-nowrap truncate max-md:hidden">
            <span class="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-primary-500 dark:bg-primary-400"></span>
            <span class="text-base font-semibold tracking-[0.2em] text-base">NTE&nbsp;MAP</span>
          </h1>
          <div v-if="searchExpanded" class="relative flex-1 min-w-0 max-md:hidden">
            <svg
              class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="store.searchQuery"
              type="text"
              placeholder="搜索..."
              ref="searchInput"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
              class="w-full pl-8 pr-7 py-1.5 text-xs bg-surface border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
            />
            <button
              @click="toggleSearch()"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-muted hover:text-base transition-colors"
              title="关闭"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div v-else class="flex-1 min-w-0 max-md:hidden" />
          <!-- Route button (desktop) -->
          <button
            @click="store.showRouteView ? store.closeRouteView() : store.openRouteList()"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 max-md:hidden"
            :class="store.showRouteView ? 'text-primary-500 dark:text-primary-400 bg-primary-500/10' : 'text-muted hover:text-base hover:bg-elevated'"
            title="路线"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
          <button
            v-if="!searchExpanded"
            @click="toggleSearch()"
            class="w-7 h-7 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-lg transition-colors flex-shrink-0 max-md:hidden"
            title="搜索"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Route views -->
      <template v-if="store.showRouteView">
        <!-- Route list view -->
        <div v-if="!store.currentRouteId" class="flex-1 flex flex-col overflow-hidden" :class="{ 'rounded-t-2xl': isMobile }">
          <div class="flex-shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b border-default bg-overlay/80">
            <button
              @click="store.closeRouteView()"
              class="w-6 h-6 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-md transition-colors flex-shrink-0"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="flex-1 text-sm leading-none font-medium text-base truncate">路线</span>
            <button
              v-if="store.isAnyEditMode"
              @click="openCreateRouteDialog()"
              class="w-6 h-6 flex items-center justify-center text-muted hover:text-primary-400 hover:bg-elevated rounded-md transition-colors flex-shrink-0"
              title="创建路线"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            <template v-if="store.routes.length > 0">
              <div
                v-for="route in store.routes"
                :key="route.id"
                @click="handleRouteClick(route.id)"
                class="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-elevated transition-colors border border-default"
              >
                <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-elevated">
                  <img v-if="route.image" :src="route.image" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-base truncate">{{ route.name }}</div>
                  <div class="text-xs text-faint">{{ route.segments.length }} 个路段</div>
                </div>
                <button
                  v-if="store.isAnyEditMode"
                  @click.stop="handleDeleteRoute(route.id)"
                  class="w-6 h-6 flex items-center justify-center text-faint hover:text-red-400 rounded transition-colors flex-shrink-0"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <svg class="w-3.5 h-3.5 text-faint flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </template>

            <div v-else class="flex flex-col items-center justify-center gap-2 text-faint py-12">
              <svg class="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span class="text-xs">暂无路线</span>
              <span v-if="store.isAnyEditMode" class="text-xs text-faint">点击右上角 + 创建路线</span>
            </div>
          </div>
        </div>

        <!-- Route detail view -->
        <div v-else class="flex-1 flex flex-col overflow-hidden" :class="{ 'rounded-t-2xl': isMobile }">
          <div class="flex-shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b border-default bg-overlay/80">
            <button
              @click="handleBackToRouteList()"
              class="w-6 h-6 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-md transition-colors flex-shrink-0"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div v-if="store.currentRoute?.image" class="w-5 h-5 rounded overflow-hidden flex-shrink-0 bg-elevated">
              <img :src="store.currentRoute.image" class="w-full h-full object-cover" />
            </div>
            <span class="flex-1 text-sm leading-none font-medium text-base truncate">{{ store.currentRoute?.name ?? '' }}</span>
            <button
              v-if="store.isAnyEditMode"
              @click="openEditRouteDialog()"
              class="w-6 h-6 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-md transition-colors flex-shrink-0"
              title="编辑路线"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              v-if="!store.isAddingSegment"
              @click="toggleRouteMarkerFilter()"
              class="w-6 h-6 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
              :class="store.routeMarkerFilterIds ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'text-muted hover:text-base hover:bg-elevated'"
              :title="store.routeMarkerFilterIds ? '显示全部标点' : '仅显示路线标点'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button
              v-if="store.isAnyEditMode && !store.isAddingSegment"
              @click="handleAddSegmentClick()"
              class="w-6 h-6 flex items-center justify-center text-muted hover:text-primary-400 hover:bg-elevated rounded-md transition-colors flex-shrink-0"
              title="添加路段"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <!-- Adding segment status bar -->
          <div
            v-if="store.isAddingSegment"
            class="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20"
          >
            <span class="text-xs text-amber-600 dark:text-amber-300 flex-1">
              已选 {{ store.segmentTempMarkerIds.length }} 个标点
            </span>
            <button
              @click="handleCancelSegmentClick()"
              class="px-2 py-1 text-xs text-muted hover:text-base rounded transition-colors"
            >取消</button>
            <button
              @click="handleFinishSegmentClick()"
              :disabled="store.segmentTempMarkerIds.length < 2"
              class="px-2.5 py-1 text-xs font-medium rounded bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >完成</button>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            <template v-if="store.currentRoute && store.currentRoute.segments.length > 0">
              <div
                v-for="(segment, idx) in store.currentRoute.segments"
                :key="segment.id"
                @click="store.focusSegment(idx)"
                :draggable="store.isAnyEditMode"
                @dragstart="onDragStart(idx, $event)"
                @dragend="onDragEnd($event)"
                @dragover="onDragOver(idx, $event)"
                @drop="onDrop(idx, $event)"
                class="p-3 rounded-xl border border-default bg-elevated/40 cursor-pointer hover:bg-elevated/60 transition-colors group"
              >
                <div class="flex items-center gap-2 mb-2">
                  <button
                    v-if="store.isAnyEditMode"
                    class="w-4 h-4 flex items-center justify-center text-faint hover:text-muted cursor-grab active:cursor-grabbing flex-shrink-0"
                    title="拖动排序"
                    @click.stop
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                    </svg>
                  </button>
                  <span
                    class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    :style="{ backgroundColor: ['#f59e0b','#3b82f6','#22c55e','#ef4444','#8b5cf6','#ec4899'][idx % 6] }"
                  >{{ idx + 1 }}</span>
                  <span class="text-sm font-medium text-base truncate flex-1">{{ segment.name }}</span>
                  <span
                    v-if="getSegmentTotalCounts(segment.markerIds) > 0"
                    class="text-xs px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 dark:text-red-400 flex-shrink-0 font-mono"
                  >{{ getSegmentTotalCounts(segment.markerIds) }}</span>
                  <button
                    v-if="store.isAnyEditMode"
                    @click.stop="openEditSegmentDialog(segment.id)"
                    class="w-5 h-5 flex items-center justify-center text-faint hover:text-base rounded transition-colors flex-shrink-0"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    v-if="store.isAnyEditMode"
                    @click.stop="handleDeleteSegment(segment.id)"
                    class="w-5 h-5 flex items-center justify-center text-faint hover:text-red-400 rounded transition-colors flex-shrink-0"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div class="flex flex-wrap gap-1.5 mt-1">
                  <span
                    v-for="stat in getSegmentTypeStats(segment.markerIds)"
                    :key="stat.type"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-elevated text-muted"
                  >
                    <img
                      :src="resolveAssetUrl(MARKER_TYPE_CONFIG[stat.type].iconUrl)"
                      :alt="MARKER_TYPE_CONFIG[stat.type].label"
                      class="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
                      :class="iconClass(stat.type)"
                    />
                    <span>{{ MARKER_TYPE_CONFIG[stat.type].label }}</span>
                    <span class="font-mono text-muted">{{ stat.count }}</span>
                  </span>
                </div>
              </div>
            </template>

            <div v-else-if="!store.isAddingSegment" class="flex flex-col items-center justify-center gap-2 text-faint py-12">
              <svg class="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span class="text-xs">暂无路段</span>
              <span v-if="store.isAnyEditMode" class="text-xs text-faint">点击右上角 + 添加路段</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Scrollable area: main list -->
      <template v-else>
      <div v-if="detailType === null && !showCategoryList && !enemyMobileView && !teleportSubMobileView" class="flex-1 overflow-y-auto overflow-hidden px-4 pb-4 space-y-3 max-md:space-y-2" @click.self="enemyExpanded = false; teleportSubExpanded = false">
        <!-- Type filters -->
        <div>
          <!-- Toolbar: progress summary (left) + icon actions (right) -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-baseline gap-1.5 min-w-0">
              <span class="text-sm font-semibold text-base tabular-nums">{{ progressSummary.found }}<span class="text-faint">/{{ progressSummary.total }}</span></span>
              <span class="text-[11px] text-faint truncate">已收集</span>
            </div>
            <div class="flex items-center gap-0.5">
              <!-- Unfound-only toggle -->
              <button
                @click="store.filterMode = store.filterMode === 'unfound' ? 'all' : 'unfound'"
                class="flex items-center gap-1 h-6 px-2 rounded-md text-[11px] transition-colors"
                :class="store.filterMode === 'unfound' ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'text-muted hover:text-base hover:bg-elevated'"
                title="仅显示未收集"
              >
                <AppIcon name="check" class="h-3 w-3" />
                <span class="max-md:hidden">未收集</span>
              </button>
              <!-- Select all / invert -->
              <button
                @click="toggleSelectAll()"
                class="flex items-center gap-1 h-6 px-2 rounded-md text-[11px] text-muted hover:text-base hover:bg-elevated transition-colors"
                :title="allSelected ? '反选' : '全选'"
              >
                <AppIcon :name="allSelected ? 'check' : 'plus'" class="h-3 w-3" />
                <span class="max-md:hidden">{{ allSelected ? '反选' : '全选' }}</span>
              </button>
              <!-- Reset (destructive, set apart) -->
              <button
                @click="handleResetProgress()"
                class="flex items-center gap-1 h-6 px-2 rounded-md text-[11px] text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="重置进度"
              >
                <AppIcon name="trash" class="h-3 w-3" />
              </button>
            </div>
          </div>
          <div :class="isMobile ? 'flex flex-col gap-2 overflow-x-auto pb-1' : 'space-y-2'">
            <div v-for="(row, ri) in categoryRows" :key="ri" :class="isMobile ? 'flex gap-2 w-max' : 'space-y-2'">
              <div v-for="cat in row" :key="cat.label" :class="isMobile ? 'flex bg-elevated/60 rounded-lg px-2 py-1 flex-col gap-1 shrink-0' : 'flex items-start gap-1.5'">
                <button
                  @click="toggleCategory(cat.types)"
                  class="text-xs font-medium transition-colors"
                  :class="[categoryAllSelected(cat.types) ? 'text-base' : categoryAnySelected(cat.types) ? 'text-muted' : 'text-faint', isMobile ? 'w-auto text-left pt-0 text-[11px]' : 'w-12 flex-shrink-0 text-right pt-0.5']"
                >{{ cat.label }}</button>
                <!-- Teleport category: basic types inline + sub-group compact entry -->
                <template v-if="cat.label === '传送点'">
                  <div :class="isMobile ? 'flex flex-nowrap gap-1' : 'flex flex-wrap gap-1 flex-1'">
                    <button
                      v-for="type in TELEPORT_BASIC_TYPES"
                      :key="type"
                      @click="store.toggleType(type)"
                      class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-all"
                      :class="[isMobile ? 'whitespace-nowrap shrink-0' : '', store.selectedTypes.has(type) ? 'border-current font-medium' : 'border-default bg-transparent opacity-60 hover:opacity-100 font-normal']"
                      :style="{ color: MARKER_TYPE_CONFIG[type].color, backgroundColor: store.selectedTypes.has(type) ? MARKER_TYPE_CONFIG[type].color + '33' : 'transparent', borderColor: store.selectedTypes.has(type) ? MARKER_TYPE_CONFIG[type].color + '66' : undefined }"
                    >
                      <img
                        :src="resolveAssetUrl(MARKER_TYPE_CONFIG[type].iconUrl)"
                        :alt="MARKER_TYPE_CONFIG[type].label"
                        class="w-3.5 h-3.5 rounded-full object-cover"
                        :class="iconClass(type)"
                      />
                      {{ MARKER_TYPE_CONFIG[type].label }}
                    </button>
                    <!-- Teleport sub-group compact entry -->
                    <div
                      ref="teleportSubTriggerRef"
                      @click.stop="handleTeleportSubClick()"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none"
                      :class="[teleportSubActiveTypes.length > 0 ? 'border-current font-medium' : 'border-default bg-transparent opacity-60 hover:opacity-100 font-normal', isMobile ? 'whitespace-nowrap shrink-0' : '']"
                      :style="{ color: '#a855f7', backgroundColor: teleportSubActiveTypes.length > 0 ? '#a855f733' : 'transparent', borderColor: teleportSubActiveTypes.length > 0 ? '#a855f766' : undefined }"
                    >
                      <span class="text-[10px] font-mono font-bold min-w-[14px] text-center">{{ teleportSubActiveTypes.length }}</span>
                      <div class="flex items-center" style="margin-left: 1px;">
                        <img
                          v-for="(type, i) in teleportSubActiveTypes.slice(0, 6)"
                          :key="type"
                          :src="resolveAssetUrl(MARKER_TYPE_CONFIG[type].iconUrl)"
                          :alt="MARKER_TYPE_CONFIG[type].label"
                          :class="[iconClass(type)]"
                          class="w-3.5 h-3.5 rounded-full object-cover border border-overlay"
                          :style="{ marginLeft: i > 0 ? '-6px' : '0' }"
                        />
                        <span v-if="teleportSubActiveTypes.length > 6" class="text-[9px] text-muted ml-0.5">...</span>
                      </div>
                      <AppIcon name="chevronRight" class="w-3 h-3 text-faint flex-shrink-0 transition-transform" :class="{ 'rotate-90': teleportSubExpanded && !isMobile }" />
                    </div>
                  </div>
                </template>
                <!-- Regular category: show individual type buttons -->
                <div v-else-if="cat.label !== '敌影清剿'" :class="isMobile ? 'flex flex-nowrap gap-1' : 'flex flex-wrap gap-1 flex-1'">
                  <button
                    v-for="type in cat.types"
                    :key="type"
                    @click="store.toggleType(type)"
                    class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-all"
                    :class="[isMobile ? 'whitespace-nowrap shrink-0' : '', store.selectedTypes.has(type) ? 'border-current font-medium' : 'border-default bg-transparent opacity-60 hover:opacity-100 font-normal']"
                    :style="{ color: MARKER_TYPE_CONFIG[type].color, backgroundColor: store.selectedTypes.has(type) ? MARKER_TYPE_CONFIG[type].color + '33' : 'transparent', borderColor: store.selectedTypes.has(type) ? MARKER_TYPE_CONFIG[type].color + '66' : undefined }"
                  >
                    <img
                      :src="resolveAssetUrl(MARKER_TYPE_CONFIG[type].iconUrl)"
                      :alt="MARKER_TYPE_CONFIG[type].label"
                      class="w-3.5 h-3.5 rounded-full object-cover"
                      :class="iconClass(type)"
                    />
                    {{ MARKER_TYPE_CONFIG[type].label }}
                  </button>
                </div>
                <!-- Enemy clearing: compact entry -->
                <template v-else>
                  <div
                    ref="enemyTriggerRef"
                    @click.stop="handleEnemyClick()"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none"
                    :class="[enemyActiveTypes.length > 0 ? 'border-current font-medium' : 'border-default bg-transparent opacity-60 hover:opacity-100 font-normal', isMobile ? 'whitespace-nowrap shrink-0' : '']"
                      :style="{ color: '#a78bfa', backgroundColor: enemyActiveTypes.length > 0 ? '#a78bfa33' : 'transparent', borderColor: enemyActiveTypes.length > 0 ? '#a78bfa66' : undefined }"
                  >
                    <span class="text-[10px] font-mono font-bold min-w-[14px] text-center">{{ enemyActiveTypes.length }}</span>
                    <div class="flex items-center" style="margin-left: 1px;">
                      <img
                        v-for="(type, i) in enemyActiveTypes.slice(0, 6)"
                        :key="type"
                        :src="resolveAssetUrl(MARKER_TYPE_CONFIG[type].iconUrl)"
                        :alt="MARKER_TYPE_CONFIG[type].label"
                        :class="[iconClass(type)]"
                        class="w-3.5 h-3.5 rounded-full object-cover border border-overlay"
                        :style="{ marginLeft: i > 0 ? '-6px' : '0' }"
                      />
                      <span v-if="enemyActiveTypes.length > 6" class="text-[9px] text-muted ml-0.5">...</span>
                    </div>
                    <AppIcon name="chevronRight" class="w-3 h-3 text-faint flex-shrink-0 transition-transform" :class="{ 'rotate-90': enemyExpanded && !isMobile }" />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Results count + category-list entry -->
        <div class="flex items-center justify-between pt-1 border-t border-default">
          <span class="text-[11px] text-faint">
            {{ flatVisibleTypes.length }} 类 · {{ store.filteredMarkers.length }} 个标记
          </span>
          <button
            @click="openCategoryList()"
            class="flex items-center gap-1 text-[11px] text-muted hover:text-base transition-colors"
            title="按分类浏览全部类型"
          >
            <span>全部类型</span>
            <AppIcon name="chevronRight" class="h-3 w-3" />
          </button>
        </div>

        <!-- Flat type list -->
        <div class="max-md:flex max-md:gap-2 max-md:overflow-x-auto max-md:pb-1 max-md:mt-2">
          <!-- Regular type rows (non-enemy) -->
          <template v-for="item in flatVisibleTypes" :key="item.type">
            <div
              @click="showDetail(item.type)"
              class="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-elevated active:bg-elevated transition-colors border-b border-default select-none max-md:flex-shrink-0 max-md:flex-col max-md:gap-1 max-md:px-2 max-md:py-1.5 max-md:rounded-lg max-md:bg-elevated/60 max-md:border-b-0 max-md:min-w-[60px] max-md:text-center max-md:hover:bg-elevated max-md:relative"
              :class="{ 'opacity-50': item.foundCount === item.totalCount && item.totalCount > 0 }"
            >
              <img
                :src="resolveAssetUrl(MARKER_TYPE_CONFIG[item.type].iconUrl)"
                :alt="MARKER_TYPE_CONFIG[item.type].label"
                class="w-[18px] h-[18px] rounded-full object-cover flex-shrink-0 max-md:w-6 max-md:h-6"
                :class="iconClass(item.type)"
              />
              <span class="flex-1 text-sm text-base truncate max-md:text-xs max-md:flex-initial">{{ MARKER_TYPE_CONFIG[item.type].label }}</span>
              <span
                v-if="item.foundCount === item.totalCount && item.totalCount > 0"
                class="flex items-center justify-center w-4 h-4 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 flex-shrink-0 max-md:hidden"
                title="已完成"
              >
                <AppIcon name="check" class="h-2.5 w-2.5" stroke="3" />
              </span>
              <span
                class="text-xs font-mono flex-shrink-0 tabular-nums"
                :class="item.foundCount === item.totalCount && item.totalCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-faint'"
              >
                {{ item.foundCount }}/{{ item.totalCount }}
              </span>
              <span
                v-if="item.monsterSum"
                    class="text-xs px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 dark:text-red-400 flex-shrink-0 font-mono max-md:absolute max-md:top-0 max-md:right-0 max-md:text-[10px] max-md:px-1 max-md:py-px max-md:z-10"
              >{{ item.monsterSum }}</span>
              <svg
                class="w-3.5 h-3.5 text-faint flex-shrink-0 max-md:hidden"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </template>

          <div v-if="flatVisibleTypes.length === 0" class="flex items-center justify-center gap-2 text-faint py-2.5 max-md:min-h-[72px] max-md:min-w-[60px] max-md:flex-shrink-0 max-md:flex-col max-md:py-1.5 max-md:rounded-lg max-md:bg-elevated/60">
            <AppIcon name="filter" class="w-7 h-7 opacity-30 max-md:w-7 max-md:h-7" stroke="1.5" />
            <span class="text-xs">无匹配</span>
          </div>
        </div>
      </div>

      <!-- Enemy clearing mobile view -->
      <div
        v-else-if="enemyMobileView && detailType === null"
        class="flex-1 flex flex-col overflow-hidden max-md:rounded-t-2xl"
      >
        <!-- Header -->
        <div class="flex-shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b border-default bg-overlay/80">
          <button
            @click="closeEnemyMobile()"
            class="w-6 h-6 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-md transition-colors flex-shrink-0"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="flex-1 text-sm leading-none font-medium text-base truncate">敌影清剿</span>
          <span class="text-xs leading-none font-mono text-faint flex-shrink-0">
            {{ enemyCombinedStats.found }}/{{ enemyCombinedStats.total }}
          </span>
        </div>

        <!-- Scrollable type list -->
        <div class="flex-1 overflow-y-auto py-3 px-3">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="item in enemyAllTypes"
              :key="item.type"
              @click="store.toggleType(item.type)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all"
              :class="item.selected ? 'border-current font-medium' : 'border-default bg-transparent opacity-60 hover:opacity-100 font-normal'"
              :style="{ color: MARKER_TYPE_CONFIG[item.type].color, backgroundColor: item.selected ? MARKER_TYPE_CONFIG[item.type].color + '33' : 'transparent', borderColor: item.selected ? MARKER_TYPE_CONFIG[item.type].color + '66' : undefined }"
            >
              <img
                :src="resolveAssetUrl(MARKER_TYPE_CONFIG[item.type].iconUrl)"
                :alt="MARKER_TYPE_CONFIG[item.type].label"
                class="w-4 h-4 rounded-full object-cover"
                :class="iconClass(item.type)"
              />
              <span>{{ MARKER_TYPE_CONFIG[item.type].label }}</span>
              <span
                class="font-mono text-[10px] opacity-70"
              >{{ item.foundCount }}/{{ item.totalCount }}</span>
            </button>
          </div>

          <div v-if="enemyAllTypes.length === 0" class="flex items-center justify-center gap-2 text-faint py-8">
            <AppIcon name="filter" class="w-7 h-7 opacity-30" stroke="1.5" />
            <span class="text-xs">无匹配</span>
          </div>
        </div>
      </div>

      <!-- Teleport sub-group mobile view -->
      <div
        v-else-if="teleportSubMobileView && detailType === null"
        class="flex-1 flex flex-col overflow-hidden max-md:rounded-t-2xl"
      >
        <!-- Header -->
        <div class="flex-shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b border-default bg-overlay/80">
          <button
            @click="closeTeleportSubMobile()"
            class="w-6 h-6 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-md transition-colors flex-shrink-0"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="flex-1 text-sm leading-none font-medium text-base truncate">传送点 · 异象/特殊</span>
          <span class="text-xs leading-none font-mono text-faint flex-shrink-0">
            {{ teleportSubCombinedStats.found }}/{{ teleportSubCombinedStats.total }}
          </span>
        </div>

        <!-- Scrollable type list -->
        <div class="flex-1 overflow-y-auto py-3 px-3">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="item in teleportSubAllTypes"
              :key="item.type"
              @click="store.toggleType(item.type)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all"
              :class="item.selected ? 'border-current font-medium' : 'border-default bg-transparent opacity-60 hover:opacity-100 font-normal'"
              :style="{ color: MARKER_TYPE_CONFIG[item.type].color, backgroundColor: item.selected ? MARKER_TYPE_CONFIG[item.type].color + '33' : 'transparent', borderColor: item.selected ? MARKER_TYPE_CONFIG[item.type].color + '66' : undefined }"
            >
              <img
                :src="resolveAssetUrl(MARKER_TYPE_CONFIG[item.type].iconUrl)"
                :alt="MARKER_TYPE_CONFIG[item.type].label"
                class="w-4 h-4 rounded-full object-cover"
                :class="iconClass(item.type)"
              />
              <span>{{ MARKER_TYPE_CONFIG[item.type].label }}</span>
              <span
                class="font-mono text-[10px] opacity-70"
              >{{ item.foundCount }}/{{ item.totalCount }}</span>
            </button>
          </div>

          <div v-if="teleportSubAllTypes.length === 0" class="flex items-center justify-center gap-2 text-faint py-8">
            <AppIcon name="filter" class="w-7 h-7 opacity-30" stroke="1.5" />
            <span class="text-xs">无匹配</span>
          </div>
        </div>
      </div>

      <!-- Category list view: two-panel layout -->
      <div
        v-else-if="showCategoryList"
        class="flex-1 flex flex-col overflow-hidden max-md:rounded-t-2xl"
      >
        <!-- Back button + header -->
        <div class="flex-shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b border-default bg-overlay/80">
          <button
            @click="closeCategoryList()"
            class="w-6 h-6 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-md transition-colors flex-shrink-0"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="flex-1 text-sm leading-none font-medium text-base truncate">分类列表</span>
        </div>

        <!-- Two panels -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Left panel: category labels -->
          <div class="w-[72px] flex-shrink-0 overflow-y-auto border-r border-default py-1.5 space-y-0.5 px-1.5">
            <button
              v-for="cat in categoryListData"
              :key="cat.label"
              @click="scrollToCategory(cat.label)"
              class="w-full text-center px-1 py-3 rounded-lg text-muted hover:bg-elevated hover:text-base transition-colors text-[11px] font-medium leading-tight"
            >{{ cat.label }}</button>

            <div v-if="categoryListData.length === 0" class="flex flex-col items-center gap-1 py-4 text-faint">
              <AppIcon name="filter" class="w-5 h-5 opacity-30" stroke="1.5" />
              <span class="text-[10px]">无</span>
            </div>
          </div>

          <!-- Right panel: type cards grouped by category -->
          <div ref="categoryScrollRef" class="flex-1 overflow-y-auto py-2 px-2 space-y-3">
            <template v-for="cat in categoryListData" :key="cat.label">
              <div :id="`cat-section-${cat.label}`">
                <div class="text-xs font-medium text-muted px-1 mb-2">{{ cat.label }}</div>
                <div class="flex flex-wrap gap-1.5">
                  <div
                    v-for="t in cat.types"
                    :key="t.type"
                    class="flex flex-col items-center gap-1"
                  >
                    <div
                      @click="store.toggleType(t.type)"
                      class="flex items-center justify-center w-[60px] h-[44px] rounded-lg cursor-pointer border transition-colors"
                      :class="t.selected
                        ? 'border-current font-medium'
                        : 'border-default hover:bg-elevated'"
                      :style="t.selected ? { backgroundColor: t.config.color + '22', borderColor: t.config.color + '66' } : {}"
                      :title="t.config.label"
                    >
                      <img
                        :src="resolveAssetUrl(t.config.iconUrl)"
                        :alt="t.config.label"
                        class="w-8 h-8 rounded-full object-cover"
                        :class="iconClass(t.type)"
                      />
                    </div>
                    <span
                      class="text-[10px] leading-tight text-center w-[60px] truncate"
                      :class="t.selected ? 'text-base' : 'text-faint'"
                    >{{ t.config.label }}</span>
                  </div>
                </div>
              </div>
            </template>

            <div v-if="categoryListData.length === 0" class="flex items-center justify-center gap-2 text-faint py-8">
              <AppIcon name="filter" class="w-7 h-7 opacity-30" stroke="1.5" />
              <span class="text-xs">无匹配</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail overlay -->
      <div
        v-if="detailType !== null"
        class="flex-1 flex flex-col overflow-hidden max-md:rounded-t-2xl"
      >
        <!-- Back button + type header -->
        <div class="flex-shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b border-default bg-overlay/80">
          <button
            @click="backToList()"
            class="w-6 h-6 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-md transition-colors flex-shrink-0"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <img
            :src="resolveAssetUrl(MARKER_TYPE_CONFIG[detailType].iconUrl)"
            :alt="MARKER_TYPE_CONFIG[detailType].label"
            class="w-4 h-4 rounded-full object-cover flex-shrink-0"
            :class="iconClass(detailType)"
          />
          <span class="flex-1 text-sm leading-none font-medium text-base truncate">{{ MARKER_TYPE_CONFIG[detailType].label }}</span>
          <span class="text-xs leading-none font-mono text-faint flex-shrink-0">
            {{ store.typeStats[detailType].found }}/{{ store.typeStats[detailType].total }}
          </span>
        </div>

        <!-- Marker cards -->
        <div ref="detailScrollRef" :class="isMobile ? 'flex-1 flex flex-col gap-2 overflow-x-auto overflow-y-hidden px-4 pb-3 pt-3' : 'flex-1 overflow-y-auto px-4 pb-3 space-y-2 pt-3'">
          <template v-if="detailMarkers.length > 0">
            <div v-for="(row, ri) in detailMarkerRows" :key="ri" :class="isMobile ? 'flex gap-2 w-max' : 'space-y-2'">
              <div
                v-for="m in row"
                :key="m.id"
                @click="scrollToList(m.id)"
                class="flex gap-3 p-2 rounded-xl cursor-pointer hover:bg-elevated transition-colors border border-default max-md:flex-shrink-0 max-md:overflow-hidden relative"
                :style="isMobile ? { width: m.description ? 'var(--card-width)' : 'var(--card-width-narrow)', minWidth: m.description ? 'var(--card-width)' : 'var(--card-width-narrow)', height: 'var(--card-row-h)' } : {}"
                :class="[
                  { 'bg-primary-500/10 border-primary-500/30': store.selectedMarkerId === m.id },
                  isMobile && !m.description ? 'flex-col items-center justify-center gap-1' : '',
                ]"
              >
                <!-- Count badge (absolute top-left, mobile only) -->
                <span
                  v-if="m.counts && Object.values(m.counts).some(v => v > 0)"
                  class="md:hidden absolute top-1 left-1 text-[10px] px-1 py-0.5 rounded-full bg-red-500/20 text-red-500 dark:text-red-400 font-mono leading-none z-10"
                >{{ Object.values(m.counts).reduce((a: number, b: number) => a + b, 0) }}</span>

                <!-- Image -->
                <div v-if="m.image || (m.images && m.images.length > 0)" class="rounded-lg overflow-hidden flex-shrink-0 bg-elevated"
                  :class="{ 'self-center': !isMobile || !!m.description }"
                  :style="isMobile ? { width: 'var(--card-img-size)', height: 'var(--card-img-size)' } : { width: '64px', height: '64px' }">
                  <img
                    :src="m.image ? resolveAssetUrl(m.image) : (m.images && m.images[0] ? resolveAssetUrl(m.images[0]) : undefined)"
                    :alt="m.name"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div v-else class="rounded-lg flex-shrink-0 bg-elevated flex items-center justify-center"
                  :class="{ 'self-center': !isMobile || !!m.description }"
                  :style="isMobile ? { width: 'var(--card-img-size)', height: 'var(--card-img-size)' } : { width: '64px', height: '64px' }">
                  <img
                    :src="resolveAssetUrl(MARKER_TYPE_CONFIG[m.types[0]].iconUrl)"
                    :alt="MARKER_TYPE_CONFIG[m.types[0]].label"
                    class="rounded-full object-cover opacity-50"
                    :class="iconClass(m.types[0])"
                    :style="isMobile ? { width: `calc(var(--card-img-size) * 0.5)`, height: `calc(var(--card-img-size) * 0.5)` } : { width: '32px', height: '32px' }"
                  />
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0 flex flex-col overflow-hidden"
                  :class="isMobile && !m.description ? 'flex-initial items-center text-center' : ''">
                  <div class="flex items-center gap-2 flex-shrink-0"
                    :class="isMobile && !m.description ? 'flex-col gap-0.5' : ''">
                    <span class="font-medium truncate" :class="store.isFound(m.id) ? 'text-faint line-through' : 'text-base'" :style="isMobile ? { fontSize: 'var(--card-font-size)' } : { fontSize: '14px' }">
                      {{ m.name }}
                    </span>
                    <span
                      v-if="store.isFound(m.id)"
                      class="text-xs px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 flex-shrink-0"
                    >已标记</span>
                    <span
                      v-if="m.counts && Object.values(m.counts).some(v => v > 0)"
                      class="max-md:hidden text-xs px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 dark:text-red-400 flex-shrink-0 font-mono"
                    >{{ Object.values(m.counts).reduce((a: number, b: number) => a + b, 0) }}</span>
                  </div>
                  <div
                    v-if="m.description"
                    class="text-faint mt-0.5 overflow-y-auto flex-1 min-h-0"
                    :style="{ fontSize: isMobile ? 'var(--card-font-size)' : '12px' }"
                  >
                    {{ m.description }}
                  </div>
                </div>

              </div>
            </div>
          </template>

          <div v-else class="flex items-center justify-center gap-2 text-faint max-md:flex-shrink-0 max-md:flex-col max-md:rounded-xl max-md:bg-elevated/60 max-md:border max-md:border-default" :style="isMobile ? { minWidth: '160px', height: 'calc(var(--card-row-h) * 2 + 8px)' } : {}">
            <AppIcon name="filter" class="w-7 h-7 opacity-30" stroke="1.5" />
            <span class="text-xs">无匹配</span>
          </div>
        </div>
      </div>
      </template>
    </div>
  </Transition>

  <!-- Confirm dialog (teleported to body for centered overlay) -->
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="confirmVisible"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="onConfirmResult(false)"
      >
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-6 w-72 mx-4">
          <p class="text-sm text-base text-center leading-relaxed">{{ confirmMessage }}</p>
          <div class="flex gap-3 mt-5">
            <button
              @click="onConfirmResult(false)"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-elevated text-muted hover:bg-surface transition-colors"
            >取消</button>
            <button
              @click="onConfirmResult(true)"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors"
            >确定</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Enemy clearing popover (desktop) -->
  <Teleport to="body">
    <div
      v-if="!isMobile && enemyExpanded"
      class="fixed inset-0 z-[65]"
      @click="enemyExpanded = false"
    ></div>
    <div
      v-if="!isMobile && enemyExpanded"
      :style="enemyPopoverStyle"
      @click.stop
      class="bg-overlay/95 backdrop-blur-xl border border-default rounded-xl shadow-2xl p-3 w-[320px]"
    >
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="type in ENEMY_CLEARING_TYPES"
          :key="type"
          @click="store.toggleType(type)"
          class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-all"
          :class="store.selectedTypes.has(type) ? 'border-current font-medium' : 'border-default bg-transparent opacity-60 hover:opacity-100 font-normal'"
          :style="{ color: MARKER_TYPE_CONFIG[type].color, backgroundColor: store.selectedTypes.has(type) ? MARKER_TYPE_CONFIG[type].color + '33' : 'transparent', borderColor: store.selectedTypes.has(type) ? MARKER_TYPE_CONFIG[type].color + '66' : undefined }"
        >
          <img
            :src="resolveAssetUrl(MARKER_TYPE_CONFIG[type].iconUrl)"
            :alt="MARKER_TYPE_CONFIG[type].label"
            class="w-3.5 h-3.5 rounded-full object-cover"
            :class="iconClass(type)"
          />
          {{ MARKER_TYPE_CONFIG[type].label }}
        </button>
      </div>
    </div>
  </Teleport>

  <!-- Teleport sub-group popover (desktop) -->
  <Teleport to="body">
    <div
      v-if="!isMobile && teleportSubExpanded"
      class="fixed inset-0 z-[65]"
      @click="teleportSubExpanded = false"
    ></div>
    <div
      v-if="!isMobile && teleportSubExpanded"
      :style="teleportSubPopoverStyle"
      @click.stop
      class="bg-overlay/95 backdrop-blur-xl border border-default rounded-xl shadow-2xl p-3 w-[320px]"
    >
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="type in TELEPORT_SUB_TYPES"
          :key="type"
          @click="store.toggleType(type)"
          class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-all"
          :class="store.selectedTypes.has(type) ? 'border-current font-medium' : 'border-default bg-transparent opacity-60 hover:opacity-100 font-normal'"
          :style="{ color: MARKER_TYPE_CONFIG[type].color, backgroundColor: store.selectedTypes.has(type) ? MARKER_TYPE_CONFIG[type].color + '33' : 'transparent', borderColor: store.selectedTypes.has(type) ? MARKER_TYPE_CONFIG[type].color + '66' : undefined }"
        >
          <img
            :src="resolveAssetUrl(MARKER_TYPE_CONFIG[type].iconUrl)"
            :alt="MARKER_TYPE_CONFIG[type].label"
            class="w-3.5 h-3.5 rounded-full object-cover"
            :class="iconClass(type)"
          />
          {{ MARKER_TYPE_CONFIG[type].label }}
        </button>
      </div>
    </div>
  </Teleport>

  <!-- Create route dialog -->
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="showCreateRouteDialog"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="showCreateRouteDialog = false"
      >
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-5 w-[380px] max-w-[92vw] max-h-[85vh] flex flex-col">
          <h3 class="text-sm font-medium text-base mb-4">创建路线</h3>
          <div class="mb-3">
            <label class="block text-xs text-muted mb-1.5">路线名称</label>
            <input
              v-model="newRouteName"
              type="text"
              placeholder="输入路线名称"
              class="w-full px-3 py-2 text-sm bg-elevated border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
              @keydown.enter="confirmCreateRoute()"
            />
          </div>
          <div class="flex-1 min-h-0 mb-4">
            <label class="block text-xs text-muted mb-1.5">选择路线图片</label>
            <div v-if="routeImageOptions.length > 0" class="grid grid-cols-5 gap-2 max-h-[240px] overflow-y-auto">
              <div
                v-for="(img, idx) in routeImageOptions"
                :key="idx"
                @click="newRouteImage = img.url"
                class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors bg-elevated"
                :class="newRouteImage === img.url ? 'border-primary-500' : 'border-transparent hover:border-border-strong'"
                :title="img.label"
              >
                <img :src="img.url" class="w-full h-full object-cover" />
              </div>
            </div>
            <div v-else class="text-xs text-faint py-4 text-center">暂无可用图片</div>
          </div>
          <div class="flex gap-3 flex-shrink-0">
            <button
              @click="showCreateRouteDialog = false"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-elevated text-muted hover:bg-surface transition-colors"
            >取消</button>
            <button
              @click="confirmCreateRoute()"
              :disabled="!newRouteName.trim()"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >创建</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Create segment dialog -->
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="showCreateSegmentDialog"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="showCreateSegmentDialog = false"
      >
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-5 w-[380px] max-w-[92vw] max-h-[85vh] flex flex-col">
          <h3 class="text-sm font-medium text-base mb-4">新建路段</h3>
          <div class="mb-3">
            <label class="block text-xs text-muted mb-1.5">路段名称</label>
            <input
              v-model="newSegmentName"
              type="text"
              placeholder="输入路段名称"
              class="w-full px-3 py-2 text-sm bg-elevated border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
              @keydown.enter="confirmCreateSegment()"
            />
          </div>
          <div class="mb-4">
            <label class="block text-xs text-muted mb-1.5">连接标点 ({{ store.segmentTempMarkerIds.length }} 个)</label>
            <div class="max-h-[160px] overflow-y-auto space-y-1">
              <div
                v-for="(mid, idx) in store.segmentTempMarkerIds"
                :key="mid"
                class="flex items-center gap-2 px-2 py-1 rounded bg-elevated text-xs text-muted"
              >
                <span class="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">{{ idx + 1 }}</span>
                <span class="truncate">{{ getMarkerName(mid) }}</span>
              </div>
              <div v-if="store.segmentTempMarkerIds.length === 0" class="text-xs text-faint py-2 text-center">无标点</div>
            </div>
          </div>
          <div class="flex gap-3 flex-shrink-0">
            <button
              @click="showCreateSegmentDialog = false"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-elevated text-muted hover:bg-surface transition-colors"
            >取消</button>
            <button
              @click="confirmCreateSegment()"
              :disabled="!newSegmentName.trim() || store.segmentTempMarkerIds.length < 2"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >保存</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Edit route dialog -->
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="showEditRouteDialog"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="showEditRouteDialog = false"
      >
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-5 w-[380px] max-w-[92vw] max-h-[85vh] flex flex-col">
          <h3 class="text-sm font-medium text-base mb-4">编辑路线</h3>
          <div class="mb-3">
            <label class="block text-xs text-muted mb-1.5">路线名称</label>
            <input
              v-model="editRouteName"
              type="text"
              placeholder="输入路线名称"
              class="w-full px-3 py-2 text-sm bg-elevated border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
              @keydown.enter="confirmEditRoute()"
            />
          </div>
          <div class="flex-1 min-h-0 mb-4">
            <label class="block text-xs text-muted mb-1.5">选择路线图片</label>
            <div v-if="routeImageOptions.length > 0" class="grid grid-cols-5 gap-2 max-h-[240px] overflow-y-auto">
              <div
                v-for="(img, idx) in routeImageOptions"
                :key="idx"
                @click="editRouteImage = img.url"
                class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors bg-elevated"
                :class="editRouteImage === img.url ? 'border-primary-500' : 'border-transparent hover:border-border-strong'"
                :title="img.label"
              >
                <img :src="img.url" class="w-full h-full object-cover" />
              </div>
            </div>
            <div v-else class="text-xs text-faint py-4 text-center">暂无可用图片</div>
          </div>
          <div class="flex gap-3 flex-shrink-0">
            <button
              @click="showEditRouteDialog = false"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-elevated text-muted hover:bg-surface transition-colors"
            >取消</button>
            <button
              @click="confirmEditRoute()"
              :disabled="!editRouteName.trim()"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >保存</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Edit segment dialog -->
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="showEditSegmentDialog"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="showEditSegmentDialog = false"
      >
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-5 w-[320px] max-w-[92vw]">
          <h3 class="text-sm font-medium text-base mb-4">编辑路段</h3>
          <div class="mb-4">
            <label class="block text-xs text-muted mb-1.5">路段名称</label>
            <input
              v-model="editSegmentName"
              type="text"
              placeholder="输入路段名称"
              class="w-full px-3 py-2 text-sm bg-elevated border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
              @keydown.enter="confirmEditSegment()"
            />
          </div>
          <div class="flex gap-3">
            <button
              @click="showEditSegmentDialog = false"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-elevated text-muted hover:bg-surface transition-colors"
            >取消</button>
            <button
              @click="confirmEditSegment()"
              :disabled="!editSegmentName.trim()"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >保存</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
@media (min-width: 768px) {
  .slide-enter-from,
  .slide-leave-to {
    transform: translateX(-100%);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
