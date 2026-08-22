import type {
  Alarm,
  ApiResult,
  Binding,
  Cargo,
  DispatchCommand,
  EtaInfo,
  PositionPoint,
  Role,
  TrackPoint,
  UserSession,
  Vehicle,
} from '../types/domain'

/** Deep module: HTTP seam. Pages only call these methods. */
export interface LogisticsApi {
  login(username: string, password: string, role: Role): Promise<ApiResult<UserSession>>
  logout(): Promise<ApiResult<null>>
  listVehicles(): Promise<ApiResult<Vehicle[]>>
  createVehicle(body: Omit<Vehicle, 'id' | 'status'>): Promise<ApiResult<Vehicle>>
  listCargos(): Promise<ApiResult<Cargo[]>>
  listBindings(): Promise<ApiResult<Binding[]>>
  createBinding(cargoId: number, vehicleId: number): Promise<ApiResult<Binding>>
  deleteBinding(id: number): Promise<ApiResult<null>>
  vehiclePositions(): Promise<ApiResult<PositionPoint[]>>
  cargoPosition(cargoId: number): Promise<ApiResult<PositionPoint>>
  cargoTrack(cargoId: number): Promise<ApiResult<{ cargoId: number; points: TrackPoint[] }>>
  cargoEta(cargoId: number): Promise<ApiResult<EtaInfo>>
  listAlarms(): Promise<ApiResult<Alarm[]>>
  resolveAlarm(id: number): Promise<ApiResult<Alarm>>
  dispatch(body: {
    vehicleId: number
    type: DispatchCommand['type']
    message: string
    targetLongitude?: number
    targetLatitude?: number
  }): Promise<ApiResult<DispatchCommand>>
  listDispatch(vehicleId?: number): Promise<ApiResult<DispatchCommand[]>>
  updateCargoStatus(
    cargoId: number,
    status: Cargo['status'],
  ): Promise<ApiResult<Cargo>>
}

function ok<T>(data: T): ApiResult<T> {
  return { code: 0, message: 'success', data }
}

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00')

let vehicles: Vehicle[] = [
  {
    id: 201,
    plateNo: '沪A·物流01',
    deviceId: 'ESP32-0001',
    type: 'truck',
    driverName: '张三',
    driverPhone: '13800138000',
    status: 1,
  },
  {
    id: 202,
    plateNo: '沪B·模拟02',
    deviceId: 'SIM-0002',
    type: 'van',
    driverName: '李四',
    driverPhone: '13900139000',
    status: 1,
  },
  {
    id: 203,
    plateNo: '沪C·模拟03',
    deviceId: 'SIM-0003',
    type: 'truck',
    driverName: '王五',
    driverPhone: '13700137000',
    status: 0,
  },
]

let cargos: Cargo[] = [
  { id: 101, name: '冷链样件 A', shipperName: '华东货主', status: 'transporting', vehicleId: 201 },
  { id: 102, name: '电子元器件 B', shipperName: '华东货主', status: 'loaded', vehicleId: 202 },
  { id: 103, name: '待发货 C', shipperName: '华东货主', status: 'pending' },
]

let bindings: Binding[] = [
  { id: 1, cargoId: 101, vehicleId: 201, createdAt: nowIso() },
  { id: 2, cargoId: 102, vehicleId: 202, createdAt: nowIso() },
]

let alarms: Alarm[] = [
  {
    id: 5001,
    vehicleId: 201,
    cargoId: 101,
    alarmType: 'off_route',
    alarmLevel: 2,
    description: '车辆偏离规划路线超过 500 米',
    status: 'active',
    timestamp: nowIso(),
  },
]

let dispatches: DispatchCommand[] = []

/** Shanghai-ish demo corridor */
const baseTrack: TrackPoint[] = [
  { timestamp: '2026-08-21T10:00:00+08:00', longitude: 121.47, latitude: 31.23, speed: 40 },
  { timestamp: '2026-08-21T11:00:00+08:00', longitude: 121.48, latitude: 31.235, speed: 55 },
  { timestamp: '2026-08-21T12:00:00+08:00', longitude: 121.49, latitude: 31.24, speed: 62 },
  { timestamp: '2026-08-21T13:00:00+08:00', longitude: 121.5, latitude: 31.245, speed: 48 },
  { timestamp: '2026-08-21T14:00:00+08:00', longitude: 121.51, latitude: 31.25, speed: 35 },
]

const livePositions: Record<number, PositionPoint> = {
  201: {
    vehicleId: 201,
    cargoId: 101,
    longitude: 121.505,
    latitude: 31.248,
    speed: 42,
    timestamp: nowIso(),
  },
  202: {
    vehicleId: 202,
    cargoId: 102,
    longitude: 121.46,
    latitude: 31.22,
    speed: 28,
    timestamp: nowIso(),
  },
  203: {
    vehicleId: 203,
    longitude: 121.44,
    latitude: 31.21,
    speed: 0,
    timestamp: nowIso(),
  },
}

