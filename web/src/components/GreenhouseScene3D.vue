<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { GhEffectiveLight } from '../api/greenhouse'

const props = defineProps<{
  light: GhEffectiveLight | null
}>()

const hostRef = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let heatMesh: THREE.Mesh | null = null
let shadeClothA: THREE.Mesh | null = null
let shadeClothB: THREE.Mesh | null = null
let sunLight: THREE.DirectionalLight | null = null
let sunArrow: THREE.ArrowHelper | null = null
let sunGroup: THREE.Group | null = null
let lampGroup: THREE.Group | null = null
let sensorGroup: THREE.Group | null = null
let structureKey = ''
let raf = 0
let disposed = false

const Z_L0 = 0.55
const Z_L1 = 1.25

const BEDS_A = [
  { x0: 0.5, x1: 7.5, y0: 1.0, y1: 1.8 },
  { x0: 0.5, x1: 7.5, y0: 3.1, y1: 3.9 },
  { x0: 0.5, x1: 7.5, y0: 5.2, y1: 6.0 },
]
const BEDS_B = [
  { x0: 8.5, x1: 15.5, y0: 1.0, y1: 1.8 },
  { x0: 8.5, x1: 15.5, y0: 3.1, y1: 3.9 },
  { x0: 8.5, x1: 15.5, y0: 5.2, y1: 6.0 },
]

const sunHud = computed(() => {
  const el = props.light?.solarElevationDeg
  const az = props.light?.solarAzimuthDeg
  if (el == null || az == null) return '日光：等待仿真…'
  const dir =
    az < 135 ? '偏东' : az < 225 ? '正南为主' : '偏西'
  return `太阳高度 ${Number(el).toFixed(0)}° · 方位 ${Number(az).toFixed(0)}°（${dir}）`
})

const heatMax = computed(() => {
  const g = props.light?.grid || []
  return Math.max(props.light?.recipe?.ppfdHardMax ?? 120, ...g.map((p) => p.ppfd), 1)
})

/** 蓝→青→黄→红，便于看出分布 */
function ppfdColor(v: number, maxRef: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v / Math.max(maxRef, 1)))
  if (t < 0.25) {
    const u = t / 0.25
    return [Math.round(20 + u * 20), Math.round(40 + u * 100), Math.round(120 + u * 80)]
  }
  if (t < 0.5) {
    const u = (t - 0.25) / 0.25
    return [Math.round(40 + u * 40), Math.round(140 + u * 80), Math.round(200 - u * 80)]
  }
  if (t < 0.75) {
    const u = (t - 0.5) / 0.25
    return [Math.round(80 + u * 140), Math.round(220 - u * 40), Math.round(120 - u * 80)]
  }
  const u = (t - 0.75) / 0.25
  return [Math.round(220 + u * 30), Math.round(180 - u * 120), Math.round(40 - u * 20)]
}

function makeShadeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1a221c'
  ctx.fillRect(0, 0, 64, 64)
  ctx.strokeStyle = '#4a5a50'
  for (let i = 0; i < 64; i += 4) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, 64)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(64, i)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(14, 10)
  return tex
}

function buildScene(el: HTMLDivElement) {
  const w = el.clientWidth || 800
  const h = el.clientHeight || 460
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xc5d6ca)
  scene.fog = new THREE.Fog(0xc5d6ca, 24, 55)

  camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 120)
  camera.position.set(14, 11, 18)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  el.innerHTML = ''
  el.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(8, 1.3, 3.5)
  controls.maxPolarAngle = Math.PI * 0.49

  scene.add(new THREE.AmbientLight(0xffffff, 0.35))
  sunLight = new THREE.DirectionalLight(0xfff1c8, 1.1)
  sunLight.position.set(2, 14, -12)
  scene.add(sunLight)
  scene.add(new THREE.HemisphereLight(0xe8f4d8, 0x5a6a50, 0.45))

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 30),
    new THREE.MeshStandardMaterial({ color: 0x6b7a5a, roughness: 0.95 }),
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  lampGroup = new THREE.Group()
  sensorGroup = new THREE.Group()
  sunGroup = new THREE.Group()
  scene.add(lampGroup)
  scene.add(sensorGroup)
  scene.add(sunGroup)

  const loop = () => {
    if (disposed) return
    raf = requestAnimationFrame(loop)
    controls?.update()
    if (renderer && scene && camera) renderer.render(scene, camera)
  }
  loop()
}

