<script setup lang="ts">
import { ref } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { EDITOR_ENABLED } from '@/config'
import { useTheme, type ThemeMode } from '@/composables/useTheme'
import { IconButton, Panel, Toggle, AppIcon } from '@/components/ui'

const store = useMarkerStore()
const { mode, setThemeMode } = useTheme()
const expanded = ref(false)
const editHintVisible = ref(false)
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

const themeOptions: { value: ThemeMode; icon: 'sun' | 'moon' | 'monitor'; label: string }[] = [
  { value: 'light', icon: 'sun', label: '浅色' },
  { value: 'dark', icon: 'moon', label: '深色' },
  { value: 'system', icon: 'monitor', label: '跟随' },
]
</script>

<template>
  <div class="fixed bottom-6 right-6 z-20 select-none">
    <!-- Settings gear button -->
    <IconButton
      icon="gear"
      size="lg"
      :active="expanded"
      :title="'设置'"
      @click="expanded = !expanded"
    />

    <!-- Settings panel -->
    <Transition name="settings">
      <Panel
        v-if="expanded"
        radius="xl"
        class="absolute bottom-12 right-0 mb-2 w-56 space-y-1 p-3"
      >
        <!-- Theme switcher (segmented) -->
        <div class="mb-1 flex items-center justify-between gap-1.5">
          <span class="text-xs text-muted">主题</span>
          <div class="flex rounded-lg bg-elevated p-0.5">
            <button
              v-for="opt in themeOptions"
              :key="opt.value"
              :title="opt.label"
              class="flex h-6 w-7 items-center justify-center rounded-md transition-colors"
              :class="
                mode === opt.value
                  ? 'bg-primary-500 text-white'
                  : 'text-faint hover:text-base'
              "
              @click="setThemeMode(opt.value)"
            >
              <AppIcon :name="opt.icon" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Time toggle -->
        <div class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-elevated">
          <span class="text-xs text-muted">时间标记</span>
          <Toggle v-model="store.showMarkerTime" />
        </div>

        <!-- Weather toggle -->
        <div class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-elevated">
          <span class="text-xs text-muted">天气标记</span>
          <Toggle v-model="store.showMarkerWeather" />
        </div>

        <!-- Monster count toggle -->
        <div class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-elevated">
          <span class="text-xs text-muted">怪物数量</span>
          <Toggle v-model="store.showMarkerCount" />
        </div>

        <!-- Divider + Offline edit section (only when EDITOR_ENABLED=false) -->
        <template v-if="!EDITOR_ENABLED">
          <div class="mt-1.5 border-t border-default pt-1.5">
            <!-- Offline edit mode toggle -->
            <div class="relative">
              <div class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-elevated">
                <span class="flex items-center gap-1">
                  <span class="text-xs" :class="store.isOfflineEditMode ? 'text-green-600 dark:text-green-300' : 'text-muted'">自定义编辑</span>
                  <span
                    class="inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full bg-elevated text-[10px] text-muted leading-none transition-colors hover:bg-surface hover:text-base"
                    title="关于自定义编辑"
                    @click.stop="editHintVisible = !editHintVisible"
                  >?</span>
                </span>
                <Toggle :model-value="store.isOfflineEditMode" color="green" @update:model-value="handleToggleOfflineEdit()" />
              </div>

              <!-- Edit hint tooltip -->
              <Transition name="hint">
                <div
                  v-if="editHintVisible"
                  class="absolute left-1/2 top-full z-30 mt-1 w-60 -translate-x-1/2 rounded-lg border border-default bg-overlay p-2.5 text-[11px] leading-relaxed text-muted shadow-xl"
                >
                  <div class="flex items-start justify-between gap-2">
                    <p>自定义编辑的内容仅保存在<strong class="text-base">浏览器本地存储</strong>中。为防止缓存清空导致修改丢失，编辑后请<strong class="text-yellow-500 dark:text-yellow-300">及时导出数据</strong>备份。导出的数据也可提交给作者，整合到地图原始数据中。</p>
                    <button
                      class="shrink-0 leading-none text-faint transition-colors hover:text-base"
                      @click.stop="editHintVisible = false"
                    >✕</button>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Export / Import -->
            <button
              class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-elevated"
              @click="handleExport()"
            >
              <span class="text-xs text-muted">导出数据</span>
              <AppIcon name="download" class="h-4 w-4 text-faint" />
            </button>

            <button
              class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-elevated"
              @click="triggerImport()"
            >
              <span class="text-xs text-muted">导入数据</span>
              <AppIcon name="upload" class="h-4 w-4 text-faint" />
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
              class="py-1 text-center text-xs text-green-500 dark:text-green-400"
            >{{ importResult }}</div>
          </div>
        </template>
      </Panel>
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

.hint-enter-active,
.hint-leave-active {
  transition: all 0.15s ease;
}
.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
