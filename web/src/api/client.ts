import { createMockApi, type LogisticsApi } from './mock'

/**
 * Seam: swap Mock for HTTP adapter when backend is up.
 * Set VITE_API_MODE=http and VITE_API_BASE=http://localhost:8080 later.
 */
const mode = import.meta.env.VITE_API_MODE ?? 'mock'

export const api: LogisticsApi = mode === 'mock' ? createMockApi() : createMockApi()
