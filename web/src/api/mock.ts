import type {
  AlarmLog,
  AlarmStatistics,
  ControlLog,
  Device,
  DeviceDetail,
  DeviceStatistics,
  EffectiveThreshold,
  LatestLight,
  LightReading,
  PageResult,
  Role,
  ThresholdConfig,
  ThresholdOverride,
  TrendPoint,
  UserSession,
} from '../types/domain'
import { CHONGQING_FLEET } from '../config/lampLocations'
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

let nextDeviceId = 1
let devices: Device[] = CHONGQING_FLEET.groups.flatMap((g) =>
  g.lamps.map((l) => {
    const status = l.status === 'ON' ? 'ON' : 'OFF'
    const online = l.online === 'OFFLINE' ? 'OFFLINE' : 'ONLINE'
    return {
      id: String(nextDeviceId++),
      deviceName: l.name,
      deviceSn: l.sn,
      status,
      onlineStatus: online,
      controlMode: 'AUTO' as const,
      groupName: g.name,
      latitude: l.lat,
      longitude: l.lng,
      expectedStatus: status,
      statusMatch: true,
      lastHeartbeatTime: online === 'OFFLINE' ? '2026-08-25 07:00:00' : now(),
      createdAt: '2026-07-26 10:00:00',
    } satisfies Device
  }),
)

function deviceBySn(sn: string): Device {
  const hit = devices.find((d) => d.deviceSn === sn)
  if (!hit) throw new Error(`演示灯不存在: ${sn}`)
  return hit
}

const rm1 = deviceBySn('SN-RM-001')
const rm2 = deviceBySn('SN-RM-002')
const rm3 = deviceBySn('SN-RM-003')
const yjp5 = deviceBySn('SN-YJP-005')
const gyq6 = deviceBySn('SN-GYQ-006')

/** 城市道路昼夜 lux 近似（含偏置与噪声） */
function diurnalLux(hour: number, minute: number, bias: number, seed: number): number {
  let base = 20
  if (hour <= 4) base = 1.5 + minute / 60
  else if (hour === 5) base = 6 + minute * 0.4
  else if (hour === 6) base = 35 + minute * 0.9
  else if (hour === 7) base = 90 + minute * 2
  else if (hour >= 8 && hour <= 10) base = 280 + (hour - 8) * 80 + minute * 0.8
  else if (hour >= 11 && hour <= 13) base = 720 + (12 - Math.abs(hour - 12)) * 40 + Math.sin(minute / 10) * 30
  else if (hour >= 14 && hour <= 16) base = 480 - (hour - 14) * 70 + minute * 0.5
  else if (hour === 17) base = 160 - minute * 1.5
  else if (hour === 18) base = 70 - minute * 0.8
  else if (hour === 19) base = 28 - minute * 0.35
  else if (hour >= 20) base = 8 - (hour - 20) * 1.2 + minute * 0.02
  const noise = ((seed * 17 + hour * 3 + minute) % 11) - 5
  return Math.max(0.2, Math.round((base + bias + noise) * 100) / 100)
}

const deviceMeta = devices.map((d) => ({
  id: d.id,
  name: d.deviceName,
  bias: ((Number(d.id) * 7) % 31) - 15,
}))

let lights: LightReading[] = []
let lightSeq = 1
const today = new Date()
for (let day = 0; day < 3; day++) {
  const d = new Date(today)
  d.setDate(d.getDate() - day)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  for (let h = 0; h < 24; h++) {
    for (const min of [0, 30]) {
      // 西段离线：最近 3 小时无数据
      const ageHours = day * 24 + (today.getHours() - h) + (today.getMinutes() - min) / 60
      for (const meta of deviceMeta) {
        if (meta.id === yjp5.id && day === 0 && ageHours < 3) continue
        lights.push({
          id: lightSeq++,
          deviceId: meta.id,
          deviceName: meta.name,
          lightIntensity: diurnalLux(h, min, meta.bias, Number(meta.id) + day),
          createdAt: `${y}-${mo}-${dd} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`,
        })
      }
    }
  }
}
// 对齐「最新」采样与演示开关态
function bumpLatest(deviceId: string, lux: number) {
  let last = -1
  for (let i = 0; i < lights.length; i++) if (lights[i].deviceId === deviceId) last = i
  if (last >= 0) lights[last] = { ...lights[last], lightIntensity: lux }
}
bumpLatest(rm2.id, 12.4)
bumpLatest(rm3.id, 356.2)
bumpLatest(deviceBySn('SN-JFB-001').id, 520.1)
bumpLatest(deviceBySn('SN-GYQ-001').id, 412.8)
bumpLatest(gyq6.id, 95.6)
bumpLatest(deviceBySn('SN-XQ-001').id, 268.5)

