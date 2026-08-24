<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '../api/client'

const form = reactive({
  lightThresholdOn: 30,
  lightThresholdOff: 80,
  heartbeatTimeout: 60,
})
const msg = ref('')
const updatedAt = ref('')

onMounted(async () => {
  const res = await api.getThreshold()
  if (res.code === 200) {
    form.lightThresholdOn = res.data.lightThresholdOn
    form.lightThresholdOff = res.data.lightThresholdOff
    form.heartbeatTimeout = res.data.heartbeatTimeout
    updatedAt.value = res.data.updatedAt
  }
})

async function save() {
  if (form.lightThresholdOn >= form.lightThresholdOff) {
    msg.value = '开灯阈值必须小于关灯阈值'
    return
  }
  const res = await api.updateThreshold({ ...form })
  msg.value = res.code === 200 ? res.data : res.errorMsg || '失败'
  if (res.code === 200) {
    const again = await api.getThreshold()
    if (again.code === 200) updatedAt.value = again.data.updatedAt
  }
}
</script>

<template>
  <div class="card">
    <h2>开关灯阈值</h2>
    <p class="desc">
      光照低于「开灯阈值」且灯为关 → 云端自动下发开灯；高于「关灯阈值」且灯为开 → 自动关灯。
      判定在后端执行，板子只上报光照并执行指令。
    </p>
    <label>
      开灯阈值（lux）
      <input v-model.number="form.lightThresholdOn" type="number" min="0" step="1" />
    </label>
    <label>
      关灯阈值（lux）
      <input v-model.number="form.lightThresholdOff" type="number" min="0" step="1" />
    </label>
    <label>
      心跳超时（秒）
      <input v-model.number="form.heartbeatTimeout" type="number" />
    </label>
    <p class="mono muted">更新于 {{ updatedAt || '—' }}</p>
    <button type="button" @click="save">保存</button>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<style scoped>
.card {
  max-width: 420px;
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 18px;
  border-radius: var(--radius);
  display: grid;
  gap: 12px;
}
h2 {
  font-size: 24px;
}
.desc {
  margin: 0;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.45;
}
label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-soft);
}
input,
button {
  font: inherit;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
button {
  background: var(--sodium);
  border-color: var(--sodium);
  color: #121820;
  font-weight: 600;
  cursor: pointer;
}
.muted {
  margin: 0;
  font-size: 12px;
  color: var(--ink-soft);
}
.msg {
  margin: 0;
  color: var(--online);
}
</style>
