<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MapCanvas from '../components/MapCanvas.vue'
import { api } from '../api/client'
import { useRealtimeStore } from '../stores/realtime'
import type { DispatchCommand, Vehicle } from '../types/domain'

const realtime = useRealtimeStore()
const vehicles = ref<Vehicle[]>([])
const vehicleId = ref(201)
const message = ref('请改道至备用廊道，避开拥堵。')
const type = ref<DispatchCommand['type']>('reroute')
const history = ref<DispatchCommand[]>([])
const flash = ref('')

onMounted(async () => {
  const v = await api.listVehicles()
  vehicles.value = v.data
  await loadHistory()
})

async function loadHistory() {
  const res = await api.listDispatch(vehicleId.value)
  history.value = res.data
}

async function send() {
  const res = await api.dispatch({
    vehicleId: vehicleId.value,
    type: type.value,
    message: message.value,
    targetLongitude: 121.48,
    targetLatitude: 31.24,
  })
  flash.value = res.code === 0 ? `已下发 ${res.data.commandId}` : res.message
  await loadHistory()
}
</script>

<template>
  <div class="page">
    <div class="map">
      <MapCanvas :positions="realtime.positions" />
    </div>
    <aside class="panel">
      <h2>调度指令</h2>
      <p class="desc">人确认后下发；板端蜂鸣/LED + ack（后端 MQTT）。此处走 REST `/api/dispatch`。</p>
      <label>
        目标车辆
        <select v-model.number="vehicleId" @change="loadHistory">
          <option v-for="v in vehicles" :key="v.id" :value="v.id">
            {{ v.plateNo }}（{{ v.deviceId }}）
          </option>
        </select>
      </label>
      <label>
        类型
        <select v-model="type">
          <option value="reroute">改道</option>
          <option value="stop">停车</option>
          <option value="resume">继续</option>
        </select>
      </label>
      <label>
        内容
        <textarea v-model="message" rows="3" />
      </label>
      <button type="button" @click="send">确认下发</button>
      <p v-if="flash" class="flash mono">{{ flash }}</p>
      <h3>指令历史</h3>
      <ul>
        <li v-for="d in history" :key="d.commandId">
          <span class="mono">{{ d.commandId }}</span>
          <span>{{ d.type }} · {{ d.message }}</span>
        </li>
      </ul>
    </aside>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 16px;
  min-height: calc(100vh - 140px);
}
.map {
  min-height: 420px;
}
.panel {
  background: rgba(244, 246, 248, 0.92);
  border: 1px solid var(--line);
  padding: 18px;
  border-radius: var(--radius);
}
.panel h2 {
  font-size: 26px;
}
.desc {
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.5;
}
label {
  display: grid;
  gap: 6px;
  margin: 12px 0;
  font-size: 13px;
  color: var(--ink-soft);
}
select,
textarea,
button {
  font: inherit;
  padding: 9px 11px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
}
button {
  width: 100%;
  border: 0;
  background: var(--signal);
  color: #1a2332;
  font-weight: 600;
  cursor: pointer;
}
.flash {
  color: var(--ok);
  font-size: 12px;
}
h3 {
  margin: 18px 0 8px;
  font-size: 18px;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  max-height: 220px;
  overflow: auto;
}
li {
  display: grid;
  gap: 4px;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--line);
  font-size: 13px;
}
@media (max-width: 900px) {
  .page {
    grid-template-columns: 1fr;
  }
}
</style>
