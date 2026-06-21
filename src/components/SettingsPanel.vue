<script setup lang="ts">
import { ref } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { EDITOR_ENABLED } from '@/config'
import { useTheme, type ThemeMode } from '@/composables/useTheme'
import { useGuide } from '@/composables/useGuide'
import { IconButton, Panel, Toggle, AppIcon, Dialog } from '@/components/ui'

const store = useMarkerStore()
const { mode, setThemeMode } = useTheme()
const { openGuide } = useGuide()
const expanded = ref(false)
const editHintVisible = ref(false)
const importResult = ref('')
let importResultTimer: ReturnType<typeof setTimeout> | null = null
const fileInput = ref<HTMLInputElement | null>(null)
const aboutOpen = ref(false)

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
  <div class="fixed bottom-6 right-6 z-40 select-none">
    <!-- Settings gear button -->
    <IconButton
      icon="gear"
      size="lg"
      :active="expanded"
      :title="'设置'"
      @click="expanded = !expanded"
    />

    <!-- Click-away backdrop (teleported so it covers the full viewport).
         z-20 sits below this container (z-40) so the panel stays clickable. -->
    <Teleport to="body">
      <div
        v-if="expanded"
        class="fixed inset-0 z-20"
        @click="expanded = false"
      />
    </Teleport>

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

        <!-- Guide + About (always visible, bottom) -->
        <div class="mt-1.5 border-t border-default pt-1.5">
          <button
            class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-elevated"
            @click="openGuide(); expanded = false"
          >
            <span class="text-xs text-muted">新手指南</span>
            <AppIcon name="book" class="h-4 w-4 text-faint" />
          </button>
          <button
            class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-elevated"
            @click="aboutOpen = true; expanded = false"
          >
            <span class="text-xs text-muted">关于</span>
            <AppIcon name="info" class="h-4 w-4 text-faint" />
          </button>
        </div>
      </Panel>
    </Transition>

    <!-- About dialog -->
    <Dialog :open="aboutOpen" title="NTE · 夜巡" width="380px" @close="aboutOpen = false">
      <div class="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          <strong class="text-base">NTE · 夜巡</strong>是一个为游戏《异环》设计的交互式 Web 地图，帮助玩家快速定位传送点、收集品、任务、打卡点与圣地巡礼地点。
        </p>
        <div class="space-y-1.5 rounded-lg border border-default bg-elevated/50 p-3 text-xs">
          <div class="flex justify-between">
            <span class="text-faint">作者</span>
            <span class="text-base">松坂有希</span>
          </div>
          <div class="flex justify-between">
            <span class="text-faint">Bilibili</span>
            <span class="text-base">@松坂有希</span>
          </div>
          <div class="flex justify-between">
            <span class="text-faint">开源协议</span>
            <span class="text-base">MIT</span>
          </div>
          <div class="flex justify-between">
            <span class="text-faint">技术栈</span>
            <span class="text-base">Vue 3 · Leaflet · Tailwind v4</span>
          </div>
        </div>
        <p class="text-xs text-faint">
          异环游戏相关的所有素材均为 Perfect World / Hotta Studio 所有，合理使用仅为提供信息参考，与游戏官方无关。标记数据由社区贡献维护，坐标可能存在偏差，请以游戏内实际情况为准。本项目基于 Horizony14 的原项目（MIT 协议）开发。
        </p>
        <div class="flex gap-2 pt-1">
          <a
            href="https://github.com/matsuzaka-yuki/NTE-Compass"
            target="_blank"
            rel="noopener"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-default py-2 text-xs font-medium text-muted transition-colors hover:bg-elevated hover:text-base"
          >
            <AppIcon name="externalLink" class="h-3.5 w-3.5" />
            GitHub
          </a>
          <button
            class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-500"
            @click="aboutOpen = false"
          >
            关闭
          </button>
        </div>
      </div>
    </Dialog>
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
