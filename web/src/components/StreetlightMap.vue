<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../api/client'
import {
  CHONGQING_CENTER,
  CHONGQING_FLEET,
  groupColor,
  resolveLampLocation,
} from '../config/lampLocations'
import { groupZonePath } from '../utils/groupZone'
import { useRealtimeStore } from '../stores/realtime'
import type { Device } from '../types/domain'

const props = withDefaults(
  defineProps<{
    variant?: 'full' | 'embed' | 'command'
  }>(),
  { variant: 'full' },
)

type PlotLamp = {
  key: string
  deviceName: string
  deviceSn: string
  groupName: string | null
  latitude: number
  longitude: number
  status: 'ON' | 'OFF'
  onlineStatus: 'ONLINE' | 'OFFLINE'
  real: Device
}

type GroupZone = {
  name: string
  district: string
  color: string
  count: number
  onCount: number
  onlineCount: number
  path: L.LatLngExpression[]
  bounds: L.LatLngBounds
}

const CITY_CENTER: L.LatLngExpression = CHONGQING_CENTER
const DISTRICT_BY_GROUP = Object.fromEntries(CHONGQING_FLEET.groups.map((g) => [g.name, g.district]))

const realtime = useRealtimeStore()
const records = ref<Device[]>([])
const selectedKey = ref<string | null>(null)
const selectedGroup = ref<string | null>(null)
const pinTargetId = ref<string | null>(null)
const msg = ref('')
const mapEl = ref<HTMLElement | null>(null)
const switching = ref(false)
const groupSwitching = ref<string | null>(null)
const threshDraft = reactive({
  lightThresholdOn: 30,
  lightThresholdOff: 80,
  heartbeatTimeout: 180,
})
const threshMsg = ref('')
const threshSaving = ref(false)

let map: L.Map | null = null
let markers = L.layerGroup()
let zones = L.layerGroup()
const markerByKey = new Map<string, L.Marker>()
let didFit = false

function hasLocation(d: Device): boolean {
  return d.latitude != null && d.longitude != null
}

function withLocation(d: Device): Device {
  const loc = resolveLampLocation(d.deviceSn, d.latitude, d.longitude)
  return { ...d, latitude: loc.latitude, longitude: loc.longitude }
}

const plotLamps = computed<PlotLamp[]>(() =>
  records.value
    .map((raw) => {
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
    })
    .filter((d) => d.latitude != null && d.longitude != null),
)

