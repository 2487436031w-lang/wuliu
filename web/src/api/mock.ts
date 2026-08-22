import type {
  AlarmLog,
  AlarmStatistics,
  ControlLog,
  Device,
  DeviceDetail,
  DeviceStatistics,
  LatestLight,
  LightReading,
  PageResult,
  Role,
  ThresholdConfig,
  TrendPoint,
  UserSession,
} from '../types/domain'
import { fail, ok, type StreetLightApi } from './types'

const now = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

let users: { username: string; password: string; role: Role; id: number }[] = [
  { id: 1, username: 'admin', password: 'admin123', role: 'ADMIN' },
  { id: 2, username: 'staff', password: 'staff123', role: 'MUNICIPAL_STAFF' },
]

let devices: Device[] = [
  {
    id: 1,
    deviceName: '一号路口灯柱',
    deviceSn: 'SN001',
    status: 'ON',
    onlineStatus: 'ONLINE',
    lastHeartbeatTime: now(),
    createdAt: '2026-06-01 10:00:00',
  },
  {
    id: 2,
    deviceName: '校园东门灯',
    deviceSn: 'SN002',
    status: 'OFF',
    onlineStatus: 'ONLINE',
    lastHeartbeatTime: now(),
    createdAt: '2026-06-02 11:00:00',
  },
  {
    id: 3,
    deviceName: '体育场路灯',
    deviceSn: 'SN003',
    status: 'OFF',
    onlineStatus: 'OFFLINE',
    lastHeartbeatTime: '2026-08-21 22:00:00',
    createdAt: '2026-06-03 12:00:00',
  },
]

let lights: LightReading[] = []
let lightSeq = 1
for (let i = 0; i < 24; i++) {
  lights.push({
    id: lightSeq++,
    deviceId: 1,
    deviceName: '一号路口灯柱',
    lightIntensity: 20 + Math.sin(i / 3) * 40 + i * 2,
    createdAt: `2026-08-22 ${String(i).padStart(2, '0')}:00:00`,
  })
}

let alarms: AlarmLog[] = [
  {
    id: 1,
    deviceId: 3,
    deviceName: '体育场路灯',
    alarmType: 'OFFLINE',
    message: '心跳超时离线',
    status: 'ACTIVE',
    createdAt: '2026-08-21 22:05:00',
    resolvedAt: null,
  },
]

let threshold: ThresholdConfig = {
  id: 1,
  lightThresholdOn: 30,
  lightThresholdOff: 80,
  heartbeatTimeout: 60,
  updatedAt: now(),
}

let controlLogs: ControlLog[] = []
let controlSeq = 1

function pageOf<T>(list: T[], page = 1, pageSize = 10): PageResult<T> {
  const start = (page - 1) * pageSize
  return { total: list.length, records: list.slice(start, start + pageSize) }
}

