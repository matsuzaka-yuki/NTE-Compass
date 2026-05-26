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
let defaultZoom = 5

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

const mapImgPath = resolveAssetUrl('./map-base.png')

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

  return L.divIcon({
    className: `custom-marker${found ? ' found' : ''}`,
    html: `
      <div style="position:relative;width:${size}px;height:${size}px"
        ${overlayTypes.length > 1 ? `onmouseover="const t=this.querySelector('.marker-overlay-track');if(t)t.style.width='${totalOverlayWidth}px'" onmouseout="const t=this.querySelector('.marker-overlay-track');if(t)t.style.width='${overlayIconSize}px'"` : ''}
      >
        <img src="${imgSrc}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;object-position:center;box-shadow:0 2px 6px rgba(0,0,0,0.45)" />
        ${overlaysHtml}
        ${found ? `<svg width="${size}" height="${size}" viewBox="0 0 36 36" style="position:absolute;top:0;left:0;pointer-events:none"><circle cx="31" cy="7" r="4.5" fill="#22c55e" stroke="white" stroke-width="1.5"/><path d="M28.5 7 l2 2 l4-4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
        ${displayCount > 0 ? `<svg width="${size}" height="${size}" viewBox="0 0 36 36" style="position:absolute;top:0;left:0;pointer-events:none"><circle cx="30" cy="30" r="6" fill="#f0441c"/><text x="30" y="32.5" text-anchor="middle" fill="white" font-size="9" font-weight="bold">${displayCount}</text></svg>` : ''}
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function buildMarkers() {
  if (!markerClusterGroup) return
  markerClusterGroup.clearLayers()

  for (const m of store.filteredMarkers) {
    const found = store.isFound(m.id)
    const icon = createMarkerIcon(m, found)
    const marker = L.marker([m.lat, m.lng], { icon })
    marker.on('click', () => {
      store.selectMarker(m.id)
    })
    const canHover = window.matchMedia('(hover: hover)').matches
    if (canHover) {
      marker.on('mouseover', () => {
        if (!map) return
        const point = map.latLngToContainerPoint([m.lat, m.lng])
        hoveredMarker.value = m
        hoveredScreenPos.value = { x: point.x, y: point.y }
      })
      marker.on('mouseout', () => {
        hoveredMarker.value = null
        hoveredScreenPos.value = null
      })
    }
    markerClusterGroup!.addLayer(marker)
  }
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

  map.flyTo(targetLatLng, targetZoom, {
    duration: 0.6,
    easeLinearity: 0.25,
  })

  map.once('moveend', () => {
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
  () => [store.filteredMarkers, store.foundIds] as const,
  () => {
    buildMarkers()
  },
  { deep: false }
)

watch(
  () => store.selectedMarkerId,
  (id) => {
    if (id) {
      const m = store.markers.find((x) => x.id === id)
      if (m) flyToMarker(m)
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
    maxZoom: 14,
    zoom: 2,
    zoomDelta: 0.1,
    zoomSnap: 0,
    zoomAnimation: false,
    markerZoomAnimation: false,
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
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 8,
  })

  map.addLayer(markerClusterGroup)

  map.on('moveend', () => {
    if (store.selectedMarker) {
      updateSelectedMarkerScreenPos()
    }
    if (hoveredMarker.value && map) {
      const point = map.latLngToContainerPoint([hoveredMarker.value.lat, hoveredMarker.value.lng])
      hoveredScreenPos.value = { x: point.x, y: point.y }
    }
  })

  map.on('click', (e) => {
    const target = (e as any).originalEvent?.target as HTMLElement | undefined
    if (target?.closest('.custom-marker, .leaflet-popup, .marker-cluster')) return

    if (store.selectedMarkerId) {
      store.selectMarker(null)
    } else if (store.isEditorMode) {
      store.openCreateMarker(e.latlng.lat, e.latlng.lng)
    }
  })

  buildMarkers()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

defineExpose({ flyToMarker })
</script>

<template>
  <div
    ref="mapContainer"
    class="map-container absolute inset-0 z-0"
  ></div>

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
          <div class="rounded-lg overflow-hidden border border-white/15 shadow-xl bg-surface-800/90 backdrop-blur-sm">
            <img
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
          <span class="block px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-surface-800/90 backdrop-blur-sm border border-white/10 text-slate-100 shadow-lg">
            {{ hoveredMarker.name }}
          </span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
.map-container :deep(.leaflet-map-pane) {
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

</style>
