<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/client'
import type { Cargo } from '../types/domain'

const cargos = ref<Cargo[]>([])
const msg = ref('')

onMounted(async () => {
  const res = await api.listCargos()
  cargos.value = res.data.filter((c) => c.vehicleId)
})

async function setStatus(cargo: Cargo, status: Cargo['status']) {
  const res = await api.updateCargoStatus(cargo.id, status)
  if (res.code === 0) {
    cargo.status = res.data.status
    msg.value = `${cargo.name} → ${status}`
  }
}
</script>

<template>
  <div class="page card">
    <h2>司机状态上报</h2>
    <p class="desc">装货 / 运输中 / 已送达。对应 `POST /api/cargos/{id}/status`。</p>
    <p v-if="msg" class="msg">{{ msg }}</p>
    <div v-for="c in cargos" :key="c.id" class="row">
      <div>
        <strong>{{ c.name }}</strong>
        <span class="mono">#{{ c.id }} · 车 {{ c.vehicleId }}</span>
        <em>{{ c.status }}</em>
      </div>
      <div class="actions">
        <button type="button" @click="setStatus(c, 'loaded')">已装货</button>
        <button type="button" @click="setStatus(c, 'transporting')">运输中</button>
        <button type="button" class="done" @click="setStatus(c, 'delivered')">已送达</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: rgba(244, 246, 248, 0.92);
  border: 1px solid var(--line);
  padding: 20px;
  border-radius: var(--radius);
}
h2 {
  font-size: 26px;
}
.desc {
  color: var(--ink-soft);
}
.msg {
  color: var(--ok);
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}
.row div:first-child {
  display: grid;
  gap: 4px;
}
.row em {
  font-style: normal;
  color: var(--track);
  font-size: 13px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
button {
  font: inherit;
  padding: 8px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
}
.done {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}
@media (max-width: 700px) {
  .row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
