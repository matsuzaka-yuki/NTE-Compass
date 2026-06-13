<script setup lang="ts">
import { ref } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { EDITOR_ENABLED } from '@/config'

const store = useMarkerStore()
const expanded = ref(false)
const importResult = ref('')
let importResultTimer: ReturnType<typeof setTimeout> | null = null
const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const result = store.importData(reader.result as string)
    if ('error' in result) {
      importResult.value = result.error
    } else {
      importResult.value = `导入成功：${result.markers} 个标点，${result.routes} 条路线`
    }
    if (importResultTimer) clearTimeout(importResultTimer)
    importResultTimer = setTimeout(() => {
      importResult.value = ''
    }, 3000)
  }
  reader.readAsText(file)
  input.value = ''
}

function handleExport() {
  store.exportData()
  importResult.value = '导出成功'
  if (importResultTimer) clearTimeout(importResultTimer)
  importResultTimer = setTimeout(() => {
    importResult.value = ''
  }, 2000)
}

async function handleToggleOfflineEdit() {
  store.toggleOfflineEditMode()
}
</script>

<template>
  <div class="fixed bottom-6 right-6 z-20 select-none">
    <!-- Settings gear button -->
    <button
      @click="expanded = !expanded"
      class="w-10 h-10 rounded-xl bg-surface-800/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center text-slate-300 hover:text-white hover:border-white/20 transition-all"
      :class="{ 'text-primary-400 border-primary-400/30 bg-primary-500/10': expanded }"
      title="设置"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
      </svg>
    </button>

    <!-- Settings panel -->
    <Transition name="settings">
      <div
        v-if="expanded"
        class="absolute bottom-12 right-0 mb-2 w-52 rounded-xl bg-surface-800/95 backdrop-blur-xl border border-white/10 shadow-2xl p-3 space-y-1.5"
      >
        <!-- Time toggle -->
        <button
          @click="store.showMarkerTime = !store.showMarkerTime"
          class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <span class="text-xs text-slate-300">时间标记</span>
          <span class="relative inline-flex w-8 h-5 rounded-full transition-colors" :class="store.showMarkerTime ? 'bg-primary-500' : 'bg-slate-600'">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" :class="store.showMarkerTime ? 'left-[14px]' : 'left-0.5'" />
          </span>
        </button>

        <!-- Weather toggle -->
        <button
          @click="store.showMarkerWeather = !store.showMarkerWeather"
          class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <span class="text-xs text-slate-300">天气标记</span>
          <span class="relative inline-flex w-8 h-5 rounded-full transition-colors" :class="store.showMarkerWeather ? 'bg-primary-500' : 'bg-slate-600'">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" :class="store.showMarkerWeather ? 'left-[14px]' : 'left-0.5'" />
          </span>
        </button>

        <!-- Monster count toggle -->
        <button
          @click="store.showMarkerCount = !store.showMarkerCount"
          class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <span class="text-xs text-slate-300">怪物数量</span>
          <span class="relative inline-flex w-8 h-5 rounded-full transition-colors" :class="store.showMarkerCount ? 'bg-primary-500' : 'bg-slate-600'">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" :class="store.showMarkerCount ? 'left-[14px]' : 'left-0.5'" />
          </span>
        </button>

        <!-- Divider + Offline edit section (only when EDITOR_ENABLED=false) -->
        <template v-if="!EDITOR_ENABLED">
        <div class="border-t border-white/10 pt-1.5 mt-1.5">
          <!-- Offline edit mode toggle -->
          <button
            @click="handleToggleOfflineEdit()"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span class="text-xs" :class="store.isOfflineEditMode ? 'text-green-300' : 'text-slate-300'">自定义编辑</span>
            <span class="relative inline-flex w-8 h-5 rounded-full transition-colors" :class="store.isOfflineEditMode ? 'bg-green-500' : 'bg-slate-600'">
              <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" :class="store.isOfflineEditMode ? 'left-[14px]' : 'left-0.5'" />
            </span>
          </button>

          <!-- Export / Import -->
          <button
            @click="handleExport()"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span class="text-xs text-slate-300">导出数据</span>
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          <button
            @click="triggerImport()"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span class="text-xs text-slate-300">导入数据</span>
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </button>

          <input
            ref="fileInput"
            type="file"
            accept=".json"
            class="hidden"
            @change="handleImport"
          />

          <!-- Import/export result toast -->
          <div
            v-if="importResult"
            class="text-xs text-green-400 text-center py-1"
          >{{ importResult }}</div>
        </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.settings-enter-active,
.settings-leave-active {
  transition: all 0.2s ease;
}
.settings-enter-from,
.settings-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}
</style>