function makeLabelSprite(text: string, scaleX = 3.4): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(16,32,24,0.78)'
  ctx.fillRect(6, 10, 348, 44)
  ctx.fillStyle = '#e8f2ea'
  ctx.font = '600 20px "Source Sans 3", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, 180, 40)
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false }))
  spr.scale.set(scaleX, 0.7, 1)
  return spr
}

function addStackedCrops(bed: { x0: number; x1: number; y0: number; y1: number }, group: THREE.Group, dual: boolean) {
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 })
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333938, metalness: 0.35, roughness: 0.5 })
  const potMat = new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.85 })
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d7a52, roughness: 0.65 })
  const trayMat = new THREE.MeshStandardMaterial({ color: 0xb8cfc0, roughness: 0.75 })
  const bw = bed.x1 - bed.x0
  const bd = bed.y1 - bed.y0
  const cx = (bed.x0 + bed.x1) / 2
  const cz = (bed.y0 + bed.y1) / 2

  const deck0 = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.07, bd), bedMat)
  deck0.position.set(cx, Z_L0, cz)
  group.add(deck0)

  for (const [ox, oz] of [
    [-bw / 2 + 0.08, -bd / 2 + 0.08],
    [bw / 2 - 0.08, -bd / 2 + 0.08],
    [-bw / 2 + 0.08, bd / 2 - 0.08],
    [bw / 2 - 0.08, bd / 2 - 0.08],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, dual ? Z_L1 : Z_L0, 6), legMat)
    leg.position.set(cx + ox, (dual ? Z_L1 : Z_L0) / 2, cz + oz)
    group.add(leg)
  }

  for (let x = bed.x0 + 0.35; x < bed.x1 - 0.2; x += 0.5) {
    for (const row of [0.3, 0.7]) {
      const z = bed.y0 + bd * row
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.11, 8), potMat)
      pot.position.set(x, Z_L0 + 0.08, z)
      group.add(pot)
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 6), leafMat)
      leaf.position.set(x, Z_L0 + 0.28, z)
      group.add(leaf)
    }
  }

  if (dual) {
    const deck1 = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.2, 0.05, bd - 0.08), bedMat)
    deck1.position.set(cx, Z_L1, cz)
    group.add(deck1)
    for (let i = 0; i < 7; i++) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.28), trayMat)
      tray.position.set(bed.x0 + 0.7 + i * 0.85, Z_L1 + 0.06, cz)
      group.add(tray)
      const sprout = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), leafMat)
      sprout.position.set(bed.x0 + 0.7 + i * 0.85, Z_L1 + 0.12, cz)
      group.add(sprout)
    }
  }
}

function addMatBed(bed: { x0: number; x1: number; y0: number; y1: number }, group: THREE.Group) {
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 })
  const mat = new THREE.MeshStandardMaterial({ color: 0x2f5d3a, roughness: 0.9 })
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333938, metalness: 0.35, roughness: 0.5 })
  const bw = bed.x1 - bed.x0
  const bd = bed.y1 - bed.y0
  const cx = (bed.x0 + bed.x1) / 2
  const cz = (bed.y0 + bed.y1) / 2
  const deck = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.07, bd), bedMat)
  deck.position.set(cx, Z_L0, cz)
  group.add(deck)
  for (const [ox, oz] of [
    [-bw / 2 + 0.08, -bd / 2 + 0.08],
    [bw / 2 - 0.08, -bd / 2 + 0.08],
    [-bw / 2 + 0.08, bd / 2 - 0.08],
    [bw / 2 - 0.08, bd / 2 - 0.08],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, Z_L0, 6), legMat)
    leg.position.set(cx + ox, Z_L0 / 2, cz + oz)
    group.add(leg)
  }
  const pad = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.15, 0.08, bd - 0.12), mat)
  pad.position.set(cx, Z_L0 + 0.08, cz)
  group.add(pad)
}

