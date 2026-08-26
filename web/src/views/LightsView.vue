<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import CalendarFilter, { type DayMeta } from '../components/CalendarFilter.vue'
import { api } from '../api/client'
import { useRealtimeStore } from '../stores/realtime'
import type { Device, LightReading, ThresholdConfig, ThresholdOverride, TrendPoint } from '../types/domain'
import {
  dateKey,
  dayRange,
  extractDateKey,
  formatDisplayDate,
  monthRange,
  parseDateKey,
} from '../utils/datetime'

type ViewMode = 'all' | 'group' | 'device'

const realtime = useRealtimeStore()

const devices = ref<Device[]>([])
const viewMode = ref<ViewMode>('all')
const groupName = ref('')
const deviceId = ref<number | null>(null)
const records = ref<LightReading[]>([])
const trend = ref<TrendPoint[]>([])
const monthReadings = ref<LightReading[]>([])
const threshold = ref<ThresholdConfig | null>(null)
const overrides = ref<ThresholdOverride[]>([])
/** 当前视图对应的展示阈值（全局 / 编组覆盖 / 设备生效） */
const bannerThreshold = ref<{
  on: number
  off: number
  sourceLabel: string
  href: string
  actionLabel: string
} | null>(null)
const selectedDay = ref(dateKey(new Date()))
const viewMonth = ref({ y: new Date().getFullYear(), m: new Date().getMonth() })

const hover = ref<{
  time: string
  value: number
  name: string
  x: number
  y: number
} | null>(null)

const groupNames = computed(() => {
  const set = new Set<string>()
  for (const d of devices.value) {
    if (d.groupName?.trim()) set.add(d.groupName.trim())
  }
  return [...set].sort()
})

const scopeLabel = computed(() => {
  if (viewMode.value === 'all') return '全体路灯 · 分钟平均'
  if (viewMode.value === 'group') return `编组「${groupName.value || '—'}」· 分钟平均`
  const d = devices.value.find((x) => x.id === deviceId.value)
  return d?.deviceName ?? '—'
})

const maxVal = computed(() => Math.max(1, ...trend.value.map((t) => t.value)))

const yTicks = computed(() => {
  const max = maxVal.value
  const nice = niceCeil(max)
  return [nice, nice * 0.75, nice * 0.5, nice * 0.25, 0].map((v) => Math.round(v))
})

const plotMax = computed(() => Math.max(maxVal.value, yTicks.value[0] || 1))

const xLabelStep = computed(() => {
  const n = trend.value.length
  if (n <= 12) return 1
  if (n <= 24) return 2
  if (n <= 48) return 4
  return Math.max(1, Math.ceil(n / 12))
})

const dayStrip = computed(() => {
  const map = new Map<string, LightReading[]>()
  for (const r of monthReadings.value) {
    const k = extractDateKey(r.createdAt)
    const list = map.get(k) ?? []
    list.push(r)
    map.set(k, list)
  }
  const keys = [...map.keys()].sort()
  return keys.map((key) => {
    const list = map.get(key)!.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    const values = list.map((x) => x.lightIntensity)
    const max = Math.max(1, ...values)
    return {
      key,
      label: key.slice(5),
      count: list.length,
      avg: values.reduce((s, v) => s + v, 0) / values.length,
      spark: values.filter((_, i) => i % Math.max(1, Math.floor(values.length / 8)) === 0).slice(0, 8),
      sparkHeights: values
        .filter((_, i) => i % Math.max(1, Math.floor(values.length / 8)) === 0)
        .slice(0, 8)
        .map((v) => (v / max) * 100),
    }
  })
})

const dayMeta = computed<Record<string, DayMeta>>(() => {
  const meta: Record<string, DayMeta> = {}
  for (const d of dayStrip.value) {
    meta[d.key] = { spark: d.spark, count: d.count }
  }
  return meta
})

