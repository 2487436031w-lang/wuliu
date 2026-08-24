import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api/client'
import { isHttpMode, isMockToken } from '../config/runtime'
import type { Role, UserSession } from '../types/domain'
import { ROLE_LABEL } from '../types/domain'

const STORAGE_KEY = 'streetlight.session'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<UserSession | null>(readSession())

  const isAuthed = computed(() => !!session.value?.token)
  const role = computed(() => session.value?.role)
  const roleLabel = computed(() => (role.value ? ROLE_LABEL[role.value] : ''))
  const isAdmin = computed(() => role.value === 'ADMIN')

  async function login(username: string, password: string) {
    if (!username.trim() || !password.trim()) throw new Error('请输入用户名和密码')
    const res = await api.login(username.trim(), password.trim())
    if (res.code !== 200) throw new Error(res.errorMsg || '登录失败')
    session.value = res.data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data))
  }

  async function register(username: string, password: string, role: Role = 'MUNICIPAL_STAFF') {
    if (!username.trim() || !password.trim()) throw new Error('请输入用户名和密码')
    const res = await api.register(username.trim(), password.trim(), role)
    if (res.code !== 200) throw new Error(res.errorMsg || '注册失败')
  }

  async function logout() {
    session.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return { session, isAuthed, role, roleLabel, isAdmin, login, register, logout }
})

function readSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as UserSession
    if (isHttpMode && isMockToken(session.token)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}
