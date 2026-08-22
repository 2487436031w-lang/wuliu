<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRealtimeStore } from '../stores/realtime'
import type { Role } from '../types/domain'

const auth = useAuthStore()
const realtime = useRealtimeStore()
const route = useRoute()
const router = useRouter()

const nav = computed(() => {
  const role = auth.role
  const all = [
    { to: '/warehouse', label: '车辆绑定', roles: ['warehouse', 'admin'] as Role[] },
    { to: '/track', label: '在途追踪', roles: ['shipper', 'admin'] as Role[] },
    { to: '/dispatch', label: '调度总览', roles: ['dispatcher', 'admin'] as Role[] },
    { to: '/driver', label: '状态上报', roles: ['driver', 'admin'] as Role[] },
    { to: '/alarms', label: '告警日志', roles: ['admin', 'dispatcher', 'shipper'] as Role[] },
  ]
  if (!role) return []
  return all.filter((n) => n.roles.includes(role))
})

onMounted(() => realtime.connect())

async function clearSessionAndGoLogin(query?: Record<string, string>) {
  realtime.disconnect()
  await auth.logout()
  router.push({ name: 'login', query })
}

async function onLogout() {
  await clearSessionAndGoLogin()
}

/** 切换角色必须重新输入账号密码，禁止免密改 session */
async function onSwitchRole() {
  await clearSessionAndGoLogin({
    switch: '1',
    role: auth.role ?? 'shipper',
  })
}
</script>

<template>
  <div class="shell">
    <aside class="rail">
      <div class="brand">
        <p class="brand-mark">在途</p>
        <p class="brand-sub">智慧物流控制台</p>
      </div>
      <nav>
        <RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-link">
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="rail-foot">
        <p class="role-now">
          当前角色
          <strong>{{ auth.roleLabel }}</strong>
        </p>
        <button type="button" class="ghost" @click="onSwitchRole">切换角色</button>
        <button type="button" class="ghost" @click="onLogout">退出</button>
      </div>
    </aside>

    <div class="main">
      <header class="top">
        <div>
          <p class="eyebrow mono">{{ route.meta.title }}</p>
          <h1>{{ auth.roleLabel }}工作台</h1>
        </div>
        <div class="live" :data-on="realtime.connected">
          <span class="live-dot" />
          {{ realtime.connected ? '实时链路' : '离线' }}
        </div>
      </header>

      <main class="content">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <Transition name="fade">
      <div v-if="realtime.latestAlarm" class="toast" role="alert">
        <div>
          <strong>新告警</strong>
          <p>{{ realtime.latestAlarm.description }}</p>
        </div>
        <button type="button" @click="realtime.clearAlarmToast()">知道了</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--shell-rail) 1fr;
  min-height: 100vh;
}

.rail {
  display: flex;
  flex-direction: column;
  padding: 28px 18px;
  background: linear-gradient(180deg, #1a2332 0%, #243044 100%);
  color: #f4f6f8;
}

.brand-mark {
  margin: 0;
  font-family: var(--font-display);
  font-size: 42px;
  line-height: 0.9;
  letter-spacing: 0.08em;
  color: var(--signal);
}

.brand-sub {
  margin: 8px 0 28px;
  font-size: 13px;
  opacity: 0.72;
}

.nav-link {
  display: block;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: var(--radius);
  color: rgba(244, 246, 248, 0.78);
  transition: background 0.2s ease, color 0.2s ease;
}
.nav-link:hover,
.nav-link.router-link-active {
  background: rgba(232, 163, 23, 0.16);
  color: #fff;
}

.rail-foot {
  margin-top: auto;
  display: grid;
  gap: 10px;
}

.role-now {
  margin: 0 0 4px;
  font-size: 12px;
  opacity: 0.85;
  display: grid;
  gap: 4px;
}
.role-now strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--signal);
}

.ghost {
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: #fff;
  padding: 8px 10px;
  border-radius: var(--radius);
  cursor: pointer;
}

.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: end;
  padding: 28px 32px 12px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--ink-soft);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.top h1 {
  font-size: 34px;
  font-weight: 600;
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--paper-elevated);
  border: 1px solid var(--line);
  font-size: 13px;
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--line);
}
.live[data-on='true'] .live-dot {
  background: var(--ok);
  box-shadow: 0 0 0 4px rgba(47, 125, 74, 0.2);
}

.content {
  padding: 8px 32px 32px;
  flex: 1;
}

.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  display: flex;
  gap: 16px;
  align-items: center;
  max-width: 360px;
  padding: 14px 16px;
  background: #1a2332;
  color: #fff;
  border-left: 4px solid var(--danger);
  box-shadow: var(--shadow);
}
.toast p {
  margin: 4px 0 0;
  font-size: 14px;
  opacity: 0.86;
}
.toast button {
  border: 0;
  background: var(--signal);
  color: #1a2332;
  padding: 8px 10px;
  border-radius: var(--radius);
  cursor: pointer;
  white-space: nowrap;
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .rail {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .brand {
    width: 100%;
  }
  .brand-mark {
    font-size: 32px;
  }
  .brand-sub {
    margin-bottom: 8px;
  }
  .rail-foot {
    width: 100%;
    grid-template-columns: 1fr auto;
    align-items: end;
  }
  .top,
  .content {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