function niceCeil(v: number) {
  if (v <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / exp
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return nice * exp
}

function formatClock(iso: string) {
  const m = iso.match(/(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : iso.slice(11, 16)
}

function showXLabel(i: number) {
  const n = trend.value.length
  if (n === 0) return false
  if (i === 0 || i === n - 1) return true
  return i % xLabelStep.value === 0
}

function scopeQuery(): { deviceId?: number; groupName?: string } {
  if (viewMode.value === 'device' && deviceId.value != null) return { deviceId: deviceId.value }
  if (viewMode.value === 'group' && groupName.value) return { groupName: groupName.value }
  return {}
}

function onBarEnter(e: MouseEvent, p: TrendPoint) {
  const frame = (e.currentTarget as HTMLElement).closest('.chart-frame') as HTMLElement | null
  if (!frame) return
  const rect = frame.getBoundingClientRect()
  hover.value = {
    time: p.time,
    value: p.value,
    name: scopeLabel.value,
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function onBarMove(e: MouseEvent) {
  if (!hover.value) return
  const frame = (e.currentTarget as HTMLElement).closest('.chart-frame') as HTMLElement | null
  if (!frame) return
  const rect = frame.getBoundingClientRect()
  hover.value = {
    ...hover.value,
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function onBarLeave() {
  hover.value = null
}

async function loadDevices() {
  const res = await api.listDevices({ page: 1, pageSize: 100 })
  if (res.code !== 200) return
  devices.value = [...res.data.records].sort((a, b) => a.id - b.id)
  if (!groupName.value && groupNames.value.length) groupName.value = groupNames.value[0]
  if (devices.value.length) {
    const ids = new Set(devices.value.map((d) => d.id))
    if (deviceId.value === null || !ids.has(deviceId.value)) {
      deviceId.value = devices.value[0].id
    }
  } else {
    deviceId.value = null
  }
}

function canLoadScope() {
  if (viewMode.value === 'device') return deviceId.value != null
  if (viewMode.value === 'group') return !!groupName.value
  return true
}

async function loadMonth() {
  if (!canLoadScope()) return
  const q = scopeQuery()
  const token = JSON.stringify({ mode: viewMode.value, ...q, m: viewMonth.value })
  const { start, end } = monthRange(viewMonth.value.y, viewMonth.value.m)
  const res = await api.listLightReadings({ page: 1, pageSize: 500, ...q })
  if (JSON.stringify({ mode: viewMode.value, ...scopeQuery(), m: viewMonth.value }) !== token) return
  if (res.code !== 200) return
  monthReadings.value = res.data.records.filter((r) => {
    const k = extractDateKey(r.createdAt)
    return k >= start.slice(0, 10) && k <= end.slice(0, 10)
  })
}

async function loadDay() {
  if (!canLoadScope()) {
    records.value = []
    trend.value = []
    return
  }
  const q = scopeQuery()
  const token = JSON.stringify({ mode: viewMode.value, ...q, day: selectedDay.value })
  const { start, end } = dayRange(selectedDay.value)
  const [list, tr] = await Promise.all([
    api.listLightReadings({ page: 1, pageSize: 200, ...q }),
    api.lightTrend({ ...q, startTime: start, endTime: end }),
  ])
  if (JSON.stringify({ mode: viewMode.value, ...scopeQuery(), day: selectedDay.value }) !== token) return
  if (list.code === 200) {
    records.value = list.data.records.filter((r) => extractDateKey(r.createdAt) === selectedDay.value)
  }
  if (tr.code === 200) {
    const points = tr.data.filter((p) => extractDateKey(p.time) === selectedDay.value)
    // 总体/编组禁止回退到原始混表：否则会把单灯尖峰当成「总体」柱
    if (points.length) {
      trend.value = points
    } else if (viewMode.value === 'device') {
      trend.value = records.value
        .slice()
        .reverse()
        .map((r) => ({ time: r.createdAt, value: r.lightIntensity }))
    } else {
      trend.value = []
    }
  }
}

async function load() {
  await loadMonth()
  await loadDay()
}

async function loadThresholdBanner() {
  const [th, ov] = await Promise.all([api.getThreshold(), api.listThresholdOverrides()])
  if (th.code === 200) threshold.value = th.data
  if (ov.code === 200) overrides.value = ov.data
  const global = threshold.value
  if (!global) {
    bannerThreshold.value = null
    return
  }

  if (viewMode.value === 'all') {
    bannerThreshold.value = {
      on: global.lightThresholdOn,
      off: global.lightThresholdOff,
      sourceLabel: '全局默认',
      href: '/threshold',
      actionLabel: '修改全局 / 覆盖',
    }
    return
  }

  if (viewMode.value === 'group') {
    const name = groupName.value.trim()
    const hit = overrides.value.find((o) => o.scopeType === 'GROUP' && o.scopeKey === name)
    const q = name ? `?scopeType=GROUP&scopeKey=${encodeURIComponent(name)}` : ''
    if (hit) {
      bannerThreshold.value = {
        on: hit.lightThresholdOn,
        off: hit.lightThresholdOff,
        sourceLabel: `编组「${name}」覆盖`,
        href: `/threshold${q}`,
        actionLabel: '修改该编组阈值',
      }
    } else {
      bannerThreshold.value = {
        on: global.lightThresholdOn,
        off: global.lightThresholdOff,
        sourceLabel: name ? `编组「${name}」沿用全局` : '全局默认',
        href: `/threshold${q}`,
        actionLabel: name ? '为该编组单独设置' : '修改阈值',
      }
    }
    return
  }

  if (deviceId.value == null) {
    bannerThreshold.value = {
      on: global.lightThresholdOn,
      off: global.lightThresholdOff,
      sourceLabel: '全局默认',
      href: '/threshold',
      actionLabel: '修改阈值',
    }
    return
  }
  const eff = await api.getEffectiveThreshold(deviceId.value)
  if (eff.code !== 200) {
    bannerThreshold.value = {
      on: global.lightThresholdOn,
      off: global.lightThresholdOff,
      sourceLabel: '全局默认',
      href: `/threshold?scopeType=DEVICE&scopeKey=${deviceId.value}`,
      actionLabel: '为该灯单独设置',
    }
    return
  }
  const sourceLabel =
    eff.data.source === 'DEVICE'
      ? '本灯单独覆盖'
      : eff.data.source === 'GROUP'
        ? `沿用编组「${eff.data.sourceKey}」`
        : '沿用全局'
  bannerThreshold.value = {
    on: eff.data.lightThresholdOn,
    off: eff.data.lightThresholdOff,
    sourceLabel,
    href: `/threshold?scopeType=DEVICE&scopeKey=${deviceId.value}`,
    actionLabel: eff.data.source === 'DEVICE' ? '修改本灯阈值' : '为本灯单独设置',
  }
}

onMounted(async () => {
  await loadDevices()
  await loadThresholdBanner()
  await load()
})

watch([viewMode, groupName, deviceId], () => {
  void load()
  void loadThresholdBanner()
})

watch(selectedDay, (v) => {
  if (!v) {
    selectedDay.value = dateKey(new Date())
    return
  }
  void loadDay()
})

watch(
  () => realtime.latestLight,
  () => {
    void load()
  },
)

function onMonthChange(y: number, m: number) {
  viewMonth.value = { y, m }
  void loadMonth()
}

function pickStripDay(key: string) {
  selectedDay.value = key
  viewMonth.value = {
    y: parseDateKey(key).getFullYear(),
    m: parseDateKey(key).getMonth(),
  }
}

function setMode(mode: ViewMode) {
  viewMode.value = mode
  if (mode === 'group' && !groupName.value && groupNames.value.length) {
    groupName.value = groupNames.value[0]
  }
}
</script>

<template>
  <div class="ui-page ui-page-fill lights-page">
    <div class="lights-top slide-up-enter-active">
      <RouterLink v-if="bannerThreshold" :to="bannerThreshold.href" class="banner ui-link-card">
        <span class="banner-scope">{{ bannerThreshold.sourceLabel }}</span>
        自动开关灯：光照 &lt; <strong>{{ bannerThreshold.on }}</strong> lux 开灯，
        &gt; <strong>{{ bannerThreshold.off }}</strong> lux 关灯
        <span class="banner-action">· {{ bannerThreshold.actionLabel }}</span>
      </RouterLink>

      <div class="toolbar slide-up-enter-active slide-up-delay-1">
        <div class="mode-seg" role="tablist" aria-label="视图范围">
          <button
            type="button"
            class="seg-btn"
            :class="{ on: viewMode === 'all' }"
            @click="setMode('all')"
          >
            总体
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ on: viewMode === 'group' }"
            :disabled="!groupNames.length"
            @click="setMode('group')"
          >
            编组
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ on: viewMode === 'device' }"
            :disabled="!devices.length"
            @click="setMode('device')"
          >
            单灯
          </button>
        </div>
        <label v-if="viewMode === 'group'" class="ui-label device-select">
          编组
          <select v-model="groupName" class="ui-select" :disabled="!groupNames.length">
            <option v-for="g in groupNames" :key="g" :value="g">{{ g }}</option>
          </select>
        </label>
        <label v-if="viewMode === 'device'" class="ui-label device-select">
          设备
          <select v-model="deviceId" class="ui-select" :disabled="!devices.length">
            <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.deviceName }}</option>
          </select>
        </label>
        <CalendarFilter
          v-model="selectedDay"
          mode="spark"
          label="日历选日"
          :day-meta="dayMeta"
          @month-change="onMonthChange"
        />
      </div>
    </div>

    <div class="ui-scroll-panel lights-body slide-up-enter-active slide-up-delay-1">
      <section class="ui-card chart-card slide-up-enter-active slide-up-delay-1">
        <div class="chart-head">
          <h2 class="ui-card-title">光照趋势 · {{ formatDisplayDate(selectedDay) }}</h2>
          <p class="chart-sub">{{ scopeLabel }} · {{ trend.length }} 个采样点</p>
        </div>

        <div class="chart-frame">
          <div class="y-axis" aria-hidden="true">
            <span v-for="(t, i) in yTicks" :key="i" class="y-tick mono">{{ t }}</span>
          </div>
          <div class="chart-main">
            <div class="chart-scroll">
              <div class="chart-plot">
                <div class="bars-row">
                  <div
                    v-for="(p, i) in trend"
                    :key="i"
                    class="bar-col"
                    @mouseenter="onBarEnter($event, p)"
                    @mousemove="onBarMove"
                    @mouseleave="onBarLeave"
                  >
                    <div
                      class="bar"
                      :style="{ height: `${(p.value / plotMax) * 100}%` }"
                    />
                  </div>
                  <p v-if="!trend.length" class="chart-empty">该日暂无数据</p>
                </div>
                <div class="x-axis">
                  <span
                    v-for="(p, i) in trend"
                    :key="'x' + i"
                    class="x-tick mono"
                    :class="{ show: showXLabel(i) }"
                  >
                    {{ showXLabel(i) ? formatClock(p.time) : '' }}
                  </span>
                </div>
              </div>
            </div>
            <p class="y-unit">lux</p>
          </div>

          <div
            v-if="hover"
            class="chart-tip"
            :style="{
              left: `${hover.x + 16}px`,
              top: `${Math.max(8, hover.y - 76)}px`,
            }"
          >
            <p class="tip-name">{{ hover.name }}</p>
            <p class="tip-row mono">{{ hover.time }}</p>
            <p class="tip-row tip-lux mono">{{ hover.value.toFixed(1) }} lux</p>
          </div>
        </div>
        <p class="scroll-hint">左右滑动查看全部采样 · 悬停柱条查看时间与亮度</p>

        <div class="day-rail-wrap">
          <p class="rail-label">按天浏览</p>
          <div class="day-rail-tray">
            <div class="day-rail">
              <button
                v-for="d in dayStrip"
                :key="d.key"
                type="button"
                class="day-chip"
                :class="{ on: d.key === selectedDay }"
                @click="pickStripDay(d.key)"
              >
                <span class="chip-date">{{ d.label }}</span>
                <span class="chip-spark">
                  <i
                    v-for="(h, j) in d.sparkHeights"
                    :key="j"
                    :style="{ height: Math.max(10, h) + '%' }"
                  />
                </span>
                <span class="chip-avg mono">{{ d.avg.toFixed(0) }}</span>
              </button>
              <p v-if="!dayStrip.length" class="rail-empty">本月暂无分天数据</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.lights-top {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex-shrink: 0;
}

.lights-body {
  flex: 1 1 0;
  min-height: 0;
}

.chart-card {
  flex: 1 1 auto;
}

.banner {
  display: block;
  padding: var(--space-4) var(--space-5);
  background: var(--sodium-soft);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink);
  text-decoration: none;
}

.banner-scope {
  display: inline-block;
  margin-right: 8px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--sodium-deep);
  background: rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-sm);
  vertical-align: 1px;
}

