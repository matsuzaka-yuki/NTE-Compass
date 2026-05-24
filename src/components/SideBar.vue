<script setup lang="ts">
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { MARKER_TYPE_CONFIG, MARKER_CATEGORIES } from '@/types'
import type { MarkerType } from '@/types'
import { resolveAssetUrl } from '@/config'

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
const searchExpanded = ref(false)

const searchInput = ref<HTMLInputElement | null>(null)

const categoryRows = computed(() => {
  if (!isMobile.value) return [MARKER_CATEGORIES]
  const mid = Math.ceil(MARKER_CATEGORIES.length / 2)
  return [MARKER_CATEGORIES.slice(0, mid), MARKER_CATEGORIES.slice(mid)]
})

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
  const result: { type: MarkerType; foundCount: number; totalCount: number }[] = []
  for (const cat of MARKER_CATEGORIES) {
    for (const type of cat.types) {
      if (!store.selectedTypes.has(type)) continue
      const stats = store.typeStats[type]
      if (stats.total > 0) {
        result.push({ type, foundCount: stats.found, totalCount: stats.total })
      }
    }
  }
  return result
})

const detailMarkers = computed(() => {
  if (!detailType.value) return []
  return store.filteredMarkers.filter((m) => m.type === detailType.value)
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
}

function backToList() {
  detailType.value = null
}

function scrollToList(id: string) {
  store.selectMarker(id)
}
</script>

<template>
  <!-- Mobile open button (visible when sidebar closed) -->
  <button
    v-if="!store.sidebarOpen"
    @click="store.sidebarOpen = true"
    class="fixed bottom-6 left-6 z-30 w-10 h-10 rounded-xl bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center text-slate-300 hover:text-white hover:border-white/20 transition-all md:hidden"
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
      class="fixed z-50 flex flex-col bg-surface-900/95 backdrop-blur-xl border border-white/10 shadow-2xl inset-x-0 bottom-0 rounded-t-2xl md:h-auto md:top-3 md:bottom-3 md:left-3 md:inset-x-auto md:w-[300px] md:rounded-2xl md:overflow-hidden"
      :style="isMobile ? { height: 'clamp(280px, 42dvh, 600px)' } : {}"
    >
      <!-- Mobile close button (at top edge of panel) -->
      <button
        @click="store.sidebarOpen = false"
        class="absolute left-2 z-30 w-9 h-9 rounded-lg bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center text-slate-300 hover:text-white hover:border-white/20 transition-all md:hidden"
        style="top: -2.75rem;"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Mobile search button (collapsed) -->
      <button
        v-if="!searchExpanded"
        @click="toggleSearch()"
        class="absolute right-2 z-30 w-9 h-9 rounded-lg bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center text-slate-300 hover:text-white hover:border-white/20 transition-all md:hidden"
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
            class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
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
            class="w-full h-full pl-8 pr-7 text-xs bg-surface-800/90 backdrop-blur-md border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
          <button
            @click="toggleSearch()"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            title="关闭"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Fixed top section -->
      <div class="flex-shrink-0 space-y-3" :class="{ 'p-2': !(isMobile && detailType !== null) }">
        <!-- Header -->
        <div class="flex items-center gap-2">
          <h1 v-if="!searchExpanded" class="text-lg font-bold tracking-wide text-primary-400 select-none whitespace-nowrap truncate max-md:hidden">
            异环 大地图
          </h1>
          <div v-if="searchExpanded" class="relative flex-1 min-w-0 max-md:hidden">
            <svg
              class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
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
              class="w-full pl-8 pr-7 py-1.5 text-xs bg-surface-800 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
            <button
              @click="toggleSearch()"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="关闭"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div v-else class="flex-1 min-w-0 max-md:hidden" />
          <button
            v-if="!searchExpanded"
            @click="toggleSearch()"
            class="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 max-md:hidden"
            title="搜索"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Scrollable area -->
      <div v-if="detailType === null" class="flex-1 overflow-y-auto overflow-hidden px-4 pb-4 space-y-3">
        <!-- Type filters -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">分类</span>
            <div class="flex items-center gap-2">
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <span class="text-xs text-slate-500">仅未标记</span>
                <div class="relative">
                  <input
                    type="checkbox"
                    :checked="store.filterMode === 'unfound'"
                    @change="store.filterMode = store.filterMode === 'unfound' ? 'all' : 'unfound'"
                    class="sr-only peer"
                  />
                  <div class="w-8 h-4 bg-surface-700 rounded-full peer-checked:bg-primary-600 transition-colors"></div>
                  <div
                    class="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                    :class="store.filterMode === 'unfound' ? 'translate-x-4' : ''"
                  ></div>
                </div>
              </label>
              <button
                @click="handleResetProgress()"
                class="text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                重置
              </button>
              <button
                @click="toggleSelectAll()"
                class="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                {{ allSelected ? '反选' : '全选' }}
              </button>
            </div>
          </div>
          <div :class="isMobile ? 'flex flex-col gap-2 overflow-x-auto pb-1' : 'space-y-2'">
            <div v-for="(row, ri) in categoryRows" :key="ri" :class="isMobile ? 'flex gap-2 w-max' : 'space-y-2'">
              <div v-for="cat in row" :key="cat.label" :class="isMobile ? 'flex bg-white/5 rounded-lg px-2.5 py-1.5 flex-col gap-1 shrink-0' : 'flex items-start gap-1.5'">
                <button
                  @click="toggleCategory(cat.types)"
                  class="text-xs font-medium transition-colors"
                  :class="[categoryAllSelected(cat.types) ? 'text-slate-200' : categoryAnySelected(cat.types) ? 'text-slate-400' : 'text-slate-600', isMobile ? 'w-auto text-left pt-0 text-[11px]' : 'w-10 flex-shrink-0 text-right pt-0.5']"
                >{{ cat.label }}</button>
                <div :class="isMobile ? 'flex flex-nowrap gap-1' : 'flex flex-wrap gap-1 flex-1'">
                  <button
                    v-for="type in cat.types"
                    :key="type"
                    @click="store.toggleType(type)"
                    :class="['inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-all', isMobile ? 'whitespace-nowrap shrink-0' : '', store.selectedTypes.has(type) ? 'border-current text-white' : 'border-white/10 text-slate-500 bg-transparent']"
                    :style="store.selectedTypes.has(type) ? { backgroundColor: MARKER_TYPE_CONFIG[type].color + '33', borderColor: MARKER_TYPE_CONFIG[type].color + '66' } : {}"
                  >
                    <img
                      :src="resolveAssetUrl(MARKER_TYPE_CONFIG[type].iconUrl)"
                      :alt="MARKER_TYPE_CONFIG[type].label"
                      class="w-3.5 h-3.5 rounded-full object-cover"
                    />
                    {{ MARKER_TYPE_CONFIG[type].label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Results count -->
        <div class="text-xs text-slate-500 pt-1 border-t border-white/5">
          <span>共 {{ store.filteredMarkers.length }} 个标记点</span>
        </div>

        <!-- Flat type list -->
        <div class="max-md:flex max-md:gap-2 max-md:overflow-x-auto max-md:pb-1">
          <template v-for="item in flatVisibleTypes" :key="item.type">
            <div
              @click="showDetail(item.type)"
              class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 select-none -mx-4 max-md:flex-shrink-0 max-md:flex-col max-md:gap-1 max-md:px-2 max-md:py-1.5 max-md:mx-0 max-md:rounded-lg max-md:bg-white/5 max-md:border-b-0 max-md:min-w-[60px] max-md:text-center max-md:hover:bg-white/10"
            >
              <img
                :src="resolveAssetUrl(MARKER_TYPE_CONFIG[item.type].iconUrl)"
                :alt="MARKER_TYPE_CONFIG[item.type].label"
                class="w-[18px] h-[18px] rounded-full object-cover flex-shrink-0 max-md:w-6 max-md:h-6"
              />
              <span class="flex-1 text-sm text-slate-200 truncate max-md:text-xs max-md:flex-initial">{{ MARKER_TYPE_CONFIG[item.type].label }}</span>
              <span
                class="text-xs font-mono flex-shrink-0"
                :class="item.foundCount === item.totalCount && item.totalCount > 0 ? 'text-green-400' : 'text-slate-500'"
              >
                {{ item.foundCount }}/{{ item.totalCount }}
              </span>
              <svg
                class="w-3.5 h-3.5 text-slate-500 flex-shrink-0 max-md:hidden"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </template>

          <div v-if="flatVisibleTypes.length === 0" class="flex items-center justify-center gap-2 text-slate-500 py-2.5 max-md:min-h-[72px] max-md:min-w-[60px] max-md:flex-shrink-0 max-md:flex-col max-md:py-1.5 max-md:rounded-lg max-md:bg-white/5">
            <svg class="w-8 h-8 opacity-30 max-md:w-8 max-md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span class="text-xs">无匹配</span>
          </div>
        </div>
      </div>

      <!-- Detail overlay -->
      <div
        v-if="detailType !== null"
        class="flex-1 flex flex-col overflow-hidden max-md:rounded-t-2xl"
      >
        <!-- Back button + type header -->
        <div class="flex-shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b border-white/10 bg-surface-800/80">
          <button
            @click="backToList()"
            class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors flex-shrink-0"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <img
            :src="resolveAssetUrl(MARKER_TYPE_CONFIG[detailType].iconUrl)"
            :alt="MARKER_TYPE_CONFIG[detailType].label"
            class="w-4 h-4 rounded-full object-cover flex-shrink-0"
          />
          <span class="flex-1 text-sm leading-none font-medium text-slate-200 truncate">{{ MARKER_TYPE_CONFIG[detailType].label }}</span>
          <span class="text-xs leading-none font-mono text-slate-500 flex-shrink-0">
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
                class="flex gap-3 p-1 rounded-xl cursor-pointer hover:bg-white/5 transition-colors border border-white/5 max-md:flex-shrink-0 max-md:overflow-hidden"
                :style="isMobile ? { width: m.description ? 'var(--card-width)' : 'var(--card-width-narrow)', minWidth: m.description ? 'var(--card-width)' : 'var(--card-width-narrow)', height: 'var(--card-row-h)' } : {}"
                :class="[
                  { 'bg-primary-500/10 border-primary-500/30': store.selectedMarkerId === m.id },
                  isMobile && !m.description ? 'flex-col items-center justify-center gap-1' : '',
                ]"
              >
                <!-- Image -->
                <div v-if="m.image || (m.images && m.images.length > 0)" class="rounded-lg overflow-hidden flex-shrink-0 bg-surface-800"
                  :class="{ 'self-center': !isMobile || !!m.description }"
                  :style="isMobile ? { width: 'var(--card-img-size)', height: 'var(--card-img-size)' } : { width: '64px', height: '64px' }">
                  <img
                    :src="m.image ? resolveAssetUrl(m.image) : (m.images && m.images[0] ? resolveAssetUrl(m.images[0]) : undefined)"
                    :alt="m.name"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div v-else class="rounded-lg flex-shrink-0 bg-surface-800 flex items-center justify-center"
                  :class="{ 'self-center': !isMobile || !!m.description }"
                  :style="isMobile ? { width: 'var(--card-img-size)', height: 'var(--card-img-size)' } : { width: '64px', height: '64px' }">
                  <img
                    :src="resolveAssetUrl(MARKER_TYPE_CONFIG[m.type].iconUrl)"
                    :alt="MARKER_TYPE_CONFIG[m.type].label"
                    class="rounded-full object-cover opacity-50"
                    :style="isMobile ? { width: `calc(var(--card-img-size) * 0.5)`, height: `calc(var(--card-img-size) * 0.5)` } : { width: '32px', height: '32px' }"
                  />
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0 flex flex-col overflow-hidden"
                  :class="isMobile && !m.description ? 'flex-initial items-center text-center' : ''">
                  <div class="flex items-center gap-2 flex-shrink-0"
                    :class="isMobile && !m.description ? 'flex-col gap-0.5' : ''">
                    <span class="font-medium truncate" :class="store.isFound(m.id) ? 'text-slate-500 line-through' : 'text-slate-200'" :style="isMobile ? { fontSize: 'var(--card-font-size)' } : { fontSize: '14px' }">
                      {{ m.name }}
                    </span>
                    <span
                      v-if="store.isFound(m.id)"
                      class="text-xs px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 flex-shrink-0"
                    >已标记</span>
                  </div>
                  <div
                    v-if="m.description"
                    class="text-slate-500 mt-0.5 overflow-y-auto flex-1 min-h-0"
                    :style="{ fontSize: isMobile ? 'var(--card-font-size)' : '12px' }"
                  >
                    {{ m.description }}
                  </div>
                </div>

              </div>
            </div>
          </template>

          <div v-else class="flex items-center justify-center gap-2 text-slate-500 max-md:flex-shrink-0 max-md:flex-col max-md:rounded-xl max-md:bg-white/5 max-md:border max-md:border-white/5" :style="isMobile ? { minWidth: '160px', height: 'calc(var(--card-row-h) * 2 + 8px)' } : {}">
            <svg class="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span class="text-xs">无匹配</span>
          </div>
        </div>
      </div>
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
        <div class="relative bg-surface-800 border border-white/10 rounded-2xl shadow-2xl p-6 w-72 mx-4">
          <p class="text-sm text-slate-200 text-center leading-relaxed">{{ confirmMessage }}</p>
          <div class="flex gap-3 mt-5">
            <button
              @click="onConfirmResult(false)"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-surface-700 text-slate-300 hover:bg-surface-600 transition-colors"
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
