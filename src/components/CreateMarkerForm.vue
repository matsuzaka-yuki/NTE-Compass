<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { MARKER_TYPE_CONFIG, ALL_ITEMS } from '@/types'
import type { MarkerType } from '@/types'
import { resolveAssetUrl } from '@/config'

const store = useMarkerStore()

const markerTypes = Object.keys(MARKER_TYPE_CONFIG) as MarkerType[]

const name = ref('')
const selectedType = ref<MarkerType>('phonebooth')
const images = ref<string[]>([])
const uploading = ref(false)
const description = ref('')
const refreshTime = ref('')
const relatedQuest = ref('')
const selectedItems = ref<string[]>([])
const count = ref<number | undefined>(undefined)

const isEditing = computed(() => !!store.editingMarker)

// Uploaded paths cache (data URL → server path)
const uploadedPaths = ref<Map<string, string>>(new Map())

function handleFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  for (const file of Array.from(files)) {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX = 1920
      let { width, height } = img
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      const webpDataUrl = canvas.toDataURL('image/webp', 0.8)
      images.value = [...images.value, webpDataUrl]
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  }
  input.value = ''
}

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

// ---- drag reorder ----
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(idx: number, e: DragEvent) {
  dragIndex.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(idx: number, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = idx
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDrop(idx: number) {
  if (dragIndex.value === null || dragIndex.value === idx) {
    dragIndex.value = null
    dragOverIndex.value = null
    return
  }
  const arr = [...images.value]
  const [moved] = arr.splice(dragIndex.value, 1)
  arr.splice(idx, 0, moved)
  images.value = arr
  dragIndex.value = null
  dragOverIndex.value = null
}

async function handleSave() {
  if (!name.value.trim()) return

  if (isEditing.value) {
    // Edit mode — no position needed
    uploading.value = true
    const paths = await uploadNewImages()
    uploading.value = false

    store.updateMarker(store.editingMarker!.id, {
      name: name.value.trim(),
      type: selectedType.value,
      lat: store.editingMarker!.lat,
      lng: store.editingMarker!.lng,
      description: description.value.trim() || undefined,
      refreshTime: refreshTime.value.trim() || undefined,
      relatedQuest: relatedQuest.value.trim() || undefined,
      relatedItems: selectedItems.value.length > 0 ? selectedItems.value : undefined,
      count: count.value !== undefined ? count.value : undefined,
      images: paths.length > 0 ? paths : undefined,
    })
    resetForm()
    return
  }

  // Create mode
  if (!store.pendingMarkerPos) return

  uploading.value = true
  const paths = await uploadNewImages()
  uploading.value = false

  store.addMarker({
    name: name.value.trim(),
    type: selectedType.value,
    lat: store.pendingMarkerPos.lat,
    lng: store.pendingMarkerPos.lng,
    description: description.value.trim() || undefined,
    refreshTime: refreshTime.value.trim() || undefined,
    relatedQuest: relatedQuest.value.trim() || undefined,
    relatedItems: selectedItems.value.length > 0 ? selectedItems.value : undefined,
    count: count.value !== undefined ? count.value : undefined,
    images: paths.length > 0 ? paths : undefined,
  })

  resetForm()
  store.closeCreateMarker()
}

async function uploadNewImages(): Promise<string[]> {
  const result: string[] = []

  for (const img of images.value) {
    // Already a server path — keep as-is
    if (!img.startsWith('data:')) {
      result.push(img)
      continue
    }
    // Already uploaded in this session
    const cached = uploadedPaths.value.get(img)
    if (cached) {
      result.push(cached)
      continue
    }
    // Upload to server
    try {
      const ext = img.match(/^data:image\/(\w+);/)?.[1] || 'png'
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: img, type: selectedType.value, ext }),
      })
      const json = await res.json()
      if (json.ok && json.path) {
        result.push(json.path)
        uploadedPaths.value.set(img, json.path)
      }
    } catch { /* skip failed upload */ }
  }

  return result
}