.banner-action {
  color: var(--ink-muted);
  font-weight: 500;
}

.banner strong {
  color: var(--sodium-deep);
  font-weight: 600;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}

.mode-seg {
  display: inline-flex;
  padding: 3px;
  background: var(--paper);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-inset);
}

.seg-btn {
  border: none;
  background: transparent;
  padding: 8px 14px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink-muted);
  border-radius: calc(var(--radius-md) - 2px);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-out),
    color var(--duration-fast);
}

.seg-btn:hover:not(:disabled) {
  color: var(--ink);
}

.seg-btn.on {
  background: var(--panel);
  color: var(--ink);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.06));
}

.seg-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.device-select {
  max-width: 280px;
  flex: 1 1 200px;
}

.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.chart-head .ui-card-title {
  margin-bottom: 0;
}

.chart-sub {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.chart-frame {
  position: relative;
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 8px;
  margin-top: var(--space-3);
  align-items: stretch;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 0 28px;
  text-align: right;
}

.y-tick {
  font-size: 10px;
  color: var(--ink-muted);
  line-height: 1;
}

.chart-main {
  min-width: 0;
  position: relative;
}

.chart-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #1d1d1f 0%, #2c2c2e 100%);
  -webkit-overflow-scrolling: touch;
}

.chart-plot {
  width: max-content;
  min-width: 100%;
  box-sizing: border-box;
  padding: 12px 16px 8px;
}

