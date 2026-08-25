<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { apiMode, isHttpMode, isMockMode } from '../config/runtime'
import type { Role } from '../types/domain'
import { ROLE_LABEL } from '../types/domain'
import BrandIcon from '../components/BrandIcon.vue'

const auth = useAuthStore()
const router = useRouter()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const role = ref<Role>('MUNICIPAL_STAFF')
const loading = ref(false)
const error = ref('')
const tip = ref('')
const backendOk = ref<boolean | null>(null)

async function checkBackend() {
  if (!isHttpMode) {
    backendOk.value = null
    return
  }
  try {
    const res = await fetch('/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '__ping__', password: '__ping__' }),
    })
    const body = (await res.json()) as { code?: number }
    backendOk.value = typeof body.code === 'number'
  } catch {
    backendOk.value = false
  }
}

onMounted(checkBackend)

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
    <section class="hero slide-up-enter-active">
      <div class="hero-badge">
        <BrandIcon :size="28" />
      </div>
      <h1>城市照明，一屏尽览</h1>
      <p class="lead">
        设备管理、光照阈值、告警与实时推送 — 对齐
        <code class="mono">smart-street-light-master</code> 后端。
      </p>
      <p class="mode-badge mono" :data-mode="apiMode">
        {{ isMockMode ? 'Mock 内存演示' : 'HTTP 真后端' }} · {{ apiMode }}
      </p>
      <p v-if="isHttpMode && backendOk === false" class="hint warn">
        后端未响应。请先在 <code class="mono">smart-street-light-master</code> 启动 Java 服务（:8080）。
      </p>
      <p v-else-if="isHttpMode && backendOk" class="hint">
        后端已连通。账号来自 <code class="mono">sql/test-data.sql</code>：
        <span class="mono">admin / admin123</span>
      </p>
      <p v-else class="hint">
        Mock 演示账号 <span class="mono">admin / admin123</span>
      </p>
    </section>

    <form class="panel slide-up-enter-active slide-up-delay-1" @submit.prevent="submit">
      <div class="ui-tabs">
        <button type="button" :class="{ on: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button type="button" :class="{ on: mode === 'register' }" @click="mode = 'register'">
          注册
        </button>
      </div>

      <label class="ui-label">
        用户名
        <input v-model="username" class="ui-input" required autocomplete="username" />
      </label>
      <label class="ui-label">
        密码
        <input
          v-model="password"
          class="ui-input"
          type="password"
          required
          autocomplete="current-password"
        />
      </label>
      <label v-if="mode === 'register'" class="ui-label">
        角色
        <select v-model="role" class="ui-select">
          <option v-for="(label, key) in ROLE_LABEL" :key="key" :value="key">{{ label }}</option>
        </select>
      </label>

      <p v-if="error" class="ui-msg ui-msg-error">{{ error }}</p>
      <p v-if="tip" class="ui-msg">{{ tip }}</p>

      <button type="submit" class="ui-btn ui-btn-warm submit" :disabled="loading">
        {{ loading ? '提交中…' : mode === 'login' ? '进入灯廊' : '创建账号' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: var(--space-10);
  padding: var(--space-10);
  align-items: center;
  max-width: 1100px;
  margin: 0 auto;
}

.hero {
  max-width: 480px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: var(--space-5);
  border-radius: var(--radius-md);
  background: linear-gradient(145deg, var(--sodium) 0%, #ffcc00 100%);
  color: #fff;
  box-shadow: 0 8px 24px rgba(255, 149, 0, 0.3);
}

.hero h1 {
  font-size: clamp(32px, 4vw, 44px);
  font-weight: 700;
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

.lead {
  margin-top: var(--space-4);
  color: var(--ink-soft);
  line-height: var(--leading-normal);
  font-size: var(--text-lg);
}

.mode-badge {
  margin: var(--space-4) 0 0;
  display: inline-block;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
  background: var(--panel);
  box-shadow: var(--shadow-sm), var(--shadow-inset);
  color: var(--ink-soft);
}

.mode-badge[data-mode='http'] {
  color: var(--online);
  background: var(--online-soft);
}

.mode-badge[data-mode='mock'] {
  color: var(--sodium);
  background: var(--sodium-soft);
}

.hint {
  margin: var(--space-3) 0 0;
  color: var(--ink-muted);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.hint.warn {
  color: var(--danger);
}

.panel {
  justify-self: end;
  width: min(100%, 400px);
  display: grid;
  gap: var(--space-4);
  padding: var(--space-6);
  background: var(--panel);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.submit {
  margin-top: var(--space-1);
  width: 100%;
  padding: 12px;
  font-size: var(--text-base);
}

@media (max-width: 840px) {
  .login {
    grid-template-columns: 1fr;
    padding: var(--space-6) var(--space-4);
    gap: var(--space-6);
  }

  .panel {
    justify-self: stretch;
  }
}
</style>
