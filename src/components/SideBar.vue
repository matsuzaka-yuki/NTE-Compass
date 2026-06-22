<script setup lang="ts">
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { MARKER_TYPE_CONFIG, MARKER_CATEGORIES, ENEMY_CLEARING_TYPES, TELEPORT_SUB_TYPES, TELEPORT_BASIC_TYPES, iconClass } from '@/types'
import type { MarkerType } from '@/types'
import { resolveAssetUrl } from '@/config'
import { AppIcon, Dialog, Btn } from '@/components/ui'
import RouteDialogs from './sidebar/RouteDialogs.vue'

const routeDialogsRef = ref<InstanceType<typeof RouteDialogs> | null>(null)

const store = useMarkerStore()

const detailScrollRef = ref<HTMLElement | null>(null)
const isMobile = ref(window.innerWidth < 768)

// Track viewport breakpoints via resize (replaces the old ResizeObserver that
// only fired when the detail panel was mounted, leaving isMobile stale).
function onResize() {
  isMobile.value = window.innerWidth < 768
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const markerTypes = Object.keys(MARKER_TYPE_CONFIG) as MarkerType[]

const allSelected = computed(() => markerTypes.every((t) => store.selectedTypes.has(t)))

const detailType = ref<MarkerType | null>(null)
const showCategoryList = ref(false)
const showBookmarkView = ref(false)
const showAutoRouteDialog = ref(false)
const autoRouteError = ref('')
const autoRouteUseTeleport = ref(false)
const categoryScrollRef = ref<HTMLElement | null>(null)
const searchExpanded = ref(false)

// Bookmarked markers (sorted by type then name)
const bookmarkedMarkers = computed(() => {
  return store.markers
    .filter(m => store.bookmarkedIds.has(m.id))
    .sort((a, b) => {
      const ta = MARKER_TYPE_CONFIG[a.types[0]]?.label ?? ''
      const tb = MARKER_TYPE_CONFIG[b.types[0]]?.label ?? ''
      if (ta !== tb) return ta.localeCompare(tb)
      return a.name.localeCompare(b.name)
    })
})

function openBookmarkView() {
  showBookmarkView.value = true
  showCategoryList.value = false
  detailType.value = null
}
function closeBookmarkView() {
  showBookmarkView.value = false
}

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

// Progress ring geometry (0–1 around a 36px circle).
const progressRing = computed(() => {
  const { found, total } = progressSummary.value
  if (total === 0) return { ratio: 0, pct: 0, dash: 0, gap: 100 }
  const ratio = Math.min(1, found / total)
  const pct = Math.round(ratio * 100)
  const circumference = 2 * Math.PI * 15 // r=15
  return {
    ratio,
    pct,
    dash: ratio * circumference,
    gap: circumference,
    complete: ratio >= 1,
  }
})

const detailMarkers = computed(() => {
  if (!detailType.value) return []
  return store.filteredMarkers.filter((m) => m.types.includes(detailType.value!))
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
  routeDialogsRef.value?.openCreateSegmentDialog()
}

function handleCancelSegmentClick() {
  store.cancelAddSegment()
}

function handleRouteClick(routeId: string) {
  store.openRouteDetail(routeId)
}

function handleGenerateAllEnemyRoute() {
  autoRouteError.value = ''
  showAutoRouteDialog.value = true
}

function confirmGenerateAllEnemyRoute() {
  showAutoRouteDialog.value = false
  const count = store.generateAllEnemyRoute(autoRouteUseTeleport.value)
  if (count === 0) {
    autoRouteError.value = '当前筛选条件下没有敌人清剿标记，请先勾选怪物类型'
    showAutoRouteDialog.value = true
  } else {
    autoRouteError.value = ''
  }
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
    class="fixed bottom-6 left-6 z-30 w-10 h-10 rounded-xl bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center text-muted hover:text-base hover:border-border-strong transition-colors active:scale-95 md:hidden"
  >
    <AppIcon name="menu" class="w-5 h-5" stroke="2" />
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
        class="absolute left-2 z-30 w-9 h-9 rounded-lg bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center text-muted hover:text-base hover:border-border-strong transition-colors active:scale-95 md:hidden"
        style="top: -2.75rem;"
      >
        <AppIcon name="close" class="w-5 h-5" stroke="2" />
      </button>

      <!-- Mobile farming button: above close button when sidebar open (mobile only) -->
      <div
        v-if="store.currentRoute && store.currentSegmentIndex >= 0 && !store.isAddingSegment && !store.farmingMode"
        class="absolute left-2 z-30 md:hidden"
        style="top: -5.5rem;"
      >
        <button
          @click="store.startFarmingMode()"
          class="w-9 h-9 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 transition-colors active:scale-95"
          title="开刷"
        >
          <AppIcon name="bolt" class="w-5 h-5" />
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
          class="w-9 h-9 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
          title="上一组"
        >
          <AppIcon name="chevronUp" class="w-5 h-5" />
        </button>
        <button
          @click="store.farmingNextPair()"
          :disabled="!store.farmingCanGoNext"
          class="w-9 h-9 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
          title="下一组"
        >
          <AppIcon name="chevronDown" class="w-5 h-5" />
        </button>
      </div>

      <!-- Mobile search button (collapsed) -->
      <button
        v-if="!searchExpanded"
        @click="toggleSearch()"
        class="absolute right-2 z-30 w-9 h-9 rounded-lg bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center text-muted hover:text-base hover:border-border-strong transition-colors active:scale-95 md:hidden"
        style="top: -2.75rem;"
      >
        <AppIcon name="search" class="w-5 h-5" stroke="2" />
      </button>

      <!-- Mobile bookmark button -->
      <button
        v-if="!searchExpanded"
        @click="showBookmarkView ? (showBookmarkView = false) : openBookmarkView()"
        class="absolute z-30 w-9 h-9 rounded-lg bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center transition-colors active:scale-95 md:hidden"
        :class="showBookmarkView ? 'text-amber-500 dark:text-amber-400 border-amber-500/40 bg-amber-500/10' : 'text-muted hover:text-base hover:border-border-strong'"
        style="top: -2.75rem; right: 3.5rem;"
      >
        <AppIcon name="heart" class="w-5 h-5" stroke="2" />
      </button>

      <!-- Mobile search bar (expanded) -->
      <div
        v-if="searchExpanded"
        class="absolute z-30 md:hidden"
        style="top: -2.75rem; left: 3.25rem; right: 0.5rem; height: 2.25rem;"
      >
        <div class="relative w-full h-full">
          <input
            v-model="store.searchQuery"
            type="text"
            placeholder="搜索..."
            ref="searchInput"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
            class="w-full h-full pl-8 pr-7 text-xs bg-overlay/90 border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
          />
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted"><AppIcon name="search" class="w-4 h-4" stroke="2" /></span>
          <button
            @click="toggleSearch()"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-muted hover:text-base transition-colors"
            title="关闭"
          >
            <AppIcon name="close" class="w-3 h-3" stroke="2" />
          </button>
        </div>
      </div>

      <!-- Fixed top section -->
      <div v-if="!store.showRouteView" class="flex-shrink-0 space-y-3" :class="{ 'p-2': !isMobile, 'p-1': isMobile && detailType === null && !showCategoryList && !enemyMobileView && !teleportSubMobileView }">
        <!-- Header -->
        <div class="flex items-center gap-2">
          <h1 v-if="!searchExpanded" class="flex items-center gap-2 select-none whitespace-nowrap truncate max-md:hidden">
            <img :src="resolveAssetUrl('./logo.png')" alt="异环地图" class="h-6 w-6 rounded-md object-cover flex-shrink-0" />
            <span class="text-base font-semibold tracking-[0.15em] text-base">NTE · 夜巡</span>
          </h1>
          <div v-if="searchExpanded" class="relative flex-1 min-w-0 max-md:hidden">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style="color: var(--text);"><AppIcon name="search" class="w-4 h-4" stroke="2" /></span>
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
              <AppIcon name="close" class="w-3 h-3" stroke="2" />
            </button>
          </div>
          <div v-else class="flex-1 min-w-0 max-md:hidden" />
          <!-- Route button (desktop) -->
          <button
            @click="store.showRouteView ? store.closeRouteView() : store.openRouteList()"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 max-md:hidden"
            :class="store.showRouteView ? 'text-base bg-elevated' : 'text-muted hover:text-base hover:bg-elevated'"
            title="路线"
          >
            <AppIcon name="route" class="w-4 h-4" stroke="2" />
          </button>
          <!-- Bookmark button (desktop) -->
          <button
            @click="showBookmarkView ? (showBookmarkView = false) : openBookmarkView()"
            class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 max-md:hidden"
            :class="showBookmarkView ? 'text-amber-500 dark:text-amber-400 bg-amber-500/10' : 'text-muted hover:text-base hover:bg-elevated'"
            title="收藏"
          >
            <AppIcon name="heart" class="w-4 h-4" stroke="2" />
          </button>
          <button
            v-if="!searchExpanded"
            @click="toggleSearch()"
            class="w-7 h-7 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-lg transition-colors flex-shrink-0 max-md:hidden"
            title="搜索"
          >
            <AppIcon name="search" class="w-4 h-4" stroke="2" />
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
              <AppIcon name="back" class="w-3.5 h-3.5" stroke="2" />
            </button>
            <span class="flex-1 text-sm leading-none font-medium text-base truncate">路线</span>
            <button
              @click="handleGenerateAllEnemyRoute()"
              class="flex items-center gap-1 h-6 px-2 rounded-md text-[11px] text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex-shrink-0"
              title="自动生成全怪最优路线"
            >
              <AppIcon name="bolt" class="h-3 w-3" stroke="2" />
              全怪路线
            </button>
            <button
              v-if="store.isAnyEditMode"
              @click="routeDialogsRef?.openCreateRouteDialog()"
              class="w-6 h-6 flex items-center justify-center text-muted hover:text-primary-400 hover:bg-elevated rounded-md transition-colors flex-shrink-0"
              title="创建路线"
            >
              <AppIcon name="plus" class="w-4 h-4" stroke="2" />
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
                    <AppIcon name="route" class="w-5 h-5 text-faint" stroke="2" />
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
                  <AppIcon name="trash" class="w-3.5 h-3.5" stroke="2" />
                </button>
                <AppIcon name="chevronRight" class="w-3.5 h-3.5 text-faint flex-shrink-0" />
              </div>
            </template>

            <div v-else class="flex flex-col items-center justify-center gap-2 text-faint py-12">
              <AppIcon name="route" class="w-10 h-10 opacity-30" stroke="1.5" />
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
              <AppIcon name="back" class="w-3.5 h-3.5" stroke="2" />
            </button>
            <div v-if="store.currentRoute?.image" class="w-5 h-5 rounded overflow-hidden flex-shrink-0 bg-elevated">
              <img :src="store.currentRoute.image" class="w-full h-full object-cover" />
            </div>
            <span class="flex-1 text-sm leading-none font-medium text-base truncate">{{ store.currentRoute?.name ?? '' }}</span>
            <button
              v-if="store.isAnyEditMode"
              @click="routeDialogsRef?.openEditRouteDialog()"
              class="w-6 h-6 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-md transition-colors flex-shrink-0"
              title="编辑路线"
            >
              <AppIcon name="edit" class="w-3.5 h-3.5" stroke="2" />
            </button>
            <button
              v-if="!store.isAddingSegment"
              @click="toggleRouteMarkerFilter()"
              class="w-6 h-6 flex items-center justify-center rounded-md transition-colors flex-shrink-0"
              :class="store.routeMarkerFilterIds ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'text-muted hover:text-base hover:bg-elevated'"
              :title="store.routeMarkerFilterIds ? '显示全部标点' : '仅显示路线标点'"
            >
              <AppIcon name="filter" class="w-4 h-4" stroke="2" />
            </button>
            <button
              v-if="store.isAnyEditMode && !store.isAddingSegment"
              @click="handleAddSegmentClick()"
              class="w-6 h-6 flex items-center justify-center text-muted hover:text-primary-400 hover:bg-elevated rounded-md transition-colors flex-shrink-0"
              title="添加路段"
            >
              <AppIcon name="plus" class="w-4 h-4" stroke="2" />
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
                    <AppIcon name="dragGrid" class="w-3 h-3" />
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
                    @click.stop="routeDialogsRef?.openEditSegmentDialog(segment.id)"
                    class="w-5 h-5 flex items-center justify-center text-faint hover:text-base rounded transition-colors flex-shrink-0"
                  >
                    <AppIcon name="edit" class="w-3 h-3" stroke="2" />
                  </button>
                  <button
                    v-if="store.isAnyEditMode"
                    @click.stop="handleDeleteSegment(segment.id)"
                    class="w-5 h-5 flex items-center justify-center text-faint hover:text-red-400 rounded transition-colors flex-shrink-0"
                  >
                    <AppIcon name="trash" class="w-3 h-3" stroke="2" />
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
              <AppIcon name="bolt" class="w-10 h-10 opacity-30" stroke="1.5" />
              <span class="text-xs">暂无路段</span>
              <span v-if="store.isAnyEditMode" class="text-xs text-faint">点击右上角 + 添加路段</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Bookmark view -->
      <template v-else-if="showBookmarkView">
        <div class="flex-1 flex flex-col overflow-hidden" :class="{ 'rounded-t-2xl': isMobile }">
          <div class="flex-shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b border-default bg-overlay/80">
            <button
              @click="closeBookmarkView()"
              class="w-6 h-6 flex items-center justify-center text-muted hover:text-base hover:bg-elevated rounded-md transition-colors flex-shrink-0"
            >
              <AppIcon name="back" class="w-3.5 h-3.5" stroke="2" />
            </button>
            <span class="flex-1 text-sm leading-none font-medium text-base truncate">收藏 ({{ bookmarkedMarkers.length }})</span>
          </div>
          <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            <template v-if="bookmarkedMarkers.length > 0">
              <div
                v-for="m in bookmarkedMarkers"
                :key="m.id"
                @click="scrollToList(m.id); closeBookmarkView()"
                class="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-elevated active:bg-elevated transition-colors border border-default"
              >
                <img
                  :src="resolveAssetUrl(MARKER_TYPE_CONFIG[m.types[0]]?.iconUrl)"
                  :alt="MARKER_TYPE_CONFIG[m.types[0]]?.label"
                  class="w-[18px] h-[18px] rounded-full object-cover flex-shrink-0"
                  :class="iconClass(m.types[0])"
                />
                <div class="flex-1 min-w-0">
                  <span class="block text-sm text-base truncate">{{ m.name }}</span>
                  <span class="text-[11px] text-faint">{{ MARKER_TYPE_CONFIG[m.types[0]]?.label }}</span>
                </div>
                <button
                  @click.stop="store.toggleBookmark(m.id)"
                  class="w-6 h-6 flex items-center justify-center text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors flex-shrink-0"
                  title="取消收藏"
                >
                  <AppIcon name="heart" class="w-3.5 h-3.5" />
                </button>
              </div>
            </template>
            <div v-else class="flex flex-col items-center justify-center gap-2 text-faint py-12">
              <AppIcon name="heart" class="w-8 h-8 opacity-30" stroke="1.5" />
              <span class="text-xs">还没有收藏的标记</span>
              <span class="text-[11px]">点击标记弹窗里的爱心即可收藏</span>
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
            <div class="flex items-center gap-2 min-w-0">
              <!-- Progress ring -->
              <svg class="h-9 w-9 shrink-0" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" stroke-width="3" class="text-default" opacity="0.4" />
                <circle
                  cx="18" cy="18" r="15" fill="none" stroke-width="3" stroke-linecap="round"
                  :stroke="progressRing.complete ? '#22c55e' : 'currentColor'"
                  :class="progressRing.complete ? '' : 'text-primary-500'"
                  stroke-dasharray="100 100"
                  :stroke-dashoffset="100 - progressRing.dash"
                  pathLength="100"
                  transform="rotate(-90 18 18)"
                  style="transition: stroke-dashoffset 0.5s ease;"
                />
                <text x="18" y="21" text-anchor="middle" class="fill-current text-[8px] font-semibold" :class="progressRing.complete ? 'text-green-500' : 'text-base'">{{ progressRing.pct }}%</text>
              </svg>
              <div class="flex flex-col leading-tight min-w-0">
                <span class="text-sm font-semibold text-base tabular-nums">{{ progressSummary.found }}<span class="text-faint">/{{ progressSummary.total }}</span></span>
                <span class="text-[11px] text-faint truncate max-md:hidden">{{ progressRing.complete ? '已全部收集' : '已收集' }}</span>
              </div>
            </div>
            <div class="flex items-center gap-0.5">
              <!-- Unfound-only toggle -->
              <button
                @click="store.filterMode = store.filterMode === 'unfound' ? 'all' : 'unfound'"
                class="flex items-center gap-1 h-6 px-2 rounded-md text-[11px] transition-colors"
                :class="store.filterMode === 'unfound' ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'text-muted hover:text-base hover:bg-elevated'"
                title="仅显示未收集"
              >
                <AppIcon name="filter" class="h-3 w-3" />
                <span>未收集</span>
              </button>
              <!-- Select all / invert -->
              <button
                @click="toggleSelectAll()"
                class="flex items-center gap-1 h-6 px-2 rounded-md text-[11px] text-muted hover:text-base hover:bg-elevated transition-colors"
                :title="allSelected ? '反选' : '全选'"
              >
                <AppIcon :name="allSelected ? 'check' : 'plus'" class="h-3 w-3" />
                <span>{{ allSelected ? '反选' : '全选' }}</span>
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
              class="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-elevated active:bg-elevated transition-colors border-b border-default select-none max-md:flex-shrink-0 max-md:flex-col max-md:gap-1 max-md:px-2.5 max-md:py-1.5 max-md:rounded-lg max-md:bg-elevated/60 max-md:border-b-0 max-md:min-w-[52px] max-md:text-center max-md:hover:bg-elevated max-md:relative"
              :class="{ 'opacity-50': item.foundCount === item.totalCount && item.totalCount > 0 }"
            >
              <img
                :src="resolveAssetUrl(MARKER_TYPE_CONFIG[item.type].iconUrl)"
                :alt="MARKER_TYPE_CONFIG[item.type].label"
                class="w-[18px] h-[18px] rounded-full object-cover flex-shrink-0 max-md:w-6 max-md:h-6"
                :class="iconClass(item.type)"
              />
              <span class="flex-1 text-sm text-base truncate max-md:text-xs max-md:flex-initial max-md:whitespace-nowrap">{{ MARKER_TYPE_CONFIG[item.type].label }}</span>
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
              <AppIcon name="chevronRight" class="w-3.5 h-3.5 text-faint flex-shrink-0 max-md:hidden" />
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
            <AppIcon name="back" class="w-3.5 h-3.5" stroke="2" />
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
            <AppIcon name="back" class="w-3.5 h-3.5" stroke="2" />
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
            <AppIcon name="back" class="w-3.5 h-3.5" stroke="2" />
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
            <AppIcon name="back" class="w-3.5 h-3.5" stroke="2" />
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
        <div ref="detailScrollRef" :class="isMobile ? 'flex-1 overflow-y-auto px-3 pb-3 pt-3 grid grid-cols-2 gap-2 content-start' : 'flex-1 overflow-y-auto px-4 pb-3 space-y-2 pt-3'">
          <template v-if="detailMarkers.length > 0">
            <div
              v-for="m in detailMarkers"
              :key="m.id"
              @click="scrollToList(m.id)"
              class="flex gap-2 p-2 rounded-xl cursor-pointer hover:bg-elevated transition-colors border border-default relative"
              :class="{ 'bg-primary-500/10 border-primary-500/30': store.selectedMarkerId === m.id }"
            >
              <!-- Count badge (absolute top-right, mobile only) -->
              <span
                v-if="isMobile && m.counts && Object.values(m.counts).some(v => v > 0)"
                class="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 dark:text-red-400 font-mono leading-none z-10"
              >{{ Object.values(m.counts).reduce((a: number, b: number) => a + b, 0) }}</span>

              <!-- Image -->
              <div v-if="m.image || (m.images && m.images.length > 0)" class="rounded-lg overflow-hidden flex-shrink-0 bg-elevated self-start"
                :style="isMobile ? { width: '44px', height: '44px' } : { width: '64px', height: '64px' }">
                <img
                  :src="m.image ? resolveAssetUrl(m.image) : (m.images && m.images[0] ? resolveAssetUrl(m.images[0]) : undefined)"
                  :alt="m.name"
                  class="w-full h-full object-cover"
                />
              </div>
              <div v-else class="rounded-lg flex-shrink-0 bg-elevated flex items-center justify-center self-start"
                :style="isMobile ? { width: '44px', height: '44px' } : { width: '64px', height: '64px' }">
                <img
                  :src="resolveAssetUrl(MARKER_TYPE_CONFIG[m.types[0]].iconUrl)"
                  :alt="MARKER_TYPE_CONFIG[m.types[0]].label"
                  class="rounded-full object-cover opacity-50"
                  :class="iconClass(m.types[0])"
                  :style="isMobile ? { width: '22px', height: '22px' } : { width: '32px', height: '32px' }"
                />
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
                <span class="font-medium truncate" :class="store.isFound(m.id) ? 'text-faint line-through' : 'text-base'" :style="isMobile ? { fontSize: '11px' } : { fontSize: '14px' }">
                  {{ m.name }}
                </span>
                <span
                  v-if="store.isFound(m.id)"
                  class="mt-0.5 self-start text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 flex-shrink-0"
                >已标记</span>
                <span
                  v-if="!isMobile && m.counts && Object.values(m.counts).some(v => v > 0)"
                  class="mt-0.5 self-start text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 dark:text-red-400 flex-shrink-0 font-mono"
                >{{ Object.values(m.counts).reduce((a: number, b: number) => a + b, 0) }}</span>
                <div
                  v-if="m.description"
                  class="text-faint mt-0.5 line-clamp-2"
                  :style="{ fontSize: isMobile ? '10px' : '12px' }"
                >
                  {{ m.description }}
                </div>
              </div>

            </div>
          </template>

          <div v-else class="flex w-full items-center justify-center gap-2 text-faint py-12">
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

  <!-- Route & segment dialogs (extracted to RouteDialogs.vue) -->
  <RouteDialogs ref="routeDialogsRef" />

  <!-- Auto-route info dialog -->
  <Dialog :open="showAutoRouteDialog" title="生成全怪路线" width="360px" @close="showAutoRouteDialog = false">
    <div class="space-y-3 text-sm text-muted leading-relaxed">
      <p>将根据当前筛选的敌人清剿标记，自动生成一条最优刷怪路线：</p>
      <ul class="space-y-1.5 text-xs">
        <li class="flex gap-2"><span class="text-primary-500">·</span> 使用最近邻算法排序所有标记</li>
        <li class="flex gap-2"><span class="text-primary-500">·</span> 远距离优先走最近的传送点（电话亭/塔/粉爪/魔女之家）</li>
        <li class="flex gap-2"><span class="text-primary-500">·</span> 按地理位置自动分段</li>
        <li class="flex gap-2"><span class="text-primary-500">·</span> 起始点会高亮标记</li>
      </ul>
      <p class="text-xs text-faint">该路线为临时生成，关闭后不保留。请先在筛选中勾选想刷的怪物类型。</p>
      <!-- Teleport start toggle -->
      <div
        class="flex items-center justify-between rounded-lg border border-border-strong bg-elevated px-3 py-2.5 cursor-pointer select-none"
        @click="autoRouteUseTeleport = !autoRouteUseTeleport"
      >
        <div class="flex items-center gap-1.5">
          <AppIcon name="bolt" class="h-3.5 w-3.5 text-amber-500" stroke="2" />
          <div class="flex flex-col gap-0.5">
            <span class="text-xs font-medium text-base">以传送点为起点</span>
            <span class="text-[11px] text-faint">从最近的电话亭/塔/粉爪/魔女之家出发</span>
          </div>
        </div>
        <div class="relative w-9 h-5 rounded-full transition-colors flex-shrink-0" :class="autoRouteUseTeleport ? 'bg-primary-500' : 'bg-faint/40'">
          <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" :class="{ 'translate-x-4': autoRouteUseTeleport }"></div>
        </div>
      </div>
      <p v-if="autoRouteError" class="text-xs text-red-500 dark:text-red-400">{{ autoRouteError }}</p>
    </div>
    <template #footer>
      <Btn variant="ghost" size="sm" @click="showAutoRouteDialog = false">取消</Btn>
      <Btn variant="primary" size="sm" @click="confirmGenerateAllEnemyRoute()">
        <AppIcon name="bolt" class="h-3.5 w-3.5" />
        生成路线
      </Btn>
    </template>
  </Dialog>
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
