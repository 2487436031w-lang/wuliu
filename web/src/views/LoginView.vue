<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ROLE_LABEL, type Role } from '../types/domain'
import { homeForRole } from '../router'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const isRoleSwitch = computed(() => route.query.switch === '1')
const presetRole = route.query.role as string | undefined
const roles = Object.keys(ROLE_LABEL) as Role[]

const username = ref('')
const password = ref('')
const role = ref<Role>(
  presetRole && roles.includes(presetRole as Role) ? (presetRole as Role) : 'shipper',
)
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value, role.value)
    router.replace(homeForRole(role.value))
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <section class="hero">
      <p class="mark">在途</p>
      <h1>货物还在路上，指挥台已经亮起。</h1>
      <p class="lead">
        绑定车辆 → 实时位置 → 轨迹与 ETA → 三类告警 → 调度下发。演示账号任意密码，先选角色进舱。
      </p>
    </section>

    <form class="panel" @submit.prevent="submit">
      <h2>{{ isRoleSwitch ? '切换角色' : '进入控制台' }}</h2>
      <p v-if="isRoleSwitch" class="switch-hint">切换角色需重新输入用户名和密码。</p>
      <label>
        用户名
        <input v-model="username" autocomplete="username" required />
      </label>
      <label>
        密码
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <label>
        角色
        <select v-model="role">
          <option v-for="(label, key) in ROLE_LABEL" :key="key" :value="key">{{ label }}</option>
        </select>
      </label>
      <p v-if="error" class="err">{{ error }}</p>
      <button type="submit" :disabled="loading">
        {{ loading ? '验证中…' : isRoleSwitch ? '重新登录' : '开始演示' }}
      </button>
      <p class="hint mono">Mock 模式 · 对齐 接口文档.md</p>
    </form>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 32px;
  padding: 48px;
  align-items: center;
}

.hero {
  max-width: 560px;
  animation: rise 0.7s ease both;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.mark {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-size: 72px;
  line-height: 0.85;
  letter-spacing: 0.1em;
  color: var(--signal-deep);
}

.hero h1 {
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 600;
  line-height: 1.05;
  max-width: 12ch;
}

.lead {
  margin-top: 18px;
  font-size: 18px;
  line-height: 1.55;
  color: var(--ink-soft);
  max-width: 36ch;
}

.panel {
  justify-self: end;
  width: min(100%, 380px);
  display: grid;
  gap: 14px;
  padding: 28px;
  background: rgba(244, 246, 248, 0.92);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  animation: rise 0.7s ease 0.08s both;
}

.panel h2 {
  font-size: 28px;
  margin-bottom: 4px;
}
.switch-hint {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--signal-deep);
}

label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-soft);
}

input,
select,
button {
  font: inherit;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
}

button {
  margin-top: 6px;
  border: 0;
  background: var(--ink);
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}
button:hover {
  background: #243044;
}
button:active {
  transform: translateY(1px);
}

.err {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}
.hint {
  margin: 0;
  font-size: 11px;
  color: var(--ink-soft);
  opacity: 0.8;
}

@media (max-width: 860px) {
  .login {
    grid-template-columns: 1fr;
    padding: 28px 16px;
  }
  .panel {
    justify-self: stretch;
  }
  .mark {
    font-size: 56px;
  }
}
</style>
