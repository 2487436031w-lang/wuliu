<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../api/client'
import {
  EXTRA_CORRIDOR_LAMPS,
  isNightHour,
  resolveLampLocation,
  type CorridorLamp,
} from '../config/lampLocations'
import { useRealtimeStore } from '../stores/realtime'
import type { Device } from '../types/domain'

const props = withDefaults(
  defineProps<{
    variant?: 'full' | 'embed'
  }>(),
  { variant: 'full' },
)

/** 重庆大学 A 区（沙正街）附近，GCJ-02 */
const CAMPUS_CENTER: L.LatLngExpression = [29.56492, 106.46882]

type PlotLamp = {
  key: string
  deviceName: string
  deviceSn: string
  groupName: string | null
  latitude: number
  longitude: number
  status: 'ON' | 'OFF'
  onlineStatus: 'ONLINE' | 'OFFLINE'
  real: Device | null
}

const realtime = useRealtimeStore()
const records = ref<Device[]>([])
const selectedKey = ref<string | null>(null)
const pinTargetId = ref<number | null>(null)
const msg = ref('')
const mapEl = ref<HTMLElement | null>(null)
const switching = ref(false)

let map: L.Map | null = null
let markers = L.layerGroup()
const markerByKey = new Map<string, L.Marker>()
let didFit = false

function hasLocation(d: Device): boolean {
  return d.latitude != null && d.longitude != null
}

function withLocation(d: Device): Device {
  const loc = resolveLampLocation(d.deviceSn, d.latitude, d.longitude)
  return { ...d, latitude: loc.latitude, longitude: loc.longitude }
}

function extraStatus(lamp: CorridorLamp, index: number): { status: 'ON' | 'OFF'; onlineStatus: 'ONLINE' | 'OFFLINE' } {
  const peers = records.value.filter((d) => (d.groupName || '') === lamp.groupName)
  const peerOn = peers.some((d) => d.status === 'ON')
  const night = isNightHour()
  const on = peerOn ? index % 4 !== 2 : night ? index % 3 !== 1 : index % 7 === 0
  const offline = peers.length > 0 && peers.every((d) => d.onlineStatus === 'OFFLINE') && index % 9 === 0
  return {
    status: on ? 'ON' : 'OFF',
    onlineStatus: offline ? 'OFFLINE' : 'ONLINE',
  }
}

const plotLamps = computed<PlotLamp[]>(() => {
  const real: PlotLamp[] = records.value.map((raw) => {
    const d = withLocation(raw)
    return {
      key: `dev-${d.id}`,
      deviceName: d.deviceName,
      deviceSn: d.deviceSn,
      groupName: d.groupName,
      latitude: d.latitude as number,
      longitude: d.longitude as number,
      status: d.status,
      onlineStatus: d.onlineStatus,
      real: d,
    }
  }).filter((d) => d.latitude != null && d.longitude != null)

  const extras: PlotLamp[] = EXTRA_CORRIDOR_LAMPS.map((lamp, i) => {
    const st = extraStatus(lamp, i)
    return {
      key: lamp.key,
      deviceName: lamp.deviceName,
      deviceSn: lamp.deviceSn,
      groupName: lamp.groupName,
      latitude: lamp.latitude,
      longitude: lamp.longitude,
      status: st.status,
      onlineStatus: st.onlineStatus,
      real: null,
    }
  })
  return [...real, ...extras]
})

const locatedReal = computed(() => records.value.map(withLocation).filter(hasLocation))
const unlocated = computed(() => records.value.map(withLocation).filter((d) => !hasLocation(d)))
const selected = computed(() => plotLamps.value.find((d) => d.key === selectedKey.value) ?? null)
const pinTarget = computed(() => records.value.find((d) => d.id === pinTargetId.value) ?? null)
const embed = computed(() => props.variant === 'embed')

function lampClass(d: PlotLamp): string {
  const on = d.status === 'ON' ? ' is-on' : ''
  const online = d.onlineStatus === 'ONLINE' ? ' is-online' : ' is-offline'
  const pick = d.real && pinTargetId.value === d.real.id ? ' is-pinning' : ''
  const sel = selectedKey.value === d.key ? ' is-selected' : ''
  const extra = d.real ? '' : ' is-extra'
  return `lamp-marker${on}${online}${pick}${sel}${extra}`
}