.bars-row {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: clamp(140px, 28vh, 220px);
  position: relative;
}

.bar-col {
  flex: 0 0 14px;
  width: 14px;
  height: 100%;
  display: flex;
  align-items: flex-end;
  cursor: crosshair;
}

.bar {
  width: 100%;
  background: linear-gradient(180deg, var(--sodium) 0%, #ffcc00 100%);
  border-radius: 4px 4px 0 0;
  transition:
    height var(--duration-fast) var(--ease-out),
    filter var(--duration-fast);
  min-height: 2px;
}

.bar-col:hover .bar {
  filter: brightness(1.15);
}

.x-axis {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  min-height: 16px;
}

.x-tick {
  flex: 0 0 14px;
  width: 14px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
  overflow: visible;
  white-space: nowrap;
  transform: translateX(-20%);
}

.x-tick:not(.show) {
  visibility: hidden;
}

.y-unit {
  position: absolute;
  left: -40px;
  top: 0;
  margin: 0;
  font-size: 10px;
  color: var(--ink-muted);
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: var(--text-sm);
}

.chart-tip {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  min-width: 140px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(28, 28, 30, 0.92);
  color: #f5f5f7;
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
}

.tip-name {
  margin: 0 0 4px;
  font-size: var(--text-sm);
  font-weight: 600;
}

.tip-row {
  margin: 0;
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.7);
}

