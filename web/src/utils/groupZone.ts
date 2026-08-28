/** 灯组轮廓：凸包最外圈 + 外扩 + 转角圆弧 */

export type LngLat = [lat: number, lng: number]
type Pt = [x: number, y: number]

const PAD_METERS = 52
const ARC_STEP = Math.PI / 10

function uniquePts(points: Pt[]): Pt[] {
  const seen = new Set<string>()
  const out: Pt[] = []
  for (const p of points) {
    const key = `${p[0].toFixed(2)},${p[1].toFixed(2)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

function cross(o: Pt, a: Pt, b: Pt): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

/** 单调链凸包，逆时针 */
function convexHull(points: Pt[]): Pt[] {
  const pts = uniquePts(points).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length <= 2) return pts
  const lower: Pt[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper: Pt[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

function hypot(x: number, y: number): number {
  return Math.sqrt(x * x + y * y)
}

function circle(center: Pt, r: number): Pt[] {
  const n = Math.max(16, Math.round((Math.PI * 2) / ARC_STEP))
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push([center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)])
  }
  return out
}

/** 凸包外扩 r 米，顶点用圆弧连接（CCW 外侧） */
function expandRounded(hull: Pt[], r: number): Pt[] {
  if (hull.length === 0) return []
  if (hull.length === 1) return circle(hull[0], r)
  const n = hull.length
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const prev = hull[(i + n - 1) % n]
    const curr = hull[i]
    const next = hull[(i + 1) % n]
    const inX = curr[0] - prev[0]
    const inY = curr[1] - prev[1]
    const outX = next[0] - curr[0]
    const outY = next[1] - curr[1]
    const inLen = hypot(inX, inY)
    const outLen = hypot(outX, outY)
    if (inLen < 1e-6 || outLen < 1e-6) continue
    // CCW 外侧 = 右法向 (dy, -dx)
    const n1x = (inY / inLen) * r
    const n1y = (-inX / inLen) * r
    const n2x = (outY / outLen) * r
    const n2y = (-outX / outLen) * r
    let a1 = Math.atan2(n1y, n1x)
    let a2 = Math.atan2(n2y, n2x)
    let delta = a2 - a1
    while (delta < 0) delta += Math.PI * 2
    const steps = Math.max(1, Math.round(delta / ARC_STEP))
    for (let k = 0; k <= steps; k++) {
      const a = a1 + (delta * k) / steps
      out.push([curr[0] + r * Math.cos(a), curr[1] + r * Math.sin(a)])
    }
  }
  return out
}

function project(lamps: { latitude: number; longitude: number }[]) {
  const lat0 = lamps.reduce((s, l) => s + l.latitude, 0) / lamps.length
  const lng0 = lamps.reduce((s, l) => s + l.longitude, 0) / lamps.length
  const mLat = 111_320
  const mLng = 111_320 * Math.cos((lat0 * Math.PI) / 180)
  return {
    toXy: (lat: number, lng: number): Pt => [(lng - lng0) * mLng, (lat - lat0) * mLat],
    toLl: (p: Pt): LngLat => [lat0 + p[1] / mLat, lng0 + p[0] / mLng],
  }
}

/** 灯组区域：最外围凸包外扩一小段，转角圆弧 */
export function groupZonePath(
  lamps: { latitude: number; longitude: number }[],
  padMeters = PAD_METERS,
): LngLat[] {
  if (!lamps.length) return []
  const { toXy, toLl } = project(lamps)
  const pts = lamps.map((l) => toXy(l.latitude, l.longitude))
  const hull = convexHull(pts)
  const ring = expandRounded(hull, padMeters)
  return ring.map(toLl)
}
