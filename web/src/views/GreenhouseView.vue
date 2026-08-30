<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  greenhouseApi,
  type GhEffectiveLight,
  type GhRecipe,
  type GhWorkOrder,
  type GhZone,
} from '../api/greenhouse'
import { useRealtimeStore } from '../stores/realtime'
import GreenhouseScene3D from '../components/GreenhouseScene3D.vue'
import DayCurvesChart from '../components/DayCurvesChart.vue'

const realtime = useRealtimeStore()
const zones = ref<GhZone[]>([])
const recipes = ref<GhRecipe[]>([])
const orders = ref<GhWorkOrder[]>([])
const profiles = ref<Record<string, { id: string; labelZh: string }>>({})
const zoneId = ref('ZONE-A')
const light = ref<GhEffectiveLight | null>(null)
const err = ref('')
let poll: number | undefined

const climateOptions = computed(() =>
  Object.values(profiles.value).map((p) => ({ id: p.id, label: p.labelZh })),
)

const series = computed(() => light.value?.series ?? [])
const dayPct = computed(() => Math.round((light.value?.dayProgress ?? 0) * 100))

async function refresh() {
  err.value = ''
  try {
    const [z, r, o, p, el] = await Promise.all([
      greenhouseApi.zones(),
      greenhouseApi.recipes(),
      greenhouseApi.workOrders(),
      greenhouseApi.climateProfiles(),
      greenhouseApi.effectiveLight(zoneId.value),
    ])
    if (z.code !== 200) throw new Error(z.errorMsg || 'zones failed')
    zones.value = z.data || []
    recipes.value = r.data || []
    orders.value = o.data || []
    profiles.value = p.data || {}
    light.value = el.data
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  }
}

async function onRecipe(e: Event) {
  const recipeId = (e.target as HTMLSelectElement).value
  await greenhouseApi.bindRecipe(zoneId.value, recipeId)
  await refresh()
}

async function onClimate(e: Event) {
  const profileId = (e.target as HTMLSelectElement).value
  await greenhouseApi.setClimate(zoneId.value, profileId)
  await refresh()
}

async function toggleAuto() {
  if (!light.value) return
  await greenhouseApi.setAuto(zoneId.value, !light.value.autoControl)
  await refresh()
}

async function resetDay() {
  await greenhouseApi.resetDay()
  await refresh()
}

async function approve(id: number) {
  await greenhouseApi.approve(id)
  await refresh()
}

async function reject(id: number) {
  await greenhouseApi.reject(id)
  await refresh()
}

