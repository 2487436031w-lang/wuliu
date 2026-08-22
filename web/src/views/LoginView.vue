<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import type { Role } from '../types/domain'
import { ROLE_LABEL } from '../types/domain'

const auth = useAuthStore()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const role = ref<Role>('MUNICIPAL_STAFF')
const loading = ref(false)
const error = ref('')
const tip = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  tip.value = ''
  try {
    if (mode.value === 'login') {
      await auth.login(username.value, password.value)
      router.replace('/dashboard')
    } else {
      await auth.register(username.value, password.value, role.value)
      tip.value = '注册成功，请登录'
      mode.value = 'login'
      password.value = ''
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <section class="hero">
      <p class="mark">灯廊</p>
      <h1>路灯亮起的一刻，城市才有夜班。</h1>
      <p class="lead">
        对齐 <code class="mono">smart-street-light-master</code>：设备、光照阈值、告警与 STOMP 推送。
        Mock 演示账号 <span class="mono">admin / admin123</span>。
      </p>
    </section>

    <form class="panel" @submit.prevent="submit">
      <div class="tabs">
        <button type="button" :class="{ on: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button type="button" :class="{ on: mode === 'register' }" @click="mode = 'register'">
          注册
        </button>
      </div>
      <label>
        用户名
        <input v-model="username" required autocomplete="username" />
      </label>
      <label>
        密码
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>
      <label v-if="mode === 'register'">
        角色
        <select v-model="role">
          <option v-for="(label, key) in ROLE_LABEL" :key="key" :value="key">{{ label }}</option>
        </select>
      </label>
      <p v-if="error" class="err">{{ error }}</p>
      <p v-if="tip" class="ok">{{ tip }}</p>
      <button type="submit" class="submit" :disabled="loading">
        {{ loading ? '提交中…' : mode === 'login' ? '进入灯廊' : '创建账号' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 28px;
  padding: 48px;
  align-items: center;
}
.hero {
  max-width: 520px;
  animation: rise 0.65s ease both;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.mark {
  margin: 0 0 16px;
  font-family: var(--font-display);
  font-size: 68px;
  line-height: 0.85;
  color: var(--sodium-deep);
  letter-spacing: 0.1em;
}
.hero h1 {
  font-size: clamp(34px, 4.5vw, 50px);
  line-height: 1.05;
  max-width: 11ch;
}
.lead {
  margin-top: 16px;
  color: var(--ink-soft);
  line-height: 1.55;
  font-size: 17px;
}
.panel {
  justify-self: end;
  width: min(100%, 380px);
  display: grid;
  gap: 12px;
  padding: 24px;
  background: rgba(242, 244, 247, 0.94);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  animation: rise 0.65s ease 0.06s both;
}
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 4px;
}
.tabs button {
  border: 1px solid var(--line);
  background: #fff;
  padding: 8px;
  cursor: pointer;
  border-radius: var(--radius);
}
.tabs button.on {
  background: var(--steel);
  color: #fff;
  border-color: var(--steel);
}
label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-soft);
}
input,
select {
  font: inherit;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #fff;
}
.submit {
  margin-top: 4px;
  border: 0;
  background: var(--sodium);
  color: #121820;
  font-weight: 600;
  padding: 11px;
  cursor: pointer;
  border-radius: var(--radius);
}
.err {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}
.ok {
  margin: 0;
  color: var(--online);
  font-size: 13px;
}
@media (max-width: 840px) {
  .login {
    grid-template-columns: 1fr;
    padding: 24px 16px;
  }
  .panel {
    justify-self: stretch;
  }
}
</style>
