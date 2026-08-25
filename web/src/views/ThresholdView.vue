<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/client'
import type { Device, ThresholdOverride } from '../types/domain'

type ScopeKind = 'GLOBAL' | 'GROUP' | 'DEVICE'
type FilterType = 'ALL' | 'GROUP' | 'DEVICE'

const route = useRoute()

const scopeKind = ref<ScopeKind>('GLOBAL')
const scopeKey = ref('')
const devices = ref<Device[]>([])
const overrides = ref<ThresholdOverride[]>([])
const msg = ref('')
const listMsg = ref('')
const updatedAt = ref('')

const listQuery = ref('')
const listType = ref<FilterType>('ALL')

const form = reactive({
  lightThresholdOn: 30,
  lightThresholdOff: 80,
  heartbeatTimeout: 60,
})

const globalDraft = reactive({
  lightThresholdOn: 30,
  lightThresholdOff: 80,
  heartbeatTimeout: 60,
  updatedAt: '',
})

const groupNames = computed(() => {
  const set = new Set<string>()
  for (const d of devices.value) {
    if (d.groupName?.trim()) set.add(d.groupName.trim())
  }
  return [...set].sort()
})

const currentOverride = computed(() => {
  if (scopeKind.value === 'GLOBAL' || !scopeKey.value) return null
  return (
    overrides.value.find(
      (o) => o.scopeType === scopeKind.value && o.scopeKey === scopeKey.value,
    ) ?? null
  )
})

const filteredOverrides = computed(() => {
  const q = listQuery.value.trim().toLowerCase()
  return overrides.value
    .filter((o) => {
      if (listType.value !== 'ALL' && o.scopeType !== listType.value) return false
      if (!q) return true
      const hay = `${o.scopeLabel} ${o.scopeKey} ${o.scopeType} ${o.lightThresholdOn} ${o.lightThresholdOff}`.toLowerCase()
      return hay.includes(q)
    })
    .slice()
    .sort((a, b) => {
      if (a.scopeType !== b.scopeType) return a.scopeType === 'GROUP' ? -1 : 1
      return a.scopeLabel.localeCompare(b.scopeLabel, 'zh')
    })
})

const listCounts = computed(() => ({
  all: overrides.value.length,
  group: overrides.value.filter((o) => o.scopeType === 'GROUP').length,
  device: overrides.value.filter((o) => o.scopeType === 'DEVICE').length,
}))

const scopeHint = computed(() => {
  if (scopeKind.value === 'GLOBAL') {
    return '未单独配置的编组与路灯使用全局数值。心跳超时仅在此设置。'
  }
  if (scopeKind.value === 'GROUP') {
    return currentOverride.value
      ? '当前编组已有覆盖；保存将更新，删除后回退全局。'
      : '当前编组尚无覆盖，保存后单独生效。优先级：设备 > 编组 > 全局。'
  }
  return currentOverride.value
    ? '当前路灯已有覆盖；保存将更新，删除后回退编组或全局。'
    : '当前路灯尚无覆盖，保存后单独生效。优先级：设备 > 编组 > 全局。'
})

const saveLabel = computed(() => {
  if (scopeKind.value === 'GLOBAL') return '保存全局'
  return currentOverride.value ? '更新覆盖' : '保存覆盖'
})

async function loadAll() {
  const [th, ov, dev] = await Promise.all([
    api.getThreshold(),
    api.listThresholdOverrides(),
    api.listDevices({ page: 1, pageSize: 200 }),
  ])
  if (th.code === 200) {
    globalDraft.lightThresholdOn = th.data.lightThresholdOn
    globalDraft.lightThresholdOff = th.data.lightThresholdOff
    globalDraft.heartbeatTimeout = th.data.heartbeatTimeout
    globalDraft.updatedAt = th.data.updatedAt
  }
  if (ov.code === 200) overrides.value = ov.data
  if (dev.code === 200) devices.value = dev.data.records
}

function fillFromGlobal() {
  form.lightThresholdOn = globalDraft.lightThresholdOn
  form.lightThresholdOff = globalDraft.lightThresholdOff
  form.heartbeatTimeout = globalDraft.heartbeatTimeout
  updatedAt.value = globalDraft.updatedAt
}

