<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api/client'
import { useRealtimeStore } from '../stores/realtime'
import type { Device, LightReading, ThresholdConfig, TrendPoint } from '../types/domain'
import { todayRange } from '../utils/datetime'

const realtime = useRealtimeStore()

const devices = ref<Device[]>([])
const deviceId = ref<number | null>(null)
const records = ref<LightReading[]>([])
const trend = ref<TrendPoint[]>([])
const threshold = ref<ThresholdConfig | null>(null)
const maxVal = computed(() => Math.max(1, ...trend.value.map((t) => t.value)))

async function loadDevices() {
  const res = await api.listDevices({ page: 1, pageSize: 100 })
  if (res.code !== 200) return
  devices.value = [...res.data.records].sort((a, b) => a.id - b.id)
  if (!devices.value.length) {
    deviceId.value = null
    return
  }
  const ids = new Set(devices.value.map((d) => d.id))
  if (deviceId.value === null || !ids.has(deviceId.value)) {
    deviceId.value = devices.value[0].id
  }
}

async function load() {
  if (deviceId.value === null) return
  const id = deviceId.value
  const { start, end } = todayRange()
  const [list, tr] = await Promise.all([
    api.listLightReadings({ page: 1, pageSize: 20, deviceId: id }),
    api.lightTrend(id, start, end),
  ])
  if (deviceId.value !== id) return
  if (list.code === 200) records.value = list.data.records
  if (tr.code === 200) trend.value = tr.data
}

onMounted(async () => {
  const th = await api.getThreshold()
  if (th.code === 200) threshold.value = th.data
  await loadDevices()
  await load()
})

watch(deviceId, () => {
  void load()
})

watch(
  () => realtime.latestLight,
  () => {
    void load()
  },
)
</script>

<template>
  <div class="page">
    <RouterLink v-if="threshold" to="/threshold" class="threshold-banner">
      自动开关灯：光照 &lt; <strong>{{ threshold.lightThresholdOn }}</strong> lux 开灯，
      &gt; <strong>{{ threshold.lightThresholdOff }}</strong> lux 关灯 · 点击修改
    </RouterLink>

    <label>
      设备
      <select v-model="deviceId" :disabled="!devices.length">
        <option v-for="d in devices" :key="d.id" :value="d.id">{{ d.deviceName }}</option>
      </select>
    </label>

    <section class="card">
      <h2>光照趋势</h2>
      <div class="chart">
        <div
          v-for="(p, i) in trend"
          :key="i"
          class="bar"
          :style="{ height: `${(p.value / maxVal) * 100}%` }"
          :title="`${p.time} · ${p.value.toFixed(1)}`"
        />
      </div>
    </section>

    <section class="card">
      <h2>最近记录</h2>
      <table>
        <thead>
          <tr>
            <th>时间</th>
            <th>设备</th>
            <th>光照</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.id">
            <td class="mono">{{ r.createdAt }}</td>
            <td>{{ r.deviceName }}</td>
            <td class="mono">{{ r.lightIntensity.toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
}
.threshold-banner {
  padding: 12px 14px;
  background: rgba(240, 162, 2, 0.12);
  border: 1px solid rgba(240, 162, 2, 0.35);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--ink);
  text-decoration: none;
}
.threshold-banner strong {
  color: var(--sodium-deep);
}
label {
  display: grid;
  gap: 6px;
  max-width: 280px;
  font-size: 13px;
  color: var(--ink-soft);
}
select {
  font: inherit;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 18px;
  border-radius: var(--radius);
}
h2 {
  font-size: 22px;
  margin-bottom: 12px;
}
.chart {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 160px;
  padding: 8px;
  background: #121820;
  border-radius: var(--radius);
}
.bar {
  flex: 1;
  min-width: 6px;
  background: linear-gradient(180deg, var(--sodium), #7a5200);
  border-radius: 2px 2px 0 0;
  transition: height 0.25s ease;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th,
td {
  text-align: left;
  padding: 8px 6px;
  border-bottom: 1px solid var(--line);
}
</style>