function rebuildStructure(light: GhEffectiveLight) {
  if (!scene) return
  const L = Number(light.lengthM) || 16
  const W = Number(light.widthM) || 7
  const H = Number(light.ridgeHeightM) || 3.8
  const G = Number(light.gutterHeightM) || 2.8
  const key = `${L}x${W}x${H}-v1.2`
  if (key === structureKey) return
  structureKey = key

  scene.children.filter((c) => c.userData.structure).forEach((c) => {
    scene!.remove(c)
    c.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const m = obj.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
      }
    })
  })

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d4a40, metalness: 0.2, roughness: 0.6 })
  for (let i = 0; i < 9; i++) {
    const x = (i / 8) * L
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.05, 0),
      new THREE.Vector3(x, G, W * 0.15),
      new THREE.Vector3(x, H, W * 0.5),
      new THREE.Vector3(x, G, W * 0.85),
      new THREE.Vector3(x, 0.05, W),
    ])
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.04, 6, false), frameMat)
    tube.userData.structure = true
    scene.add(tube)
  }

  const skin = new THREE.Mesh(
    new THREE.BoxGeometry(L * 0.98, H * 0.9, W * 0.98),
    new THREE.MeshPhysicalMaterial({
      color: 0xe8f4ec,
      transparent: true,
      opacity: 0.08,
      transmission: 0.55,
      thickness: 0.3,
      roughness: 0.25,
    }),
  )
  skin.position.set(L / 2, H * 0.45, W / 2)
  skin.userData.structure = true
  scene.add(skin)

  const crops = new THREE.Group()
  crops.userData.structure = true
  BEDS_A.forEach((b) => addStackedCrops(b, crops, true))
  BEDS_B.forEach((b) => addMatBed(b, crops))
  scene.add(crops)

  const aisle = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.02, W * 0.9),
    new THREE.MeshStandardMaterial({ color: 0x8a9580 }),
  )
  aisle.position.set(8, 0.02, W / 2)
  aisle.userData.structure = true
  scene.add(aisle)

  for (const [cx, t] of [
    [4, '外遮阳卷轴·西'],
    [12, '外遮阳卷轴·东'],
  ] as const) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.16, 0.2), new THREE.MeshStandardMaterial({ color: 0x2c3330 }))
    box.position.set(cx, 3.55, W - 0.12)
    box.userData.structure = true
    scene.add(box)
    const s = makeLabelSprite(t, 3.2)
    s.position.set(cx, 3.85, W - 0.12)
    s.userData.structure = true
    scene.add(s)
  }

  for (const [t, p] of [
    ['南 · 日光入射', [L / 2, 0.75, -1.0]],
    ['北', [L / 2, 0.75, W + 1.0]],
    ['西 · 石斛双层', [-1.5, 1.5, W / 2]],
    ['东 · 金线莲/草莓', [L + 1.5, 1.5, W / 2]],
  ] as const) {
    const s = makeLabelSprite(t)
    s.position.set(p[0], p[1], p[2])
    s.userData.structure = true
    scene.add(s)
  }

  controls!.target.set(L / 2, 1.3, W / 2)
  camera?.position.set(L * 0.65, H * 1.9, -W * 0.7)
}