function lampIcon(d: PlotLamp): L.DivIcon {
  const compact = embed.value
  return L.divIcon({
    className: lampClass(d),
    html: '<span class="lamp-glow"></span><span class="lamp-head"></span><span class="lamp-pole"></span>',
    iconSize: compact ? [22, 34] : [28, 42],
    iconAnchor: compact ? [11, 32] : [14, 40],
    popupAnchor: [0, compact ? -30 : -36],
  })
}

function popupHtml(d: PlotLamp): string {
  const group = d.groupName?.trim() || '未分组'
  const light = d.status === 'ON' ? '开灯' : '关灯'
  const online = d.onlineStatus === 'ONLINE' ? '在线' : '离线'
  const kind = d.real ? '' : '<br/><span class="mono">廊道演示灯</span>'
  return `<strong>${d.deviceName}</strong><br/><span class="mono">${d.deviceSn}</span><br/>${group} · ${light} · ${online}${kind}`
}

function syncMarkers() {
  if (!map) return
  markers.clearLayers()
  markerByKey.clear()
  for (const d of plotLamps.value) {
    const marker = L.marker([d.latitude, d.longitude], {
      icon: lampIcon(d),
      title: d.deviceName,
    })
    marker.bindPopup(popupHtml(d))
    marker.on('click', () => {
      selectedKey.value = d.key
      if (d.real && pinTargetId.value && pinTargetId.value !== d.real.id) pinTargetId.value = null
    })
    markers.addLayer(marker)
    markerByKey.set(d.key, marker)
  }
}

function fitAll() {
  if (!map || !plotLamps.value.length) {
    map?.setView(CAMPUS_CENTER, 14)
    return
  }
  const bounds = L.latLngBounds(plotLamps.value.map((d) => [d.latitude, d.longitude] as L.LatLngTuple))
  map.fitBounds(bounds.pad(0.12), { maxZoom: 15, animate: true })
}

async function load(opts?: { fit?: boolean }) {
  const res = await api.listDevices({ page: 1, pageSize: 200 })
  if (res.code !== 200) {
    msg.value = res.errorMsg || '加载设备失败'
    return
  }
  records.value = [...res.data.records].sort((a, b) => a.id - b.id)
  await nextTick()
  syncMarkers()
  if (opts?.fit || !didFit) {
    fitAll()
    didFit = true
  }
}

async function onMapClick(e: L.LeafletMouseEvent) {
  if (embed.value) return
  const target = pinTarget.value
  if (!target) return
  const lat = Math.round(e.latlng.lat * 1e7) / 1e7
  const lng = Math.round(e.latlng.lng * 1e7) / 1e7
  const res = await api.setDeviceLocation(target.id, { latitude: lat, longitude: lng })
  msg.value = res.code === 200 ? `${target.deviceName}：${res.data}` : res.errorMsg || '标定失败'
  if (res.code === 200) {
    pinTargetId.value = null
    selectedKey.value = `dev-${target.id}`
    await load()
  }
}

function startPin(d: Device) {
  selectedKey.value = `dev-${d.id}`
  pinTargetId.value = d.id
  msg.value = `点击地图，为「${d.deviceName}」标定位置`
  map?.getContainer().classList.add('is-pinning')
}

function cancelPin() {
  pinTargetId.value = null
  map?.getContainer().classList.remove('is-pinning')
  msg.value = ''
}

async function clearLocation(d: Device) {
  const res = await api.setDeviceLocation(d.id, { latitude: null, longitude: null })
  msg.value = res.code === 200 ? res.data : res.errorMsg || '清除失败'
  if (res.code === 200) {
    pinTargetId.value = null
    await load()
  }
}

function focusDevice(d: Device) {
  const located = withLocation(d)
  selectedKey.value = `dev-${d.id}`
  if (!hasLocation(located) || !map) return
  map.flyTo([located.latitude as number, located.longitude as number], Math.max(map.getZoom(), 17), {
    duration: 0.45,
  })
}

async function toggle(d: Device) {
  const next = d.status === 'ON' ? 'OFF' : 'ON'
  switching.value = true
  const res = await api.switchDevice(d.id, next)
  switching.value = false
  msg.value =
    res.code === 200 ? `${d.deviceName}：已下发 ${res.data.command}` : res.errorMsg || '下发失败'
  await load()
}

watch(pinTargetId, (id) => {
  map?.getContainer().classList.toggle('is-pinning', id != null)
})

watch([selectedKey, pinTargetId], async () => {
  syncMarkers()
  await nextTick()
  if (selectedKey.value != null) markerByKey.get(selectedKey.value)?.openPopup()
})

watch(
  () => realtime.deviceSyncTick,
  () => {
    void load()
  },
)

