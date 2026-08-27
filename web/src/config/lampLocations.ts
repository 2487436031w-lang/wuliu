/** 演示路灯默认坐标（GCJ-02，重庆大学 A 区沙正街一带） */
export const DEMO_LAMP_LOCATIONS: Record<string, { latitude: number; longitude: number }> = {
  'SN-RM-001': { latitude: 29.5647, longitude: 106.4674 },
  'SN-RM-002': { latitude: 29.56485, longitude: 106.4682 },
  'SN-RM-003': { latitude: 29.565, longitude: 106.469 },
  'SN-JF-001': { latitude: 29.5662, longitude: 106.4686 },
  'SN-JF-002': { latitude: 29.5664, longitude: 106.4695 },
  'SN-BJ-001': { latitude: 29.5635, longitude: 106.4678 },
  'SN-BJ-002': { latitude: 29.5633, longitude: 106.4687 },
  'SN-XQ-001': { latitude: 29.5654, longitude: 106.4698 },
}

/** 库里没有坐标时，用演示 SN 的默认点位，避免旧库全是「未标定」 */
export function resolveLampLocation(deviceSn: string, latitude: number | null, longitude: number | null) {
  if (latitude != null && longitude != null) {
    return { latitude, longitude }
  }
  return DEMO_LAMP_LOCATIONS[deviceSn] ?? { latitude: null, longitude: null }
}
