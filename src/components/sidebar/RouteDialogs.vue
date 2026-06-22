<script setup lang="ts">
/**
 * Route & segment create/edit dialogs, extracted from SideBar.vue.
 * All state comes from the shared `useRouteDialogs()` composable so SideBar
 * can open dialogs (openCreateRouteDialog etc.) and this component renders them.
 */
import { useRouteDialogs } from '@/composables/useRouteDialogs'
import { useMarkerStore } from '@/stores/markerStore'

const store = useMarkerStore()
const d = useRouteDialogs()

// expose to template via the `d` object; also need openXxx for SideBar to call
defineExpose(d)

function getMarkerName(id: string): string {
  return store.getMarkerById(id)?.name ?? id
}
</script>

<template>
  <!-- Create route dialog -->
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="d.showCreateRouteDialog.value"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="d.showCreateRouteDialog.value = false"
      >
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-5 w-[380px] max-w-[92vw] max-h-[85vh] flex flex-col">
          <h3 class="text-sm font-medium text-base mb-4">创建路线</h3>
          <div class="mb-3">
            <label class="block text-xs text-muted mb-1.5">路线名称</label>
            <input
              v-model="d.newRouteName.value"
              type="text"
              placeholder="输入路线名称"
              class="w-full px-3 py-2 text-sm bg-elevated border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
              @keydown.enter="d.confirmCreateRoute()"
            />
          </div>
          <div class="flex-1 min-h-0 mb-4">
            <label class="block text-xs text-muted mb-1.5">选择路线图片</label>
            <div v-if="d.routeImageOptions.value.length > 0" class="grid grid-cols-5 gap-2 max-h-[240px] overflow-y-auto">
              <div
                v-for="(img, idx) in d.routeImageOptions.value"
                :key="idx"
                class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors bg-elevated"
                :class="d.newRouteImage.value === img.url ? 'border-primary-500' : 'border-transparent hover:border-border-strong'"
                :title="img.label"
                @click="d.newRouteImage.value = img.url"
              >
                <img :src="img.url" class="w-full h-full object-cover" />
              </div>
            </div>
            <div v-else class="text-xs text-faint py-4 text-center">暂无可用图片</div>
          </div>
          <div class="flex gap-3 flex-shrink-0">
            <button
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-elevated text-muted hover:bg-surface transition-colors"
              @click="d.showCreateRouteDialog.value = false"
            >取消</button>
            <button
              :disabled="!d.newRouteName.value.trim()"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              @click="d.confirmCreateRoute()"
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
        v-if="d.showCreateSegmentDialog.value"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="d.showCreateSegmentDialog.value = false"
      >
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-5 w-[380px] max-w-[92vw] max-h-[85vh] flex flex-col">
          <h3 class="text-sm font-medium text-base mb-4">新建路段</h3>
          <div class="mb-3">
            <label class="block text-xs text-muted mb-1.5">路段名称</label>
            <input
              v-model="d.newSegmentName.value"
              type="text"
              placeholder="输入路段名称"
              class="w-full px-3 py-2 text-sm bg-elevated border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
              @keydown.enter="d.confirmCreateSegment()"
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
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-elevated text-muted hover:bg-surface transition-colors"
              @click="d.showCreateSegmentDialog.value = false"
            >取消</button>
            <button
              :disabled="!d.newSegmentName.value.trim() || store.segmentTempMarkerIds.length < 2"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              @click="d.confirmCreateSegment()"
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
        v-if="d.showEditRouteDialog.value"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="d.showEditRouteDialog.value = false"
      >
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-5 w-[380px] max-w-[92vw] max-h-[85vh] flex flex-col">
          <h3 class="text-sm font-medium text-base mb-4">编辑路线</h3>
          <div class="mb-3">
            <label class="block text-xs text-muted mb-1.5">路线名称</label>
            <input
              v-model="d.editRouteName.value"
              type="text"
              placeholder="输入路线名称"
              class="w-full px-3 py-2 text-sm bg-elevated border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
              @keydown.enter="d.confirmEditRoute()"
            />
          </div>
          <div class="flex-1 min-h-0 mb-4">
            <label class="block text-xs text-muted mb-1.5">选择路线图片</label>
            <div v-if="d.routeImageOptions.value.length > 0" class="grid grid-cols-5 gap-2 max-h-[240px] overflow-y-auto">
              <div
                v-for="(img, idx) in d.routeImageOptions.value"
                :key="idx"
                class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors bg-elevated"
                :class="d.editRouteImage.value === img.url ? 'border-primary-500' : 'border-transparent hover:border-border-strong'"
                :title="img.label"
                @click="d.editRouteImage.value = img.url"
              >
                <img :src="img.url" class="w-full h-full object-cover" />
              </div>
            </div>
            <div v-else class="text-xs text-faint py-4 text-center">暂无可用图片</div>
          </div>
          <div class="flex gap-3 flex-shrink-0">
            <button
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-elevated text-muted hover:bg-surface transition-colors"
              @click="d.showEditRouteDialog.value = false"
            >取消</button>
            <button
              :disabled="!d.editRouteName.value.trim()"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              @click="d.confirmEditRoute()"
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
        v-if="d.showEditSegmentDialog.value"
        class="fixed inset-0 z-[100] flex items-center justify-center"
        @click.self="d.showEditSegmentDialog.value = false"
      >
        <div class="absolute inset-0 bg-black/60"></div>
        <div class="relative bg-elevated border border-default rounded-2xl shadow-2xl p-5 w-[320px] max-w-[92vw]">
          <h3 class="text-sm font-medium text-base mb-4">编辑路段</h3>
          <div class="mb-4">
            <label class="block text-xs text-muted mb-1.5">路段名称</label>
            <input
              v-model="d.editSegmentName.value"
              type="text"
              placeholder="输入路段名称"
              class="w-full px-3 py-2 text-sm bg-elevated border border-default rounded-lg text-base placeholder:text-faint focus:outline-none focus:border-primary-500 transition-colors"
              @keydown.enter="d.confirmEditSegment()"
            />
          </div>
          <div class="flex gap-3">
            <button
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-elevated text-muted hover:bg-surface transition-colors"
              @click="d.showEditSegmentDialog.value = false"
            >取消</button>
            <button
              :disabled="!d.editSegmentName.value.trim()"
              class="flex-1 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              @click="d.confirmEditSegment()"
            >保存</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

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
