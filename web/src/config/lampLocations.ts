/** 演示路灯默认坐标（GCJ-02，重庆大学 A 区沙正街一带） */
export const DEMO_LAMP_LOCATIONS: Record<string, { latitude: number; longitude: number }> = {
  'SN-RM-001': { latitude: 29.5638, longitude: 106.4612 },
  'SN-RM-002': { latitude: 29.5647, longitude: 106.4674 },
  'SN-RM-003': { latitude: 29.5656, longitude: 106.4738 },
  'SN-JF-001': { latitude: 29.5696, longitude: 106.464 },
  'SN-JF-002': { latitude: 29.5718, longitude: 106.4702 },
  'SN-BJ-001': { latitude: 29.5564, longitude: 106.4655 },
  'SN-BJ-002': { latitude: 29.5578, longitude: 106.474 },
  'SN-XQ-001': { latitude: 29.5688, longitude: 106.4668 },
}

export interface CorridorLamp {
  key: string
  deviceName: string
  deviceSn: string
  groupName: string
  latitude: number
  longitude: number
}

function round7(n: number): number {
  return Math.round(n * 1e7) / 1e7
}

/** 沿道路疏铺，左右错开，避免挤成一条线 */
function interpolate(
  start: [number, number],
  end: [number, number],
  count: number,
  side = 0.00018,
): [number, number][] {
  const pts: [number, number][] = []
  const dlat = end[0] - start[0]
  const dlng = end[1] - start[1]
  const len = Math.hypot(dlat, dlng) || 1
  const nlat = (-dlng / len) * side
  const nlng = (dlat / len) * side
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const s = i % 2 === 0 ? 1 : -1
    pts.push([
      round7(start[0] + dlat * t + nlat * s),
      round7(start[1] + dlng * t + nlng * s),
    ])
  }
  return pts
}

function ring(center: [number, number], radiusLat: number, radiusLng: number, count: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count
    pts.push([round7(center[0] + Math.cos(a) * radiusLat), round7(center[1] + Math.sin(a) * radiusLng)])
  }
  return pts
}

/** 在街区范围内打散点，看起来像散落的路灯而不是一根绳 */
function scatter(center: [number, number], count: number, spreadLat: number, spreadLng: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + i * 0.37
    const r = 0.35 + ((i * 17) % 10) / 16
    pts.push([
      round7(center[0] + Math.cos(a) * spreadLat * r),
      round7(center[1] + Math.sin(a) * spreadLng * r),
    ])
  }
  return pts
}

function tooCloseToDemo(lat: number, lng: number): boolean {
  return Object.values(DEMO_LAMP_LOCATIONS).some(
    (p) => Math.hypot(p.latitude - lat, p.longitude - lng) < 0.00045,
  )
}

function named(
  groupName: string,
  snPrefix: string,
  namePrefix: string,
  points: [number, number][],
): CorridorLamp[] {
  return points
    .filter(([lat, lng]) => !tooCloseToDemo(lat, lng))
    .map(([latitude, longitude], i) => {
      const n = String(i + 1).padStart(3, '0')
      return {
        key: `${snPrefix}-${n}`,
        deviceSn: `${snPrefix}-${n}`,
        deviceName: `${namePrefix}${n}号路灯`,
        groupName,
        latitude,
        longitude,
      }
    })
}

/** 廊道补点：铺开到沙坪坝更大范围，间距约 150–250m */
export const EXTRA_CORRIDOR_LAMPS: CorridorLamp[] = [
  ...named(
    '人民路',
    'SN-RMX',
    '人民路',
    interpolate([29.5624, 106.4578], [29.5668, 106.4785], 9),
  ),
  ...named(
    '解放大道',
    'SN-JFX',
    '解放大道',
    interpolate([29.5682, 106.4595], [29.5736, 106.4738], 8),
  ),
  ...named(
    '滨江路',
    'SN-BJX',
    '滨江步道',
    interpolate([29.5548, 106.4612], [29.5596, 106.4792], 8),
  ),
  ...named(
    '校园主道',
    'SN-XQX',
    '校园主道',
    interpolate([29.5618, 106.4698], [29.5724, 106.4632], 8),
  ),
  ...named(
    '沙正街',
    'SN-SZX',
    '沙正街',
    interpolate([29.5592, 106.4548], [29.5642, 106.4662], 7),
  ),
  ...named(
    '三峡广场',
    'SN-MHX',
    '三峡广场',
    scatter([29.5572, 106.4558], 8, 0.00135, 0.0017),
  ),
  ...named(
    '重大B区',
    'SN-BQX',
    'B区环路',
    ring([29.5716, 106.4638], 0.00115, 0.00145, 8),
  ),
  ...named(
    '沙坪公园',
    'SN-GYX',
    '沙坪公园',
    scatter([29.5606, 106.4584], 6, 0.0011, 0.0014),
  ),
]

/** 已知演示 SN 用铺开后的点位；其余用库里的坐标 */
export function resolveLampLocation(deviceSn: string, latitude: number | null, longitude: number | null) {
  const demo = DEMO_LAMP_LOCATIONS[deviceSn]
  if (demo) return demo
  if (latitude != null && longitude != null) {
    return { latitude, longitude }
  }
  return { latitude: null, longitude: null }
}

export function isNightHour(date = new Date()): boolean {
  const h = date.getHours()
  return h >= 19 || h < 7
}
