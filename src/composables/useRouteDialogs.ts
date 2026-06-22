/**
 * Route & segment dialog state and handlers, extracted from SideBar.vue.
 *
 * All dialog visibility refs + form fields + open/confirm functions live here.
 * SideBar calls `openCreateRouteDialog()` etc. via template events; the
 * RouteDialogs component reads these refs to render the dialogs.
 */
import { ref, computed } from 'vue'
import { useMarkerStore } from '@/stores/markerStore'
import { MARKER_TYPE_CONFIG, ALL_MARKER_TYPES, ALL_ITEMS, getIconUrl } from '@/types'
import { resolveAssetUrl } from '@/config'

export function useRouteDialogs() {
  const store = useMarkerStore()

  // ---- Create route ----
  const showCreateRouteDialog = ref(false)
  const newRouteName = ref('')
  const newRouteImage = ref('')

  // ---- Create segment ----
  const showCreateSegmentDialog = ref(false)
  const newSegmentName = ref('')

  // ---- Edit route ----
  const showEditRouteDialog = ref(false)
  const editRouteName = ref('')
  const editRouteImage = ref('')

  // ---- Edit segment ----
  const showEditSegmentDialog = ref(false)
  const editSegmentName = ref('')
  const editingSegmentId = ref<string | null>(null)

  // ---- Image picker options ----
  const routeImageOptions = computed(() => {
    const images: { url: string; label: string }[] = []
    const seen = new Set<string>()
    for (const type of ALL_MARKER_TYPES) {
      const cfg = MARKER_TYPE_CONFIG[type]
      const url = getIconUrl(type)
      if (!seen.has(url)) { seen.add(url); images.push({ url, label: cfg.label }) }
    }
    for (const item of ALL_ITEMS) {
      if (item.image && !seen.has(item.image)) {
        seen.add(item.image)
        images.push({ url: resolveAssetUrl(item.image), label: item.name })
      }
    }
    for (const m of store.markers) {
      const img = m.images?.[0] || m.image
      if (img && !seen.has(img)) {
        seen.add(img)
        const url = img.startsWith('data:') ? img : resolveAssetUrl('./' + img)
        images.push({ url, label: m.name })
      }
    }
    return images
  })

  function openCreateRouteDialog() {
    newRouteName.value = ''
    newRouteImage.value = routeImageOptions.value[0]?.url ?? ''
    showCreateRouteDialog.value = true
  }
  function confirmCreateRoute() {
    const name = newRouteName.value.trim()
    if (!name) return
    store.addRoute(name, newRouteImage.value || undefined)
    showCreateRouteDialog.value = false
  }
  function openCreateSegmentDialog() {
    newSegmentName.value = ''
    showCreateSegmentDialog.value = true
  }
  function confirmCreateSegment() {
    const name = newSegmentName.value.trim()
    if (!name) return
    store.finishAddSegment(name)
    showCreateSegmentDialog.value = false
  }
  function openEditRouteDialog() {
    if (!store.currentRoute) return
    editRouteName.value = store.currentRoute.name
    editRouteImage.value = store.currentRoute.image ?? ''
    showEditRouteDialog.value = true
  }
  function confirmEditRoute() {
    const name = editRouteName.value.trim()
    if (!name || !store.currentRouteId) return
    store.updateRoute(store.currentRouteId, { name, image: editRouteImage.value || undefined })
    showEditRouteDialog.value = false
  }
  function openEditSegmentDialog(segmentId: string) {
    const route = store.currentRoute
    if (!route) return
    const seg = route.segments.find(s => s.id === segmentId)
    if (!seg) return
    editingSegmentId.value = segmentId
    editSegmentName.value = seg.name
    showEditSegmentDialog.value = true
  }
  function confirmEditSegment() {
    const name = editSegmentName.value.trim()
    if (!name || !editingSegmentId.value) return
    store.updateSegment(editingSegmentId.value, { name })
    showEditSegmentDialog.value = false
    editingSegmentId.value = null
  }

  return {
    showCreateRouteDialog, newRouteName, newRouteImage,
    showCreateSegmentDialog, newSegmentName,
    showEditRouteDialog, editRouteName, editRouteImage,
    showEditSegmentDialog, editSegmentName, editingSegmentId,
    routeImageOptions,
    openCreateRouteDialog, confirmCreateRoute,
    openCreateSegmentDialog, confirmCreateSegment,
    openEditRouteDialog, confirmEditRoute,
    openEditSegmentDialog, confirmEditSegment,
  }
}