function fillFromOverride(o: ThresholdOverride | null) {
  if (o) {
    form.lightThresholdOn = o.lightThresholdOn
    form.lightThresholdOff = o.lightThresholdOff
    updatedAt.value = o.updatedAt
  } else {
    form.lightThresholdOn = globalDraft.lightThresholdOn
    form.lightThresholdOff = globalDraft.lightThresholdOff
    updatedAt.value = ''
  }
}

function ensureScopeKey() {
  if (scopeKind.value === 'GROUP') {
    if (!scopeKey.value || !groupNames.value.includes(scopeKey.value)) {
      scopeKey.value = groupNames.value[0] ?? ''
    }
  } else if (scopeKind.value === 'DEVICE') {
    const ids = new Set(devices.value.map((d) => String(d.id)))
    if (!scopeKey.value || !ids.has(scopeKey.value)) {
      scopeKey.value = devices.value[0] ? String(devices.value[0].id) : ''
    }
  } else {
    scopeKey.value = ''
  }
}

function syncFormToScope() {
  ensureScopeKey()
  if (scopeKind.value === 'GLOBAL') fillFromGlobal()
  else fillFromOverride(currentOverride.value)
}

function onScopeKindChange() {
  msg.value = ''
  ensureScopeKey()
  syncFormToScope()
}

watch(scopeKey, () => {
  if (scopeKind.value === 'GLOBAL') return
  msg.value = ''
  fillFromOverride(currentOverride.value)
})

function applyRouteScope() {
  const rawType = String(route.query.scopeType ?? '').toUpperCase()
  const key = route.query.scopeKey != null ? String(route.query.scopeKey) : ''
  if (rawType === 'GROUP' || rawType === 'DEVICE') {
    scopeKind.value = rawType
    scopeKey.value = key
    return
  }
  if (rawType === 'GLOBAL' || route.query.scope === 'global') {
    scopeKind.value = 'GLOBAL'
  }
}

onMounted(async () => {
  await loadAll()
  applyRouteScope()
  syncFormToScope()
})

async function save() {
  if (form.lightThresholdOn >= form.lightThresholdOff) {
    msg.value = '开灯阈值必须小于关灯阈值'
    return
  }

  if (scopeKind.value === 'GLOBAL') {
    if (form.heartbeatTimeout <= 0) {
      msg.value = '心跳超时必须大于 0'
      return
    }
    const res = await api.updateThreshold({
      lightThresholdOn: form.lightThresholdOn,
      lightThresholdOff: form.lightThresholdOff,
      heartbeatTimeout: form.heartbeatTimeout,
    })
    msg.value = res.code === 200 ? res.data : res.errorMsg || '失败'
    if (res.code === 200) {
      await loadAll()
      fillFromGlobal()
    }
    return
  }

  if (!scopeKey.value) {
    msg.value = scopeKind.value === 'GROUP' ? '请选择编组' : '请选择路灯'
    return
  }
  const res = await api.upsertThresholdOverride({
    scopeType: scopeKind.value,
    scopeKey: scopeKey.value,
    lightThresholdOn: form.lightThresholdOn,
    lightThresholdOff: form.lightThresholdOff,
  })
  msg.value = res.code === 200 ? res.data : res.errorMsg || '失败'
  if (res.code === 200) {
    await loadAll()
    fillFromOverride(currentOverride.value)
  }
}

async function removeOverride(o: ThresholdOverride) {
  const res = await api.deleteThresholdOverride(o.scopeType, o.scopeKey)
  listMsg.value = res.code === 200 ? '已删除覆盖' : res.errorMsg || '删除失败'
  if (res.code !== 200) return
  await loadAll()
  if (scopeKind.value === o.scopeType && scopeKey.value === o.scopeKey) {
    fillFromOverride(null)
    msg.value = '当前覆盖已删除，表单回退为全局预填'
  }
}

async function removeCurrentOverride() {
  if (!currentOverride.value) return
  await removeOverride(currentOverride.value)
}

function pickOverride(o: ThresholdOverride) {
  scopeKind.value = o.scopeType === 'DEVICE' ? 'DEVICE' : 'GROUP'
  scopeKey.value = o.scopeKey
  msg.value = ''
  listMsg.value = ''
  fillFromOverride(o)
}

