<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/client'
import { useLatestRequest, useRowAction } from '../composables/useLatestRequest'
import { useRealtimeStore } from '../stores/realtime'
import type { AlarmLog } from '../types/domain'

const route = useRoute()
const realtime = useRealtimeStore()
const listRequest = useLatestRequest()
const rowAction = useRowAction()
const records = ref<AlarmLog[]>([])
const status = ref('')
const msg = ref('')

function applyRouteFilter() {
  status.value = typeof route.query.status === 'string' ? route.query.status : ''
}

async function load() {
  const res = await listRequest.run(() =>
    api.listAlarms({ page: 1, pageSize: 50, status: status.value || undefined }),
  )
  if (!res || res.code !== 200) return
  records.value = res.data.records
}

onMounted(async () => {
  applyRouteFilter()
  await load()
})

watch(
  () => route.query,
  async () => {
    applyRouteFilter()
    await load()
  },
)

watch(
  () => realtime.alarmSyncTick,
  async () => {
    await load()
  },
)

async function resolve(alarm: AlarmLog) {
  const alarmId = String(alarm.id)
  msg.value = ''
  await rowAction.run(alarmId, async () => {
    try {
      const res = await api.resolveAlarm(alarmId)
      if (res.code === 200) {
        records.value = records.value.map((row) =>
          row.id === alarmId ? { ...row, status: 'RESOLVED' } : row,
        )
        msg.value = '已处理'
        realtime.alarmSyncTick += 1
      } else {
        msg.value = res.errorMsg || '处理失败'
      }
      await load()
    } catch (err) {
      msg.value = err instanceof Error ? err.message : '处理失败'
    }
  })
}
</script>

<template>
  <div class="card">
    <div class="head">
      <h2>告警日志</h2>
      <div class="tools">
        <p v-if="msg" class="msg">{{ msg }}</p>
        <select v-model="status" @change="load">
          <option value="">全部状态</option>
          <option value="ACTIVE">待处理</option>
          <option value="RESOLVED">已处理</option>
        </select>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>设备</th>
          <th>类型</th>
          <th>内容</th>
          <th>状态</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in records" :key="a.id">
          <td class="mono">{{ a.createdAt }}</td>
          <td>{{ a.deviceName }}</td>
          <td class="mono">{{ a.alarmType }}</td>
          <td>{{ a.message }}</td>
          <td>{{ a.status === 'ACTIVE' ? '待处理' : '已处理' }}</td>
          <td>
            <button
              v-if="a.status === 'ACTIVE'"
              type="button"
              :disabled="rowAction.isActive(a.id)"
              @click="resolve(a)"
            >
              {{ rowAction.isActive(a.id) ? '…' : '处理' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 18px;
  border-radius: var(--radius);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}
.tools {
  display: flex;
  align-items: center;
  gap: 10px;
}
.msg {
  margin: 0;
  color: var(--online);
  font-size: 13px;
}
h2 {
  font-size: 24px;
}
select,
button {
  font: inherit;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #fff;
  cursor: pointer;
}
button {
  background: var(--steel);
  color: #fff;
  border-color: var(--steel);
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th,
td {
  text-align: left;
  padding: 9px 6px;
  border-bottom: 1px solid var(--line);
}
</style>
