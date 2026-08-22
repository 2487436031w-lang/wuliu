<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/client'
import { ALARM_TYPE_LABEL, type Alarm } from '../types/domain'

const alarms = ref<Alarm[]>([])

async function refresh() {
  const res = await api.listAlarms()
  alarms.value = res.data
}

onMounted(refresh)

async function resolve(id: number) {
  await api.resolveAlarm(id)
  await refresh()
}
</script>

<template>
  <div class="card">
    <h2>告警日志</h2>
    <p class="desc">偏航 / 异常停留 / 异常开箱。管理员可关闭；实时 toast 来自 WS 模拟。</p>
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>类型</th>
          <th>级别</th>
          <th>说明</th>
          <th>状态</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in alarms" :key="a.id">
          <td class="mono">{{ a.timestamp.slice(11, 19) }}</td>
          <td>{{ ALARM_TYPE_LABEL[a.alarmType] }}</td>
          <td>
            <span class="lvl" :data-l="a.alarmLevel">L{{ a.alarmLevel }}</span>
          </td>
          <td>{{ a.description }}</td>
          <td>{{ a.status }}</td>
          <td>
            <button
              v-if="a.status === 'active'"
              type="button"
              @click="resolve(a.id)"
            >
              关闭
            </button>
          </td>
        </tr>
      </tbody>
    </table>
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
  margin-bottom: 14px;
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
.lvl {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eee;
  font-family: var(--font-mono);
  font-size: 12px;
}
.lvl[data-l='2'] {
  background: rgba(232, 163, 23, 0.25);
}
.lvl[data-l='3'] {
  background: rgba(194, 59, 34, 0.2);
  color: var(--danger);
}
button {
  font: inherit;
  padding: 6px 10px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
}
</style>
