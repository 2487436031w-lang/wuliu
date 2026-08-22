import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import type { Role } from '../types/domain'

declare module 'vue-router' {
  interface RouteMeta {
    roles?: Role[]
    title?: string
    public?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('../layouts/AppShell.vue'),
    children: [
      { path: '', redirect: '/track' },
      {
        path: 'warehouse',
        name: 'warehouse',
        component: () => import('../views/WarehouseBindView.vue'),
        meta: { roles: ['warehouse', 'admin'], title: '车辆与绑定' },
      },
      {
        path: 'track',
        name: 'track',
        component: () => import('../views/ShipperTrackView.vue'),
        meta: { roles: ['shipper', 'admin'], title: '在途追踪' },
      },
      {
        path: 'dispatch',
        name: 'dispatch',
        component: () => import('../views/DispatcherMapView.vue'),
        meta: { roles: ['dispatcher', 'admin'], title: '调度总览' },
      },
      {
        path: 'driver',
        name: 'driver',
        component: () => import('../views/DriverStatusView.vue'),
        meta: { roles: ['driver', 'admin'], title: '状态上报' },
      },
      {
        path: 'alarms',
        name: 'alarms',
        component: () => import('../views/AdminAlarmsView.vue'),
        meta: { roles: ['admin', 'dispatcher', 'shipper'], title: '告警日志' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

const HOME_BY_ROLE: Record<Role, string> = {
  shipper: '/track',
  warehouse: '/warehouse',
  dispatcher: '/dispatch',
  driver: '/driver',
  admin: '/alarms',
}

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.isAuthed && to.name === 'login') return HOME_BY_ROLE[auth.role!]
    return true
  }
  if (!auth.isAuthed) return { name: 'login', query: { redirect: to.fullPath } }
  const roles = to.meta.roles
  if (roles && auth.role && !roles.includes(auth.role) && auth.role !== 'admin') {
    return HOME_BY_ROLE[auth.role]
  }
  return true
})

export function homeForRole(role: Role) {
  return HOME_BY_ROLE[role]
}
