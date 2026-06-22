import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MarkerData, MarkerType, LegacyMarkerData, RouteData, RouteSegment } from '@/types'
import { migrateMarker, ALL_MARKER_TYPES, ALL_ITEMS } from '@/types'
import markersRaw from '@/data/markers.json'
import routesRaw from '@/data/routes.json'
import { EDITOR_ENABLED } from '@/config'
import { encodeProgress, decodeProgress } from '@/composables/useShareCode'

const STORAGE_KEY = 'isekai-map-found'
const OFFLINE_MARKERS_KEY = 'isekai-map-offline-markers'
const OFFLINE_ROUTES_KEY = 'isekai-map-offline-routes'

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

function loadOfflineMarkers(): MarkerData[] {
  try {
    const raw = localStorage.getItem(OFFLINE_MARKERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveOfflineMarkers(list: MarkerData[]) {
  localStorage.setItem(OFFLINE_MARKERS_KEY, JSON.stringify(list))
}

function loadOfflineRoutes(): RouteData[] {
  try {
    const raw = localStorage.getItem(OFFLINE_ROUTES_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveOfflineRoutes(list: RouteData[]) {
  localStorage.setItem(OFFLINE_ROUTES_KEY, JSON.stringify(list))
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

function getBuiltinMarkers(): MarkerData[] {
  return (markersRaw as LegacyMarkerData[]).map(migrateMarker)
}

function getBuiltinRoutes(): RouteData[] {
  return routesRaw as RouteData[]
}

export const useMarkerStore = defineStore('markers', () => {
  // ---- editor mode ----
  const isEditorMode = ref(false)
  const isOfflineEditMode = ref(false)
  const isAnyEditMode = computed(() => isEditorMode.value || isOfflineEditMode.value)

  // ---- data initialization (for EDITOR_ENABLED=false) ----
  const needsDataSourceChoice = ref(false)
  const dataInitialized = ref(false)

  const editableMarkers = ref<MarkerData[]>(getBuiltinMarkers())

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

  /** 生成进度分享码 */
  function shareProgress(): string {
    return encodeProgress(foundIds.value, markers.value)
  }

  /** 从分享码导入进度。返回导入的标记数，-1 表示失败。 */
  function importProgress(code: string): number {
    const decoded = decodeProgress(code, markers.value)
    if (!decoded) return -1
    foundIds.value = decoded
    saveFound(decoded)
    return decoded.size
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
    try {
      const res = await fetch('/api/markers')
      if (res.ok) {
        const json = await res.json()
        editableMarkers.value = (json as LegacyMarkerData[]).map(migrateMarker)
      }
    } catch { /* keep current if API unavailable */ }
  }

  function isLocalStorageIdenticalToBuiltin(): boolean {
    const builtinMarkers = getBuiltinMarkers()
    const builtinRoutes = getBuiltinRoutes()
    const storedMarkers = loadOfflineMarkers()
    const storedRoutes = loadOfflineRoutes()
    return (
      JSON.stringify(builtinMarkers) === JSON.stringify(storedMarkers) &&
      JSON.stringify(builtinRoutes) === JSON.stringify(storedRoutes)
    )
  }

  // ---- data initialization ----
  function initData() {
    if (EDITOR_ENABLED) {
      // Load from built-in JSON (already set as default), then try API for latest
      dataInitialized.value = true
      loadLatestMarkers()
      loadRoutesFromApi().then(data => {
        if (data.length > 0) routes.value = data
      })
      checkDataVersion()
      return
    }

    // EDITOR_ENABLED = false: check localStorage
    const storedMarkers = loadOfflineMarkers()
    const storedRoutes = loadOfflineRoutes()
    checkDataVersion()

    if (storedMarkers.length > 0 || storedRoutes.length > 0) {
      // If localStorage data is identical to built-in JSON, skip the choice dialog
      if (isLocalStorageIdenticalToBuiltin()) {
        editableMarkers.value = storedMarkers
        routes.value = storedRoutes
        dataInitialized.value = true
      } else {
        // Has different localStorage data: ask user which to use
        needsDataSourceChoice.value = true
      }
    } else {
      // No localStorage data: seed from built-in JSON
      seedFromBuiltin()
      dataInitialized.value = true
    }
  }

  function seedFromBuiltin() {
    const builtinMarkers = getBuiltinMarkers()
    const builtinRoutes = getBuiltinRoutes()
    editableMarkers.value = builtinMarkers
    routes.value = builtinRoutes
    saveOfflineMarkers(builtinMarkers)
    saveOfflineRoutes(builtinRoutes)
  }

  /**
   * Compare built-in marker count against last-seen count in localStorage.
   * If different (data updated since last visit), set a flag for the UI to
   * show a "new markers available" toast.
   */
  const VERSION_KEY = 'isekai-map-data-version'
  const newMarkerCount = ref(0)

  function checkDataVersion() {
    const builtin = getBuiltinMarkers()
    const current = builtin.length
    const last = parseInt(localStorage.getItem(VERSION_KEY) || '0', 10)
    if (last > 0 && current > last) {
      newMarkerCount.value = current - last
    }
    localStorage.setItem(VERSION_KEY, String(current))
  }

  function chooseDataSource(choice: 'builtin' | 'localstorage') {
    if (choice === 'builtin') {
      // Use built-in data, overwrite localStorage
      seedFromBuiltin()
    } else {
      // Use localStorage data
      const storedMarkers = loadOfflineMarkers()
      const storedRoutes = loadOfflineRoutes()
      if (storedMarkers.length > 0) {
        editableMarkers.value = storedMarkers
      }
      if (storedRoutes.length > 0) {
        routes.value = storedRoutes
      }
      // Ensure localStorage is up to date
      saveOfflineMarkers(editableMarkers.value)
      saveOfflineRoutes(routes.value)
    }
    needsDataSourceChoice.value = false
    dataInitialized.value = true
  }

  // ---- editor mode toggle ----
  async function toggleEditorMode() {
    if (!EDITOR_ENABLED) return
    if (isEditorMode.value) {
      isEditorMode.value = false
    } else {
      // If offline mode is active, exit it first
      if (isOfflineEditMode.value) {
        isOfflineEditMode.value = false
      }
      await loadLatestMarkers()
      const latestRoutes = await loadRoutesFromApi()
      if (latestRoutes.length > 0) routes.value = latestRoutes
      isEditorMode.value = true
    }
  }

  // ---- offline edit mode toggle ----
  function toggleOfflineEditMode() {
    if (isOfflineEditMode.value) {
      // Exiting offline mode
      isOfflineEditMode.value = false
      if (EDITOR_ENABLED) {
        // Restore from built-in data, then try API
        editableMarkers.value = getBuiltinMarkers()
        routes.value = getBuiltinRoutes()
        loadLatestMarkers()
        loadRoutesFromApi().then(data => {
          if (data.length > 0) routes.value = data
        })
      } else {
        // EDITOR_ENABLED = false: reload from localStorage (may have been modified)
        const markers = loadOfflineMarkers()
        const routeData = loadOfflineRoutes()
        if (markers.length > 0) editableMarkers.value = markers
        if (routeData.length > 0) routes.value = routeData
      }
    } else {
      // Entering offline mode
      if (EDITOR_ENABLED) {
        // Switch to localStorage-based editing
        const builtinMarkers = getBuiltinMarkers()
        const builtinRoutes = getBuiltinRoutes()

        const offlineMarkers = loadOfflineMarkers()
        if (offlineMarkers.length > 0) {
          editableMarkers.value = offlineMarkers
        } else {
          editableMarkers.value = builtinMarkers
          saveOfflineMarkers(builtinMarkers)
        }

        const offlineRoutes = loadOfflineRoutes()
        if (offlineRoutes.length > 0) {
          routes.value = offlineRoutes
        } else {
          routes.value = builtinRoutes
          saveOfflineRoutes(builtinRoutes)
        }
      }
      // When EDITOR_ENABLED = false: data is already in localStorage, no switch needed

      isOfflineEditMode.value = true
      isEditorMode.value = false
    }
  }

  // ---- unified route persistence ----
  function persistRouteData() {
    if (!EDITOR_ENABLED || isOfflineEditMode.value) {
      saveOfflineRoutes(routes.value)
    }
    if (EDITOR_ENABLED) {
      saveRoutesToApi(routes.value)
    }
  }

  // ---- data export/import ----
  function exportData() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      markers: editableMarkers.value,
      routes: routes.value,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `map-data-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function importData(jsonString: string): { markers: number; routes: number } | { error: string } {
    try {
      const data = JSON.parse(jsonString)
      if (!data.markers || !Array.isArray(data.markers)) {
        return { error: '无效的数据格式：缺少 markers 字段' }
      }
      if (!data.routes || !Array.isArray(data.routes)) {
        return { error: '无效的数据格式：缺少 routes 字段' }
      }
      const importedMarkers = (data.markers as LegacyMarkerData[]).map(migrateMarker)
      const importedRoutes = data.routes as RouteData[]

      // When EDITOR_ENABLED=false, everything targets localStorage
      // When EDITOR_ENABLED=true, offline mode targets localStorage, normal mode merges into API
      const targetLocalStorage = !EDITOR_ENABLED || isOfflineEditMode.value

      if (targetLocalStorage) {
        // Replace current data with imported data
        editableMarkers.value = importedMarkers
        routes.value = importedRoutes
        saveOfflineMarkers(importedMarkers)
        saveOfflineRoutes(importedRoutes)
      } else {
        // Editor mode with API: merge into current data
        const existingIds = new Set(editableMarkers.value.map(m => m.id))
        const newMarkers = importedMarkers.filter(m => !existingIds.has(m.id))
        editableMarkers.value = [...editableMarkers.value, ...newMarkers]
        saveMarkersToFile(editableMarkers.value)

        const existingRouteIds = new Set(routes.value.map(r => r.id))
        const newRoutes = importedRoutes.filter(r => !existingRouteIds.has(r.id))
        routes.value = [...routes.value, ...newRoutes]
        persistRouteData()
      }

      return { markers: importedMarkers.length, routes: importedRoutes.length }
    } catch {
      return { error: 'JSON 解析失败，请检查文件格式' }
    }
  }

  async function saveMarkersToFile(list: MarkerData[]) {
    // When EDITOR_ENABLED=false, always save to localStorage
    // When EDITOR_ENABLED=true, save to API (or localStorage if in offline mode)
    if (!EDITOR_ENABLED || isOfflineEditMode.value) {
      saveOfflineMarkers(list)
      if (!EDITOR_ENABLED) return
    }
    try {
      await fetch('/api/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list),
      })
    } catch { /* silently fail for now */ }
  }

  // ---- marker CRUD ----
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

  function openCreateMarker(lat: number, lng: number) {
    editingMarkerId.value = null
    pendingMarkerPos.value = { lat, lng }
  }

  function closeCreateMarker() {
    pendingMarkerPos.value = null
    editingMarkerId.value = null
  }

  // ---- routes ----
  const routes = ref<RouteData[]>(getBuiltinRoutes())

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
    currentSegmentIndex.value = -1
    focusMarkerIds.value = []
  }

  function closeRouteView() {
    showRouteView.value = false
    currentRouteId.value = null
    currentSegmentIndex.value = -1
    isAddingSegment.value = false
    segmentTempMarkerIds.value = []
    routeMarkerFilterIds.value = null
    focusMarkerIds.value = []
    stopFarmingMode()
  }

  function addRoute(name: string, image?: string) {
    const id = generateId()
    const route: RouteData = { id, name, image, segments: [] }
    routes.value = [...routes.value, route]
    persistRouteData()
    currentRouteId.value = id
    return route
  }

  function updateRoute(routeId: string, data: Partial<Pick<RouteData, 'name' | 'image'>>) {
    const idx = routes.value.findIndex(r => r.id === routeId)
    if (idx === -1) return
    const updated = { ...routes.value[idx], ...data }
    routes.value = [...routes.value.slice(0, idx), updated, ...routes.value.slice(idx + 1)]
    persistRouteData()
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
    persistRouteData()
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
    persistRouteData()
  }

  function deleteRoute(routeId: string) {
    routes.value = routes.value.filter(r => r.id !== routeId)
    persistRouteData()
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
    stopFarmingMode()
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
    persistRouteData()
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
    persistRouteData()
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

  // ---- display settings ----
  const showMarkerTime = ref(true)
  const showMarkerWeather = ref(true)
  const showMarkerCount = ref(true)

  // ---- farming mode ----
  const farmingMode = ref(false)
  const farmingPairIndex = ref(0)
  const farmingHighlightId = ref<string | null>(null)

  const farmingCanGoPrev = computed(() => {
    return farmingMode.value && farmingPairIndex.value > 0
  })

  const farmingCanGoNext = computed(() => {
    if (!farmingMode.value || !currentRoute.value || currentSegmentIndex.value < 0) return false
    const seg = currentRoute.value.segments[currentSegmentIndex.value]
    if (!seg) return false
    return farmingPairIndex.value < seg.markerIds.length - 2
  })

  function startFarmingMode() {
    if (!currentRoute.value || currentSegmentIndex.value < 0) return
    const seg = currentRoute.value.segments[currentSegmentIndex.value]
    if (seg.markerIds.length < 2) return
    farmingMode.value = true
    farmingPairIndex.value = 0
    farmingHighlightId.value = seg.markerIds[1]
    if (window.innerWidth < 768) {
      sidebarOpen.value = false
    }
    requestFocusMarkers([seg.markerIds[0], seg.markerIds[1]])
    selectMarker(seg.markerIds[1])
  }

  function stopFarmingMode() {
    farmingMode.value = false
    farmingPairIndex.value = 0
    farmingHighlightId.value = null
  }

  function farmingNextPair() {
    if (!farmingCanGoNext.value) return
    farmingPairIndex.value++
    const i = farmingPairIndex.value
    if (!currentRoute.value || currentSegmentIndex.value < 0) return
    const seg = currentRoute.value.segments[currentSegmentIndex.value]
    farmingHighlightId.value = seg.markerIds[i + 1]
    requestFocusMarkers([seg.markerIds[i], seg.markerIds[i + 1]])
    selectMarker(seg.markerIds[i + 1])
  }

  function farmingPrevPair() {
    if (!farmingCanGoPrev.value) return
    farmingPairIndex.value--
    const i = farmingPairIndex.value
    if (!currentRoute.value || currentSegmentIndex.value < 0) return
    const seg = currentRoute.value.segments[currentSegmentIndex.value]
    farmingHighlightId.value = seg.markerIds[i + 1]
    requestFocusMarkers([seg.markerIds[i], seg.markerIds[i + 1]])
    selectMarker(seg.markerIds[i + 1])
  }

  return {
    // state
    isEditorMode,
    isOfflineEditMode,
    isAnyEditMode,
    needsDataSourceChoice,
    dataInitialized,
    newMarkerCount,
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
    shareProgress,
    importProgress,
    toggleType,
    selectAllTypes,
    deselectAllTypes,
    selectMarker,
    toggleSidebar,
    initData,
    chooseDataSource,
    toggleEditorMode,
    toggleOfflineEditMode,
    exportData,
    importData,
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
    // display settings
    showMarkerTime,
    showMarkerWeather,
    showMarkerCount,
    // farming mode
    farmingMode,
    farmingPairIndex,
    farmingHighlightId,
    farmingCanGoPrev,
    farmingCanGoNext,
    startFarmingMode,
    stopFarmingMode,
    farmingNextPair,
    farmingPrevPair,
  }
})
