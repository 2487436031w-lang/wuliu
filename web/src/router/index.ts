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
      { path: '', redirect: '/greenhouse' },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: '场务总览' },
      },
      {
        path: 'greenhouse',
        name: 'greenhouse',
        component: () => import('../views/GreenhouseView.vue'),
        meta: { title: '冠层光场' },
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('../views/DevicesView.vue'),
        meta: { title: '设备' },
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
    if (auth.isAuthed && to.name === 'login') return '/greenhouse'
    return true
  }
  if (!auth.isAuthed) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.admin && !auth.isAdmin) return '/greenhouse'
  return true
})
