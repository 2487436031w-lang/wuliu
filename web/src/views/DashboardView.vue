<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api, isMockMode } from '../api/client'
import { useRealtimeStore } from '../stores/realtime'
import StreetlightMap from '../components/StreetlightMap.vue'
import type { AlarmStatistics, Device, DeviceStatistics, ThresholdConfig } from '../types/domain'

const realtime = useRealtimeStore()
const stats = ref<DeviceStatistics | null>(null)
const alarmStats = ref<AlarmStatistics | null>(null)
const threshold = ref<ThresholdConfig | null>(null)
const offlineDevices = ref<Device[]>([])
const autoSwitchToday = ref(0)

function isToday(iso: string) {
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}

async function loadOps() {
  const [offlineRes, logsRes] = await Promise.all([
    api.listDevices({ page: 1, pageSize: 20, onlineStatus: 'OFFLINE' }),
    api.listControlLogs({ page: 1, pageSize: 200, source: 'AUTO' }),
  ])
  if (offlineRes.code === 200) offlineDevices.value = offlineRes.data.records
  if (logsRes.code === 200) {
    autoSwitchToday.value = logsRes.data.records.filter((c) => isToday(c.createdAt)).length
  }
}

async function load() {
  const [d, a, t] = await Promise.all([
    api.deviceStatistics(),
    api.alarmStatistics(),
    api.getThreshold(),
  ])
  if (d.code === 200) stats.value = d.data
  if (a.code === 200) alarmStats.value = a.data
  if (t.code === 200) threshold.value = t.data
  await loadOps()
}

let statsPoll: number | undefined
onMounted(() => {
  void load()
  statsPoll = window.setInterval(() => {
    void load()
  }, 4000)
})
onUnmounted(() => {
  if (statsPoll) window.clearInterval(statsPoll)
})

watch(
  () => [realtime.deviceSyncTick, realtime.alarmSyncTick],
  () => {
    load()
  },
)

const tiles = computed(() => {
  if (!stats.value) return []
  return [
    { label: '设备总数', value: stats.value.totalCount, to: '/devices' },
    {
      label: '在线',
      value: stats.value.onlineCount,
      to: '/devices',
      query: { onlineStatus: 'ONLINE' },
      tone: 'ok',
    },
    {
      label: '离线',
      value: stats.value.offlineCount,
      to: '/devices',
      query: { onlineStatus: 'OFFLINE' },
    },
    {
      label: '已开灯',
      value: stats.value.onCount,
      to: '/devices',
      query: { status: 'ON' },
      tone: 'on',
    },
    {
      label: '已关灯',
      value: stats.value.offCount,
      to: '/devices',
      query: { status: 'OFF' },
    },
    {
      label: '待处理告警',
      value: alarmStats.value?.activeCount ?? 0,
      to: '/alarms',
      query: { status: 'ACTIVE' },
      tone: 'bad',
    },
  ]
})
</script>

<template>
  <div class="ui-page ui-page-fill dashboard-page">
    <div class="dash-top slide-up-enter-active">
      <RouterLink to="/lights" class="lux-chip ui-link-card">
        <p class="lux-label">实时光照</p>
        <p class="lux-value mono">
          {{ realtime.latestLight ? realtime.latestLight.lightIntensity.toFixed(1) : '—' }}
          <span class="unit">lux</span>
        </p>
        <p class="lux-meta mono">
          {{ isMockMode ? 'Mock' : 'Live' }}
          · 开 &lt; {{ threshold?.lightThresholdOn ?? '—' }}
          · 关 &gt; {{ threshold?.lightThresholdOff ?? '—' }}
        </p>
      </RouterLink>
      <div class="kpi-row">
        <RouterLink
          v-for="tile in tiles"
          :key="tile.label"
          :to="{ path: tile.to, query: tile.query }"
          class="kpi ui-link-card"
        >
          <p class="kpi-label">{{ tile.label }}</p>
          <strong :class="['ui-stat-value', tile.tone]">{{ tile.value }}</strong>
        </RouterLink>
      </div>
    </div>

    <section class="dash-map slide-up-enter-active slide-up-delay-1">
      <StreetlightMap variant="embed" />
    </section>

    <section class="ops ui-card dash-ops slide-up-enter-active slide-up-delay-2">
      <h3 class="ui-section-title">值班待办</h3>
      <div class="ops-grid">
        <RouterLink
          :to="{ path: '/alarms', query: { status: 'ACTIVE' } }"
          class="ops-item ui-link-card"
        >
          <p class="ops-label">活跃告警</p>
          <strong class="ui-stat-value bad">{{ alarmStats?.activeCount ?? 0 }}</strong>
        </RouterLink>

        <div class="ops-item">
          <p class="ops-label">今日自动开关</p>
          <strong class="ui-stat-value on">{{ autoSwitchToday }}</strong>
          <RouterLink to="/logs" class="ops-link">控制日志 →</RouterLink>
        </div>

        <div class="ops-item ops-item-list">
          <p class="ops-label">离线设备（{{ offlineDevices.length }}）</p>
          <div class="offline-panel">
            <ul v-if="offlineDevices.length" class="offline-list">
              <li v-for="d in offlineDevices" :key="d.id">
                <RouterLink to="/devices">{{ d.deviceName }}</RouterLink>
                <span class="mono sn">{{ d.deviceSn }}</span>
              </li>
            </ul>
            <p v-else class="ops-empty">全部在线 ✓</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard-page {
  gap: var(--space-3);
}

.dash-top {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: minmax(180px, 240px) 1fr;
  gap: var(--space-3);
}

.lux-chip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #1d1d1f 0%, #2c2c2e 100%);
  color: #f5f5f7;
  text-decoration: none;
  box-shadow: var(--shadow);
}

.lux-label {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.lux-value {
  margin: 4px 0 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--sodium);
  line-height: 1.1;
}

.unit {
  font-size: var(--text-sm);
  margin-left: 4px;
  opacity: 0.65;
}

.lux-meta {
  margin: 6px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-2);
}

.kpi {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--panel);
  box-shadow: var(--shadow-sm), var(--shadow-inset);
  text-decoration: none;
  color: inherit;
}

.kpi-label {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--ink-soft);
  font-weight: 500;
}

.kpi .ui-stat-value {
  margin-top: 2px;
  font-size: var(--text-xl);
}

.dash-map {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
}

.dash-ops {
  flex-shrink: 0;
}

.dash-ops .ui-section-title {
  margin-bottom: var(--space-2);
}

.ops-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.ops-item {
  padding: var(--space-3) var(--space-4);
  background: var(--paper);
  border-radius: var(--radius-md);
  display: block;
  text-decoration: none;
  color: inherit;
}

.ops-item-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ops-label {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  font-weight: 500;
  flex-shrink: 0;
}

.ops-item .ui-stat-value {
  display: block;
  margin-top: var(--space-1);
}

.ops-link {
  display: inline-block;
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
}

.offline-panel {
  flex: 1 1 0;
  min-height: 0;
  max-height: 72px;
  margin-top: var(--space-1);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.offline-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.offline-list li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 4px 0;
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--line);
}

.offline-list li:last-child {
  border-bottom: none;
}

.offline-list a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}

.sn {
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.ops-empty {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--online);
  font-weight: 500;
}

@media (max-width: 1100px) {
  .dash-top {
    grid-template-columns: 1fr;
  }

  .kpi-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 800px) {
  .kpi-row,
  .ops-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