const groupZones = computed<GroupZone[]>(() => {
  const buckets = new Map<string, PlotLamp[]>()
  for (const lamp of plotLamps.value) {
    const name = lamp.groupName?.trim()
    if (!name) continue
    const list = buckets.get(name) ?? []
    list.push(lamp)
    buckets.set(name, list)
  }
  return [...buckets.entries()]
    .map(([name, lamps]) => {
      const color = groupColor(name)
      const path = groupZonePath(lamps)
      const bounds = L.latLngBounds(path.length ? path : lamps.map((l) => [l.latitude, l.longitude] as L.LatLngTuple))
      return {
        name,
        district: DISTRICT_BY_GROUP[name] ?? '',
        color,
        count: lamps.length,
        onCount: lamps.filter((l) => l.status === 'ON').length,
        onlineCount: lamps.filter((l) => l.onlineStatus === 'ONLINE').length,
        path,
        bounds,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
})

const locatedReal = computed(() => records.value.map(withLocation).filter(hasLocation))
const unlocated = computed(() => records.value.map(withLocation).filter((d) => !hasLocation(d)))
const selected = computed(() => plotLamps.value.find((d) => d.key === selectedKey.value) ?? null)
const pinTarget = computed(() => records.value.find((d) => d.id === pinTargetId.value) ?? null)
const embed = computed(() => props.variant === 'embed')
const command = computed(() => props.variant === 'command')
const showDock = computed(() => props.variant === 'full' || props.variant === 'command')

const groupedDevices = computed(() => {
  const map = new Map<string, Device[]>()
  for (const d of locatedReal.value) {
    const name = d.groupName?.trim() || '未分组'
    const list = map.get(name) ?? []
    list.push(d)
    map.set(name, list)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'zh'))
})

const dockLamps = computed(() => {
  if (!selectedGroup.value) return locatedReal.value
  return locatedReal.value.filter((d) => (d.groupName || '未分组') === selectedGroup.value)
})

function lampClass(d: PlotLamp): string {
  const on = d.status === 'ON' ? ' is-on' : ''
  const online = d.onlineStatus === 'ONLINE' ? ' is-online' : ' is-offline'
  const pick = pinTargetId.value === d.real.id ? ' is-pinning' : ''
  const sel = selectedKey.value === d.key ? ' is-selected' : ''
  return `lamp-marker${on}${online}${pick}${sel}`
}

function lampIcon(d: PlotLamp): L.DivIcon {
  const color = groupColor(d.groupName)
  return L.divIcon({
    className: lampClass(d),
    html: `<span class="lamp-pin" style="--g:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
}

function popupHtml(d: PlotLamp): string {
  const group = d.groupName?.trim() || '未分组'
  const light = d.status === 'ON' ? '开灯' : '关灯'
  const online = d.onlineStatus === 'ONLINE' ? '在线' : '离线'
  return `<strong>${d.deviceName}</strong><br/><span class="mono">${d.deviceSn}</span><br/>${group} · ${light} · ${online}`
}

function syncZones() {
  if (!map) return
  zones.clearLayers()
  for (const g of groupZones.value) {
    if (g.path.length < 3) continue
    const active = selectedGroup.value === g.name
    const poly = L.polygon(g.path, {
      pane: 'groups',
      color: g.color,
      weight: active ? 2.5 : 1.5,
      fillColor: g.color,
      fillOpacity: active ? 0.3 : 0.16,
      opacity: active ? 0.95 : 0.72,
      smoothFactor: 1.2,
    })
    poly.bindTooltip(`${g.name} · ${g.district}`, { sticky: true, opacity: 0.92 })
    poly.on('click', (e) => {
      L.DomEvent.stopPropagation(e)
      focusGroup(g.name)
    })
    zones.addLayer(poly)
  }
}

function syncMarkers() {
  if (!map) return
  markers.clearLayers()
  markerByKey.clear()
  for (const d of plotLamps.value) {
    const marker = L.marker([d.latitude, d.longitude], {
      icon: lampIcon(d),
      title: d.deviceName,
      riseOnHover: true,
    })
    marker.bindPopup(popupHtml(d))
    marker.on('click', () => {
      selectedKey.value = d.key
      selectedGroup.value = d.groupName
      if (pinTargetId.value && pinTargetId.value !== d.real.id) pinTargetId.value = null
    })
    markers.addLayer(marker)
    markerByKey.set(d.key, marker)
  }
}

function fitAll() {
  if (!map || !plotLamps.value.length) {
    map?.setView(CITY_CENTER, 12)
    return
  }
  const bounds = L.latLngBounds(plotLamps.value.map((d) => [d.latitude, d.longitude] as L.LatLngTuple))
  map.fitBounds(bounds.pad(0.18), { maxZoom: 13, animate: true })
}

function focusGroup(name: string) {
  selectedGroup.value = name
  const zone = groupZones.value.find((g) => g.name === name)
  if (zone && map) {
    map.fitBounds(zone.bounds.pad(0.35), { maxZoom: 15, animate: true })
  }
}

async function load(opts?: { fit?: boolean; threshold?: boolean }) {
  const [devRes, thRes] = await Promise.all([
    api.listDevices({ page: 1, pageSize: 200 }),
    command.value && opts?.threshold ? api.getThreshold() : Promise.resolve(null),
  ])
  if (devRes.code !== 200) {
    msg.value = devRes.errorMsg || '加载设备失败'
    return
  }
  records.value = [...devRes.data.records].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
  if (thRes && thRes.code === 200) {
    threshDraft.lightThresholdOn = thRes.data.lightThresholdOn
    threshDraft.lightThresholdOff = thRes.data.lightThresholdOff
    threshDraft.heartbeatTimeout = thRes.data.heartbeatTimeout
  }
  await nextTick()
  syncZones()
  syncMarkers()
  if (opts?.fit || !didFit) {
    fitAll()
    didFit = true
  }
}

async function onMapClick(e: L.LeafletMouseEvent) {
  if (embed.value || command.value) return
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
  selectedGroup.value = d.groupName
  if (!hasLocation(located) || !map) return
  map.flyTo([located.latitude as number, located.longitude as number], Math.max(map.getZoom(), 16), {
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

async function switchGroup(name: string, status: 'ON' | 'OFF') {
  groupSwitching.value = name
  const res = await api.switchGroup(name, status)
  groupSwitching.value = null
  msg.value =
    res.code === 200 ? `${name}：已${status === 'ON' ? '全开' : '全关'} ${res.data.count} 盏` : res.errorMsg || '编组失败'
  selectedGroup.value = name
  await load()
}

async function saveThreshold() {
  if (threshDraft.lightThresholdOn >= threshDraft.lightThresholdOff) {
    threshMsg.value = '开灯阈值必须小于关灯阈值'
    return
  }
  if (threshDraft.heartbeatTimeout <= 0) {
    threshMsg.value = '心跳超时必须大于 0'
    return
  }
  threshSaving.value = true
  const res = await api.updateThreshold({ ...threshDraft })
  threshSaving.value = false
  threshMsg.value = res.code === 200 ? res.data : res.errorMsg || '保存失败'
  if (res.code === 200) await load({ threshold: true })
}

watch(pinTargetId, (id) => {
  map?.getContainer().classList.toggle('is-pinning', id != null)
})

watch([selectedKey, pinTargetId, selectedGroup], async () => {
  syncZones()
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
    center: CITY_CENTER,
    zoom: 12,
    zoomControl: !embed.value,
    attributionControl: true,
  })
  map.createPane('groups')
  const pane = map.getPane('groups')
  if (pane) pane.style.zIndex = '350'
  L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    {
      subdomains: '1234',
      maxZoom: 18,
      attribution: '&copy; 高德地图',
    },
  ).addTo(map)
  zones.addTo(map)
  markers.addTo(map)
  map.on('click', onMapClick)
  const resize = () => map?.invalidateSize()
  window.setTimeout(resize, 80)
  window.setTimeout(resize, 320)
  await load({ fit: true, threshold: true })
})

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="street-map" :data-variant="props.variant">
    <section class="map-stage">
      <div ref="mapEl" class="map-el" />
      <div v-if="pinTarget && !embed && !command" class="pin-banner">
        点击地图标定「{{ pinTarget.deviceName }}」
        <button type="button" class="ui-btn ui-btn-compact ui-btn-secondary" @click="cancelPin">
          取消
        </button>
      </div>
      <div class="map-float">
        <p class="map-count">重庆灯廊 · {{ plotLamps.length }} 盏 · {{ groupZones.length }} 组</p>
        <div class="legend">
          <span><i class="dot on" />开灯</span>
          <span><i class="dot off" />关灯</span>
          <span><i class="dot offline" />离线</span>
          <span><i class="dot zone" />编组区块</span>
        </div>
        <button type="button" class="fit-btn" @click="fitAll">全市视野</button>
      </div>
    </section>

    <aside v-if="showDock" class="map-side ui-card">
      <div class="dock-head">
        <h2 class="ui-card-title">{{ command ? '指挥台' : '路灯位置' }}</h2>
        <p class="side-meta">{{ locatedReal.length }} / {{ records.length }} 盏</p>
      </div>
      <p v-if="msg" class="ui-msg">{{ msg }}</p>

      <div class="dock-scroll">
        <div class="group-rows">
          <div
            v-for="g in groupZones"
            :key="g.name"
            class="group-row"
            :class="{ on: selectedGroup === g.name }"
          >
            <button type="button" class="group-main" @click="focusGroup(g.name)">
              <i class="chip-swatch" :style="{ background: g.color }" />
              <span class="chip-name">{{ g.name }}</span>
              <span class="mono chip-count">{{ g.onCount }}/{{ g.count }}</span>
            </button>
            <button
              type="button"
              class="ui-btn ui-btn-compact"
              :disabled="groupSwitching === g.name"
              @click="switchGroup(g.name, 'ON')"
            >
              开
            </button>
            <button
              type="button"
              class="ui-btn ui-btn-compact ui-btn-secondary"
              :disabled="groupSwitching === g.name"
              @click="switchGroup(g.name, 'OFF')"
            >
              关
            </button>
          </div>
        </div>

        <div v-if="selected" class="selected-card">
          <p class="sel-name">{{ selected.deviceName }}</p>
          <p class="mono sel-sn">{{ selected.deviceSn }}</p>
          <p class="sel-row">
            <span class="ui-pill" :data-on="selected.status === 'ON'">{{ selected.status }}</span>
            {{ selected.onlineStatus === 'ONLINE' ? '在线' : '离线' }}
            · {{ selected.groupName || '未分组' }}
          </p>
          <div class="ui-action-bar">
            <button
              type="button"
              class="ui-btn ui-btn-compact"
              :disabled="switching"
              @click="toggle(selected.real)"
            >
              {{ selected.real.status === 'ON' ? '关灯' : '开灯' }}
            </button>
            <template v-if="!command">
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
            </template>
          </div>
        </div>
        <p v-else class="sel-hint">点地图灯杆或编组色块，直接开关。</p>

        <form v-if="command" class="thresh-card" @submit.prevent="saveThreshold">
          <p class="group-label">全局阈值</p>
          <label class="thresh-row">
            开灯 &lt;
            <input v-model.number="threshDraft.lightThresholdOn" class="ui-input" type="number" min="0" step="1" />
            lux
          </label>
          <label class="thresh-row">
            关灯 &gt;
            <input v-model.number="threshDraft.lightThresholdOff" class="ui-input" type="number" min="0" step="1" />
            lux
          </label>
          <label class="thresh-row">
            心跳
            <input v-model.number="threshDraft.heartbeatTimeout" class="ui-input" type="number" min="1" step="1" />
            s
          </label>
          <p v-if="threshMsg" class="ui-msg">{{ threshMsg }}</p>
          <button type="submit" class="ui-btn ui-btn-compact" :disabled="threshSaving">保存阈值</button>
        </form>

        <template v-if="!command">
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
        </template>

        <template v-if="command">
          <p class="group-label">{{ selectedGroup || '全部路灯' }}</p>
          <button
            v-for="d in dockLamps"
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
        </template>
        <template v-else>
          <template v-for="[name, list] in groupedDevices" :key="name">
            <p class="group-label">
              <i class="chip-swatch" :style="{ background: groupColor(name === '未分组' ? null : name) }" />
              {{ name }}
            </p>
            <button
              v-for="d in list"
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
          </template>
        </template>
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

.street-map[data-variant='embed'] {
  grid-template-columns: 1fr;
}

.street-map[data-variant='command'] {
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: var(--space-3);
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

.street-map[data-variant='embed'] .map-el,
.street-map[data-variant='command'] .map-el {
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

.legend .zone {
  border-radius: 2px;
  background: linear-gradient(90deg, #0071e3, #af52de, #ff6b4a);
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
  padding: var(--space-4);
}

.dock-head {
  flex-shrink: 0;
}

.dock-head .ui-card-title {
  margin-bottom: 2px;
}

.dock-scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
}

.side-meta {
  margin: 0 0 var(--space-2);
  color: var(--ink-muted);
  font-size: var(--text-xs);
}

.group-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--space-3);
}

.group-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  border-radius: var(--radius-sm);
}

.group-row.on {
  background: var(--accent-soft);
}

.group-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.group-row .ui-btn {
  flex-shrink: 0;
  padding: 4px 8px;
}

.chip-swatch {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chip-name {
  font-weight: 650;
}

.chip-count {
  color: var(--ink-muted);
  font-size: 10px;
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
  margin: 0 0 var(--space-3);
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.group-ops {
  flex-shrink: 0;
  margin-bottom: var(--space-3);
}

.group-ops-label {
  margin: 0 0 6px;
  font-size: var(--text-xs);
  font-weight: 650;
  color: var(--ink-soft);
}

.thresh-card {
  flex-shrink: 0;
  padding: var(--space-3);
  margin-bottom: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--paper);
  border: 1px solid var(--line);
}

.thresh-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: var(--text-xs);
  color: var(--ink-soft);
}

.thresh-row .ui-input {
  width: 72px;
  padding: 4px 8px;
}

.group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: var(--space-3) 0 var(--space-2);
  font-size: var(--text-xs);
  font-weight: 650;
  letter-spacing: var(--tracking-wide);
  color: var(--ink-muted);
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
  .street-map:not([data-variant='embed']) {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(280px, 1fr) minmax(240px, 42%);
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

.lamp-marker .lamp-pin {
  display: block;
  width: 14px;
  height: 14px;
  margin: 2px;
  border-radius: 50%;
  box-sizing: border-box;
  border: 2.5px solid var(--g, #8e8e93);
  background: #6e6e73;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.lamp-marker.is-on .lamp-pin {
  background: #ffd60a;
  box-shadow:
    0 0 0 3px rgba(255, 214, 10, 0.28),
    0 0 10px 2px rgba(255, 214, 10, 0.55);
}

.lamp-marker.is-offline .lamp-pin {
  background: #ff3b30;
  border-color: #ff3b30;
  box-shadow: none;
}

.lamp-marker.is-selected .lamp-pin {
  width: 16px;
  height: 16px;
  margin: 1px;
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 5px var(--g, #0071e3);
}

.lamp-marker.is-on.is-selected .lamp-pin {
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 5px var(--g, #0071e3),
    0 0 10px 2px rgba(255, 214, 10, 0.5);
}

.lamp-marker.is-pinning .lamp-pin {
  border-style: dashed;
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
