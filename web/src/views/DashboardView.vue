<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api } from '../api/client'
import { useRealtimeStore } from '../stores/realtime'
import type { AlarmStatistics, DeviceStatistics } from '../types/domain'

const realtime = useRealtimeStore()
const stats = ref<DeviceStatistics | null>(null)
const alarmStats = ref<AlarmStatistics | null>(null)

async function load() {
  const [d, a] = await Promise.all([api.deviceStatistics(), api.alarmStatistics()])
  if (d.code === 200) stats.value = d.data
  if (a.code === 200) alarmStats.value = a.data
}

onMounted(load)
watch(
  () => realtime.latestLight?.createdAt,
  () => {
    /* keep live intensity visible */
  },
)
</script>

<template>
  <div class="page">
    <section class="hero-strip">
      <div>
        <p class="label">实时光照（Mock / WS）</p>
        <p class="big mono">
          {{ realtime.latestLight ? realtime.latestLight.lightIntensity.toFixed(1) : '—' }}
          <span>lux</span>
        </p>
      </div>
      <p class="hint">低于开灯阈值自动开灯；高于关灯阈值自动关灯（后端判定）。</p>
    </section>

    <div class="grid" v-if="stats">
      <article><p>设备总数</p><strong>{{ stats.totalCount }}</strong></article>
      <article><p>在线</p><strong class="ok">{{ stats.onlineCount }}</strong></article>
      <article><p>离线</p><strong>{{ stats.offlineCount }}</strong></article>
      <article><p>已开灯</p><strong class="on">{{ stats.onCount }}</strong></article>
      <article><p>已关灯</p><strong>{{ stats.offCount }}</strong></article>
      <article>
        <p>活跃告警</p>
        <strong class="bad">{{ alarmStats?.activeCount ?? 0 }}</strong>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
}
.hero-strip {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  padding: 22px;
  background: #121820;
  color: #f2f4f7;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.label {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.65;
}
.big {
  margin: 6px 0 0;
  font-size: 56px;
  font-family: var(--font-display);
  color: var(--sodium);
  line-height: 1;
}
.big span {
  font-size: 18px;
  margin-left: 6px;
  opacity: 0.7;
}
.hint {
  margin: 0;
  max-width: 28ch;
  font-size: 14px;
  opacity: 0.75;
  line-height: 1.45;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
article {
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 16px;
  border-radius: var(--radius);
}
article p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 13px;
}
article strong {
  display: block;
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: 36px;
}
.ok {
  color: var(--online);
}
.on {
  color: var(--sodium-deep);
}
.bad {
  color: var(--danger);
}
@media (max-width: 800px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
  .hero-strip {
    flex-direction: column;
    align-items: start;
  }
}
</style>
