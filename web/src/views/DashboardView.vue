<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api, isMockMode } from '../api/client'
import { useRealtimeStore } from '../stores/realtime'
import StreetlightMap from '../components/StreetlightMap.vue'
import type { AlarmStatistics, DeviceStatistics, ThresholdConfig } from '../types/domain'

const realtime = useRealtimeStore()
const stats = ref<DeviceStatistics | null>(null)
const alarmStats = ref<AlarmStatistics | null>(null)
const threshold = ref<ThresholdConfig | null>(null)

async function load() {
  const [d, a, t] = await Promise.all([
    api.deviceStatistics(),
    api.alarmStatistics(),
    api.getThreshold(),
  ])
  if (d.code === 200) stats.value = d.data
  if (a.code === 200) alarmStats.value = a.data
  if (t.code === 200) threshold.value = t.data
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
    { label: '设备', value: stats.value.totalCount, to: '/devices' },
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
      label: '开灯',
      value: stats.value.onCount,
      to: '/devices',
      query: { status: 'ON' },
      tone: 'on',
    },
    {
      label: '关灯',
      value: stats.value.offCount,
      to: '/devices',
      query: { status: 'OFF' },
    },
    {
      label: '告警',
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
    <div class="dash-top">
      <RouterLink to="/lights" class="lux-chip ui-link-card">
        <p class="lux-label">光照</p>
        <p class="lux-value mono">
          {{ realtime.latestLight ? realtime.latestLight.lightIntensity.toFixed(1) : '—' }}
          <span class="unit">lux</span>
        </p>
        <p class="lux-meta mono">
          {{ isMockMode ? 'Mock' : 'Live' }}
          · {{ threshold?.lightThresholdOn ?? '—' }} / {{ threshold?.lightThresholdOff ?? '—' }}
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

    <section class="dash-map">
      <StreetlightMap variant="command" />
    </section>
  </div>
</template>

<style scoped>
.dashboard-page {
  gap: var(--space-2);
}

.dash-top {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: var(--space-2);
}

.lux-chip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #1d1d1f 0%, #2c2c2e 100%);
  color: #f5f5f7;
  text-decoration: none;
  box-shadow: var(--shadow-sm);
}

.lux-label {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.lux-value {
  margin: 2px 0 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--sodium);
  line-height: 1.1;
}

.unit {
  font-size: 11px;
  margin-left: 4px;
  opacity: 0.65;
}

.lux-meta {
  margin: 4px 0 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.42);
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
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--panel);
  box-shadow: var(--shadow-sm), var(--shadow-inset);
  text-decoration: none;
  color: inherit;
}

.kpi-label {
  margin: 0;
  font-size: 11px;
  color: var(--ink-soft);
  font-weight: 500;
}

.kpi .ui-stat-value {
  margin-top: 0;
  font-size: 20px;
}

.dash-map {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
}

@media (max-width: 1100px) {
  .dash-top {
    grid-template-columns: 1fr;
  }

  .kpi-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