export function createMockApi(): StreetLightApi {
  return {
    async register(username, password, role = 'MUNICIPAL_STAFF') {
      if (!username.trim() || !password.trim()) return fail('用户名和密码不能为空')
      if (users.some((u) => u.username === username)) return fail('用户名已存在')
      users.push({ id: users.length + 1, username, password, role })
      return ok('注册成功')
    },
    async login(username, password) {
      const u = users.find((x) => x.username === username && x.password === password)
      if (!u) return fail('用户名或密码错误')
      return ok({
        token: `mock-${u.role}-${Date.now()}`,
        userId: u.id,
        username: u.username,
        role: u.role,
      } satisfies UserSession)
    },
    async listDevices(params) {
      let list = [...devices]
      if (params.deviceName) list = list.filter((d) => d.deviceName.includes(params.deviceName!))
      if (params.status) list = list.filter((d) => d.status === params.status)
      if (params.onlineStatus) list = list.filter((d) => d.onlineStatus === params.onlineStatus)
      return ok(pageOf(list, params.page, params.pageSize))
    },
    async getDevice(id) {
      const d = devices.find((x) => x.id === id)
      if (!d) return fail('设备不存在')
      const latest = [...lights].reverse().find((l) => l.deviceId === id)
      const detail: DeviceDetail = {
        ...d,
        latestLightIntensity: latest?.lightIntensity ?? null,
        activeAlarmCount: alarms.filter((a) => a.deviceId === id && a.status === 'ACTIVE').length,
      }
      return ok(detail)
    },
    async addDevice(body) {
      if (devices.some((d) => d.deviceSn === body.deviceSn)) return fail('序列号已存在')
      const d: Device = {
        id: devices.length + 1,
        deviceName: body.deviceName,
        deviceSn: body.deviceSn,
        status: 'OFF',
        onlineStatus: 'OFFLINE',
        lastHeartbeatTime: null,
        createdAt: now(),
      }
      devices = [d, ...devices]
      return ok('添加成功')
    },
    async updateDevice(id, body) {
      devices = devices.map((d) => (d.id === id ? { ...d, deviceName: body.deviceName } : d))
      return ok('修改成功')
    },
    async deleteDevice(id) {
      devices = devices.filter((d) => d.id !== id)
      return ok('删除成功')
    },
    async deviceStatistics() {
      const stats: DeviceStatistics = {
        totalCount: devices.length,
        onlineCount: devices.filter((d) => d.onlineStatus === 'ONLINE').length,
        offlineCount: devices.filter((d) => d.onlineStatus === 'OFFLINE').length,
        onCount: devices.filter((d) => d.status === 'ON').length,
        offCount: devices.filter((d) => d.status === 'OFF').length,
      }
      return ok(stats)
    },
    async switchDevice(id, status) {
      const d = devices.find((x) => x.id === id)
      if (!d) return fail('设备不存在')
      devices = devices.map((x) => (x.id === id ? { ...x, status } : x))
      controlLogs = [
        {
          id: controlSeq++,
          deviceId: id,
          deviceName: d.deviceName,
          operatorId: 1,
          operatorName: 'admin',
          command: status === 'ON' ? 'MANUAL_ON' : 'MANUAL_OFF',
          source: 'MANUAL',
          result: 'SUCCESS',
          createdAt: now(),
        },
        ...controlLogs,
      ]
      return ok({ command: status === 'ON' ? 'MANUAL_ON' : 'MANUAL_OFF' })
    },
    async listLightReadings(params) {
      let list = [...lights].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      if (params.deviceId) list = list.filter((l) => l.deviceId === params.deviceId)
      return ok(pageOf(list, params.page, params.pageSize))
    },
    async latestLight(deviceId) {
      const latest = [...lights].reverse().find((l) => l.deviceId === deviceId)
      if (!latest) return fail('暂无光照数据')
      return ok({
        deviceId,
        lightIntensity: latest.lightIntensity,
        createdAt: latest.createdAt,
      } satisfies LatestLight)
    },
    async lightTrend(deviceId) {
      const points: TrendPoint[] = lights
        .filter((l) => l.deviceId === deviceId)
        .map((l) => ({ time: l.createdAt, value: l.lightIntensity }))
      return ok(points)
    },
    async listAlarms(params) {
      let list = [...alarms]
      if (params.deviceId) list = list.filter((a) => a.deviceId === params.deviceId)
      if (params.status) list = list.filter((a) => a.status === params.status)
      return ok(pageOf(list, params.page, params.pageSize))
    },
    async resolveAlarm(id) {
      const hit = alarms.find((a) => a.id === id)
      if (!hit) return fail('告警不存在')
      if (hit.status === 'RESOLVED') return fail('已解决')
      alarms = alarms.map((a) =>
        a.id === id ? { ...a, status: 'RESOLVED', resolvedAt: now() } : a,
      )
      return ok('处理成功')
    },
    async alarmStatistics() {
      const active = alarms.filter((a) => a.status === 'ACTIVE')
      const map = new Map<string, number>()
      for (const a of active) map.set(a.alarmType, (map.get(a.alarmType) ?? 0) + 1)
      const stats: AlarmStatistics = {
        activeCount: active.length,
        byType: [...map.entries()].map(([alarmType, count]) => ({ alarmType, count })),
      }
      return ok(stats)
    },
    async getThreshold() {
      return ok(threshold)
    },
    async updateThreshold(body) {
      if (body.lightThresholdOn >= body.lightThresholdOff) return fail('开灯阈值必须小于关灯阈值')
      threshold = { ...threshold, ...body, updatedAt: now() }
      return ok('更新成功')
    },
    async listControlLogs(params) {
      let list = [...controlLogs]
      if (params.deviceId) list = list.filter((c) => c.deviceId === params.deviceId)
      return ok(pageOf(list, params.page, params.pageSize))
    },
  }
}

/** Mock 实时：缓慢抖动设备 1 的光照，供 dashboard 轮询感 */
export function mockTickLight(): LatestLight | null {
  const d = devices.find((x) => x.id === 1)
  if (!d || d.onlineStatus !== 'ONLINE') return null
  const intensity = 25 + Math.random() * 60
  const row: LightReading = {
    id: lightSeq++,
    deviceId: 1,
    deviceName: d.deviceName,
    lightIntensity: intensity,
    createdAt: now(),
  }
  lights = [row, ...lights].slice(0, 200)
  return { deviceId: 1, lightIntensity: intensity, createdAt: row.createdAt }
}
