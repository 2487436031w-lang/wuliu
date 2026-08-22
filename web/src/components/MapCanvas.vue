<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type PropType } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { PositionPoint, TrackPoint } from '../types/domain'

const props = defineProps({
  positions: { type: Array as PropType<PositionPoint[]>, default: () => [] },
  track: { type: Array as PropType<TrackPoint[]>, default: () => [] },
  focus: { type: Object as PropType<{ lat: number; lng: number } | null>, default: null },
})

const root = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let markers = new Map<number, L.Marker>()
let trackLine: L.Polyline | null = null

const pulseIcon = L.divIcon({
  className: 'vehicle-pulse',
  html: '<span class="dot"></span><span class="ring"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

onMounted(() => {
  if (!root.value) return
  map = L.map(root.value, {
    zoomControl: false,
    attributionControl: true,
  }).setView([31.23, 121.47], 12)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO',
    maxZoom: 19,
  }).addTo(map)

  L.control.zoom({ position: 'bottomright' }).addTo(map)
  syncMarkers()
  syncTrack()
})

onUnmounted(() => {
  map?.remove()
  map = null
})

watch(
  () => props.positions,
  () => syncMarkers(),
  { deep: true },
)
watch(
  () => props.track,
  () => syncTrack(),
  { deep: true },
)
watch(
  () => props.focus,
  (f) => {
    if (f && map) map.flyTo([f.lat, f.lng], 13, { duration: 0.6 })
  },
)

function syncMarkers() {
  if (!map) return
  const seen = new Set<number>()
  for (const p of props.positions) {
    seen.add(p.vehicleId)
    const latlng: L.LatLngExpression = [p.latitude, p.longitude]
    const existing = markers.get(p.vehicleId)
    if (existing) {
      existing.setLatLng(latlng)
    } else {
      const m = L.marker(latlng, { icon: pulseIcon }).addTo(map)
      m.bindTooltip(`车 #${p.vehicleId} · ${p.speed.toFixed(0)} km/h`, { direction: 'top' })
      markers.set(p.vehicleId, m)
    }
  }
  for (const [id, m] of markers) {
    if (!seen.has(id)) {
      m.remove()
      markers.delete(id)
    }
  }
}

function syncTrack() {
  if (!map) return
  if (trackLine) {
    trackLine.remove()
    trackLine = null
  }
  if (!props.track.length) return
  const latlngs = props.track.map((t) => [t.latitude, t.longitude] as [number, number])
  trackLine = L.polyline(latlngs, {
    color: '#2a6f7a',
    weight: 4,
    opacity: 0.85,
  }).addTo(map)
  map.fitBounds(trackLine.getBounds(), { padding: [40, 40] })
}

const countLabel = computed(() => `${props.positions.length} 辆在线`)
</script>

<template>
  <div class="map-wrap">
    <div ref="root" class="map-root" />
    <div class="map-chip mono">{{ countLabel }}</div>
  </div>
</template>

<style scoped>
.map-wrap {
  position: relative;
  height: 100%;
  min-height: 360px;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  border: 1px solid var(--line);
  animation: mapIn 0.55s ease both;
}

@keyframes mapIn {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.map-root {
  width: 100%;
  height: 100%;
  min-height: 360px;
  background: #d5dbe3;
}

.map-chip {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 500;
  background: rgba(26, 35, 50, 0.88);
  color: #f4f6f8;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.04em;
}

:deep(.vehicle-pulse) {
  background: transparent;
  border: none;
}
:deep(.vehicle-pulse .dot) {
  display: block;
  width: 10px;
  height: 10px;
  margin: 4px;
  border-radius: 50%;
  background: var(--signal);
  box-shadow: 0 0 0 2px #1a2332;
}
:deep(.vehicle-pulse .ring) {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--signal);
  animation: pulse 1.6s ease-out infinite;
  opacity: 0.7;
}
@keyframes pulse {
  from {
    transform: scale(0.6);
    opacity: 0.8;
  }
  to {
    transform: scale(1.8);
    opacity: 0;
  }
}
</style>
