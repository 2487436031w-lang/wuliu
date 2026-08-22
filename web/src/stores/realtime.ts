import { defineStore } from 'pinia'
import { onScopeDispose, ref } from 'vue'
import { pushMockAlarm, tickMockPositions } from '../api/mock'
import type { Alarm, PositionPoint } from '../types/domain'

/**
 * Deep module: realtime seam.
 * Mock: interval ticks. Later: connect `/ws/positions` + `/ws/alarms`.
 */
export const useRealtimeStore = defineStore('realtime', () => {
  const positions = ref<PositionPoint[]>([])
  const latestAlarm = ref<Alarm | null>(null)
  const connected = ref(false)
  let timer: number | undefined

  function connect() {
    if (timer) return
    connected.value = true
    positions.value = tickMockPositions()
    timer = window.setInterval(() => {
      positions.value = tickMockPositions()
      if (Math.random() < 0.08) {
        latestAlarm.value = pushMockAlarm({
          alarmType: Math.random() > 0.5 ? 'abnormal_stop' : 'off_route',
          alarmLevel: 2,
          description: Math.random() > 0.5 ? '异常停留超过阈值' : '偏航告警（模拟推送）',
        })
      }
    }, 2500)
  }

  function disconnect() {
    if (timer) window.clearInterval(timer)
    timer = undefined
    connected.value = false
  }

  function clearAlarmToast() {
    latestAlarm.value = null
  }

  onScopeDispose(disconnect)

  return { positions, latestAlarm, connected, connect, disconnect, clearAlarmToast }
})
