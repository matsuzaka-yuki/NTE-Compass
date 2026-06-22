<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useMarkerStore } from './stores/markerStore'
import { useGuide } from './composables/useGuide'
import { useTheme } from './composables/useTheme'
import MapView from './components/MapView.vue'
import LoadingScreen from './components/LoadingScreen.vue'
import SideBar from './components/SideBar.vue'
import MarkerPopup from './components/MarkerPopup.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { ConfirmHost } from './components/ui'
import { EDITOR_ENABLED } from './config'

// Lazy-load less-critical components so they (and their deps) are split into
// separate chunks and only downloaded when needed:
//   - CreateMarkerForm: only used in editor mode (EDITOR_ENABLED)
//   - OnboardingGuide: only shown on first visit / manual re-open
const CreateMarkerForm = defineAsyncComponent(() => import('./components/CreateMarkerForm.vue'))
const OnboardingGuide = defineAsyncComponent(() => import('./components/OnboardingGuide.vue'))

const store = useMarkerStore()
const { isDark, setThemeMode } = useTheme()

// Onboarding guide — re-openable from SettingsPanel via shared trigger
const { requestId } = useGuide()
const guideForceOpen = ref(false)
watch(requestId, () => {
  guideForceOpen.value = true
})

// First-paint loading screen — hidden once MapView emits 'ready'.
const loading = ref(true)
function onMapReady() {
  loading.value = false
}

// Desktop keyboard shortcuts (ignored while typing in an input).
function onKeydown(e: KeyboardEvent) {
  const el = e.target as HTMLElement
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
    // Allow Esc to blur/close even from inputs
    if (e.key === 'Escape') (el as HTMLElement).blur()
    return
  }
  if (e.key === 'Escape') {
    if (store.selectedMarkerId) store.selectMarker(null)
    else store.sidebarOpen = false
  } else if (e.key === 't' || e.key === 'T') {
    const next = isDark.value ? 'light' : 'dark'
    setThemeMode(next)
  }
}

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2000)
}

async function handleToggleEditorMode() {
  const willEnable = !store.isEditorMode
  await store.toggleEditorMode()
  showToast(willEnable ? '编辑者模式已开启' : '编辑者模式已关闭')
}

onMounted(() => {
  store.initData()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

watch(() => store.isOfflineEditMode, (val, oldVal) => {
  if (oldVal !== undefined) {
    showToast(val ? '自定义编辑模式已开启' : '自定义编辑模式已关闭')
  }
})

// ---- Farming button visibility & positioning ----
const isMobile = ref(window.innerWidth < 768)

const showFarmingButton = computed(() => {
  return store.currentRoute && store.currentSegmentIndex >= 0 && !store.isAddingSegment
})

const farmingButtonClass = computed(() => {
  if (!showFarmingButton.value) return { display: 'none' }
  const mobile = isMobile.value
  const sidebarOpen = store.sidebarOpen

  if (mobile) {
    if (sidebarOpen) {
      // Mobile sidebar open: handled in SideBar.vue, hide App.vue button
      return { display: 'none' }
    }
    // Mobile sidebar closed: above the open button (bottom-6 left-6)
    return {
      position: 'fixed' as const,
      bottom: '84px',  // bottom-6 (24px) + button 36px + gap 24px
      left: '24px',
      zIndex: 40,      // above popup backdrop (z-30)
    }
  }

  // Desktop
  if (sidebarOpen) {
    return {
      position: 'fixed' as const,
      top: '64px',    // below close button at top-4 (16px + 36px + 12px gap)
      left: '350px',  // same as sidebar toggle when open
      zIndex: 40,     // above popup backdrop (z-30)
    }
  }
  return {
    position: 'fixed' as const,
    top: '64px',    // below hamburger at top-4
    left: '16px',
    zIndex: 40,     // above popup backdrop (z-30)
  }
})

function handleFarmingButtonClick() {
  if (store.farmingMode) {
    store.stopFarmingMode()
  } else {
    store.startFarmingMode()
  }
}

window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth < 768
})
</script>

