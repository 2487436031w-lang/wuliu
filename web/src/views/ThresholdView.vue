<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/client'
import type { Device, ThresholdOverride } from '../types/domain'

const route = useRoute()
const overrideCard = ref<HTMLElement | null>(null)

const form = reactive({
  lightThresholdOn: 30,
  lightThresholdOff: 80,
  heartbeatTimeout: 60,
})
const msg = ref('')
const updatedAt = ref('')
const overrides = ref<ThresholdOverride[]>([])
const devices = ref<Device[]>([])
const ovMsg = ref('')

const ovForm = reactive({
  scopeType: 'GROUP' as 'GROUP' | 'DEVICE',
  scopeKey: '',
  lightThresholdOn: 30,
  lightThresholdOff: 80,
})

const groupNames = computed(() => {
  const set = new Set<string>()
  for (const d of devices.value) {
    if (d.groupName?.trim()) set.add(d.groupName.trim())
  }
  return [...set].sort()
})

async function loadGlobal() {
  const res = await api.getThreshold()
  if (res.code === 200) {
    form.lightThresholdOn = res.data.lightThresholdOn
    form.lightThresholdOff = res.data.lightThresholdOff
    form.heartbeatTimeout = res.data.heartbeatTimeout
    updatedAt.value = res.data.updatedAt
  }
}

async function loadOverrides() {
  const res = await api.listThresholdOverrides()
  if (res.code === 200) overrides.value = res.data
}

async function loadDevices() {
  const res = await api.listDevices({ page: 1, pageSize: 200 })
  if (res.code === 200) devices.value = res.data.records
}

function applyRouteScope() {
  const rawType = String(route.query.scopeType ?? '').toUpperCase()
  const scopeKey = route.query.scopeKey != null ? String(route.query.scopeKey) : ''
  if (rawType !== 'GROUP' && rawType !== 'DEVICE') return false
  if (!scopeKey) return false
  ovForm.scopeType = rawType
  ovForm.scopeKey = scopeKey
  const hit = overrides.value.find((o) => o.scopeType === rawType && o.scopeKey === scopeKey)
  if (hit) {
    ovForm.lightThresholdOn = hit.lightThresholdOn
    ovForm.lightThresholdOff = hit.lightThresholdOff
  } else if (rawType === 'GROUP') {
    ovForm.lightThresholdOn = form.lightThresholdOn
    ovForm.lightThresholdOff = form.lightThresholdOff
  }
  return true
}