function handleCancel() {
  resetForm()
  store.closeCreateMarker()
  store.cancelEditMarker()
}

function resetForm() {
  name.value = ''
  selectedType.value = 'phonebooth'
  images.value = []
  uploading.value = false
  description.value = ''
  refreshTime.value = ''
  relatedQuest.value = ''
  selectedItems.value = []
  count.value = undefined
}

// Pre-fill form when editing a marker
watch(() => store.editingMarker, (m) => {
  if (m) {
    name.value = m.name
    selectedType.value = m.type
    description.value = m.description || ''
    refreshTime.value = m.refreshTime || ''
    relatedQuest.value = m.relatedQuest || ''
    selectedItems.value = m.relatedItems ? [...m.relatedItems] : []
    count.value = m.count
    images.value = m.images ? [...m.images] : []
  }
})

// Reset form when a new position is opened for create
watch(() => store.pendingMarkerPos, (pos) => {
  if (pos) {
    resetForm()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="form">
      <div
        v-if="store.pendingMarkerPos || store.editingMarker"
        class="fixed inset-0 z-40 flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="handleCancel"
        ></div>

        <!-- Form card -->
        <div
          class="relative w-[420px] max-w-[92vw] max-h-[88vh] rounded-2xl bg-surface-800/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
        >
          <div class="max-h-[88vh] overflow-y-auto">
            <!-- Header -->
            <div class="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-surface-800/95 backdrop-blur-xl">
            <h2 class="text-base font-bold text-white">{{ isEditing ? '编辑标记点' : '新建标记点' }}</h2>
            <button
              @click="handleCancel"
              class="w-7 h-7 flex items-center justify-center rounded-full bg-surface-700/80 hover:bg-surface-600 text-slate-400 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-4 space-y-4">
            <!-- Coordinates display (create mode only) -->
            <div
              v-if="!isEditing && store.pendingMarkerPos"
              class="flex items-center gap-1.5 text-xs text-slate-500 bg-surface-900/50 rounded-lg px-3 py-2"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              坐标 ({{ (store.pendingMarkerPos.lat * 100).toFixed(1) }}, {{ (store.pendingMarkerPos.lng * 100).toFixed(1) }})
            </div>

            <!-- Name -->
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1.5">名称 <span class="text-red-400">*</span></label>
              <input
                v-model="name"
                type="text"
                placeholder="输入标记名称..."
                class="w-full px-3 py-2 text-sm bg-surface-900 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                @keyup.enter="handleSave"
              />
            </div>

            <!-- Type selector -->
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1.5">图标类型</label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="type in markerTypes"
                  :key="type"
                  @click="selectedType = type"
                  class="flex flex-col items-center gap-1 p-2 rounded-lg border transition-all"
                  :class="selectedType === type
                    ? 'border-current bg-white/10'
                    : 'border-white/10 hover:border-white/20 bg-surface-900/50'"
                  :style="selectedType === type ? { borderColor: MARKER_TYPE_CONFIG[type].color } : {}"
                >
                  <img
                    :src="resolveAssetUrl(MARKER_TYPE_CONFIG[type].iconUrl)"
                    :alt="MARKER_TYPE_CONFIG[type].label"
                    class="w-8 h-8 object-cover"
                  />
                  <span class="text-xs" :style="{ color: selectedType === type ? MARKER_TYPE_CONFIG[type].color : '#94a3b8' }">
                    {{ MARKER_TYPE_CONFIG[type].label }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Image upload -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-medium text-slate-400">现场图片</label>
                <span class="text-xs text-slate-500">可选，可传多张</span>
              </div>
              <!-- Image previews -->
              <div v-if="images.length > 0" class="flex flex-wrap gap-2 mb-2">
                <div
                  v-for="(img, idx) in images"
                  :key="idx"
                  draggable="true"
                  class="relative group w-16 h-16 rounded-lg overflow-hidden border cursor-grab transition-all"
                  :class="{
                    'border-white/10': dragOverIndex !== idx,
                    'border-primary-400 border-2 scale-105': dragOverIndex === idx && dragIndex !== idx,
                    'opacity-40 scale-90': dragIndex === idx,
                  }"
                  @dragstart="onDragStart(idx, $event)"
                  @dragover="onDragOver(idx, $event)"
                  @dragleave="onDragLeave"
                  @drop="onDrop(idx)"
                  @dragend="dragIndex = null; dragOverIndex = null"
                >
                  <img :src="img.startsWith('data:') ? img : resolveAssetUrl('./' + img)" class="w-full h-full object-cover pointer-events-none" />
                  <!-- Drag handle indicator -->
                  <div class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <svg class="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                    </svg>
                  </div>
                  <button
                    @click="removeImage(idx)"
                    class="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/70 text-red-400 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <!-- Upload button -->
              <label
                class="flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-white/20 hover:bg-surface-900/50 transition-colors text-xs text-slate-400"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ images.length > 0 ? '继续添加图片' : '上传图片' }}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="handleFiles"
                />
              </label>
              <p class="mt-1 text-xs text-slate-600">图片将自动压缩为 WebP 格式，最大宽度 1920px</p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1.5">描述</label>
              <textarea
                v-model="description"
                rows="3"
                placeholder="输入描述信息..."
                class="w-full px-3 py-2 text-sm bg-surface-900 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
              ></textarea>
            </div>

            <!-- Refresh time -->
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1.5">刷新时间</label>
              <input
                v-model="refreshTime"
                type="text"
                placeholder="例如：每日刷新、72小时刷新..."
                class="w-full px-3 py-2 text-sm bg-surface-900 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <!-- Related quest -->
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1.5">关联任务</label>
              <input
                v-model="relatedQuest"
                type="text"
                placeholder="输入关联任务名称..."
                class="w-full px-3 py-2 text-sm bg-surface-900 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <!-- Related items -->
            <div v-if="ALL_ITEMS.length > 0">
              <label class="block text-xs font-medium text-slate-400 mb-2">关联物品</label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="item in ALL_ITEMS"
                  :key="item.id"
                  @click="selectedItems.includes(item.id) ? selectedItems = selectedItems.filter(id => id !== item.id) : selectedItems = [...selectedItems, item.id]"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all"
                  :class="selectedItems.includes(item.id)
                    ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                    : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'"
                >
                  <img
                    v-if="item.image"
                    :src="resolveAssetUrl('./' + item.image)"
                    :alt="item.name"
                    class="w-4 h-4 rounded object-cover"
                  />
                  {{ item.name }}
                </button>
              </div>
            </div>

            <!-- Count -->
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1.5">数量</label>
              <input
                v-model.number="count"
                type="number"
                min="0"
                placeholder="留空则不显示..."
                class="w-full px-3 py-2 text-sm bg-surface-900 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

            <!-- Footer -->
            <div class="sticky bottom-0 flex gap-3 p-4 border-t border-white/10 bg-surface-800/95 backdrop-blur-xl">
            <button
              @click="handleCancel"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5 transition-all"
            >取消</button>
            <button
              @click="handleSave"
              :disabled="!name.trim() || uploading"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >{{ uploading ? '上传中...' : (isEditing ? '保存修改' : '保存标记') }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.form-enter-active,
.form-leave-active {
  transition: opacity 0.2s ease;
}
.form-enter-active > div:last-child,
.form-leave-active > div:last-child {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.form-enter-from,
.form-leave-to {
  opacity: 0;
}
.form-enter-from > div:last-child {
  transform: scale(0.9);
  opacity: 0;
}
.form-leave-to > div:last-child {
  transform: scale(0.9);
  opacity: 0;
}
</style>
