import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api/client'
import type { Role, UserSession } from '../types/domain'
import { ROLE_LABEL } from '../types/domain'

const STORAGE_KEY = 'wuliu.session'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<UserSession | null>(readSession())

  const isAuthed = computed(() => !!session.value?.token)
  const role = computed(() => session.value?.role)
  const roleLabel = computed(() => (role.value ? ROLE_LABEL[role.value] : ''))

  async function login(username: string, password: string, rolePick: Role) {
    const user = username.trim()
    const pass = password.trim()
    if (!user || !pass) {
      throw new Error('请输入用户名和密码')
    }
    const res = await api.login(user, pass, rolePick)
    if (res.code !== 0) throw new Error(res.message)
    session.value = res.data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data))
  }

  async function logout() {
    try {
      await api.logout()
    } finally {
      session.value = null
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return { session, isAuthed, role, roleLabel, login, logout }
})

function readSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserSession) : null
  } catch {
    return null
  }
}