onMounted(async () => {
  if (!mapEl.value) return
  map = L.map(mapEl.value, {
    center: CAMPUS_CENTER,
    zoom: 14,
    zoomControl: !embed.value,
    attributionControl: true,
  })
  L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    {
      subdomains: '1234',
      maxZoom: 18,
      attribution: '&copy; 高德地图',
    },
  ).addTo(map)
  markers.addTo(map)
  map.on('click', onMapClick)
  const resize = () => map?.invalidateSize()
  window.setTimeout(resize, 80)
  window.setTimeout(resize, 320)
  await load({ fit: true })
})

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="street-map" :data-embed="embed">
    <section class="map-stage">
      <div ref="mapEl" class="map-el" />
      <div v-if="pinTarget && !embed" class="pin-banner">
        点击地图标定「{{ pinTarget.deviceName }}」
        <button type="button" class="ui-btn ui-btn-compact ui-btn-secondary" @click="cancelPin">
          取消
        </button>
      </div>
      <div class="map-float">
        <p class="map-count">灯廊 · {{ plotLamps.length }} 盏</p>
        <div class="legend">
          <span><i class="dot on" />开灯</span>
          <span><i class="dot off" />关灯</span>
          <span><i class="dot offline" />离线</span>
        </div>
        <button type="button" class="fit-btn" @click="fitAll">适应全部路灯</button>
      </div>
    </section>

    <aside v-if="!embed" class="map-side ui-card">
      <h2 class="ui-card-title">路灯位置</h2>
      <p class="side-meta">
        接入 {{ locatedReal.length }} / {{ records.length }}
        · 廊道 {{ EXTRA_CORRIDOR_LAMPS.length }}
        · 重庆大学 A 区一带
      </p>
      <p v-if="msg" class="ui-msg">{{ msg }}</p>

      <div v-if="selected" class="selected-card">
        <p class="sel-name">{{ selected.deviceName }}</p>
        <p class="mono sel-sn">{{ selected.deviceSn }}</p>
        <p class="sel-row">
          <span class="ui-pill" :data-on="selected.status === 'ON'">{{ selected.status }}</span>
          {{ selected.onlineStatus === 'ONLINE' ? '在线' : '离线' }}
          · {{ selected.groupName || '未分组' }}
        </p>
        <div v-if="selected.real" class="ui-action-bar">
          <button
            type="button"
            class="ui-btn ui-btn-compact"
            :disabled="switching"
            @click="toggle(selected.real)"
          >
            {{ selected.real.status === 'ON' ? '关灯' : '开灯' }}
          </button>
          <button type="button" class="ui-btn ui-btn-compact ui-btn-secondary" @click="startPin(selected.real)">
            {{ hasLocation(selected.real) ? '重新标定' : '标定位置' }}
          </button>
          <button
            v-if="hasLocation(selected.real)"
            type="button"
            class="ui-btn ui-btn-compact ui-btn-secondary"
            @click="clearLocation(selected.real)"
          >
            清除
          </button>
        </div>
        <p v-else class="sel-hint">廊道演示灯，随同组接入灯状态点亮。</p>
      </div>

      <div class="device-scroll">
        <p v-if="unlocated.length" class="group-label">未标定</p>
        <button
          v-for="d in unlocated"
          :key="'u-' + d.id"
          type="button"
          class="device-row"
          :class="{ on: selectedKey === 'dev-' + d.id }"
          @click="selectedKey = 'dev-' + d.id"
        >
          <span class="row-name">{{ d.deviceName }}</span>
          <span class="row-act" @click.stop="startPin(d)">去标定</span>
        </button>

        <p class="group-label">已接入</p>
        <button
          v-for="d in locatedReal"
          :key="d.id"
          type="button"
          class="device-row"
          :class="{ on: selectedKey === 'dev-' + d.id }"
          @click="focusDevice(d)"
        >
          <span class="lamp-mini" :class="{ lit: d.status === 'ON', down: d.onlineStatus !== 'ONLINE' }" />
          <span class="row-name">{{ d.deviceName }}</span>
          <span class="mono row-sn">{{ d.deviceSn }}</span>
        </button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.street-map {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--space-4);
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
}

.street-map[data-embed='true'] {
  grid-template-columns: 1fr;
}

.map-stage {
  position: relative;
  min-height: 0;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow);
  background: #e8e8ed;
}

.map-el {
  height: 100%;
  min-height: 280px;
}

.street-map[data-embed='true'] .map-el {
  min-height: 0;
}