function isSelected(o: ThresholdOverride) {
  return scopeKind.value === o.scopeType && scopeKey.value === o.scopeKey
}

function typeLabel(t: string) {
  return t === 'DEVICE' ? '单灯' : t === 'GROUP' ? '编组' : t
}
</script>

<template>
  <div class="ui-page threshold-page">
    <div class="threshold-layout slide-up-enter-active">
      <div class="ui-card form-card">
        <h2 class="ui-card-title">开关灯阈值</h2>
        <p class="ui-desc">
          光照低于开灯阈值且灯关 → 自动开灯；高于关灯阈值且灯开 → 自动关灯。生效顺序：
          <strong>单灯 &gt; 编组 &gt; 全局</strong>。
        </p>

        <div class="scope-row">
          <label class="ui-label">
            配置范围
            <select v-model="scopeKind" class="ui-select" @change="onScopeKindChange">
              <option value="GLOBAL">全局</option>
              <option value="GROUP">编组</option>
              <option value="DEVICE">单个路灯</option>
            </select>
          </label>
          <label v-if="scopeKind === 'GROUP'" class="ui-label">
            编组
            <select v-model="scopeKey" class="ui-select" :disabled="!groupNames.length">
              <option v-if="!groupNames.length" value="">暂无编组</option>
              <option v-for="g in groupNames" :key="g" :value="g">{{ g }}</option>
            </select>
          </label>
          <label v-else-if="scopeKind === 'DEVICE'" class="ui-label">
            路灯
            <select v-model="scopeKey" class="ui-select" :disabled="!devices.length">
              <option v-for="d in devices" :key="d.id" :value="String(d.id)">
                {{ d.deviceName }}
              </option>
            </select>
          </label>
        </div>

        <p class="scope-hint">{{ scopeHint }}</p>

        <label class="ui-label">
          开灯阈值（lux）
          <input
            v-model.number="form.lightThresholdOn"
            class="ui-input"
            type="number"
            min="0"
            step="1"
          />
        </label>
        <label class="ui-label">
          关灯阈值（lux）
          <input
            v-model.number="form.lightThresholdOff"
            class="ui-input"
            type="number"
            min="0"
            step="1"
          />
        </label>
        <label v-if="scopeKind === 'GLOBAL'" class="ui-label">
          心跳超时（秒）
          <input v-model.number="form.heartbeatTimeout" class="ui-input" type="number" min="1" />
        </label>

        <p class="updated mono">
          {{
            updatedAt
              ? `更新于 ${updatedAt}`
              : scopeKind === 'GLOBAL'
                ? '—'
                : '尚未单独覆盖，表单为全局预填'
          }}
        </p>

        <div class="form-footer">
          <div class="actions">
            <button type="button" class="ui-btn ui-btn-warm" @click="save">{{ saveLabel }}</button>
            <button
              v-if="currentOverride"
              type="button"
              class="ui-btn ui-btn-secondary"
              @click="removeCurrentOverride"
            >
              删除此覆盖
            </button>
          </div>
          <p v-if="msg" class="ui-msg">{{ msg }}</p>
        </div>
      </div>

      <aside class="ui-card list-card">
        <div class="list-head">
          <h2 class="ui-card-title">已有覆盖</h2>
          <span class="list-count mono">{{ filteredOverrides.length }}/{{ listCounts.all }}</span>
        </div>
        <p class="ui-desc list-desc">点选一条可载入左侧编辑；可按类型筛选或搜索名称。</p>

        <div class="list-filters">
          <input
            v-model="listQuery"
            class="ui-input"
            type="search"
            placeholder="搜索编组 / 路灯名称…"
          />
          <div class="type-seg" role="group" aria-label="覆盖类型">
            <button
              type="button"
              class="type-btn"
              :class="{ on: listType === 'ALL' }"
              @click="listType = 'ALL'"
            >
              全部 {{ listCounts.all }}
            </button>
            <button
              type="button"
              class="type-btn"
              :class="{ on: listType === 'GROUP' }"
              @click="listType = 'GROUP'"
            >
              编组 {{ listCounts.group }}
            </button>
            <button
              type="button"
              class="type-btn"
              :class="{ on: listType === 'DEVICE' }"
              @click="listType = 'DEVICE'"
            >
              单灯 {{ listCounts.device }}
            </button>
          </div>
        </div>

        <p v-if="listMsg" class="ui-msg list-msg">{{ listMsg }}</p>

        <div class="ov-scroll">
          <p v-if="!overrides.length" class="empty">暂无覆盖，全部走全局默认。</p>
          <p v-else-if="!filteredOverrides.length" class="empty">无匹配结果，试试改搜索或筛选。</p>
          <ul v-else class="ov-list">
            <li
              v-for="o in filteredOverrides"
              :key="o.id"
              class="ov-row"
              :class="{ on: isSelected(o) }"
            >
              <button type="button" class="ov-pick" @click="pickOverride(o)">
                <span class="ov-badge">{{ typeLabel(o.scopeType) }}</span>
                <span class="ov-name">{{ o.scopeLabel }}</span>
                <span class="ov-vals mono"
                  >&lt;{{ o.lightThresholdOn }} / &gt;{{ o.lightThresholdOff }} lux</span
                >
              </button>
              <button
                type="button"
                class="ui-btn ui-btn-ghost ov-del"
                title="删除覆盖"
                @click.stop="removeOverride(o)"
              >
                删除
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.threshold-page {
  align-content: start;
}