function clockLabel(minute: number) {
  const total = Math.max(0, Math.floor(minute))
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  const sec = Math.floor((minute % 1) * 60)
  if (sec > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

watch(zoneId, () => refresh())
watch(
  () => realtime.greenhouseTick,
  () => refresh(),
)

onMounted(async () => {
  await refresh()
  // 配合后端 250ms tick：约 500ms 拉一次即可连续
  poll = window.setInterval(refresh, 500)
})

onUnmounted(() => {
  if (poll) window.clearInterval(poll)
})
</script>

<template>
  <div class="gh">
    <section class="hero">
      <p class="eyebrow">智慧光棚 · cq-demo-bay-v1 · 空间光场</p>
      <h2 class="title">冠层光环境</h2>
      <p class="lede">
        {{ light?.coordinateNoteZh || '西南角原点 · 长轴东西 · 南向采光' }}；16×7 m 单跨拱棚，三维热力与灯/测点对齐布局真源。曲线对比室外、未控自然光与补光/遮阳调控后有效光。一天压缩为
        {{ light?.dayCompressSec ?? 120 }} 秒连续推进（约 {{ light?.minutesPerTick ?? '—' }} 仿真分钟/步）。
      </p>
    </section>

    <p v-if="err" class="err">{{ err }} · 请确认后端已用最新 jar（含 cq-demo-bay-v1 / 连续仿真）重启</p>

    <div class="toolbar">
      <label>
        分区
        <select v-model="zoneId">
          <option v-for="z in zones" :key="z.zoneId" :value="z.zoneId">{{ z.name }}</option>
        </select>
      </label>
      <label>
        配方
        <select :value="light?.recipeId" @change="onRecipe">
          <option v-for="r in recipes" :key="r.recipeId" :value="r.recipeId">
            {{ r.cropNameZh }} · {{ r.stage }}
          </option>
        </select>
      </label>
      <label>
        气候日型
        <select :value="light?.climateProfileId" @change="onClimate">
          <option v-for="c in climateOptions" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
      </label>
      <button type="button" class="btn" @click="toggleAuto">
        自动补光/遮阳 {{ light?.autoControl ? '开' : '关' }}
      </button>
      <button type="button" class="btn ghost" @click="resetDay">重跑今日</button>
      <button type="button" class="btn ghost" @click="refresh">刷新</button>
    </div>

    <div class="sim-bar" v-if="light">
      <div class="sim-meta">
        <strong>仿真时刻 {{ clockLabel(light.minuteOfDay) }}</strong>
        <span
          >全日进度 {{ dayPct }}% · {{ light.geometryId || 'cq-demo-bay-v1' }} · 每 tick ≈
          {{ light.minutesPerTick }} 仿真分钟（{{ light.intervalMs ?? 250 }}ms）</span
        >
      </div>
      <div class="track"><i :style="{ width: dayPct + '%' }" /></div>
    </div>

    <GreenhouseScene3D :light="light" />

    <div class="metrics" v-if="light">
      <div class="metric">
        <span class="k">调控后有效 PPFD</span>
        <strong>{{ Number(light.effectivePpfd).toFixed(1) }}</strong>
        <span class="u">µmol·m⁻²·s⁻¹</span>
      </div>
      <div class="metric">
        <span class="k">未控自然 / 补光贡献</span>
        <strong>{{ light.naturalPpfd ?? '—' }} / {{ light.ledPpfd ?? '—' }}</strong>
      </div>
      <div class="metric">
        <span class="k">湿度 · 温度</span>
        <strong>{{ light.humidityPct ?? '—' }}% · {{ light.temperatureC ?? '—' }}°C</strong>
      </div>
      <div class="metric">
        <span class="k">遮阳开度 · DLI</span>
        <strong>{{ light.shadeOpenPercent }}% · {{ light.dliSoFar }}</strong>
      </div>
      <div class="metric band" v-if="light.recipe">
        <span class="k">目标带 / 硬限</span>
        <p>
          {{ light.recipe.ppfdTargetMin }}–{{ light.recipe.ppfdTargetMax }} /
          {{ light.recipe.ppfdHardMin }}–{{ light.recipe.ppfdHardMax }}
        </p>
      </div>
    </div>

    <div class="charts">
      <DayCurvesChart
        title="光照曲线：室外 · 未控自然 · 调控后（含补光）"
        mode="light"
        :series="series"
        :minute-of-day="light?.minuteOfDay ?? 0"
      />
      <DayCurvesChart
        title="湿度 / 温度曲线"
        mode="climate"
        :series="series"
        :minute-of-day="light?.minuteOfDay ?? 0"
      />
    </div>

    <section class="orders">
      <h3>农艺工单（补光 / 遮阳大动作）</h3>
      <ul v-if="orders.length">
        <li v-for="o in orders" :key="o.id">
          <div>
            <span class="st" :data-s="o.status">{{ o.status }}</span>
            <strong>{{ o.zoneId }}</strong>
            <p>{{ o.reason }}</p>
          </div>
          <div class="acts" v-if="o.status === 'PENDING'">
            <button type="button" class="btn" @click="approve(o.id)">批准</button>
            <button type="button" class="btn ghost" @click="reject(o.id)">驳回</button>
          </div>
        </li>
      </ul>
      <p v-else class="empty">暂无工单。欠光强补或过光深遮时会生成待审批建议。</p>
    </section>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@400;600&display=swap');

.gh {
  --soil: #1a2420;
  --leaf: #2f5d4a;
  --canopy: #e8f2ea;
  --lamp: #e6b84d;
  --mist: #c5d4cb;
  --ink: #102018;
  color: var(--ink);
  font-family: 'Source Sans 3', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.hero {
  padding: 0.85rem 0 0.25rem;
  background:
    radial-gradient(ellipse 70% 80% at 8% 0%, rgba(230, 184, 77, 0.16), transparent 55%),
    linear-gradient(180deg, #dfece3 0%, transparent 100%);
}

.eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--leaf);
  margin: 0 0 0.35rem;
}

.title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(1.7rem, 2.8vw, 2.2rem);
  font-weight: 700;
  margin: 0;
}

.lede {
  max-width: 46rem;
  margin: 0.45rem 0 0;
  color: #3a4f44;
  line-height: 1.5;
}

.err {
  background: #f7e4d8;
  border-left: 3px solid #b85c38;
  padding: 0.65rem 0.85rem;
  margin: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: end;
}

.toolbar label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: #4a5e53;
}

.toolbar select {
  min-width: 11rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid #9db3a6;
  background: #f7fbf8;
  font: inherit;
}

.btn {
  border: none;
  background: var(--leaf);
  color: var(--canopy);
  padding: 0.5rem 0.9rem;
  font: inherit;
  cursor: pointer;
}

.btn.ghost {
  background: transparent;
  color: var(--leaf);
  border: 1px solid var(--leaf);
}

.sim-bar {
  display: grid;
  gap: 0.35rem;
}

.sim-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: baseline;
  font-size: 0.9rem;
}

.sim-meta strong {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.15rem;
}

.sim-meta span {
  color: #5a6e62;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.78rem;
}

.track {
  height: 6px;
  background: #d5e2d8;
  overflow: hidden;
}

.track i {
  display: block;
  height: 100%;
  background: var(--lamp);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.65rem;
  background: #f3f7f4;
  padding: 0.85rem;
  border: 1px solid #c9d8ce;
}

.metric .k {
  display: block;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #5a6e62;
  font-family: 'IBM Plex Mono', monospace;
}

.metric strong {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 1.25rem;
}

.metric .u {
  font-size: 0.72rem;
  color: #5a6e62;
}

.metric.band p {
  margin: 0.25rem 0 0;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
}

.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 960px) {
  .charts {
    grid-template-columns: 1fr;
  }
}

.orders h3 {
  font-family: 'Fraunces', Georgia, serif;
  margin: 0 0 0.65rem;
}

.orders ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.orders li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  background: #f7fbf8;
  border: 1px solid #c9d8ce;
}

.orders p {
  margin: 0.3rem 0 0;
  color: #3a4f44;
}

.st {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  margin-right: 0.5rem;
  padding: 0.1rem 0.35rem;
  background: #dfe8e2;
}

.st[data-s='PENDING'] {
  background: #f0d9a8;
}

.acts {
  display: flex;
  gap: 0.4rem;
}

.empty {
  color: #5a6e62;
}
</style>
