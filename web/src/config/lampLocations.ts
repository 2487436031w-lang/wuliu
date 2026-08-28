import fleet from './chongqingFleet.json'

export type FleetLamp = {
  sn: string
  name: string
  lat: number
  lng: number
  status: 'ON' | 'OFF' | string
  online: 'ONLINE' | 'OFFLINE' | string
}

export type FleetGroup = {
  name: string
  district: string
  color: string
  lamps: FleetLamp[]
}

export const CHONGQING_FLEET = fleet as { groups: FleetGroup[] }

export const CHONGQING_CENTER: [number, number] = [29.563, 106.551]

export const GROUP_COLORS: Record<string, string> = Object.fromEntries(
  CHONGQING_FLEET.groups.map((g) => [g.name, g.color]),
)

export const DEMO_LAMP_LOCATIONS: Record<string, { latitude: number; longitude: number }> =
  Object.fromEntries(
    CHONGQING_FLEET.groups.flatMap((g) =>
      g.lamps.map((l) => [l.sn, { latitude: l.lat, longitude: l.lng }]),
    ),
  )

export function groupColor(name: string | null | undefined): string {
  if (!name) return '#8E8E93'
  return GROUP_COLORS[name] ?? '#8E8E93'
}

export function resolveLampLocation(
  deviceSn: string,
  latitude: number | null,
  longitude: number | null,
) {
  if (latitude != null && longitude != null) return { latitude, longitude }
  const demo = DEMO_LAMP_LOCATIONS[deviceSn]
  if (demo) return demo
  return { latitude: null, longitude: null }
}