let alarms: AlarmLog[] = [
  {
    id: '1',
    deviceId: yjp5.id,
    deviceName: yjp5.deviceName,
    alarmType: 'OFFLINE',
    message: `设备${yjp5.deviceName}心跳超时，已自动标记为离线`,
    status: 'ACTIVE',
    createdAt: '2026-08-25 07:10:00',
    resolvedAt: null,
  },
  {
    id: '2',
    deviceId: rm1.id,
    deviceName: rm1.deviceName,
    alarmType: 'OFFLINE',
    message: `设备${rm1.deviceName}心跳超时，已自动标记为离线`,
    status: 'ACTIVE',
    createdAt: '2026-08-25 08:20:00',
    resolvedAt: null,
  },
  {
    id: '3',
    deviceId: rm1.id,
    deviceName: rm1.deviceName,
    alarmType: 'COMMAND_TIMEOUT',
    message: `设备${rm1.deviceName}指令 ON 超过 30s 未收到 status 回执`,
    status: 'ACTIVE',
    createdAt: '2026-08-25 08:32:00',
    resolvedAt: null,
  },
  {
    id: '4',
    deviceId: gyq6.id,
    deviceName: gyq6.deviceName,
    alarmType: 'LIGHT_ABNORMAL',
    message: `设备${gyq6.deviceName}高光照下仍保持开灯，期望与实际不一致`,
    status: 'ACTIVE',
    createdAt: '2026-08-25 09:50:00',
    resolvedAt: null,
  },
  {
    id: '5',
    deviceId: rm2.id,
    deviceName: rm2.deviceName,
    alarmType: 'HEARTBEAT_TIMEOUT',
    message: `设备${rm2.deviceName}短暂心跳丢失后已恢复`,
    status: 'RESOLVED',
    createdAt: '2026-08-23 22:10:00',
    resolvedAt: '2026-08-23 22:30:00',
  },
]

let threshold: ThresholdConfig = {
  id: 1,
  lightThresholdOn: 30,
  lightThresholdOff: 80,
  heartbeatTimeout: 180,
  updatedAt: now(),
}

let thresholdOverrides: ThresholdOverride[] = [
  {
    id: '1',
    scopeType: 'GROUP',
    scopeKey: '重大校园',
    scopeLabel: '重大校园',
    lightThresholdOn: 25,
    lightThresholdOff: 70,
    updatedAt: now(),
  },
]

let controlLogs: ControlLog[] = [
  {
    id: 1,
    deviceId: rm2.id,
    deviceName: rm2.deviceName,
    operatorId: null,
    operatorName: null,
    command: 'ON',
    source: 'AUTO',
    result: 'SUCCESS',
    executionStatus: 'SUCCESS',
    expectedStatus: 'ON',
    createdAt: now(),
  },
  {
    id: 2,
    deviceId: rm3.id,
    deviceName: rm3.deviceName,
    operatorId: null,
    operatorName: null,
    command: 'OFF',
    source: 'AUTO',
    result: 'SUCCESS',
    executionStatus: 'SUCCESS',
    expectedStatus: 'OFF',
    createdAt: '2026-08-25 09:20:00',
  },
  {
    id: 3,
    deviceId: gyq6.id,
    deviceName: gyq6.deviceName,
    operatorId: null,
    operatorName: null,
    command: 'OFF',
    source: 'AUTO',
    result: 'SUCCESS',
    executionStatus: 'SUCCESS',
    expectedStatus: 'OFF',
    createdAt: '2026-08-25 09:48:00',
  },
  {
    id: 4,
    deviceId: deviceBySn('SN-JFB-001').id,
    deviceName: deviceBySn('SN-JFB-001').deviceName,
    operatorId: 1,
    operatorName: 'admin',
    command: 'ON',
    source: 'MANUAL',
    result: 'SUCCESS',
    executionStatus: 'SUCCESS',
    expectedStatus: 'ON',
    createdAt: '2026-08-25 08:00:00',
  },
  {
    id: 5,
    deviceId: rm1.id,
    deviceName: rm1.deviceName,
    operatorId: 1,
    operatorName: 'admin',
    command: 'ON',
    source: 'MANUAL',
    result: 'SUCCESS',
    executionStatus: 'TIMEOUT',
    expectedStatus: 'ON',
    createdAt: '2026-08-25 08:30:00',
  },
]
let controlSeq = 6

function pageOf<T>(list: T[], page = 1, pageSize = 10): PageResult<T> {
  const start = (page - 1) * pageSize
  return { total: list.length, records: list.slice(start, start + pageSize) }
}

