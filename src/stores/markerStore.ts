import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MarkerData, MarkerType, LegacyMarkerData, RouteData, RouteSegment } from '@/types'
import { migrateMarker, ALL_MARKER_TYPES, ALL_ITEMS } from '@/types'
import markersRaw from '@/data/markers.json'
import routesRaw from '@/data/routes.json'
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

async function loadRoutesFromApi(): Promise<RouteData[]> {
  try {
    const res = await fetch('/api/routes')
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json)) return json
    }
  } catch { /* ignore */ }
  return []
}

async function saveRoutesToApi(routes: RouteData[]) {
  try {
    await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routes),
    })
  } catch { /* ignore */ }
}

let nextId = 1
function generateId(): string {
  return `user_${Date.now()}_${nextId++}`
}

export const useMarkerStore = defineStore('markers', () => {
  // ---- editor mode ----
  const isEditorMode = ref(false)
  const editableMarkers = ref<MarkerData[]>(
    (markersRaw as LegacyMarkerData[]).map(migrateMarker)
  )

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
  const routeMarkerFilterIds = ref<Set<string> | null>(null)

  const editingMarker = computed(() => {
    if (!editingMarkerId.value) return null
    return markers.value.find((m) => m.id === editingMarkerId.value) ?? null
  })

  const filteredMarkers = computed(() => {
    let list = markers.value

    if (filterMode.value === 'unfound') {
      list = list.filter((m) => !foundIds.value.has(m.id))
    }

    if (routeMarkerFilterIds.value) {
      list = list.filter((m) => routeMarkerFilterIds.value!.has(m.id))
    } else {
      list = list.filter((m) => m.types.some((t) => selectedTypes.value.has(t)))
    }

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
      const all = markers.value.filter((m) => m.types.includes(t))
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
        const json = await res.json()
        editableMarkers.value = (json as LegacyMarkerData[]).map(migrateMarker)
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
      const latestRoutes = await loadRoutesFromApi()
      routes.value = latestRoutes
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

  // ---- routes ----
  const routes = ref<RouteData[]>(routesRaw as RouteData[])

  // Override with API data if available (dev server)
  if (EDITOR_ENABLED) {
    loadRoutesFromApi().then(data => {
      if (data.length > 0 || routes.value.length === 0) {
        routes.value = data
      }
    })
  }
  const showRouteView = ref(false)
  const currentRouteId = ref<string | null>(null)
  const isAddingSegment = ref(false)
  const segmentTempMarkerIds = ref<string[]>([])
  const currentSegmentIndex = ref(-1)

  const currentRoute = computed(() => {
    if (!currentRouteId.value) return null
    return routes.value.find(r => r.id === currentRouteId.value) ?? null
  })

  const segmentTempMarkers = computed(() => {
    return segmentTempMarkerIds.value
      .map(id => markers.value.find(m => m.id === id))
      .filter((m): m is MarkerData => m != null)
  })

  function openRouteList() {
    showRouteView.value = true
    currentRouteId.value = null
    focusMarkerIds.value = []
  }

  function openRouteDetail(routeId: string) {
    showRouteView.value = true
    currentRouteId.value = routeId
    currentSegmentIndex.value = 0
    const route = routes.value.find(r => r.id === routeId)
    if (route && route.segments.length > 0) {
      requestFocusMarkers(route.segments[0].markerIds)
    }
  }

  function closeRouteView() {
    showRouteView.value = false
    currentRouteId.value = null
    currentSegmentIndex.value = -1
    isAddingSegment.value = false
    segmentTempMarkerIds.value = []
    routeMarkerFilterIds.value = null
    focusMarkerIds.value = []
  }

  function addRoute(name: string, image?: string) {
    const id = generateId()
    const route: RouteData = { id, name, image, segments: [] }
    routes.value = [...routes.value, route]
    saveRoutesToApi(routes.value)
    currentRouteId.value = id
    return route
  }

  function updateRoute(routeId: string, data: Partial<Pick<RouteData, 'name' | 'image'>>) {
    const idx = routes.value.findIndex(r => r.id === routeId)
    if (idx === -1) return
    const updated = { ...routes.value[idx], ...data }
    routes.value = [...routes.value.slice(0, idx), updated, ...routes.value.slice(idx + 1)]
    saveRoutesToApi(routes.value)
  }

  function updateSegment(segmentId: string, data: Partial<Pick<RouteSegment, 'name'>>) {
    if (!currentRouteId.value) return
    const routeIdx = routes.value.findIndex(r => r.id === currentRouteId.value)
    if (routeIdx === -1) return
    const route = routes.value[routeIdx]
    const updatedSegments = route.segments.map(s =>
      s.id === segmentId ? { ...s, ...data } : s
    )
    const updated = { ...route, segments: updatedSegments }
    routes.value = [...routes.value.slice(0, routeIdx), updated, ...routes.value.slice(routeIdx + 1)]
    saveRoutesToApi(routes.value)
  }

  function reorderSegments(fromIdx: number, toIdx: number) {
    if (!currentRouteId.value) return
    const routeIdx = routes.value.findIndex(r => r.id === currentRouteId.value)
    if (routeIdx === -1) return
    const route = routes.value[routeIdx]
    if (fromIdx < 0 || fromIdx >= route.segments.length) return
    if (toIdx < 0 || toIdx >= route.segments.length) return
    const segments = [...route.segments]
    const [moved] = segments.splice(fromIdx, 1)
    segments.splice(toIdx, 0, moved)
    const updated = { ...route, segments }
    routes.value = [...routes.value.slice(0, routeIdx), updated, ...routes.value.slice(routeIdx + 1)]
    saveRoutesToApi(routes.value)
  }

  function deleteRoute(routeId: string) {
    routes.value = routes.value.filter(r => r.id !== routeId)
    saveRoutesToApi(routes.value)
    if (currentRouteId.value === routeId) {
      currentRouteId.value = null
      focusMarkerIds.value = []
    }
  }

  function focusSegment(index: number) {
    const route = currentRoute.value
    if (!route) return
    if (index < 0 || index >= route.segments.length) return
    currentSegmentIndex.value = index
    requestFocusMarkers(route.segments[index].markerIds)
  }

  function focusPrevSegment() {
    const route = currentRoute.value
    if (!route) return
    const count = route.segments.length
    if (count === 0) return
    const next = (currentSegmentIndex.value - 1 + count) % count
    focusSegment(next)
  }

  function focusNextSegment() {
    const route = currentRoute.value
    if (!route) return
    const count = route.segments.length
    if (count === 0) return
    const next = (currentSegmentIndex.value + 1) % count
    focusSegment(next)
  }

  function startAddSegment() {
    isAddingSegment.value = true
    segmentTempMarkerIds.value = []
  }

  function addTempMarker(markerId: string) {
    if (!isAddingSegment.value) return
    if (segmentTempMarkerIds.value.includes(markerId)) return
    segmentTempMarkerIds.value = [...segmentTempMarkerIds.value, markerId]
  }

  function removeLastTempMarker() {
    segmentTempMarkerIds.value = segmentTempMarkerIds.value.slice(0, -1)
  }

  function cancelAddSegment() {
    isAddingSegment.value = false
    segmentTempMarkerIds.value = []
  }

  function finishAddSegment(name: string) {
    if (!currentRouteId.value || segmentTempMarkerIds.value.length < 2) return
    const route = routes.value.find(r => r.id === currentRouteId.value)
    if (!route) return
    const segment: RouteSegment = {
      id: generateId(),
      name,
      markerIds: [...segmentTempMarkerIds.value],
    }
    const updated = { ...route, segments: [...route.segments, segment] }
    const idx = routes.value.findIndex(r => r.id === currentRouteId.value)
    if (idx === -1) return
    routes.value = [...routes.value.slice(0, idx), updated, ...routes.value.slice(idx + 1)]
    saveRoutesToApi(routes.value)
    isAddingSegment.value = false
    segmentTempMarkerIds.value = []
  }

  function deleteSegment(segmentId: string) {
    if (!currentRouteId.value) return
    const route = routes.value.find(r => r.id === currentRouteId.value)
    if (!route) return
    const updated = { ...route, segments: route.segments.filter(s => s.id !== segmentId) }
    const idx = routes.value.findIndex(r => r.id === currentRouteId.value)
    if (idx === -1) return
    routes.value = [...routes.value.slice(0, idx), updated, ...routes.value.slice(idx + 1)]
    saveRoutesToApi(routes.value)
  }

  function getMarkerById(id: string): MarkerData | undefined {
    return markers.value.find(m => m.id === id)
  }

  // ---- map focus ----
  const focusMarkerIds = ref<string[]>([])

  function requestFocusMarkers(ids: string[]) {
    focusMarkerIds.value = [...ids]
  }

  function setRouteMarkerFilter(ids: string[] | null) {
    routeMarkerFilterIds.value = ids ? new Set(ids) : null
  }

  function clearRouteMarkerFilter() {
    routeMarkerFilterIds.value = null
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
    // routes
    routes,
    showRouteView,
    currentRouteId,
    currentRoute,
    currentSegmentIndex,
    isAddingSegment,
    segmentTempMarkerIds,
    segmentTempMarkers,
    openRouteList,
    openRouteDetail,
    closeRouteView,
    addRoute,
    updateRoute,
    updateSegment,
    reorderSegments,
    deleteRoute,
    focusSegment,
    focusPrevSegment,
    focusNextSegment,
    startAddSegment,
    addTempMarker,
    removeLastTempMarker,
    cancelAddSegment,
    finishAddSegment,
    deleteSegment,
    getMarkerById,
    // map focus
    focusMarkerIds,
    requestFocusMarkers,
    // route marker filter
    routeMarkerFilterIds,
    setRouteMarkerFilter,
    clearRouteMarkerFilter,
  }
})
