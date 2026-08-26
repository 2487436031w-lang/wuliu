<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CalendarFilter, { type DayMeta } from '../components/CalendarFilter.vue'
import { api } from '../api/client'
import { useLatestRequest, useRowAction } from '../composables/useLatestRequest'
import { useRealtimeStore } from '../stores/realtime'
import type { AlarmLog } from '../types/domain'
import { dateKey, extractDateKey } from '../utils/datetime'
import { alarmRisk, RISK_LABEL, type RiskLevel } from '../utils/risk'

const route = useRoute()
const realtime = useRealtimeStore()
const listRequest = useLatestRequest()
const rowAction = useRowAction()
const allRecords = ref<AlarmLog[]>([])
const status = ref('')
const alarmType = ref('')
const nameQuery = ref('')
const riskFilter = ref<'' | RiskLevel>('')
const selectedDay = ref('')
const msg = ref('')

function applyRouteFilter() {
  status.value = typeof route.query.status === 'string' ? route.query.status : ''
  alarmType.value = typeof route.query.alarmType === 'string' ? route.query.alarmType : ''
}

async function load() {
  const res = await listRequest.run(() =>
    api.listAlarms({
      page: 1,
      pageSize: 200,
      status: status.value || undefined,
      alarmType: alarmType.value || undefined,
    }),
  )
  if (!res || res.code !== 200) return
  allRecords.value = res.data.records
}

const dayMeta = computed<Record<string, DayMeta>>(() => {
  const meta: Record<string, DayMeta> = {}
  for (const a of allRecords.value) {
    const k = extractDateKey(a.createdAt)
    const r = alarmRisk(a.alarmType)
    const prev = meta[k]
    if (!prev) {
      meta[k] = { risk: r, count: 1 }
    } else {
      const order = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      const cur = prev.risk ?? 'LOW'
      meta[k] = {
        risk: order[r] >= order[cur] ? r : cur,
        count: (prev.count ?? 0) + 1,
      }
    }
  }
  return meta
})

const records = computed(() => {
  return allRecords.value.filter((a) => {
    if (nameQuery.value.trim() && !a.deviceName.includes(nameQuery.value.trim())) return false
    if (selectedDay.value && extractDateKey(a.createdAt) !== selectedDay.value) return false
    if (riskFilter.value && alarmRisk(a.alarmType) !== riskFilter.value) return false
    return true
  })
})

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

watch([status, alarmType], () => {
  void load()
})

async function resolve(alarm: AlarmLog) {
  const alarmId = String(alarm.id)
  msg.value = ''
  await rowAction.run(alarmId, async () => {
    try {
      const res = await api.resolveAlarm(alarmId)
      if (res.code === 200) {
        allRecords.value = allRecords.value.map((row) =>
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

function riskClass(type: string) {
  const r = alarmRisk(type)
  if (r === 'HIGH') return 'risk-high'
  if (r === 'MEDIUM') return 'risk-medium'
  return 'risk-low'
}

function jumpToday() {
  selectedDay.value = dateKey(new Date())
}
</script>

<template>
  <div class="ui-page ui-page-fill">
    <div class="ui-card fill-card slide-up-enter-active">
      <div class="head">
        <h2 class="ui-card-title">告警日志</h2>
        <p v-if="msg" class="ui-msg">{{ msg }}</p>
      </div>

      <div class="ui-filter-bar">
        <input
          v-model="nameQuery"
          class="ui-input"
          placeholder="按设备名称筛选"
        />
        <select v-model="status" class="ui-select">
          <option value="">全部状态</option>
          <option value="ACTIVE">待处理</option>
          <option value="RESOLVED">已处理</option>
        </select>
        <select v-model="alarmType" class="ui-select">
          <option value="">全部类型</option>
          <option value="OFFLINE">OFFLINE</option>
          <option value="COMMAND_TIMEOUT">COMMAND_TIMEOUT</option>
          <option value="LIGHT_ABNORMAL">LIGHT_ABNORMAL</option>
          <option value="HEARTBEAT_TIMEOUT">HEARTBEAT_TIMEOUT</option>
        </select>
        <select v-model="riskFilter" class="ui-select">
          <option value="">全部风险</option>
          <option value="HIGH">高风险</option>
          <option value="MEDIUM">中风险</option>
          <option value="LOW">低风险</option>
        </select>
        <CalendarFilter
          v-model="selectedDay"
          mode="risk"
          label="日历筛选"
          :day-meta="dayMeta"
        />
        <button type="button" class="ui-btn ui-btn-secondary ui-btn-compact" @click="jumpToday">
          今天
        </button>
      </div>

      <div class="ui-table-panel ui-table-panel--scroll ui-table-panel--fill">
        <div class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>设备</th>
              <th>风险</th>
              <th>类型</th>
              <th>内容</th>
              <th>状态</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in records" :key="a.id">
              <td class="col-time mono">{{ a.createdAt }}</td>
              <td class="col-name">{{ a.deviceName }}</td>
              <td>
                <span :class="['ui-badge', riskClass(a.alarmType)]">
                  {{ RISK_LABEL[alarmRisk(a.alarmType)] }}
                </span>
              </td>
              <td class="col-mono mono">{{ a.alarmType }}</td>
              <td class="col-fill">{{ a.message }}</td>
              <td class="col-mono">
                <span :class="['ui-badge', a.status === 'ACTIVE' ? 'timeout' : 'ok']">
                  {{ a.status === 'ACTIVE' ? '待处理' : '已处理' }}
                </span>
              </td>
              <td class="col-actions">
                <button
                  v-if="a.status === 'ACTIVE'"
                  type="button"
                  class="ui-btn ui-btn-compact"
                  :disabled="rowAction.isActive(a.id)"
                  @click="resolve(a)"
                >
                  {{ rowAction.isActive(a.id) ? '…' : '处理' }}
                </button>
                <span v-else class="action-placeholder">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
      <p v-if="!records.length" class="ui-empty">无匹配告警</p>
    </div>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  gap: var(--space-3);
  flex-wrap: wrap;
}

.head .ui-card-title {
  margin-bottom: 0;
}

.action-placeholder {
  display: inline-block;
  min-width: 52px;
  text-align: center;
  color: var(--ink-muted);
  font-size: var(--text-sm);
}
</style>
