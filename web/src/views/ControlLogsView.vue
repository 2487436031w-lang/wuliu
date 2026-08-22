<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api/client'
import type { ControlLog } from '../types/domain'

const records = ref<ControlLog[]>([])

onMounted(async () => {
  const res = await api.listControlLogs({ page: 1, pageSize: 50 })
  if (res.code === 200) records.value = res.data.records
})
</script>

<template>
  <div class="card">
    <h2>控制日志</h2>
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>设备</th>
          <th>操作</th>
          <th>来源</th>
          <th>结果</th>
          <th>操作人</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in records" :key="c.id">
          <td class="mono">{{ c.createdAt }}</td>
          <td>{{ c.deviceName || '—' }}</td>
          <td class="mono">{{ c.command }}</td>
          <td>{{ c.source }}</td>
          <td>{{ c.result }}</td>
          <td>{{ c.operatorName || '—' }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!records.length" class="empty">暂无日志（手动开关灯后会出现）</p>
  </div>
</template>

<style scoped>
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 18px;
  border-radius: var(--radius);
}
h2 {
  font-size: 24px;
  margin-bottom: 12px;
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
.empty {
  color: var(--ink-soft);
}
</style>
