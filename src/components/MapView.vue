<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet.markercluster'
import { useMarkerStore } from '@/stores/markerStore'
import { MARKER_TYPE_CONFIG, getPrimaryType, getOverlayTypes, isEnemyClearingType } from '@/types'
import type { MarkerData } from '@/types'
import { resolveAssetUrl } from '@/config'

const store = useMarkerStore()

const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let markerClusterGroup: L.MarkerClusterGroup | null = null
let arrowLayerGroup: L.LayerGroup | null = null
let tempHighlightLayer: L.LayerGroup | null = null
let focusedHighlightLayer: L.LayerGroup | null = null
let startPointLayer: L.LayerGroup | null = null
let defaultZoom = 5
let isFlying = false
let moveendRaf = 0

const hoveredMarker = ref<MarkerData | null>(null)
const hoveredScreenPos = ref<{ x: number; y: number } | null>(null)

const hoverPreviewImg = computed(() => {
  const m = hoveredMarker.value
  if (!m) return null
  const firstFromList = m.images?.[0]
  if (firstFromList) return firstFromList.startsWith('data:') ? firstFromList : resolveAssetUrl('./' + firstFromList)
  if (m.image) return resolveAssetUrl('./' + m.image)
  return null
})

const mapImgPath = resolveAssetUrl('./map-base.webp')

function computeBounds(imgW: number, imgH: number): L.LatLngBoundsLiteral {
  const ratio = imgW / imgH
  if (ratio >= 1) {
    return [[0, 0], [1, ratio]]
  } else {
    return [[0, 0], [1 / ratio, 1]]
  }
}