<template>
  <div class="app-shell relative h-screen w-screen overflow-hidden bg-bg text-base">
    <!-- Map (full screen) -->
    <MapView @ready="onMapReady" />

    <!-- First-paint loading screen -->
    <LoadingScreen :visible="loading" />

    <!-- Editor mode toast -->
    <Transition name="toast">
      <div
        v-if="toast"
        class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-sm font-medium text-center rounded-xl shadow-2xl pointer-events-none"
        :class="store.isEditorMode ? 'text-primary-200 bg-primary-600/80 border border-primary-400/40' : 'text-base bg-elevated/95 border border-default'"
      >
        {{ toast }}
      </div>
    </Transition>

    <!-- Editor mode toggle button -->
    <button
      v-if="EDITOR_ENABLED"
      @click="handleToggleEditorMode()"
      class="fixed bottom-20 right-6 z-20 w-10 h-10 rounded-xl bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center transition-colors active:scale-95"
      :class="store.isEditorMode ? 'text-base border-border-strong bg-elevated' : 'text-muted hover:text-base hover:border-border-strong'"
      title="编辑者模式"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>

    <!-- Mobile route button (top-left) -->
    <button
      @click="store.showRouteView ? store.closeRouteView() : (store.sidebarOpen = true, store.openRouteList())"
      class="fixed top-3 left-3 z-30 w-9 h-9 rounded-lg bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center transition-colors active:scale-95 md:hidden"
      :class="store.showRouteView ? 'text-base border-border-strong bg-elevated' : 'text-muted hover:text-base hover:border-border-strong'"
      title="路线"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    </button>

    <!-- Sidebar toggle button -->
    <button
      @click="store.toggleSidebar()"
      class="fixed z-30 w-9 h-9 rounded-lg bg-overlay/90 backdrop-blur-md border border-default shadow-lg flex items-center justify-center text-muted hover:text-base hover:border-border-strong transition-colors active:scale-95 top-4 max-md:hidden"
      :class="store.sidebarOpen ? 'left-[350px]' : 'left-4'"
    >
      <svg v-if="!store.sidebarOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Farming button (开刷) / up-down controls -->
    <div
      v-if="showFarmingButton && !store.farmingMode"
      :style="farmingButtonClass"
      class="fixed z-30"
    >
      <button
        @click="handleFarmingButtonClick()"
        class="w-9 h-9 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 transition-colors active:scale-95"
        title="开刷"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    </div>

    <!-- Farming mode: up/down pair navigation -->
    <div
      v-if="showFarmingButton && store.farmingMode"
      :style="farmingButtonClass"
      class="fixed z-30 flex flex-col gap-1.5"
    >
      <button
        @click="store.farmingPrevPair()"
        :disabled="!store.farmingCanGoPrev"
        class="w-9 h-9 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
        title="上一组"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18 15l-6-6-6 6" />
        </svg>
      </button>
      <button
        @click="store.farmingNextPair()"
        :disabled="!store.farmingCanGoNext"
        class="w-9 h-9 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 shadow-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:border-amber-400/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95"
        title="下一组"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>

    <!-- Sidebar (overlay) -->
    <SideBar />

    <!-- Popup -->
    <MarkerPopup />

    <!-- Settings -->
    <SettingsPanel />

    <!-- Create marker form -->
    <CreateMarkerForm />

    <!-- Global confirm dialog host -->
    <ConfirmHost />

    <!-- New-user onboarding guide (auto on first visit) -->
    <OnboardingGuide :force-open="guideForceOpen" @close="guideForceOpen = false" />

    <!-- Data source choice dialog (only when EDITOR_ENABLED=false and localStorage has data) -->
    <Teleport to="body">
      <Transition name="confirm">
        <div
          v-if="store.needsDataSourceChoice"
          class="fixed inset-0 z-[200] flex items-center justify-center"
        >
          <div class="absolute inset-0 bg-black/70"></div>
          <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-6 w-[360px] max-w-[92vw]">
            <h3 class="text-base font-medium text-base text-center mb-2">检测到浏览器存储的数据</h3>
            <p class="text-sm text-muted text-center mb-5">发现之前保存的标点和路线数据，请选择要使用的数据源：</p>
            <div class="flex gap-3">
              <button
                @click="store.chooseDataSource('builtin')"
                class="flex-1 py-2.5 text-sm font-medium rounded-xl bg-elevated text-muted hover:bg-surface transition-colors"
              >使用默认数据</button>
              <button
                @click="store.chooseDataSource('localstorage')"
                class="flex-1 py-2.5 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-500 transition-colors"
              >使用浏览器数据</button>
            </div>
            <p class="text-xs text-faint text-center mt-3">选择默认数据将覆盖浏览器存储</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.app-shell {
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) translateX(-50%);
}
</style>
