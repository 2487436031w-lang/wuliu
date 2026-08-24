export type Role = 'MUNICIPAL_STAFF' | 'ADMIN'

export const ROLE_LABEL: Record<Role, string> = {
  MUNICIPAL_STAFF: '市政人员',
  ADMIN: '路灯管理员',
}

/** 路灯后端：成功 code=200；Header 名 token */
export interface ApiResult<T> {
  code: number
  errorMsg: string | null
  data: T
}

export interface PageResult<T> {
  total: number
  records: T[]
}

export interface UserSession {
  token: string
  userId: number
  username: string
  role: Role
}

export interface Device {
  id: number
  deviceName: string
  deviceSn: string
  status: 'ON' | 'OFF'
  onlineStatus: 'ONLINE' | 'OFFLINE'
  lastHeartbeatTime: string | null
  createdAt: string
}

export interface DeviceDetail extends Device {
  latestLightIntensity: number | null
  activeAlarmCount: number
}

export interface DeviceStatistics {
  totalCount: number
  onlineCount: number
  offlineCount: number
  onCount: number
  offCount: number
}

export interface LightReading {
  id: number
  deviceId: number
  deviceName: string
  lightIntensity: number
  createdAt: string
}

export interface LatestLight {
  deviceId: number
  lightIntensity: number
  createdAt: string
}

export interface TrendPoint {
  time: string
  value: number
}

export interface AlarmLog {
  /** 雪花 ID，必须当字符串用，Number() 会丢精度导致处理失败 */
  id: string
  deviceId: number
  deviceName: string
  alarmType: string
  message: string
  status: 'ACTIVE' | 'RESOLVED'
  createdAt: string
  resolvedAt: string | null
}

export interface AlarmStatistics {
  activeCount: number
  byType: { alarmType: string; count: number }[]
}

export interface ThresholdConfig {
  id: number
  lightThresholdOn: number
  lightThresholdOff: number
  heartbeatTimeout: number
  updatedAt: string
}

export interface ControlLog {
  id: number
  deviceId: number | null
  deviceName: string | null
  operatorId: number | null
  operatorName: string | null
  command: string
  source: string
  result: string
  createdAt: string
}