export function createMockApi(): LogisticsApi {
  return {
    async login(username, _password, role) {
      return ok({
        token: `mock-${role}-${Date.now()}`,
        userId: 1,
        username: username || ROLE_FALLBACK[role],
        role,
      })
    },
    async logout() {
      return ok(null)
    },
    async listVehicles() {
      return ok([...vehicles])
    },
    async createVehicle(body) {
      const v: Vehicle = { ...body, id: vehicles.length + 200, status: 0 }
      vehicles = [...vehicles, v]
      return ok(v)
    },
    async listCargos() {
      return ok([...cargos])
    },
    async listBindings() {
      return ok([...bindings])
    },
    async createBinding(cargoId, vehicleId) {
      if (bindings.some((b) => b.cargoId === cargoId)) {
        return { code: 409, message: '货物已绑定', data: null as unknown as Binding }
      }
      const b: Binding = { id: bindings.length + 1, cargoId, vehicleId, createdAt: nowIso() }
      bindings = [...bindings, b]
      cargos = cargos.map((c) =>
        c.id === cargoId ? { ...c, vehicleId, status: c.status === 'pending' ? 'loaded' : c.status } : c,
      )
      return ok(b)
    },
    async deleteBinding(id) {
      const hit = bindings.find((b) => b.id === id)
      bindings = bindings.filter((b) => b.id !== id)
      if (hit) {
        cargos = cargos.map((c) =>
          c.id === hit.cargoId ? { ...c, vehicleId: undefined, status: 'pending' } : c,
        )
      }
      return ok(null)
    },
    async vehiclePositions() {
      return ok(Object.values(livePositions))
    },
    async cargoPosition(cargoId) {
      const cargo = cargos.find((c) => c.id === cargoId)
      const pos = cargo?.vehicleId ? livePositions[cargo.vehicleId] : undefined
      if (!pos) return { code: 404, message: '无位置', data: null as unknown as PositionPoint }
      return ok({ ...pos, cargoId })
    },
    async cargoTrack(cargoId) {
      return ok({ cargoId, points: baseTrack })
    },
    async cargoEta(cargoId) {
      return ok({
        cargoId,
        eta: '2026-08-21T18:30:00+08:00',
        remainingKm: 120.5,
        remainingMinutes: 150,
      })
    },
    async listAlarms() {
      return ok([...alarms].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)))
    },
    async resolveAlarm(id) {
      alarms = alarms.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a))
      const hit = alarms.find((a) => a.id === id)!
      return ok(hit)
    },
    async dispatch(body) {
      const cmd: DispatchCommand = {
        commandId: `CMD-${Date.now()}`,
        vehicleId: body.vehicleId,
        type: body.type,
        message: body.message,
        targetLongitude: body.targetLongitude,
        targetLatitude: body.targetLatitude,
        timestamp: nowIso(),
      }
      dispatches = [cmd, ...dispatches]
      return ok(cmd)
    },
    async listDispatch(vehicleId) {
      const list = vehicleId ? dispatches.filter((d) => d.vehicleId === vehicleId) : dispatches
      return ok(list)
    },
    async updateCargoStatus(cargoId, status) {
      cargos = cargos.map((c) => (c.id === cargoId ? { ...c, status } : c))
      return ok(cargos.find((c) => c.id === cargoId)!)
    },
  }
}

const ROLE_FALLBACK: Record<Role, string> = {
  shipper: '货主演示',
  warehouse: '仓库演示',
  dispatcher: '调度演示',
  driver: '司机演示',
  admin: '管理员演示',
}

/** nudge mock positions for WS simulation */
export function tickMockPositions(): PositionPoint[] {
  const p = livePositions[201]
  if (p) {
    livePositions[201] = {
      ...p,
      longitude: p.longitude + (Math.random() - 0.4) * 0.001,
      latitude: p.latitude + (Math.random() - 0.45) * 0.0008,
      speed: 30 + Math.random() * 25,
      timestamp: nowIso(),
    }
  }
  return Object.values(livePositions)
}

export function pushMockAlarm(partial?: Partial<Alarm>): Alarm {
  const a: Alarm = {
    id: 5000 + alarms.length + 1,
    vehicleId: 201,
    cargoId: 101,
    alarmType: 'abnormal_open',
    alarmLevel: 3,
    description: '杜邦开箱信号触发',
    status: 'active',
    timestamp: nowIso(),
    ...partial,
  }
  alarms = [a, ...alarms]
  return a
}
