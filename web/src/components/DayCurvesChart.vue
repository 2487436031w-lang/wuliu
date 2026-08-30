<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { DaySeriesPoint } from '../api/greenhouse'

const props = defineProps<{
  series: DaySeriesPoint[]
  minuteOfDay: number
  title?: string
  mode?: 'light' | 'climate'
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  const pad = { l: 44, r: 52, t: 28, b: 32 }
  const plotW = W - pad.l - pad.r
  const plotH = H - pad.t - pad.b
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#f3f7f4'
  ctx.fillRect(0, 0, W, H)

  const series = props.series || []
  ctx.fillStyle = '#3a4f44'
  ctx.font = '600 13px "Source Sans 3", sans-serif'
  ctx.fillText(props.title || '日变化', pad.l, 18)

  // axes
  ctx.strokeStyle = '#c9d8ce'
  ctx.beginPath()
  ctx.moveTo(pad.l, pad.t)
  ctx.lineTo(pad.l, pad.t + plotH)
  ctx.lineTo(pad.l + plotW, pad.t + plotH)
  ctx.stroke()

  const xAt = (m: number) => pad.l + (m / 1440) * plotW
  // hour ticks
  ctx.fillStyle = '#5a6e62'
  ctx.font = '11px "IBM Plex Mono", monospace'
  for (let h = 0; h <= 24; h += 4) {
    const x = xAt(h * 60)
    ctx.beginPath()
    ctx.moveTo(x, pad.t + plotH)
    ctx.lineTo(x, pad.t + plotH + 4)
    ctx.stroke()
    ctx.fillText(`${h}:00`, x - 12, pad.t + plotH + 16)
  }

  if (!series.length) {
    ctx.fillStyle = '#5a6e62'
    ctx.fillText('等待仿真采样…（一天压缩为 2 分钟）', pad.l + 8, pad.t + plotH / 2)
    return
  }

  if (props.mode === 'climate') {
    const hum = series.map((s) => s.humidityPct)
    const temp = series.map((s) => s.temperatureC)
    const maxH = Math.max(100, ...hum)
    const minH = 30
    const maxT = Math.max(40, ...temp)
    const minT = 10
    const yH = (v: number) => pad.t + plotH - ((v - minH) / (maxH - minH)) * plotH
    const yT = (v: number) => pad.t + plotH - ((v - minT) / (maxT - minT)) * plotH

    strokeLine(ctx, series, (s) => xAt(s.minuteOfDay), (s) => yH(s.humidityPct), '#2f6f8f', 2)
    strokeLine(ctx, series, (s) => xAt(s.minuteOfDay), (s) => yT(s.temperatureC), '#b85c38', 2)
    legend(ctx, pad.l, [
      { c: '#2f6f8f', t: '湿度 %' },
      { c: '#b85c38', t: '温度 °C' },
    ])
  } else {
    const vals = series.flatMap((s) => [s.outdoorPpfd, s.naturalPpfd, s.controlledPpfd])
    const maxV = Math.max(50, ...vals) * 1.08
    const y = (v: number) => pad.t + plotH - (v / maxV) * plotH
    // target band if we only have controlled - skip
    strokeLine(ctx, series, (s) => xAt(s.minuteOfDay), (s) => y(s.outdoorPpfd), '#8aa193', 1.5)
    strokeLine(ctx, series, (s) => xAt(s.minuteOfDay), (s) => y(s.naturalPpfd), '#5a8f6a', 2)
    strokeLine(ctx, series, (s) => xAt(s.minuteOfDay), (s) => y(s.controlledPpfd), '#e6b84d', 2.5)
    // led contribution as thin area hint
    strokeLine(ctx, series, (s) => xAt(s.minuteOfDay), (s) => y(s.ledPpfd), '#c47a2c', 1.25)
    legend(ctx, pad.l, [
      { c: '#8aa193', t: '室外 PAR' },
      { c: '#5a8f6a', t: '棚内自然（未控）' },
      { c: '#e6b84d', t: '调控后有效光' },
      { c: '#c47a2c', t: '补光贡献' },
    ])
  }

  // playhead
  const px = xAt(props.minuteOfDay)
  ctx.strokeStyle = '#102018'
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.moveTo(px, pad.t)
  ctx.lineTo(px, pad.t + plotH)
  ctx.stroke()
  ctx.setLineDash([])
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  series: DaySeriesPoint[],
  x: (s: DaySeriesPoint) => number,
  y: (s: DaySeriesPoint) => number,
  color: string,
  width: number,
) {
  if (series.length < 2) return
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  series.forEach((s, i) => {
    const xi = x(s)
    const yi = y(s)
    if (i === 0) ctx.moveTo(xi, yi)
    else ctx.lineTo(xi, yi)
  })
  ctx.stroke()
}

function legend(
  ctx: CanvasRenderingContext2D,
  x0: number,
  items: { c: string; t: string }[],
) {
  let x = x0 + 8
  ctx.font = '11px "Source Sans 3", sans-serif'
  for (const it of items) {
    ctx.fillStyle = it.c
    ctx.fillRect(x, 8, 10, 10)
    ctx.fillStyle = '#3a4f44'
    ctx.fillText(it.t, x + 14, 17)
    x += ctx.measureText(it.t).width + 28
  }
}

onMounted(draw)
watch(() => [props.series, props.minuteOfDay, props.mode], draw, { deep: true })
</script>

<template>
  <canvas ref="canvasRef" class="chart" width="720" height="220" />
</template>

<style scoped>
.chart {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid #c9d8ce;
}
</style>