function loadImageDimensions(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

const canHover = window.matchMedia('(hover: hover)').matches && window.innerWidth >= 768
const isMobileSegmentNav = window.innerWidth < 768

const isFullscreen = ref(false)
const fullscreenIconSrc = resolveAssetUrl('./svg/fullscreen_icon.svg')
const fullscreenExitIconSrc = resolveAssetUrl('./svg/fullscreen_exit_icon.svg')

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

const segmentColors = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899']

const focusedSegment = computed(() => {
  if (!store.currentRoute || store.currentSegmentIndex < 0) return null
  return store.currentRoute.segments[store.currentSegmentIndex] ?? null
})

const focusedSegmentColor = computed(() => {
  if (store.currentSegmentIndex < 0) return null
  return segmentColors[store.currentSegmentIndex % segmentColors.length]
})

function createMarkerIcon(m: MarkerData, found: boolean): L.DivIcon {
  const primaryType = getPrimaryType(m.types, store.selectedTypes)
  const overlayTypes = getOverlayTypes(m.types, store.selectedTypes)
  const cfg = MARKER_TYPE_CONFIG[primaryType]
  const size = 36
  const imgSrc = resolveAssetUrl(cfg.iconUrl)

  // Calculate count: sum counts of viewed enemy-clearing types
  let displayCount = 0
  if (m.counts) {
    for (const t of m.types) {
      if (store.selectedTypes.has(t) && isEnemyClearingType(t)) {
        displayCount += m.counts[t] || 0
      }
    }
  }

  const overlayIconSize = 16
  const overlayGap = 2
  const overlayTrackLeft = size - overlayIconSize // pin left edge so icons fan out to the right
  const overlaysHtml = overlayTypes.length > 0
    ? `<div class="marker-overlay-track" style="position:absolute;top:0;left:${overlayTrackLeft}px;height:${overlayIconSize}px;width:${overlayIconSize}px;overflow:hidden;transition:width 0.25s ease;border-radius:7px">
        <div style="display:flex;gap:${overlayGap}px;height:${overlayIconSize}px">
          ${overlayTypes.map(t => `<img src="${resolveAssetUrl(MARKER_TYPE_CONFIG[t].iconUrl)}" style="width:${overlayIconSize}px;height:${overlayIconSize}px;border-radius:50%;object-fit:cover;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.5)" />`).join('')}
        </div>
      </div>`
    : ''

  const totalOverlayWidth = overlayTypes.length > 0
    ? overlayTypes.length * overlayIconSize + (overlayTypes.length - 1) * overlayGap
    : 0

  // ── Time badge (bottom-left, lower) ──
  let timeBadgeHtml = ''
  if (m.time && store.showMarkerTime) {
    const timeColors: Record<string, string> = { day: '#fbbf24', night: '#6366f1' }
    const tc = timeColors[m.time]
    if (m.time === 'day') {
      timeBadgeHtml = `<div style="position:absolute;bottom:1px;left:2px;width:13px;height:13px;border-radius:50%;background:${tc};box-shadow:0 1px 3px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center" title="白天"><svg width="11" height="11" viewBox="0 0 13 13"><line x1="2.5" y1="9.5" x2="10.5" y2="9.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/><path d="M3.5 9.5 A3 3.5 0 0 1 9.5 9.5" fill="white"/></svg></div>`
    } else {
      timeBadgeHtml = `<div style="position:absolute;bottom:1px;left:2px;width:13px;height:13px;border-radius:50%;background:${tc};box-shadow:0 1px 3px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center" title="夜晚"><svg width="11" height="11" viewBox="0 0 11 11"><circle cx="5.5" cy="5.5" r="4.2" fill="white"/><circle cx="7.5" cy="4" r="3.2" fill="${tc}"/></svg></div>`
    }
  }

  // ── Weather badge (bottom-left, above time if both present) ──
  let weatherBadgeHtml = ''
  if (m.weather && store.showMarkerWeather) {
    const weatherColors: Record<string, string> = { sunny: '#f59e0b', rainy: '#3b82f6', snowy: '#06b6d4' }
    const weatherLabels: Record<string, string> = { sunny: '晴天', rainy: '雨天', snowy: '雪天' }
    const wc = weatherColors[m.weather]
    const wl = weatherLabels[m.weather]
    const wb = (m.time && store.showMarkerTime) ? '14px' : '1px'  // above time if both shown, otherwise at corner
    if (m.weather === 'sunny') {
      weatherBadgeHtml = `<div style="position:absolute;bottom:${wb};left:2px;width:13px;height:13px;border-radius:50%;background:${wc};box-shadow:0 1px 3px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center" title="${wl}"><svg width="11" height="11" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="2.5" fill="white"/><line x1="6.5" y1="1.5" x2="6.5" y2="3" stroke="white" stroke-width="1.2" stroke-linecap="round"/><line x1="6.5" y1="10" x2="6.5" y2="11.5" stroke="white" stroke-width="1.2" stroke-linecap="round"/><line x1="1.5" y1="6.5" x2="3" y2="6.5" stroke="white" stroke-width="1.2" stroke-linecap="round"/><line x1="10" y1="6.5" x2="11.5" y2="6.5" stroke="white" stroke-width="1.2" stroke-linecap="round"/></svg></div>`
    } else if (m.weather === 'rainy') {
      weatherBadgeHtml = `<div style="position:absolute;bottom:${wb};left:2px;width:13px;height:13px;border-radius:50%;background:${wc};box-shadow:0 1px 3px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center" title="${wl}"><svg width="11" height="11" viewBox="0 0 13 13"><rect x="2.5" y="3" width="8" height="4" rx="2" fill="white"/><line x1="5" y1="8.5" x2="4.5" y2="11" stroke="white" stroke-width="1" stroke-linecap="round"/><line x1="8" y1="8.5" x2="7.5" y2="11" stroke="white" stroke-width="1" stroke-linecap="round"/></svg></div>`
    } else if (m.weather === 'snowy') {
      weatherBadgeHtml = `<div style="position:absolute;bottom:${wb};left:2px;width:13px;height:13px;border-radius:50%;background:${wc};box-shadow:0 1px 3px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center" title="${wl}"><svg width="11" height="11" viewBox="0 0 13 13"><line x1="6.5" y1="2" x2="6.5" y2="11" stroke="white" stroke-width="1.2" stroke-linecap="round"/><line x1="2" y1="6.5" x2="11" y2="6.5" stroke="white" stroke-width="1.2" stroke-linecap="round"/><line x1="3.3" y1="3.3" x2="9.7" y2="9.7" stroke="white" stroke-width="1" stroke-linecap="round"/><line x1="9.7" y1="3.3" x2="3.3" y2="9.7" stroke="white" stroke-width="1" stroke-linecap="round"/></svg></div>`
    }
  }

  return L.divIcon({
    className: `custom-marker${found ? ' found' : ''}`,
    html: `
      <div style="position:relative;width:${size}px;height:${size}px"
        ${overlayTypes.length > 1 && canHover ? `onmouseover="const t=this.querySelector('.marker-overlay-track');if(t)t.style.width='${totalOverlayWidth}px'" onmouseout="const t=this.querySelector('.marker-overlay-track');if(t)t.style.width='${overlayIconSize}px'"` : ''}
      >
        <img src="${imgSrc}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;object-position:center;box-shadow:0 2px 6px rgba(0,0,0,0.45)" />
        ${overlaysHtml}
        ${found ? `<svg width="${size}" height="${size}" viewBox="0 0 36 36" style="position:absolute;top:0;left:0;pointer-events:none"><circle cx="31" cy="7" r="4.5" fill="#22c55e" stroke="white" stroke-width="1.5"/><path d="M28.5 7 l2 2 l4-4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
        ${displayCount > 0 && store.showMarkerCount ? `<svg width="${size}" height="${size}" viewBox="0 0 36 36" style="position:absolute;top:0;left:0;pointer-events:none"><circle cx="30" cy="30" r="6" fill="#f0441c"/><text x="30" y="32.5" text-anchor="middle" fill="white" font-size="9" font-weight="bold">${displayCount}</text></svg>` : ''}
        ${timeBadgeHtml}
        ${weatherBadgeHtml}
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function drawArrowLine(from: MarkerData, to: MarkerData, color: string, isTemp: boolean) {
  if (!arrowLayerGroup) return
  const latlngs: L.LatLngTuple[] = [[from.lat, from.lng], [to.lat, to.lng]]
  const polyline = L.polyline(latlngs, {
    color,
    weight: 3,
    opacity: isTemp ? 0.7 : 0.9,
    dashArray: isTemp ? '8 6' : undefined,
  })
  arrowLayerGroup.addLayer(polyline)

  const midLat = (from.lat + to.lat) / 2
  const midLng = (from.lng + to.lng) / 2
  const angle = -Math.atan2(to.lat - from.lat, to.lng - from.lng) * (180 / Math.PI)

  const arrowIcon = L.divIcon({
    className: 'route-arrow-head',
    html: `<div style="width:0;height:0;border-left:8px solid ${color};border-top:5px solid transparent;border-bottom:5px solid transparent;transform:rotate(${angle}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));"></div>`,
    iconSize: [8, 10],
    iconAnchor: [4, 5],
  })
  L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(arrowLayerGroup)
}

function buildRouteArrows() {
  if (!arrowLayerGroup) return
  arrowLayerGroup.clearLayers()

  if (store.isAddingSegment) {
    const markers = store.segmentTempMarkers
    for (let i = 0; i < markers.length - 1; i++) {
      drawArrowLine(markers[i], markers[i + 1], '#f59e0b', true)
    }
    return
  }

  // In farming mode, only show the arrow between the two currently focused markers
  if (store.farmingMode && store.focusMarkerIds.length === 2) {
    const color = focusedSegmentColor.value ?? '#f59e0b'
    const from = store.getMarkerById(store.focusMarkerIds[0])
    const to = store.getMarkerById(store.focusMarkerIds[1])
    if (from && to) {
      drawArrowLine(from, to, color, false)
    }
    return
  }

  if (store.currentRoute) {
    let colorIdx = 0
    for (const segment of store.currentRoute.segments) {
      const color = segmentColors[colorIdx % segmentColors.length]
      for (let i = 0; i < segment.markerIds.length - 1; i++) {
        const from = store.getMarkerById(segment.markerIds[i])
        const to = store.getMarkerById(segment.markerIds[i + 1])
        if (from && to) {
          drawArrowLine(from, to, color, false)
        }
      }
      colorIdx++
    }
  }
}

function createHighlightIcon(color: string): L.DivIcon {
  const size = 44
  const r = 20
  const w = 3
  return L.divIcon({
    className: 'highlight-circle',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="${w}" stroke-opacity="0.9"/></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function updateTempHighlights() {
  if (!tempHighlightLayer) return
  tempHighlightLayer.clearLayers()
  if (!store.isAddingSegment) return
  const icon = createHighlightIcon('#f59e0b')
  for (const id of store.segmentTempMarkerIds) {
    const m = store.getMarkerById(id)
    if (!m) continue
    const marker = L.marker([m.lat, m.lng], { icon, interactive: false })
    tempHighlightLayer.addLayer(marker)
  }
}

const focusedHighlightIcons = new Map<string, L.DivIcon>()

function updateFocusedHighlights() {
  if (!focusedHighlightLayer) return
  focusedHighlightLayer.clearLayers()

  // 全怪路线模式：只高亮当前路段的第一个标记（入口），起点由独立 startPointLayer 高亮
  if (store.autoRouteStartId) {
    const ids = store.focusMarkerIds
    if (ids.length === 0) return
    const firstId = ids[0]
    const color = focusedSegmentColor.value ?? '#f59e0b'
    let icon = focusedHighlightIcons.get(color)
    if (!icon) {
      icon = createHighlightIcon(color)
      focusedHighlightIcons.set(color, icon)
    }
    const m = store.getMarkerById(firstId)
    if (m) {
      const marker = L.marker([m.lat, m.lng], { icon, interactive: false })
      focusedHighlightLayer.addLayer(marker)
    }
    return
  }

  // In farming mode, only highlight the second marker of the current pair
  const ids = store.farmingMode && store.farmingHighlightId
    ? [store.farmingHighlightId]
    : store.focusMarkerIds

  if (ids.length === 0) return
  const color = focusedSegmentColor.value ?? '#f59e0b'
  let icon = focusedHighlightIcons.get(color)
  if (!icon) {
    icon = createHighlightIcon(color)
    focusedHighlightIcons.set(color, icon)
  }
  for (const id of ids) {
    const m = store.getMarkerById(id)
    if (!m) continue
    const marker = L.marker([m.lat, m.lng], { icon, interactive: false })
    focusedHighlightLayer.addLayer(marker)
  }
}

function buildMarkers() {
  if (!markerClusterGroup) return
  markerClusterGroup.clearLayers()

  const markers: L.Marker[] = []
  for (const m of store.filteredMarkers) {
    const found = store.isFound(m.id)
    const icon = createMarkerIcon(m, found)
    const marker = L.marker([m.lat, m.lng], { icon })
    marker.on('click', () => {
      if (store.isAddingSegment) {
        store.addTempMarker(m.id)
      } else {
        store.selectMarker(m.id)
      }
    })
    if (canHover) {
      marker.on('mouseover', () => {
        if (!map) return
        marker.setZIndexOffset(10000)
        const point = map.latLngToContainerPoint([m.lat, m.lng])
        hoveredMarker.value = m
        hoveredScreenPos.value = { x: point.x, y: point.y }
      })
      marker.on('mouseout', () => {
        marker.setZIndexOffset(0)
        hoveredMarker.value = null
        hoveredScreenPos.value = null
      })
    }
    markers.push(marker)
  }
  markerClusterGroup.addLayers(markers)
}

function flyToMarker(m: MarkerData) {
  if (!map) return
  const targetZoom = Math.min(defaultZoom + 2, map.getMaxZoom())
  const isMobile = window.innerWidth < 768

  let targetLatLng: L.LatLng
  if (isMobile) {
    const containerHeight = map.getContainer().clientHeight
    const markerPixel = map.project([m.lat, m.lng], targetZoom)
    const targetPixel = L.point(markerPixel.x, markerPixel.y + containerHeight * 0.08)
    targetLatLng = map.unproject(targetPixel, targetZoom)
  } else {
    const containerHeight = map.getContainer().clientHeight
    const markerPixel = map.project([m.lat, m.lng], targetZoom)
    const targetPixel = L.point(markerPixel.x, markerPixel.y - containerHeight * 0.15)
    targetLatLng = map.unproject(targetPixel, targetZoom)
  }

  isFlying = true
  map.flyTo(targetLatLng, targetZoom, {
    duration: 0.6,
    easeLinearity: 0.25,
  })

  map.once('moveend', () => {
    isFlying = false
    updateSelectedMarkerScreenPos(m)
  })
}

function updateSelectedMarkerScreenPos(m?: MarkerData) {
  if (!map) return
  const target = m ?? store.selectedMarker
  if (!target) return
  const point = map.latLngToContainerPoint([target.lat, target.lng])
  store.selectedMarkerScreenPos = { x: point.x, y: point.y }
}

watch(
  () => [store.filteredMarkers, store.foundIds, store.segmentTempMarkerIds, store.showMarkerTime, store.showMarkerWeather, store.showMarkerCount] as const,
  () => {
    buildMarkers()
    nextTick(() => buildRouteArrows())
  },
  { deep: false }
)

watch(
  () => [store.isAddingSegment, store.segmentTempMarkerIds.length] as const,
  () => {
    buildRouteArrows()
    updateTempHighlights()
  }
)

watch(
  () => store.currentRouteId,
  () => {
    nextTick(() => buildRouteArrows())
  }
)

watch(
  () => store.farmingMode,
  () => {
    nextTick(() => buildRouteArrows())
  }
)

watch(
  () => store.focusMarkerIds,
  (ids) => {
    updateFocusedHighlights()
    if (store.farmingMode) buildRouteArrows()
    if (!map || ids.length === 0) return
    const positions: L.LatLngTuple[] = []
    for (const id of ids) {
      const m = store.getMarkerById(id)
      if (m) positions.push([m.lat, m.lng])
    }
    if (positions.length === 0) return
    if (positions.length === 1) {
      const m = store.getMarkerById(ids[0])
      if (m) flyToMarker(m)
      return
    }
    const bounds = L.latLngBounds(positions)
    const isMobile = window.innerWidth < 768
    isFlying = true
    map.flyToBounds(bounds, {
      duration: 0.6,
      easeLinearity: 0.25,
      ...(isMobile
        ? { paddingTopLeft: [100, 80] as const, paddingBottomRight: [100, 400] as const }
        : { paddingTopLeft: [400, 120] as const, paddingBottomRight: [400, 120] as const }),
    })
    map.once('moveend', () => { isFlying = false })
  }
)

// Auto-route start point highlight (distinct from segment highlights)
function updateStartPoint() {
  if (!startPointLayer) return
  startPointLayer.clearLayers()
  const id = store.autoRouteStartId
  if (!id) return
  const m = store.getMarkerById(id)
  if (!m) return
  // Distinct large primary-colored ring with "起点" label
  const icon = L.divIcon({
    className: 'start-point-marker',
    html: `<div style="position:relative;width:50px;height:50px">
      <svg width="50" height="50" viewBox="0 0 50 50" style="position:absolute;top:0;left:0">
        <circle cx="25" cy="25" r="20" fill="#6366f1" fill-opacity="0.15" stroke="#6366f1" stroke-width="2.5" stroke-opacity="0.9"/>
        <circle cx="25" cy="25" r="20" fill="none" stroke="#6366f1" stroke-width="2" class="start-pulse"/>
      </svg>
      <span style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:600;white-space:nowrap;color:#6366f1;background:rgba(0,0,0,0.6);padding:1px 6px;border-radius:4px">起点</span>
    </div>`,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  })
  const marker = L.marker([m.lat, m.lng], { icon, interactive: false, zIndexOffset: 1000 })
  startPointLayer.addLayer(marker)
}

watch(() => store.autoRouteStartId, () => updateStartPoint(), { immediate: true })

watch(
  () => store.selectedMarkerId,
  (id) => {
    if (id) {
      const m = store.markers.find((x) => x.id === id)
      if (m) {
        const mobile = window.innerWidth < 768
        if (store.showRouteView && mobile) {
          updateSelectedMarkerScreenPos(m)
        } else if (store.showRouteView && !mobile) {
          // Desktop route mode: don't fly to marker, info shows on right side
        } else {
          flyToMarker(m)
        }
      }
    }
  }
)

onMounted(async () => {
  await nextTick()
  if (!mapContainer.value) return

  // Load image to detect actual dimensions
  const { w, h } = await loadImageDimensions(mapImgPath)
  const mapBounds = computeBounds(w, h)
  const ratio = w / h
  const cx = ratio >= 1 ? ratio / 2 : 0.5
  const cy = ratio >= 1 ? 0.5 : (1 / ratio) / 2
  const pad = 0.15
  const maxBounds = L.latLngBounds([
    [mapBounds[0][0] - pad, mapBounds[0][1] - pad],
    [mapBounds[1][0] + pad, mapBounds[1][1] + pad],
  ])

  map = L.map(mapContainer.value, {
    crs: L.CRS.Simple,
    minZoom: 2,
    maxZoom: 16,
    zoom: 2,
    zoomDelta: 0.5,
    zoomSnap: 0,
    zoomAnimation: true,
    markerZoomAnimation: true,
    center: [cy, cx],
    zoomControl: false,
    attributionControl: false,
    maxBounds,
    maxBoundsViscosity: 0.6,
  })

  L.control.zoom({ position: 'topright' }).addTo(map)

  L.imageOverlay(mapImgPath, mapBounds).addTo(map)

  map.fitBounds(mapBounds)
  defaultZoom = map.getZoom()

  markerClusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    animate: false,
    maxClusterRadius: (zoom: number) => {
      // 远距离（低缩放）用大半径聚成大簇，近距离用小半径保持细节
      if (zoom <= 2) return 120
      if (zoom <= 4) return 90
      if (zoom <= 6) return 60
      return 40
    },
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 8,
  })

  tempHighlightLayer = L.layerGroup().addTo(map)
  focusedHighlightLayer = L.layerGroup().addTo(map)
  startPointLayer = L.layerGroup().addTo(map)

  map.addLayer(markerClusterGroup)

  arrowLayerGroup = L.layerGroup().addTo(map)

  // Tag the map container with the current zoom level so CSS can scale
  // individual markers smaller when zoomed far out (fewer overlapping blobs).
  function updateZoomTag() {
    if (!map) return
    const z = map.getZoom()
    const el = map.getContainer()
    el.classList.toggle('zoom-far', z <= 3)
    el.classList.toggle('zoom-mid', z > 3 && z <= 5)
  }
  updateZoomTag()
  map.on('zoomend', updateZoomTag)

  map.on('moveend', () => {
    if (isFlying) return
    cancelAnimationFrame(moveendRaf)
    moveendRaf = requestAnimationFrame(() => {
      if (store.selectedMarker) {
        updateSelectedMarkerScreenPos()
      }
      if (hoveredMarker.value && map) {
        const point = map.latLngToContainerPoint([hoveredMarker.value.lat, hoveredMarker.value.lng])
        hoveredScreenPos.value = { x: point.x, y: point.y }
      }
    })
  })

  map.on('click', (e) => {
    const target = (e as any).originalEvent?.target as HTMLElement | undefined
    if (target?.closest('.custom-marker, .leaflet-popup, .marker-cluster')) return

    if (store.isAddingSegment) {
      return
    }
    if (store.selectedMarkerId) {
      store.selectMarker(null)
    } else if (store.isAnyEditMode) {
      store.openCreateMarker(e.latlng.lat, e.latlng.lng)
    }
  })

  buildMarkers()

  // Map + markers fully initialized — let the loading screen fade out.
  // Defer one frame so the browser actually paints the map first.
  requestAnimationFrame(() => emit('ready'))

  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  if (map) {
    map.remove()
    map = null
  }
})

const emit = defineEmits<{ (e: 'ready'): void }>()

defineExpose({ flyToMarker })
</script>

<template>
  <div
    ref="mapContainer"
    class="map-container absolute inset-0 z-0"
  ></div>

  <!-- Fullscreen toggle button -->
  <button
    class="fullscreen-toggle"
    :title="isFullscreen ? '退出全屏' : '全屏'"
    @click="toggleFullscreen"
  >
    <img v-if="!isFullscreen" :src="fullscreenIconSrc" alt="全屏" width="18" height="18" />
    <img v-else :src="fullscreenExitIconSrc" alt="退出全屏" width="18" height="18" />
  </button>

  <!-- Hover info: image above marker + name below marker -->
  <Teleport to="body">
    <Transition name="hover-card">
      <div
        v-if="hoveredMarker && hoveredScreenPos"
        class="fixed inset-0 z-20 pointer-events-none"
      >
        <!-- Image above marker -->
        <div
          v-if="hoverPreviewImg"
          class="absolute"
          :style="{
            left: hoveredScreenPos.x + 'px',
            top: hoveredScreenPos.y + 'px',
            transform: 'translate(-50%, calc(-100% - 28px))',
          }"
        >
          <div class="rounded-lg overflow-hidden border border-border-strong shadow-xl bg-overlay/90 backdrop-blur-sm">
            <img
              :key="hoverPreviewImg"
              :src="hoverPreviewImg"
              class="w-24 aspect-video object-cover"
              @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
          </div>
        </div>

        <!-- Name below marker -->
        <div
          class="absolute"
          :style="{
            left: hoveredScreenPos.x + 'px',
            top: hoveredScreenPos.y + 'px',
            transform: 'translate(-50%, 24px)',
          }"
        >
          <span class="block px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-overlay/90 backdrop-blur-sm border border-default text-base shadow-lg">
            {{ hoveredMarker.name }}
          </span>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Focused segment top bar -->
  <Teleport to="body">
    <Transition name="hover-card">
      <div
        v-if="focusedSegment && focusedSegmentColor"
        class="fixed z-30 left-1/2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/90 backdrop-blur-xl border border-default shadow-lg select-none cursor-pointer hover:bg-overlay/90 transition-colors"
        :class="isMobileSegmentNav ? 'top-3' : 'top-4'"
        :style="{ transform: 'translateX(-50%)' }"
        @click="store.focusSegment(store.currentSegmentIndex)"
      >
        <span
          class="w-2.5 h-2.5 rounded-full flex-shrink-0"
          :style="{ backgroundColor: focusedSegmentColor }"
        ></span>
        <span class="text-xs font-medium text-base whitespace-nowrap">{{ focusedSegment.name }}</span>
      </div>
    </Transition>
  </Teleport>

  <!-- Segment navigation: prev / name / next -->
  <Teleport to="body">
    <div
      v-if="store.currentRoute && store.currentRoute.segments.length > 0"
      class="fixed z-30 left-1/2 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface/90 backdrop-blur-xl border border-default shadow-xl select-none"
      :class="isMobileSegmentNav ? 'bottom-5' : 'bottom-4'"
      :style="{ transform: 'translateX(-50%)' }"
    >
      <button
        class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-base hover:bg-elevated transition-colors disabled:opacity-30 disabled:cursor-default"
        :disabled="store.currentRoute.segments.length <= 1"
        @click="store.focusPrevSegment()"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span
        v-if="focusedSegmentColor"
        class="w-2 h-2 rounded-full flex-shrink-0"
        :style="{ backgroundColor: focusedSegmentColor }"
      ></span>
      <span class="text-xs font-medium text-base whitespace-nowrap">
        路段 {{ store.currentSegmentIndex >= 0 ? store.currentSegmentIndex + 1 : '?' }} / {{ store.currentRoute.segments.length }}
      </span>
      <button
        class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-base hover:bg-elevated transition-colors disabled:opacity-30 disabled:cursor-default"
        :disabled="store.currentRoute.segments.length <= 1"
        @click="store.focusNextSegment()"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  contain: layout style paint;
}
.map-container :deep(.leaflet-map-pane),
.map-container :deep(.leaflet-marker-pane),
.map-container :deep(.leaflet-overlay-pane) {
  will-change: transform;
}
</style>

<style>
.hover-card-enter-active,
.hover-card-leave-active {
  transition: opacity 0.15s ease;
}
.hover-card-enter-from,
.hover-card-leave-to {
  opacity: 0;
}

.highlight-circle {
  background: transparent !important;
  border: none !important;
}
.highlight-circle svg {
  transform-box: fill-box;
  transform-origin: center;
  animation: marker-pulse 1.8s ease-out infinite;
}
@keyframes marker-pulse {
  0% { transform: scale(0.85); opacity: 1; }
  70% { transform: scale(1.7); opacity: 0; }
  100% { transform: scale(1.7); opacity: 0; }
}
.start-point-marker {
  background: transparent !important;
  border: none !important;
}
.start-pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: start-ring 2s ease-out infinite;
}
@keyframes start-ring {
  0% { transform: scale(0.9); opacity: 0.9; }
  60% { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1.8); opacity: 0; }
}
</style>
