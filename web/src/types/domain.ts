export type Role = 'shipper' | 'warehouse' | 'dispatcher' | 'driver' | 'admin'

export const ROLE_LABEL: Record<Role, string> = {
  shipper: '货主',
  warehouse: '仓库管理员',
  dispatcher: '调度员',
  driver: '司机',
  admin: '系统管理员',
}

export interface UserSession {
  token: string
  userId: number
  username: string
  role: Role
}

export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export interface Vehicle {
  id: number
  plateNo: string
  deviceId: string
  type: string
  driverName: string
  driverPhone: string
  status: 0 | 1
}

export interface Cargo {
  id: number
  name: string
  shipperName: string
  status: 'pending' | 'loaded' | 'transporting' | 'delivered'
  vehicleId?: number
}

export interface Binding {
  id: number
  cargoId: number
  vehicleId: number
  createdAt: string
}

export interface PositionPoint {
  vehicleId: number
  cargoId?: number
  longitude: number
  latitude: number
  speed: number
  timestamp: string
}

export interface TrackPoint {
  timestamp: string
  longitude: number
  latitude: number
  speed: number
}

export interface EtaInfo {
  cargoId: number
  eta: string
  remainingKm: number
  remainingMinutes: number
}

export type AlarmType = 'off_route' | 'abnormal_stop' | 'abnormal_open'

export interface Alarm {
  id: number
  vehicleId: number
  cargoId?: number
  alarmType: AlarmType
  alarmLevel: 1 | 2 | 3
  description: string
  status: 'active' | 'resolved'
  timestamp: string
}

export interface DispatchCommand {
  commandId: string
  vehicleId: number
  type: 'reroute' | 'stop' | 'resume'
  message: string
  targetLongitude?: number
  targetLatitude?: number
  timestamp: string
}

export const ALARM_TYPE_LABEL: Record<AlarmType, string> = {
  off_route: '偏航',
  abnormal_stop: '异常停留',
  abnormal_open: '异常开箱',
}
