<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/client'
import type { Binding, Cargo, Vehicle } from '../types/domain'

const vehicles = ref<Vehicle[]>([])
const cargos = ref<Cargo[]>([])
const bindings = ref<Binding[]>([])
const cargoId = ref<number>()
const vehicleId = ref<number>()
const msg = ref('')
const plateNo = ref('')
const deviceId = ref('')

async function refresh() {
  const [v, c, b] = await Promise.all([api.listVehicles(), api.listCargos(), api.listBindings()])
  vehicles.value = v.data
  cargos.value = c.data
  bindings.value = b.data
  cargoId.value = cargos.value.find((x) => !x.vehicleId)?.id ?? cargos.value[0]?.id
  vehicleId.value = vehicles.value[0]?.id
}

onMounted(refresh)

async function bind() {
  if (!cargoId.value || !vehicleId.value) return
  const res = await api.createBinding(cargoId.value, vehicleId.value)
  msg.value = res.code === 0 ? '绑定成功' : res.message
  await refresh()
}

async function unbind(id: number) {
  await api.deleteBinding(id)
  msg.value = '已解绑'
  await refresh()
}

async function addVehicle() {
  if (!plateNo.value || !deviceId.value) return
  await api.createVehicle({
    plateNo: plateNo.value,
    deviceId: deviceId.value,
    type: 'truck',
    driverName: '待指派',
    driverPhone: '-',
  })
  plateNo.value = ''
  deviceId.value = ''
  msg.value = '车辆已登记'
  await refresh()
}

function cargoName(id: number) {
  return cargos.value.find((c) => c.id === id)?.name ?? `#${id}`
}
function plate(id: number) {
  return vehicles.value.find((v) => v.id === id)?.plateNo ?? `#${id}`
}
</script>

<template>
  <div class="page">
    <section class="card">
      <h2>货物 — 车辆绑定</h2>
      <p class="desc">仓库管理员将运单与 deviceSn 车辆关联，追踪按运单而非裸设备。</p>
      <div class="row">
        <label>
          货物
          <select v-model.number="cargoId">
            <option v-for="c in cargos" :key="c.id" :value="c.id">
              {{ c.name }}（{{ c.status }}）
            </option>
          </select>
        </label>
        <label>
          车辆
          <select v-model.number="vehicleId">
            <option v-for="v in vehicles" :key="v.id" :value="v.id">
              {{ v.plateNo }} · {{ v.deviceId }}
            </option>
          </select>
        </label>
        <button type="button" class="primary" @click="bind">绑定</button>
      </div>
      <p v-if="msg" class="msg">{{ msg }}</p>
      <table>
        <thead>
          <tr>
            <th>绑定 ID</th>
            <th>货物</th>
            <th>车辆</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in bindings" :key="b.id">
            <td class="mono">{{ b.id }}</td>
            <td>{{ cargoName(b.cargoId) }}</td>
            <td>{{ plate(b.vehicleId) }}</td>
            <td><button type="button" class="link" @click="unbind(b.id)">解绑</button></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>登记车辆</h2>
      <div class="row">
        <label>
          车牌
          <input v-model="plateNo" placeholder="沪A·xxxx" />
        </label>
        <label>
          deviceId
          <input v-model="deviceId" placeholder="ESP32-xxxx" class="mono" />
        </label>
        <button type="button" class="primary" @click="addVehicle">添加</button>
      </div>
      <ul class="fleet">
        <li v-for="v in vehicles" :key="v.id">
          <strong>{{ v.plateNo }}</strong>
          <span class="mono">{{ v.deviceId }}</span>
          <span :data-on="v.status === 1">{{ v.status === 1 ? '在线' : '离线' }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 18px;
}
.card {
  background: rgba(244, 246, 248, 0.9);
  border: 1px solid var(--line);
  padding: 20px;
  border-radius: var(--radius);
}
.card h2 {
  font-size: 26px;
}
.desc {
  color: var(--ink-soft);
  margin: 6px 0 16px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
  margin-bottom: 14px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-soft);
}
input,
select,
button {
  font: inherit;
  padding: 9px 11px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: #fff;
}
.primary {
  border: 0;
  background: var(--ink);
  color: #fff;
  cursor: pointer;
}
.link {
  border: 0;
  background: transparent;
  color: var(--track);
  cursor: pointer;
}
.msg {
  color: var(--ok);
  font-size: 13px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--line);
}
.fleet {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.fleet li {
  display: grid;
  grid-template-columns: 1fr 1.2fr auto;
  gap: 10px;
  padding: 10px;
  background: #fff;
  border: 1px solid var(--line);
}
.fleet span[data-on='true'] {
  color: var(--ok);
}
</style>