.tip-lux {
  margin-top: 4px;
  color: var(--sodium);
  font-weight: 600;
}

.scroll-hint {
  margin: 8px 0 0;
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.day-rail-wrap {
  margin-top: var(--space-4);
}

.rail-label {
  margin: 0 0 8px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink-soft);
}

.day-rail-tray {
  background: var(--paper);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-inset);
  overflow: hidden;
}

.day-rail {
  display: flex;
  gap: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.day-chip {
  flex: 0 0 auto;
  width: 72px;
  padding: 10px 6px;
  border: none;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  display: grid;
  gap: 6px;
  justify-items: center;
  transition: background var(--duration-fast) var(--ease-out);
}

.day-chip:hover {
  background: rgba(0, 0, 0, 0.05);
}

.day-chip.on {
  background: var(--panel);
  box-shadow: none;
  border-radius: 0;
}

.day-chip + .day-chip {
  box-shadow: inset 1px 0 0 var(--line);
}

.chip-date {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}

.chip-spark {
  display: flex;
  align-items: end;
  gap: 1px;
  height: 28px;
  width: 100%;
}

.chip-spark i {
  flex: 1;
  background: var(--sodium);
  border-radius: 1px;
  opacity: 0.85;
  min-width: 2px;
}

.chip-avg {
  font-size: 10px;
  color: var(--ink-muted);
}

.rail-empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-muted);
  padding: 12px 0;
}
</style>