function updateSun(light: GhEffectiveLight) {
  if (!scene || !sunGroup || !sunLight) return
  while (sunGroup.children.length) sunGroup.remove(sunGroup.children[0])
  if (sunArrow) {
    scene.remove(sunArrow)
    sunArrow = null
  }

  const elev = Number(light.solarElevationDeg ?? 0)
  const az = Number(light.solarAzimuthDeg ?? 180)
  const L = Number(light.lengthM) || 16
  const W = Number(light.widthM) || 7
  const elevR = (elev * Math.PI) / 180
  const azR = (az * Math.PI) / 180
  // 方位从北顺时针；Three: +X东 +Y上 +Z北
  const dirX = Math.sin(azR) * Math.cos(elevR)
  const dirY = Math.sin(elevR)
  const dirZ = Math.cos(azR) * Math.cos(elevR)
  // 光线来自太阳：光源在 -direction 一侧
  const dist = 18
  sunLight.position.set(L / 2 - dirX * dist, Math.max(0.5, dirY * dist), W / 2 - dirZ * dist)
  sunLight.intensity = elev > 2 ? 0.35 + (elev / 90) * 1.1 : 0.08
  sunLight.color.set(elev > 15 ? 0xfff1c8 : 0xb8c4d8)

  if (elev > 1) {
    const origin = new THREE.Vector3(L / 2, 0.2, W / 2)
    const dir = new THREE.Vector3(-dirX, -dirY, -dirZ).normalize()
    sunArrow = new THREE.ArrowHelper(dir, origin.clone().addScaledVector(dir, -8), 7, 0xffcc44, 0.45, 0.3)
    scene.add(sunArrow)
    const tip = origin.clone().addScaledVector(dir, -8)
    const lab = makeLabelSprite(`日光 ${elev.toFixed(0)}°`, 2.8)
    lab.position.copy(tip).add(new THREE.Vector3(0, 0.6, 0))
    sunGroup.add(lab)
  }
}

function updateShadeRoll(mesh: THREE.Mesh | null, xCenter: number, span: number, W: number, closed: number) {
  if (!scene) return mesh
  if (!mesh) {
    mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(span, W * 0.88),
      new THREE.MeshStandardMaterial({
        map: makeShadeTexture(),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    mesh.rotation.x = -Math.PI / 2
    scene.add(mesh)
  }
  const depth = Math.max(0.12, W * 0.88 * Math.max(0.04, closed))
  mesh.scale.set(1, 1, Math.max(0.04, closed))
  mesh.position.set(xCenter, 3.42, W - 0.15 - depth / 2)
  ;(mesh.material as THREE.MeshStandardMaterial).opacity = 0.2 + closed * 0.55
  return mesh
}

function updateHeatmap(light: GhEffectiveLight) {
  if (!scene) return
  const L = Number(light.lengthM) || 16
  const W = Number(light.widthM) || 7
  const nx = light.nx || 32
  const ny = light.ny || 14
  const grid = light.grid || []
  const measureZ = Number(light.measurePlaneZ) || 0.9
  const maxRef = heatMax.value

  const canvas = document.createElement('canvas')
  canvas.width = nx
  canvas.height = ny
  const ctx = canvas.getContext('2d')!
  for (let i = 0; i < grid.length; i++) {
    const ix = i % nx
    const iy = Math.floor(i / nx)
    const [r, g, b] = ppfdColor(grid[i]?.ppfd ?? 0, maxRef)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(ix, iy, 1, 1)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace

  if (
    !heatMesh ||
    Math.abs((heatMesh.geometry as THREE.PlaneGeometry).parameters.width - L) > 0.01
  ) {
    if (heatMesh) {
      scene.remove(heatMesh)
      heatMesh.geometry.dispose()
      ;(heatMesh.material as THREE.MeshBasicMaterial).map?.dispose()
      ;(heatMesh.material as THREE.MeshBasicMaterial).dispose()
    }
    heatMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(L, W),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
    )
    heatMesh.rotation.x = -Math.PI / 2
    heatMesh.position.set(L / 2, measureZ + 0.02, W / 2)
    scene.add(heatMesh)
  } else {
    heatMesh.position.y = measureZ + 0.02
    ;(heatMesh.material as THREE.MeshBasicMaterial).map?.dispose()
    ;(heatMesh.material as THREE.MeshBasicMaterial).map = tex
    ;(heatMesh.material as THREE.MeshBasicMaterial).needsUpdate = true
    ;(heatMesh.material as THREE.MeshBasicMaterial).opacity = 0.82
  }

  const closed = 1 - (light.shadeOpenPercent ?? 100) / 100
  const zoneA = light.zoneId === 'ZONE-A'
  shadeClothA = updateShadeRoll(shadeClothA, 4, 7.6, W, zoneA ? closed : 0.15)
  shadeClothB = updateShadeRoll(shadeClothB, 12, 7.6, W, !zoneA ? closed : 0.15)

  if (lampGroup && sensorGroup) {
    while (lampGroup.children.length) lampGroup.remove(lampGroup.children[0])
    while (sensorGroup.children.length) sensorGroup.remove(sensorGroup.children[0])
    for (const d of light.devices || []) {
      if (d.posX == null || d.posY == null) continue
      if (d.deviceType === 'GROW_LAMP') {
        const dim = (d.dimmingPercent ?? 0) / 100
        const z = d.posZ ?? 1.45
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.05, 0.14),
          new THREE.MeshStandardMaterial({
            color: 0x222826,
            emissive: 0xf0c14a,
            emissiveIntensity: 0.25 + dim * 1.3,
          }),
        )
        bar.position.set(d.posX, z, d.posY)
        lampGroup.add(bar)
        const beamH = Math.max(0.35, z - measureZ)
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(0.48, beamH, 14, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xffe08a,
            transparent: true,
            opacity: 0.1 + dim * 0.25,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        )
        beam.position.set(d.posX, z - beamH / 2, d.posY)
        beam.rotation.x = Math.PI
        lampGroup.add(beam)
      } else if (d.deviceType === 'PAR_SENSOR') {
        const z = d.posZ ?? 0.9
        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12),
          new THREE.MeshStandardMaterial({ color: 0xdfeee4, emissive: 0x66aa88, emissiveIntensity: 0.35 }),
        )
        disc.position.set(d.posX, z, d.posY)
        sensorGroup.add(disc)
        const pin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6),
          new THREE.MeshStandardMaterial({ color: 0x889988 }),
        )
        pin.position.set(d.posX, z - 0.06, d.posY)
        sensorGroup.add(pin)
      }
    }
  }
}

