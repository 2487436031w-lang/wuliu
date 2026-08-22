<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MapCanvas from '../components/MapCanvas.vue'
import { api } from '../api/client'
import { useRealtimeStore } from '../stores/realtime'
import type { Cargo, EtaInfo, TrackPoint } from '../types/domain'

const realtime = useRealtimeStore()
const cargos = ref<Cargo[]>([])
const cargoId = ref(101)
const track = ref<TrackPoint[]>([])
const eta = ref<EtaInfo | null>(null)

const focusPos = computed(() => {
  const p = realtime.positions.find((x) => x.cargoId === cargoId.value)
  return p ? { lat: p.latitude, lng: p.longitude } : null
})

const mapPositions = computed(() =>
  realtime.positions.filter((p) => p.cargoId === cargoId.value || !p.cargoId),
)

async function load() {
  const list = await api.listCargos()
  cargos.value = list.data.filter((c) => c.status !== 'pending')
  cargoId.value = cargos.value[0]?.id ?? 101
  await refreshCargo()
}

async function refreshCargo() {
  const [t, e] = await Promise.all([api.cargoTrack(cargoId.value), api.cargoEta(cargoId.value)])
  track.value = t.data.points
  eta.value = e.data
}

onMounted(load)
</script>

<template>
  <div class="page">
    <aside class="side">
      <h2>我的货物</h2>
      <label>
        运单
        <select v-model.number="cargoId" @change="refreshCargo">
          <option v-for="c in cargos" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <div v-if="eta" class="eta">
        <p class="label">预计到达</p>
        <p class="value mono">{{ eta.eta.slice(11, 16) }}</p>
        <p class="meta">剩余 {{ eta.remainingKm }} km · {{ eta.remainingMinutes }} 分钟</p>
      </div>
      <p class="tip">地图为产品主视觉：轨迹线 + 实时脉冲点。数据来自 Mock / 将来接 WS。</p>
    </aside>
    <div class="map">
      <MapCanvas :positions="mapPositions" :track="track" :focus="focusPos" />
    </div>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  min-height: calc(100vh - 140px);
}
.side {
  background: rgba(244, 246, 248, 0.92);
  border: 1px solid var(--line);
  padding: 18px;
  border-radius: var(--radius);
}
.side h2 {
  font-size: 26px;
  margin-bottom: 14px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-soft);
  margin-bottom: 18px;
}
select {
  font: inherit;
  padding: 9px 11px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
}
.eta {
  padding: 14px;
  background: #1a2332;
  color: #f4f6f8;
  border-radius: var(--radius);
  margin-bottom: 14px;
}
.eta .label {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.eta .value {
  margin: 6px 0;
  font-size: 40px;
  font-family: var(--font-display);
  color: var(--signal);
}
.eta .meta {
  margin: 0;
  font-size: 13px;
  opacity: 0.8;
}
.tip {
  font-size: 13px;
  color: var(--ink-soft);
  line-height: 1.5;
}
.map {
  min-height: 420px;
}
@media (max-width: 900px) {
  .page {
    grid-template-columns: 1fr;
  }
}
</style>