.threshold-layout {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: var(--space-5);
  align-items: stretch;
  width: 100%;
  min-height: min(70vh, 640px);
}

.form-card,
.list-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
}

.list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  flex-shrink: 0;
}

.list-head .ui-card-title {
  margin-bottom: 0;
}

.list-count {
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.list-desc {
  margin: 0;
  flex-shrink: 0;
}

.list-filters {
  display: grid;
  gap: var(--space-3);
  flex-shrink: 0;
}

.type-seg {
  display: inline-flex;
  flex-wrap: wrap;
  padding: 3px;
  background: var(--paper);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-inset);
  width: fit-content;
  max-width: 100%;
}

.type-btn {
  border: none;
  background: transparent;
  padding: 7px 12px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink-muted);
  border-radius: calc(var(--radius-md) - 2px);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-out),
    color var(--duration-fast);
}

.type-btn:hover {
  color: var(--ink);
}

.type-btn.on {
  background: var(--panel);
  color: var(--ink);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.06));
}

.list-msg {
  margin: 0;
  flex-shrink: 0;
}

.ov-scroll {
  flex: 1 1 0;
  min-height: 120px;
  overflow-y: auto;
  border-radius: var(--radius-md);
  background: var(--paper);
  box-shadow: var(--shadow-inset);
}

.form-card .ui-desc,
.form-card .scope-row,
.form-card .scope-hint,
.form-card .ui-label,
.form-card .updated {
  flex-shrink: 0;
}

.scope-row {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr 1fr;
}

.scope-row .ui-label:first-child:last-child {
  grid-column: 1 / -1;
}

.scope-hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-muted);
  line-height: 1.45;
}

.updated {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--ink-muted);
}

.form-footer {
  margin-top: auto;
  display: grid;
  gap: var(--space-3);
  flex-shrink: 0;
  padding-top: var(--space-2);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.ov-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}

.ov-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  background: var(--panel);
}

.ov-row + .ov-row {
  box-shadow: inset 0 1px 0 var(--line);
}

.ov-row.on {
  background: var(--sodium-soft);
}

.ov-pick {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  padding: 12px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}

.ov-pick:hover {
  background: rgba(0, 0, 0, 0.03);
}

.ov-del {
  flex: 0 0 auto;
  align-self: center;
  margin-right: 8px;
}

.ov-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--sodium-deep);
  background: var(--sodium-soft);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.ov-row.on .ov-badge {
  background: rgba(255, 255, 255, 0.65);
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
  padding: 28px 16px;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--ink-muted);
}

@media (max-width: 860px) {
  .threshold-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .form-card,
  .list-card {
    height: auto;
  }

  .form-footer {
    margin-top: 0;
  }

  .ov-scroll {
    flex: none;
    max-height: 40vh;
  }
}

@media (max-width: 520px) {
  .scope-row {
    grid-template-columns: 1fr;
  }
}
</style>
