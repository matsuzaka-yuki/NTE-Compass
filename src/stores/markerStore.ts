import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MarkerData, MarkerType } from '@/types'
import { ALL_MARKER_TYPES, ALL_ITEMS } from '@/types'
import markersRaw from '@/data/markers.json'
import { EDITOR_ENABLED } from '@/config'

const STORAGE_KEY = 'isekai-map-found'

function loadFound(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

function saveFound(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

let nextId = 1
function generateId(): string {
  return `user_${Date.now()}_${nextId++}`
}

export const useMarkerStore = defineStore('markers', () => {
  // ---- editor mode ----
  const isEditorMode = ref(false)
  const editableMarkers = ref<MarkerData[]>(markersRaw as MarkerData[])

  const markers = computed(() => editableMarkers.value)

  // ---- found tracking (always localStorage, both modes) ----
  const foundIds = ref<Set<string>>(loadFound())

  // ---- UI state ----
  const searchQuery = ref('')
  const selectedTypes = ref<Set<MarkerType>>(new Set(ALL_MARKER_TYPES))
  const filterMode = ref<'all' | 'unfound'>('all')
  const selectedMarkerId = ref<string | null>(null)
  const selectedMarkerScreenPos = ref<{ x: number; y: number } | null>(null)
  const sidebarOpen = ref(window.innerWidth >= 768)
  const pendingMarkerPos = ref<{ lat: number; lng: number } | null>(null)
  const editingMarkerId = ref<string | null>(null)

  const editingMarker = computed(() => {
    if (!editingMarkerId.value) return null
    return markers.value.find((m) => m.id === editingMarkerId.value) ?? null
  })

  const filteredMarkers = computed(() => {
    let list = markers.value

    if (filterMode.value === 'unfound') {
      list = list.filter((m) => !foundIds.value.has(m.id))
    }

    list = list.filter((m) => selectedTypes.value.has(m.type))

    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      list = list.filter((m) => {
        if (m.name.toLowerCase().includes(q)) return true
        if (m.relatedItems && m.relatedItems.length > 0) {
          return m.relatedItems.some((itemId) => {
            const item = ALL_ITEMS.find((i) => i.id === itemId)
            return item && item.name.toLowerCase().includes(q)
          })
        }
        return false
      })
    }

    return list
  })

  const selectedMarker = computed(() => {
    if (!selectedMarkerId.value) return null
    return markers.value.find((m) => m.id === selectedMarkerId.value) ?? null
  })

  const typeStats = computed(() => {
    const result: Record<string, { total: number; found: number }> = {}
    for (const t of ALL_MARKER_TYPES) {
      const all = markers.value.filter((m) => m.type === t)
      result[t] = {
        total: all.length,
        found: all.filter((m) => foundIds.value.has(m.id)).length,
      }
    }
    return result as Record<MarkerType, { total: number; found: number }>
  })

  // ---- found tracking ----
  function isFound(id: string): boolean {
    return foundIds.value.has(id)
  }

  function toggleFound(id: string) {
    const next = new Set(foundIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    foundIds.value = next
    saveFound(next)
  }

  function resetProgress() {
    foundIds.value = new Set()
    localStorage.removeItem(STORAGE_KEY)
  }

  // ---- filters ----
  function toggleType(type: MarkerType) {
    const next = new Set(selectedTypes.value)
    if (next.has(type)) {
      next.delete(type)
    } else {
      next.add(type)
    }
    selectedTypes.value = next
  }

  function selectAllTypes() {
    selectedTypes.value = new Set(ALL_MARKER_TYPES)
  }

  function deselectAllTypes() {
    selectedTypes.value = new Set()
  }

  function selectMarker(id: string | null) {
    selectedMarkerId.value = id
    selectedMarkerScreenPos.value = null
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  async function loadLatestMarkers() {
    if (!EDITOR_ENABLED) return
    try {
      const res = await fetch('/api/markers')
      if (res.ok) {
        editableMarkers.value = await res.json()
      }
    } catch { /* keep current if API unavailable */ }
  }

  // ---- editor mode toggle ----
  async function toggleEditorMode() {
    if (!EDITOR_ENABLED) return
    if (isEditorMode.value) {
      isEditorMode.value = false
    } else {
      await loadLatestMarkers()
      isEditorMode.value = true
    }
  }

  async function saveMarkersToFile(list: MarkerData[]) {
    if (!EDITOR_ENABLED) return
    try {
      await fetch('/api/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list),
      })
    } catch { /* silently fail for now */ }
  }

  // ---- marker CRUD (editor mode) ----
  function addMarker(data: Omit<MarkerData, 'id'>) {
    const id = generateId()
    const newMarker: MarkerData = { ...data, id }
    editableMarkers.value = [...editableMarkers.value, newMarker]
    saveMarkersToFile(editableMarkers.value)
    return newMarker
  }

  function deleteMarker(id: string) {
    const before = editableMarkers.value.length
    editableMarkers.value = editableMarkers.value.filter((m) => m.id !== id)
    if (editableMarkers.value.length !== before) {
      saveMarkersToFile(editableMarkers.value)
      if (selectedMarkerId.value === id) {
        selectedMarkerId.value = null
      }
      if (foundIds.value.has(id)) {
        const next = new Set(foundIds.value)
        next.delete(id)
        foundIds.value = next
        saveFound(next)
      }
    }
  }

  // ---- edit marker (editor mode) ----
  function startEditMarker(id: string) {
    editingMarkerId.value = id
    selectedMarkerId.value = null
  }

  function cancelEditMarker() {
    editingMarkerId.value = null
  }

  function updateMarker(id: string, data: Omit<MarkerData, 'id'>) {
    const idx = editableMarkers.value.findIndex((m) => m.id === id)
    if (idx === -1) return
    editableMarkers.value = [
      ...editableMarkers.value.slice(0, idx),
      { ...data, id },
      ...editableMarkers.value.slice(idx + 1),
    ]
    saveMarkersToFile(editableMarkers.value)
    editingMarkerId.value = null
  }

  // ---- map click ----
  function openCreateMarker(lat: number, lng: number) {
    editingMarkerId.value = null
    pendingMarkerPos.value = { lat, lng }
  }

  function closeCreateMarker() {
    pendingMarkerPos.value = null
    editingMarkerId.value = null
  }

  return {
    // state
    isEditorMode,
    markers,
    foundIds,
    searchQuery,
    selectedTypes,
    filterMode,
    selectedMarkerId,
    selectedMarkerScreenPos,
    sidebarOpen,
    pendingMarkerPos,
    editingMarkerId,
    editingMarker,
    filteredMarkers,
    selectedMarker,
    typeStats,
    // actions
    isFound,
    toggleFound,
    resetProgress,
    toggleType,
    selectAllTypes,
    deselectAllTypes,
    selectMarker,
    toggleSidebar,
    toggleEditorMode,
    loadLatestMarkers,
    addMarker,
    deleteMarker,
    startEditMarker,
    cancelEditMarker,
    updateMarker,
    openCreateMarker,
    closeCreateMarker,
  }
})