function withMatch(d: Device): Device {
  const expected = d.expectedStatus ?? null
  const statusMatch = !expected || expected === d.status
  return { ...d, expectedStatus: expected, statusMatch }
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
      let list = devices.map(withMatch)
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
        ...withMatch(d),
        latestLightIntensity: latest?.lightIntensity ?? null,
        activeAlarmCount: alarms.filter((a) => a.deviceId === id && a.status === 'ACTIVE').length,
      }
      return ok(detail)
    },
    async addDevice(body) {
      if (devices.some((d) => d.deviceSn === body.deviceSn)) return fail('序列号已存在')
      const d: Device = {
        id: String(nextDeviceId++),
        deviceName: body.deviceName,
        deviceSn: body.deviceSn,
        status: 'OFF',
        onlineStatus: 'OFFLINE',
        controlMode: 'AUTO',
        groupName: null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
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
    async setDeviceLocation(id, body) {
      const d = devices.find((x) => x.id === id)
      if (!d) return fail('设备不存在')
      const lat = body.latitude
      const lng = body.longitude
      if ((lat == null) !== (lng == null)) return fail('经纬度必须同时填写')
      devices = devices.map((x) =>
        x.id === id ? { ...x, latitude: lat, longitude: lng } : x,
      )
      return ok(lat == null ? '已清除位置' : '位置已更新')
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
      const deviceId = String(id)
      const d = devices.find((x) => x.id === deviceId)
      if (!d) return fail('设备不存在')
      devices = devices.map((x) =>
        x.id === deviceId
          ? withMatch({ ...x, status, controlMode: 'MANUAL', expectedStatus: status })
          : x,
      )
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
          executionStatus: 'SUCCESS',
          expectedStatus: status,
          createdAt: now(),
        },
        ...controlLogs,
      ]
      return ok({ command: status === 'ON' ? 'MANUAL_ON' : 'MANUAL_OFF', controlMode: 'MANUAL' })
    },
    async setControlMode(id, mode) {
      const deviceId = String(id)
      if (!devices.find((x) => x.id === deviceId)) return fail('设备不存在')
      devices = devices.map((x) => (x.id === deviceId ? { ...x, controlMode: mode } : x))
      return ok('模式已更新为 ' + mode)
    },
    async setDeviceGroup(id, groupName) {
      const deviceId = String(id)
      if (!devices.find((x) => x.id === deviceId)) return fail('设备不存在')
      const name = groupName?.trim() || null
      devices = devices.map((x) => (x.id === deviceId ? { ...x, groupName: name } : x))
      return ok(name ? `已加入编组 ${name}` : '已移出编组')
    },
    async switchGroup(groupName, status) {
      const name = groupName.trim()
      const members = devices.filter((d) => d.groupName === name)
      if (!members.length) return fail('编组不存在或组内无设备')
      for (const m of members) {
        await this.switchDevice(m.id, status)
      }
      return ok({
        count: members.length,
        command: status === 'ON' ? 'MANUAL_ON' : 'MANUAL_OFF',
        controlMode: 'MANUAL',
      })
    },
    async setGroupControlMode(groupName, mode) {
      const name = groupName.trim()
      const members = devices.filter((d) => d.groupName === name)
      if (!members.length) return fail('编组不存在或组内无设备')
      for (const m of members) {
        await this.setControlMode(m.id, mode)
      }
      return ok({ count: members.length, mode })
    },
    async listLightReadings(params) {
      let list = [...lights].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      if (params.deviceId) {
        list = list.filter((l) => l.deviceId === String(params.deviceId))
      } else if (params.groupName) {
        const ids = new Set(
          devices.filter((d) => d.groupName === params.groupName).map((d) => d.id),
        )
        list = list.filter((l) => ids.has(l.deviceId))
      }
      return ok(pageOf(list, params.page, params.pageSize))
    },
    async latestLight(deviceId) {
      const id = String(deviceId)
      const latest = [...lights].reverse().find((l) => l.deviceId === id)
      if (!latest) return fail('暂无光照数据')
      return ok({
        deviceId,
        lightIntensity: latest.lightIntensity,
        createdAt: latest.createdAt,
      } satisfies LatestLight)
    },
    async lightTrend(params) {
      let scoped = [...lights]
      if (params.deviceId != null) {
        const id = String(params.deviceId)
        scoped = scoped.filter((l) => l.deviceId === id)
        let points: TrendPoint[] = scoped.map((l) => ({ time: l.createdAt, value: l.lightIntensity }))
        if (params.startTime) points = points.filter((p) => p.time >= params.startTime)
        if (params.endTime) points = points.filter((p) => p.time <= params.endTime)
        return ok(points)
      }
      if (params.groupName) {
        const ids = new Set(
          devices.filter((d) => d.groupName === params.groupName).map((d) => d.id),
        )
        scoped = scoped.filter((l) => ids.has(l.deviceId))
      }
      const buckets = new Map<string, number[]>()
      for (const l of scoped) {
        if (params.startTime && l.createdAt < params.startTime) continue
        if (params.endTime && l.createdAt > params.endTime) continue
        const key = l.createdAt.slice(0, 16) + ':00'
        const arr = buckets.get(key) ?? []
        arr.push(l.lightIntensity)
        buckets.set(key, arr)
      }
      const points: TrendPoint[] = [...buckets.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([time, vals]) => ({
          time,
          value: vals.reduce((s, v) => s + v, 0) / vals.length,
        }))
      return ok(points)
    },
    async listAlarms(params) {
      let list = [...alarms]
      if (params.deviceId) list = list.filter((a) => a.deviceId === params.deviceId)
      if (params.alarmType) list = list.filter((a) => a.alarmType === params.alarmType)
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
    async listThresholdOverrides() {
      return ok([...thresholdOverrides])
    },
    async upsertThresholdOverride(body) {
      if (body.lightThresholdOn >= body.lightThresholdOff) return fail('开灯阈值必须小于关灯阈值')
      const label =
        body.scopeType === 'DEVICE'
          ? devices.find((d) => String(d.id) === body.scopeKey)?.deviceName ?? body.scopeKey
          : body.scopeKey
      const hit = thresholdOverrides.find(
        (o) => o.scopeType === body.scopeType && o.scopeKey === body.scopeKey,
      )
      if (hit) {
        hit.lightThresholdOn = body.lightThresholdOn
        hit.lightThresholdOff = body.lightThresholdOff
        hit.scopeLabel = label
        hit.updatedAt = now()
      } else {
        thresholdOverrides.push({
          id: String(Date.now()),
          scopeType: body.scopeType,
          scopeKey: body.scopeKey,
          scopeLabel: label,
          lightThresholdOn: body.lightThresholdOn,
          lightThresholdOff: body.lightThresholdOff,
          updatedAt: now(),
        })
      }
      return ok('覆盖已保存')
    },
    async deleteThresholdOverride(scopeType, scopeKey) {
      thresholdOverrides = thresholdOverrides.filter(
        (o) => !(o.scopeType === scopeType && o.scopeKey === scopeKey),
      )
      return ok('覆盖已删除')
    },
    async getEffectiveThreshold(deviceId) {
      const d = devices.find((x) => x.id === String(deviceId))
      const deviceOv = thresholdOverrides.find(
        (o) => o.scopeType === 'DEVICE' && o.scopeKey === String(deviceId),
      )
      if (deviceOv) {
        return ok({
          lightThresholdOn: deviceOv.lightThresholdOn,
          lightThresholdOff: deviceOv.lightThresholdOff,
          source: 'DEVICE',
          sourceKey: String(deviceId),
        } satisfies EffectiveThreshold)
      }
      const group = d?.groupName?.trim()
      if (group) {
        const groupOv = thresholdOverrides.find(
          (o) => o.scopeType === 'GROUP' && o.scopeKey === group,
        )
        if (groupOv) {
          return ok({
            lightThresholdOn: groupOv.lightThresholdOn,
            lightThresholdOff: groupOv.lightThresholdOff,
            source: 'GROUP',
            sourceKey: group,
          } satisfies EffectiveThreshold)
        }
      }
      return ok({
        lightThresholdOn: threshold.lightThresholdOn,
        lightThresholdOff: threshold.lightThresholdOff,
        source: 'GLOBAL',
        sourceKey: null,
      } satisfies EffectiveThreshold)
    },
    async listControlLogs(params) {
      let list = [...controlLogs]
      if (params.deviceId) list = list.filter((c) => c.deviceId === params.deviceId)
      if (params.source) list = list.filter((c) => c.source === params.source)
      return ok(pageOf(list, params.page, params.pageSize))
    },
  }
}

/** Mock 实时：缓慢抖动在线模拟灯的光照 */
export function mockTickLight(): LatestLight | null {
  const d = devices.find((x) => x.id === rm2.id && x.onlineStatus === 'ONLINE')
  if (!d) return null
  const intensity = Math.max(5, Math.min(40, 12 + Math.random() * 18))
  const row: LightReading = {
    id: lightSeq++,
    deviceId: rm2.id,
    deviceName: d.deviceName,
    lightIntensity: intensity,
    createdAt: now(),
  }
  lights = [row, ...lights].slice(0, 800)
  return { deviceId: rm2.id, lightIntensity: intensity, createdAt: row.createdAt }
}