function apply(light: GhEffectiveLight | null) {
  if (!light || !scene) return
  rebuildStructure(light)
  updateSun(light)
  updateHeatmap(light)
}

function onResize() {
  const host = hostRef.value
  if (!host || !camera || !renderer) return
  camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1)
  camera.updateProjectionMatrix()
  renderer.setSize(host.clientWidth, host.clientHeight)
}

onMounted(() => {
  const host = hostRef.value
  if (!host) return
  buildScene(host)
  apply(props.light)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  disposed = true
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
  controls?.dispose()
  renderer?.dispose()
})

watch(
  () => props.light,
  (v) => apply(v),
  { deep: true },
)
</script>

<template>
  <div class="wrap">
    <div ref="hostRef" class="scene" aria-label="智慧光棚三维 · 双层叠栽 · 光场热力 · 日光矢量" />
    <aside class="hud">
      <p class="sun">{{ sunHud }}</p>
      <p class="hint">蓝→青→黄→红 = 冠层 PPFD 热力（当前分区网格）</p>
      <div class="bar" :title="'max ≈ ' + heatMax.toFixed(0)">
        <span>低</span>
        <i /><i /><i /><i />
        <span>高</span>
      </div>
      <p class="hint">石斛三床均为上下叠层；每床东西各灯+测点；上层另有灯/测</p>
    </aside>
  </div>
</template>

<style scoped>
.wrap {
  position: relative;
}
.scene {
  width: 100%;
  height: min(56vh, 560px);
  min-height: 400px;
  overflow: hidden;
  background: #c5d6ca;
}
.hud {
  position: absolute;
  left: 0.65rem;
  bottom: 0.65rem;
  max-width: 16rem;
  padding: 0.55rem 0.7rem;
  background: rgba(16, 32, 24, 0.72);
  color: #e8f2ea;
  font-size: 0.75rem;
  line-height: 1.4;
  pointer-events: none;
}
.sun {
  margin: 0 0 0.35rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.78rem;
}
.hint {
  margin: 0.25rem 0;
  opacity: 0.9;
}
.bar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0.35rem 0;
}
.bar i {
  flex: 1;
  height: 8px;
}
.bar i:nth-child(2) {
  background: #2848c0;
}
.bar i:nth-child(3) {
  background: #40c8a0;
}
.bar i:nth-child(4) {
  background: #e8c030;
}
.bar i:nth-child(5) {
  background: #e82820;
}
</style>
