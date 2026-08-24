<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRealtimeStore } from '../stores/realtime'
import { isMockMode } from '../config/runtime'

const auth = useAuthStore()
const realtime = useRealtimeStore()
const route = useRoute()
const router = useRouter()

const nav = [
  { to: '/dashboard', label: '总览' },
  { to: '/devices', label: '设备' },
  { to: '/lights', label: '光照' },
  { to: '/alarms', label: '告警' },
  { to: '/threshold', label: '阈值' },
  { to: '/logs', label: '控制日志' },
]

onMounted(() => realtime.connect())

async function onLogout() {
  realtime.disconnect()
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="shell">
    <aside class="rail">
      <div class="brand">
        <p class="mark">灯廊</p>
        <p class="sub">智慧路灯控制台</p>
      </div>
      <nav>
        <RouterLink
          v-for="item in nav.filter((n) => !n.admin || auth.isAdmin)"
          :key="item.to"
          :to="item.to"
          class="nav-link"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="foot">
        <p class="who">
          {{ auth.session?.username }}
          <strong>{{ auth.roleLabel }}</strong>
        </p>
        <p class="mode mono">
          {{ isMockMode ? 'MOCK 内存' : 'HTTP 后端' }} · {{ realtime.connected ? 'LIVE' : 'OFF' }}
          <span v-if="!isMockMode" class="src">· PostgreSQL :8080</span>
        </p>
        <button type="button" class="ghost" @click="onLogout">退出登录</button>
      </div>
    </aside>

    <div class="main">
      <header class="top">
        <div>
          <p class="eyebrow mono">{{ route.meta.title }}</p>
          <h1>{{ route.meta.title }}</h1>
        </div>
        <div class="lamp" :data-on="realtime.connected">
          <span class="bulb" />
          实时链路
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
          <p>{{ realtime.latestAlarm.deviceName }} · {{ realtime.latestAlarm.message }}</p>
        </div>
        <button type="button" @click="realtime.clearAlarmToast()">关闭</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--rail) 1fr;
  min-height: 100vh;
}
.rail {
  display: flex;
  flex-direction: column;
  padding: 26px 16px;
  background: linear-gradient(180deg, #121820 0%, #1c2733 100%);
  color: #f2f4f7;
}
.mark {
  margin: 0;
  font-family: var(--font-display);
  font-size: 44px;
  line-height: 0.9;
  color: var(--sodium);
  letter-spacing: 0.12em;
}
.sub {
  margin: 8px 0 24px;
  font-size: 13px;
  opacity: 0.7;
}
.nav-link {
  display: block;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: var(--radius);
  color: rgba(242, 244, 247, 0.75);
}
.nav-link:hover,
.nav-link.router-link-active {
  background: rgba(240, 162, 2, 0.16);
  color: #fff;
}
.foot {
  margin-top: auto;
  display: grid;
  gap: 8px;
}
.who {
  margin: 0;
  font-size: 13px;
  display: grid;
  gap: 2px;
}
.who strong {
  color: var(--sodium);
}
.mode {
  margin: 0;
  font-size: 11px;
  opacity: 0.55;
}
.mode .src {
  opacity: 0.85;
}
.ghost {
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: transparent;
  color: #fff;
  padding: 8px;
  border-radius: var(--radius);
  cursor: pointer;
}
.main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: end;
  padding: 26px 28px 10px;
}
.eyebrow {
  margin: 0 0 4px;
  color: var(--ink-soft);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.top h1 {
  font-size: 32px;
  font-weight: 600;
}
.lamp {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 999px;
  font-size: 13px;
}
.bulb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--offline);
}
.lamp[data-on='true'] .bulb {
  background: var(--sodium);
  box-shadow: 0 0 10px var(--sodium);
}
.content {
  padding: 8px 28px 28px;
  flex: 1;
}
.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 50;
  display: flex;
  gap: 14px;
  align-items: center;
  max-width: 360px;
  padding: 14px;
  background: #121820;
  color: #fff;
  border-left: 4px solid var(--danger);
  box-shadow: var(--shadow);
}
.toast p {
  margin: 4px 0 0;
  font-size: 13px;
  opacity: 0.85;
}
.toast button {
  border: 0;
  background: var(--sodium);
  color: #121820;
  padding: 8px 10px;
  cursor: pointer;
}
@media (max-width: 840px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .rail {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
  .brand {
    width: 100%;
  }
  .foot {
    width: 100%;
  }
}
</style>
