import type {
  AlarmLog,
  AlarmStatistics,
  ApiResult,
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

export interface StreetLightApi {
  register(username: string, password: string, role?: Role): Promise<ApiResult<string>>
  login(username: string, password: string): Promise<ApiResult<UserSession>>
  listDevices(params: {
    page?: number
    pageSize?: number
    deviceName?: string
    status?: string
    onlineStatus?: string
  }): Promise<ApiResult<PageResult<Device>>>
  getDevice(id: number): Promise<ApiResult<DeviceDetail>>
  addDevice(body: { deviceName: string; deviceSn: string }): Promise<ApiResult<string>>
  updateDevice(id: number, body: { deviceName: string }): Promise<ApiResult<string>>
  deleteDevice(id: number): Promise<ApiResult<string>>
  deviceStatistics(): Promise<ApiResult<DeviceStatistics>>
  switchDevice(id: number, status: 'ON' | 'OFF'): Promise<ApiResult<{ command: string }>>
  listLightReadings(params: {
    page?: number
    pageSize?: number
    deviceId?: number
  }): Promise<ApiResult<PageResult<LightReading>>>
  latestLight(deviceId: number): Promise<ApiResult<LatestLight>>
  lightTrend(deviceId: number, startTime: string, endTime: string): Promise<ApiResult<TrendPoint[]>>
  listAlarms(params: {
    page?: number
    pageSize?: number
    deviceId?: number
    status?: string
  }): Promise<ApiResult<PageResult<AlarmLog>>>
  resolveAlarm(id: number): Promise<ApiResult<string>>
  alarmStatistics(): Promise<ApiResult<AlarmStatistics>>
  getThreshold(): Promise<ApiResult<ThresholdConfig>>
  updateThreshold(body: {
    lightThresholdOn: number
    lightThresholdOff: number
    heartbeatTimeout: number
  }): Promise<ApiResult<string>>
  listControlLogs(params: {
    page?: number
    pageSize?: number
    deviceId?: number
  }): Promise<ApiResult<PageResult<ControlLog>>>
}

export function ok<T>(data: T): ApiResult<T> {
  return { code: 200, errorMsg: null, data }
}

export function fail<T = never>(msg: string): ApiResult<T> {
  return { code: 500, errorMsg: msg, data: null as T }
}