onMounted(async () => {
  await Promise.all([loadGlobal(), loadOverrides(), loadDevices()])
  const fromRoute = applyRouteScope()
  if (!fromRoute) {
    if (groupNames.value.length) ovForm.scopeKey = groupNames.value[0]
    else if (devices.value.length) {
      ovForm.scopeType = 'DEVICE'
      ovForm.scopeKey = String(devices.value[0].id)
    }
  } else {
    await nextTick()
    overrideCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

async function save() {
  if (form.lightThresholdOn >= form.lightThresholdOff) {
    msg.value = '开灯阈值必须小于关灯阈值'
    return
  }
  const res = await api.updateThreshold({ ...form })
  msg.value = res.code === 200 ? res.data : res.errorMsg || '失败'
  if (res.code === 200) await loadGlobal()
}

function onScopeTypeChange() {
  if (ovForm.scopeType === 'GROUP') {
    ovForm.scopeKey = groupNames.value[0] ?? ''
  } else {
    ovForm.scopeKey = devices.value[0] ? String(devices.value[0].id) : ''
  }
}

async function saveOverride() {
  if (!ovForm.scopeKey) {
    ovMsg.value = ovForm.scopeType === 'GROUP' ? '请选择编组' : '请选择设备'
    return
  }
  if (ovForm.lightThresholdOn >= ovForm.lightThresholdOff) {
    ovMsg.value = '开灯阈值必须小于关灯阈值'
    return
  }
  const res = await api.upsertThresholdOverride({ ...ovForm })
  ovMsg.value = res.code === 200 ? res.data : res.errorMsg || '失败'
  if (res.code === 200) await loadOverrides()
}

async function removeOverride(o: ThresholdOverride) {
  const res = await api.deleteThresholdOverride(o.scopeType, o.scopeKey)
  if (res.code === 200) await loadOverrides()
  else ovMsg.value = res.errorMsg || '删除失败'
}

function typeLabel(t: string) {
  return t === 'DEVICE' ? '设备' : t === 'GROUP' ? '编组' : t
}
</script>

<template>
  <div class="ui-page threshold-page">
    <div class="ui-card form-card slide-up-enter-active">
      <h2 class="ui-card-title">全局默认阈值</h2>
      <p class="ui-desc">
        未单独配置的设备与编组使用此处数值。自动开关：光照低于开灯阈值且灯关 → 开灯；高于关灯阈值且灯开 →
        关灯。心跳超时仅全局生效。
      </p>

      <label class="ui-label">
        开灯阈值（lux）
        <input v-model.number="form.lightThresholdOn" class="ui-input" type="number" min="0" step="1" />
      </label>
      <label class="ui-label">
        关灯阈值（lux）
        <input v-model.number="form.lightThresholdOff" class="ui-input" type="number" min="0" step="1" />
      </label>
      <label class="ui-label">
        心跳超时（秒）
        <input v-model.number="form.heartbeatTimeout" class="ui-input" type="number" />
      </label>

      <p class="updated mono">更新于 {{ updatedAt || '—' }}</p>

      <button type="button" class="ui-btn ui-btn-warm" @click="save">保存全局</button>
      <p v-if="msg" class="ui-msg">{{ msg }}</p>
    </div>

    <div ref="overrideCard" class="ui-card form-card slide-up-enter-active slide-up-delay-1">
      <h2 class="ui-card-title">编组 / 设备覆盖</h2>
      <p class="ui-desc">
        可为某个编组或单灯单独设定开/关阈值。生效顺序：
        <strong>设备 &gt; 编组 &gt; 全局</strong>。
      </p>

      <div class="ov-form">
        <label class="ui-label">
          范围
          <select v-model="ovForm.scopeType" class="ui-select" @change="onScopeTypeChange">
            <option value="GROUP">编组</option>
            <option value="DEVICE">单设备</option>
          </select>
        </label>
        <label v-if="ovForm.scopeType === 'GROUP'" class="ui-label">
          编组
          <select v-model="ovForm.scopeKey" class="ui-select" :disabled="!groupNames.length">
            <option v-if="!groupNames.length" value="">暂无编组</option>
            <option v-for="g in groupNames" :key="g" :value="g">{{ g }}</option>
          </select>
        </label>
        <label v-else class="ui-label">
          设备
          <select v-model="ovForm.scopeKey" class="ui-select" :disabled="!devices.length">
            <option v-for="d in devices" :key="d.id" :value="String(d.id)">
              {{ d.deviceName }}
            </option>
          </select>
        </label>
        <label class="ui-label">
          开灯（lux）
          <input
            v-model.number="ovForm.lightThresholdOn"
            class="ui-input"
            type="number"
            min="0"
            step="1"
          />
        </label>
        <label class="ui-label">
          关灯（lux）
          <input
            v-model.number="ovForm.lightThresholdOff"
            class="ui-input"
            type="number"
            min="0"
            step="1"
          />
        </label>
      </div>

      <button type="button" class="ui-btn ui-btn-warm" @click="saveOverride">保存覆盖</button>
      <p v-if="ovMsg" class="ui-msg">{{ ovMsg }}</p>

      <ul v-if="overrides.length" class="ov-list">
        <li v-for="o in overrides" :key="o.id" class="ov-row">
          <div class="ov-meta">
            <span class="ov-badge">{{ typeLabel(o.scopeType) }}</span>
            <span class="ov-name">{{ o.scopeLabel }}</span>
            <span class="ov-vals mono"
              >&lt;{{ o.lightThresholdOn }} / &gt;{{ o.lightThresholdOff }} lux</span
            >
          </div>
          <button type="button" class="ui-btn ui-btn-ghost" @click="removeOverride(o)">删除</button>
        </li>
      </ul>
      <p v-else class="empty">暂无覆盖，全部走全局默认。</p>
    </div>
  </div>
</template>

<style scoped>
.threshold-page {
  display: grid;
  gap: var(--space-5);
  align-content: start;
  grid-template-columns: repeat(auto-fit, minmax(320px, 440px));
}

.form-card {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.updated {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.ov-form {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr 1fr;
}

.ov-form .ui-label:nth-child(1),
.ov-form .ui-label:nth-child(2) {
  grid-column: 1 / -1;
}

.ov-list {
  list-style: none;
  margin: var(--space-2) 0 0;
  padding: 0;
  display: grid;
  gap: 2px;
  background: var(--paper);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-inset);
  overflow: hidden;
}

.ov-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 12px 14px;
  background: var(--panel);
}

.ov-row + .ov-row {
  box-shadow: inset 0 1px 0 var(--line);
}

.ov-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.ov-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--sodium-deep);
  background: var(--sodium-soft);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.ov-name {
  font-weight: 600;
  font-size: var(--text-sm);
}

.ov-vals {
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-muted);
}

@media (max-width: 520px) {
  .ov-form {
    grid-template-columns: 1fr;
  }

  .ov-form .ui-label:nth-child(1),
  .ov-form .ui-label:nth-child(2) {
    grid-column: auto;
  }
}
</style>
