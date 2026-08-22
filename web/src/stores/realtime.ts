import { Client } from '@stomp/stompjs'
import { defineStore } from 'pinia'
import { onScopeDispose, ref } from 'vue'
import { isMockMode } from '../api/client'
import { mockTickLight } from '../api/mock'
import type { AlarmLog, LatestLight } from '../types/domain'
import { useAuthStore } from './auth'

/**
 * Seam: STOMP `/ws?token=` → topics。
 * Mock 模式用定时器模拟光照推送。
 */
export const useRealtimeStore = defineStore('realtime', () => {
  const connected = ref(false)
  const latestLight = ref<LatestLight | null>(null)
  const latestAlarm = ref<AlarmLog | null>(null)
  let client: Client | null = null
  let timer: number | undefined

  function connect() {
    disconnect()
    if (isMockMode) {
      connected.value = true
      timer = window.setInterval(() => {
        latestLight.value = mockTickLight()
      }, 3000)
      return
    }

    const auth = useAuthStore()
    const token = auth.session?.token
    if (!token) return

    const wsBase = (import.meta.env.VITE_WS_BASE as string) || `ws://${location.hostname}:8080`
    client = new Client({
      brokerURL: `${wsBase}/ws?token=${encodeURIComponent(token)}`,
      reconnectDelay: 4000,
      onConnect: () => {
        connected.value = true
        client?.subscribe('/topic/light-readings', (msg) => {
          const body = JSON.parse(msg.body) as { data: LatestLight }
          latestLight.value = body.data
        })
        client?.subscribe('/topic/alarms', (msg) => {
          const body = JSON.parse(msg.body) as { data: AlarmLog }
          latestAlarm.value = body.data
        })
        client?.subscribe('/topic/device-status', () => {
          /* pages can refresh on demand */
        })
        client?.subscribe('/topic/device-online', () => {})
      },
      onDisconnect: () => {
        connected.value = false
      },
      onStompError: () => {
        connected.value = false
      },
    })
    client.activate()
  }

  function disconnect() {
    if (timer) window.clearInterval(timer)
    timer = undefined
    client?.deactivate()
    client = null
    connected.value = false
  }

  function clearAlarmToast() {
    latestAlarm.value = null
  }

  onScopeDispose(disconnect)

  return { connected, latestLight, latestAlarm, connect, disconnect, clearAlarmToast }
})