.pin-banner {
  position: absolute;
  z-index: 500;
  top: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 8px 12px 8px 16px;
  border-radius: var(--radius-full);
  background: rgba(29, 29, 31, 0.88);
  color: #f5f5f7;
  font-size: var(--text-sm);
  box-shadow: var(--shadow-lg);
}

.map-float {
  position: absolute;
  z-index: 500;
  left: var(--space-3);
  bottom: var(--space-3);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.map-count {
  margin: 0;
  padding: 6px 10px;
  border-radius: var(--radius-full);
  background: rgba(29, 29, 31, 0.82);
  color: #f5f5f7;
  font-size: var(--text-xs);
  font-weight: 650;
}

.legend {
  display: flex;
  gap: 10px;
  padding: 6px 10px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.92);
  font-size: var(--text-xs);
  color: var(--ink-soft);
  box-shadow: var(--shadow-sm);
}

.legend .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 5px;
  border-radius: 50%;
}

.legend .on {
  background: var(--lamp-on);
  box-shadow: 0 0 6px rgba(255, 214, 10, 0.8);
}

.legend .off {
  background: #8e8e93;
}

.legend .offline {
  background: var(--danger);
}

.fit-btn {
  padding: 6px 12px;
  border: 0;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.92);
  color: var(--ink);
  font: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.map-side {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.side-meta {
  margin: 0 0 var(--space-3);
  color: var(--ink-muted);
  font-size: var(--text-xs);
}

.selected-card {
  flex-shrink: 0;
  padding: var(--space-3);
  margin-bottom: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--panel-secondary);
  border: 1px solid var(--line);
}

.sel-name {
  margin: 0;
  font-weight: 650;
}

.sel-sn {
  margin: 2px 0 var(--space-2);
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.sel-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  color: var(--ink-soft);
}

.sel-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.device-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
}

.group-label {
  margin: var(--space-3) 0 var(--space-2);
  font-size: var(--text-xs);
  font-weight: 650;
  letter-spacing: var(--tracking-wide);
  color: var(--ink-muted);
  text-transform: uppercase;
}

.device-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: 8px 10px;
  margin-bottom: 4px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.device-row:hover,
.device-row.on {
  background: var(--accent-soft);
}

.row-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
}

.row-sn {
  font-size: 10px;
  color: var(--ink-muted);
}

.row-act {
  font-size: var(--text-xs);
  font-weight: 650;
  color: var(--accent);
}

.lamp-mini {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #8e8e93;
}

.lamp-mini.lit {
  background: var(--lamp-on);
  box-shadow: 0 0 6px rgba(255, 214, 10, 0.7);
}

.lamp-mini.down {
  background: var(--danger);
}

@media (max-width: 960px) {
  .street-map:not([data-embed='true']) {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(280px, 1fr) minmax(220px, 40%);
  }
}
</style>

<style>
.leaflet-container.is-pinning {
  cursor: crosshair;
}

.lamp-marker {
  background: transparent;
  border: 0;
}

.lamp-marker .lamp-glow {
  position: absolute;
  left: 50%;
  top: 4px;
  width: 18px;
  height: 18px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: transparent;
}

.lamp-marker.is-on .lamp-glow {
  background: radial-gradient(circle, rgba(255, 214, 10, 0.85) 0%, rgba(255, 149, 0, 0) 70%);
  box-shadow: 0 0 14px 4px rgba(255, 214, 10, 0.55);
}

.lamp-marker .lamp-head {
  position: absolute;
  left: 50%;
  top: 6px;
  width: 14px;
  height: 10px;
  transform: translateX(-50%);
  border-radius: 7px 7px 3px 3px;
  background: #636366;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.lamp-marker.is-on .lamp-head {
  background: #ffd60a;
}

.lamp-marker.is-offline .lamp-head {
  outline: 2px solid #ff3b30;
  outline-offset: 1px;
}

.lamp-marker .lamp-pole {
  position: absolute;
  left: 50%;
  top: 16px;
  width: 3px;
  height: 22px;
  transform: translateX(-50%);
  border-radius: 1px;
  background: #3a3a3c;
}

.lamp-marker.is-selected .lamp-pole {
  background: #0071e3;
}

.lamp-marker.is-pinning .lamp-head {
  outline: 2px dashed #0071e3;
}

.lamp-marker.is-extra {
  opacity: 0.92;
}

.leaflet-popup-content {
  font-size: 13px;
  line-height: 1.45;
}

.leaflet-popup-content .mono {
  font-family: var(--font-mono);
  font-size: 11px;
  color: #6e6e73;
}
</style>
