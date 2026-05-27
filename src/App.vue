<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMarkerStore } from './stores/markerStore'
import MapView from './components/MapView.vue'
import SideBar from './components/SideBar.vue'
import MarkerPopup from './components/MarkerPopup.vue'
import LegendPanel from './components/LegendPanel.vue'
import CreateMarkerForm from './components/CreateMarkerForm.vue'
import { EDITOR_ENABLED } from './config'

const store = useMarkerStore()

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
  store.loadLatestMarkers()
})
</script>

<template>
  <div class="app-shell relative h-screen w-screen overflow-hidden bg-[#010101]">
    <!-- Map (full screen) -->
    <MapView />

    <!-- Editor mode toast -->
    <Transition name="toast">
      <div
        v-if="toast"
        class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-sm font-medium text-center rounded-xl shadow-2xl pointer-events-none"
        :class="store.isEditorMode ? 'text-primary-200 bg-primary-600/80 border border-primary-400/40' : 'text-slate-200 bg-surface-700/95 border border-white/10'"
      >
        {{ toast }}
      </div>
    </Transition>

    <!-- Editor mode toggle button -->
    <button
      v-if="EDITOR_ENABLED"
      @click="handleToggleEditorMode()"
      class="fixed bottom-20 right-6 z-20 w-10 h-10 rounded-xl bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center transition-all"
      :class="store.isEditorMode ? 'text-primary-400 border-primary-400/30 bg-primary-500/10' : 'text-slate-300 hover:text-white hover:border-white/20'"
      title="编辑者模式"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>

    <!-- Mobile route button (top-left) -->
    <button
      @click="store.showRouteView ? store.closeRouteView() : (store.sidebarOpen = true, store.openRouteList())"
      class="fixed top-3 left-3 z-30 w-9 h-9 rounded-lg bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center transition-all md:hidden"
      :class="store.showRouteView ? 'text-primary-400 border-primary-400/30 bg-primary-500/10' : 'text-slate-300 hover:text-white hover:border-white/20'"
      title="路线"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    </button>

    <!-- Sidebar toggle button -->
    <button
      @click="store.toggleSidebar()"
      class="fixed z-30 w-9 h-9 rounded-lg bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center text-slate-300 hover:text-white hover:border-white/20 transition-all top-4 max-md:hidden"
      :class="store.sidebarOpen ? 'left-[350px]' : 'left-4'"
    >
      <svg v-if="!store.sidebarOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Sidebar (overlay) -->
    <SideBar />

    <!-- Popup -->
    <MarkerPopup />

    <!-- Legend -->
    <LegendPanel />

    <!-- Create marker form -->
    <CreateMarkerForm />
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
