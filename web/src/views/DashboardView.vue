<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api, isMockMode } from '../api/client'
import { useRealtimeStore } from '../stores/realtime'
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
  ]
})

const alarmTile = computed(() => ({
  label: '待处理告警',
  value: alarmStats.value?.activeCount ?? 0,
}))
</script>

<template>
  <div class="ui-page ui-page-fill dashboard-page">
    <RouterLink to="/lights" class="hero page-hero ui-link-card slide-up-enter-active">
      <div class="hero-main">
        <p class="eyebrow">实时光照 · 点击查看趋势</p>
        <p class="hero-value mono">
          {{ realtime.latestLight ? realtime.latestLight.lightIntensity.toFixed(1) : '—' }}
          <span class="unit">lux</span>
        </p>
        <p class="hero-meta mono">{{ isMockMode ? 'Mock 定时模拟' : '后端 WebSocket' }}</p>
      </div>
      <div class="hero-side">
        <p class="threshold-hint">
          开灯 &lt; {{ threshold?.lightThresholdOn ?? '—' }} lux<br />
          关灯 &gt; {{ threshold?.lightThresholdOff ?? '—' }} lux
        </p>
        <RouterLink to="/threshold" class="hero-link" @click.stop>修改阈值 →</RouterLink>
      </div>
    </RouterLink>

    <div v-if="stats" class="ui-fill-body dashboard-body slide-up-enter-active slide-up-delay-1">
      <section class="ops ui-card">
        <h3 class="ui-section-title">值班待办</h3>
        <div class="ops-grid">
          <RouterLink
            :to="{ path: '/alarms', query: { status: 'ACTIVE' } }"
            class="ops-item ui-link-card"
          >
            <p class="ops-label">活跃告警</p>
            <strong class="ui-stat-value bad">{{ alarmTile.value }}</strong>
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
                  <RouterLink :to="`/devices`">{{ d.deviceName }}</RouterLink>
                  <span class="mono sn">{{ d.deviceSn }}</span>
                </li>
              </ul>
              <p v-else class="ops-empty">全部在线 ✓</p>
            </div>
          </div>
        </div>
      </section>

      <div class="stat-grid">
        <RouterLink
          v-for="tile in tiles"
          :key="tile.label"
          :to="{ path: tile.to, query: tile.query }"
          class="stat ui-card ui-card-compact ui-link-card"
        >
          <p class="stat-label">{{ tile.label }}</p>
          <strong :class="['ui-stat-value', tile.tone]">{{ tile.value }}</strong>
        </RouterLink>

        <RouterLink
          :to="{ path: '/alarms', query: { status: 'ACTIVE' } }"
          class="stat ui-card ui-card-compact ui-link-card"
        >
          <p class="stat-label">{{ alarmTile.label }}</p>
          <strong class="ui-stat-value bad">{{ alarmTile.value }}</strong>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-6);
  padding: var(--space-6) var(--space-8);
  background: linear-gradient(135deg, #1d1d1f 0%, #2c2c2e 100%);
  color: #f5f5f7;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  text-decoration: none;
}

.eyebrow {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.hero-value {
  margin: var(--space-2) 0 0;
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 600;
  color: var(--sodium);
  line-height: 1;
  letter-spacing: -0.03em;
}

.unit {
  font-size: var(--text-xl);
  margin-left: var(--space-2);
  opacity: 0.65;
  font-weight: 500;
}

.hero-meta {
  margin: var(--space-2) 0 0;
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.4);
}

.hero-side {
  text-align: right;
}

.threshold-hint {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
}

.hero-link {
  display: inline-block;
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--sodium);
  text-decoration: none;
}

.dashboard-body {
  min-height: 0;
}

.dashboard-body .ops {
  flex-shrink: 0;
}

.dashboard-body .stat-grid {
  flex-shrink: 0;
}

.ops-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.ops-item {
  padding: var(--space-4);
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
  margin-top: var(--space-2);
}

.ops-link {
  display: inline-block;
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
}

.offline-panel {
  flex: 1 1 0;
  min-height: 0;
  max-height: min(160px, 24vh);
  margin-top: var(--space-2);
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
  padding: var(--space-2) 0;
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
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  color: var(--online);
  font-weight: 500;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  flex-shrink: 0;
}

.stat {
  display: block;
  text-decoration: none;
  color: inherit;
}

.stat-label {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  font-weight: 500;
}

.stat .ui-stat-value {
  display: block;
  margin-top: var(--space-2);
}

@media (max-width: 800px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    padding: var(--space-5);
  }

  .hero-side {
    text-align: left;
  }

  .stat-grid,
  .ops-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
