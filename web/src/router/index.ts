import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

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
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: '总览' },
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('../views/DevicesView.vue'),
        meta: { title: '设备管理' },
      },
      {
        path: 'lights',
        name: 'lights',
        component: () => import('../views/LightsView.vue'),
        meta: { title: '光照监测' },
      },
      {
        path: 'alarms',
        name: 'alarms',
        component: () => import('../views/AlarmsView.vue'),
        meta: { title: '告警管理' },
      },
      {
        path: 'threshold',
        name: 'threshold',
        component: () => import('../views/ThresholdView.vue'),
        meta: { title: '阈值配置' },
      },
      {
        path: 'logs',
        name: 'logs',
        component: () => import('../views/ControlLogsView.vue'),
        meta: { title: '控制日志' },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.isAuthed && to.name === 'login') return '/dashboard'
    return true
  }
  if (!auth.isAuthed) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.admin && !auth.isAdmin) return '/dashboard'
  return true
})
