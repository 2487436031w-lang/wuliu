import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { router } from './router'
import { runBootstrap } from './bootstrap'
import { apiMode } from './config/runtime'
import './styles/tokens.css'

runBootstrap()
if (import.meta.env.DEV) {
  console.info(`[灯廊] API 模式: ${apiMode}`)
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
