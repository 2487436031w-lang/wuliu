<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CalendarFilter, { type DayMeta } from '../components/CalendarFilter.vue'
import { api } from '../api/client'
import type { AlarmLog, ControlLog } from '../types/domain'
import { dateKey, extractDateKey } from '../utils/datetime'
import {
  alarmRisk,
  controlLogRisk,
  maxRisk,
  RISK_LABEL,
  type RiskLevel,
} from '../utils/risk'

const allLogs = ref<ControlLog[]>([])
const alarmPool = ref<AlarmLog[]>([])
const nameQuery = ref('')
const riskFilter = ref<'' | RiskLevel>('')
const selectedDay = ref('')
const sourceFilter = ref('')

function execLabel(status: string) {
  if (status === 'PENDING') return '等待回执'
  if (status === 'TIMEOUT') return '超时'
  if (status === 'SUCCESS') return '已确认'
  return status
}

function execClass(status: string) {
  if (status === 'PENDING') return 'pending'
  if (status === 'TIMEOUT') return 'timeout'
  if (status === 'SUCCESS') return 'ok'
  return ''
}

function sourceLabel(source: string) {
  if (source === 'AUTO') return '自动'
  if (source === 'MANUAL') return '手动'
  return source
}

function riskClass(level: RiskLevel) {
  if (level === 'HIGH') return 'risk-high'
  if (level === 'MEDIUM') return 'risk-medium'
  return 'risk-low'
}

async function load() {
  const [logsRes, alarmRes] = await Promise.all([
    api.listControlLogs({ page: 1, pageSize: 200, source: sourceFilter.value || undefined }),
    api.listAlarms({ page: 1, pageSize: 200 }),
  ])
  if (logsRes.code === 200) allLogs.value = logsRes.data.records
  if (alarmRes.code === 200) alarmPool.value = alarmRes.data.records
}

/** 日历：优先用当日告警风险着色；无告警时用控制日志执行严重度 */
const dayMeta = computed<Record<string, DayMeta>>(() => {
  const meta: Record<string, DayMeta> = {}
  for (const a of alarmPool.value) {
    const k = extractDateKey(a.createdAt)
    meta[k] = {
      risk: maxRisk(meta[k]?.risk, alarmRisk(a.alarmType)),
      count: (meta[k]?.count ?? 0) + 1,
    }
  }
  for (const c of allLogs.value) {
    const k = extractDateKey(c.createdAt)
    if (!meta[k]?.risk) {
      meta[k] = {
        risk: maxRisk(meta[k]?.risk, controlLogRisk(c.executionStatus)),
        count: (meta[k]?.count ?? 0) + 1,
      }
    } else {
      meta[k] = { ...meta[k], count: (meta[k].count ?? 0) + 1 }
    }
  }
  return meta
})

const records = computed(() => {
  return allLogs.value.filter((c) => {
    if (nameQuery.value.trim()) {
      const q = nameQuery.value.trim()
      const hit =
        (c.deviceName && c.deviceName.includes(q)) ||
        (c.operatorName && c.operatorName.includes(q))
      if (!hit) return false
    }
    if (selectedDay.value && extractDateKey(c.createdAt) !== selectedDay.value) return false
    if (riskFilter.value && controlLogRisk(c.executionStatus) !== riskFilter.value) return false
    return true
  })
})

onMounted(load)
watch(sourceFilter, load)

function jumpToday() {
  selectedDay.value = dateKey(new Date())
}
</script>

<template>
  <div class="ui-page ui-page-fill">
    <div class="ui-card fill-card slide-up-enter-active">
      <h2 class="ui-card-title">控制日志</h2>

      <div class="ui-filter-bar">
        <input v-model="nameQuery" class="ui-input" placeholder="设备 / 操作人名称" />
        <select v-model="sourceFilter" class="ui-select">
          <option value="">全部来源</option>
          <option value="AUTO">自动</option>
          <option value="MANUAL">手动</option>
        </select>
        <select v-model="riskFilter" class="ui-select">
          <option value="">全部风险</option>
          <option value="HIGH">高风险（超时）</option>
          <option value="MEDIUM">中风险（等待）</option>
          <option value="LOW">低风险（已确认）</option>
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

      <p class="cal-note">
        日历色点优先标记当日<strong>告警</strong>风险（红=高 / 橙=中 / 绿=低）；无告警时按日志执行状态着色。
      </p>

      <div v-if="records.length" class="ui-table-panel ui-table-panel--scroll ui-table-panel--fill">
        <div class="ui-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>设备</th>
              <th>指令</th>
              <th>来源</th>
              <th>风险</th>
              <th>执行</th>
              <th>期望</th>
              <th>操作人</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in records" :key="c.id">
              <td class="col-time mono">{{ c.createdAt }}</td>
              <td class="col-name">{{ c.deviceName || '—' }}</td>
              <td class="col-mono mono">{{ c.command }}</td>
              <td class="col-mono">{{ sourceLabel(c.source) }}</td>
              <td>
                <span :class="['ui-badge', riskClass(controlLogRisk(c.executionStatus))]">
                  {{ RISK_LABEL[controlLogRisk(c.executionStatus)] }}
                </span>
              </td>
              <td class="col-mono">
                <span :class="['ui-badge', execClass(c.executionStatus)]">
                  {{ execLabel(c.executionStatus) }}
                </span>
              </td>
              <td class="col-mono mono">{{ c.expectedStatus || '—' }}</td>
              <td class="col-name">{{ c.operatorName || '—' }}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <p v-else class="ui-empty">无匹配日志</p>
    </div>
  </div>
</template>

<style scoped>
.cal-note {
  margin: 0 0 var(--space-3);
  font-size: var(--text-xs);
  color: var(--ink-muted);
  line-height: 1.5;
}

.cal-note strong {
  color: var(--ink-soft);
  font-weight: 600;
}
</style>
