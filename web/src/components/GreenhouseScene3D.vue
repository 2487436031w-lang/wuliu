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
let sunDisc: THREE.Mesh | null = null
let hemiLight: THREE.HemisphereLight | null = null
let skyDome: THREE.Mesh | null = null
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

/**
 * 布局坐标 +X=东、+Y=北。
 * Three 从南往北看时 +X 落在屏幕左侧，与「面北·左西右东」相反，故世界 X 取镜像。
 */
function lx(layoutX: number, lengthM = 16) {
  return lengthM - layoutX
}

function mirrorBed(
  bed: { x0: number; x1: number; y0: number; y1: number },
  lengthM: number,
) {
  return { x0: lx(bed.x1, lengthM), x1: lx(bed.x0, lengthM), y0: bed.y0, y1: bed.y1 }
}

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

function makeGroundTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#5f7348'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 900; i++) {
    const x = (i * 47) % 256
    const y = (i * 91) % 256
    const g = 70 + ((i * 13) % 50)
    ctx.fillStyle = `rgb(${50 + (i % 30)},${g},${40 + (i % 20)})`
    ctx.fillRect(x, y, 2 + (i % 3), 2 + (i % 2))
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(18, 12)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeSkyTexture(elev = 45): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  if (elev < 2) {
    g.addColorStop(0, '#0b1220')
    g.addColorStop(0.55, '#1a2740')
    g.addColorStop(1, '#3a4050')
  } else if (elev < 18) {
    g.addColorStop(0, '#6a8ec8')
    g.addColorStop(0.45, '#f0b070')
    g.addColorStop(1, '#f5d5a8')
  } else {
    g.addColorStop(0, '#6eb0e8')
    g.addColorStop(0.55, '#b8d8f0')
    g.addColorStop(1, '#e8f2dc')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function rnd(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** 棚外场地：草坪斑块、杂草、灌木、远树、南侧土路 */
function addSiteEnvironment(L: number, W: number, group: THREE.Group) {
  const padMat = new THREE.MeshStandardMaterial({ color: 0x9aa396, roughness: 0.92 })
  const gravelMat = new THREE.MeshStandardMaterial({ color: 0x8b8578, roughness: 0.95 })
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x6e5a42, roughness: 0.97 })
  const grassA = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 0.85 })
  const grassB = new THREE.MeshStandardMaterial({ color: 0x3d6b32, roughness: 0.88 })
  const grassC = new THREE.MeshStandardMaterial({ color: 0x6a8f45, roughness: 0.82 })
  const weedMat = new THREE.MeshStandardMaterial({ color: 0x2f5a28, roughness: 0.8 })
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x355c30, roughness: 0.75 })
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3528, roughness: 0.9 })
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2f5e34, roughness: 0.7 })
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xd4a018, roughness: 0.55 })

  // 棚底硬化垫层
  const pad = new THREE.Mesh(new THREE.BoxGeometry(L + 1.6, 0.06, W + 1.4), padMat)
  pad.position.set(L / 2, 0.02, W / 2)
  group.add(pad)

  // 外圈碎石带
  const gravel = new THREE.Mesh(new THREE.BoxGeometry(L + 4.2, 0.04, W + 3.6), gravelMat)
  gravel.position.set(L / 2, 0.005, W / 2)
  group.add(gravel)

  // 南侧进光土路
  const path = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 6.5), dirtMat)
  path.position.set(L / 2, 0.03, -2.8)
  group.add(path)

  // 地面罗盘（面北时左西右东）
  const compassY = 0.06
  for (const [t, px, pz, sx] of [
    ['北', L / 2, W + 2.2, 2.2],
    ['南', L / 2, -2.2, 2.2],
    ['西', lx(-2.2, L), W / 2, 2.2],
    ['东', lx(L + 2.2, L), W / 2, 2.2],
  ] as const) {
    const s = makeLabelSprite(t, sx)
    s.position.set(px, compassY + 0.5, pz)
    group.add(s)
  }

  // 周边草坪色块（打破整片平地）
  for (let i = 0; i < 14; i++) {
    const side = i % 4
    let x = 0
    let z = 0
    if (side === 0) {
      x = lx(rnd(i * 3) * (L + 10) - 5, L)
      z = -2.5 - rnd(i * 5) * 6
    } else if (side === 1) {
      x = lx(rnd(i * 7) * (L + 10) - 5, L)
      z = W + 2 + rnd(i * 9) * 5
    } else if (side === 2) {
      x = lx(-3 - rnd(i * 11) * 5, L)
      z = rnd(i * 13) * (W + 6) - 2
    } else {
      x = lx(L + 3 + rnd(i * 17) * 5, L)
      z = rnd(i * 19) * (W + 6) - 2
    }
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(1.2 + rnd(i) * 1.8, 10),
      i % 3 === 0 ? grassA : i % 3 === 1 ? grassB : grassC,
    )
    patch.rotation.x = -Math.PI / 2
    patch.position.set(x, 0.04, z)
    group.add(patch)
  }

  // 杂草簇（棚外四边）
  for (let i = 0; i < 70; i++) {
    const edge = i % 4
    let xLay = 0
    let z = 0
    if (edge === 0) {
      xLay = rnd(i * 3) * (L + 6) - 3
      z = -1.4 - rnd(i * 5) * 5
    } else if (edge === 1) {
      xLay = rnd(i * 7) * (L + 6) - 3
      z = W + 1.4 + rnd(i * 9) * 4.5
    } else if (edge === 2) {
      xLay = -1.5 - rnd(i * 11) * 4
      z = rnd(i * 13) * (W + 4) - 1
    } else {
      xLay = L + 1.5 + rnd(i * 17) * 4
      z = rnd(i * 19) * (W + 4) - 1
    }
    const x = lx(xLay, L)
    const h = 0.18 + rnd(i * 6) * 0.35
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.04 + rnd(i) * 0.05, h, 5), i % 4 ? weedMat : grassB)
    blade.position.set(x, h / 2, z)
    blade.rotation.z = (rnd(i + 2) - 0.5) * 0.35
    blade.rotation.x = (rnd(i + 3) - 0.5) * 0.25
    group.add(blade)
    if (i % 5 === 0) {
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 5), flowerMat)
      bloom.position.set(x, h + 0.02, z)
      group.add(bloom)
    }
  }

  // 近处灌木团
  for (let i = 0; i < 12; i++) {
    const xLay = i < 6 ? -2.5 - rnd(i) * 2.5 : L + 2.5 + rnd(i) * 2.5
    const x = lx(xLay, L)
    const z = 0.5 + rnd(i * 8) * (W + 2)
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.45 + rnd(i) * 0.35, 8, 6), shrubMat)
    bush.scale.set(1.2, 0.7 + rnd(i * 2) * 0.4, 1.0)
    bush.position.set(x, 0.35, z)
    group.add(bush)
  }

  // 远树剪影
  for (let i = 0; i < 9; i++) {
    const x = lx(-8 + i * 4.2 + rnd(i) * 1.5, L)
    const z = W + 7 + rnd(i * 2) * 3
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.6 + rnd(i) * 1.2, 6), trunkMat)
    trunk.position.set(x, 0.9, z)
    group.add(trunk)
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9 + rnd(i) * 0.5, 8, 6), canopyMat)
    crown.position.set(x, 2.1 + rnd(i) * 0.4, z)
    crown.scale.set(1.2, 0.9, 1.1)
    group.add(crown)
  }

  // 南侧迎光矮篱
  for (let i = 0; i < 10; i++) {
    const xLay = 1 + i * 1.55
    if (xLay > L - 1) continue
    const hedge = new THREE.Mesh(new THREE.SphereGeometry(0.35, 7, 5), shrubMat)
    hedge.scale.set(1.4, 0.55, 0.8)
    hedge.position.set(lx(xLay, L), 0.28, -1.35)
    group.add(hedge)
  }
}

function buildScene(el: HTMLDivElement) {
  const w = el.clientWidth || 800
  const h = el.clientHeight || 460
  structureKey = ''
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xb8d4e8)
  scene.fog = new THREE.Fog(0xb8d4e8, 28, 70)

  camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 160)
  camera.position.set(14, 11, 18)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  el.innerHTML = ''
  el.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(8, 1.3, 3.5)
  controls.maxPolarAngle = Math.PI * 0.49
  controls.minDistance = 6
  controls.maxDistance = 55

  scene.add(new THREE.AmbientLight(0xfff6e8, 0.28))
  sunLight = new THREE.DirectionalLight(0xfff1c8, 1.15)
  sunLight.position.set(2, 14, -12)
  scene.add(sunLight)
  hemiLight = new THREE.HemisphereLight(0xd8ecff, 0x6a7a55, 0.55)
  scene.add(hemiLight)

  skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(80, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(45), side: THREE.BackSide, depthWrite: false }),
  )
  scene.add(skyDome)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 70),
    new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 0.95, metalness: 0 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.01
  scene.add(ground)

  // 可见太阳圆盘（位置由 updateSun 更新）
  sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false }),
  )
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(1.85, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.28, fog: false, depthWrite: false }),
  )
  sunDisc.add(sunGlow)
  scene.add(sunDisc)

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

function addBedFrame(
  bed: { x0: number; x1: number; y0: number; y1: number },
  group: THREE.Group,
  deckY = Z_L0,
) {
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 })
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333938, metalness: 0.35, roughness: 0.5 })
  const bw = bed.x1 - bed.x0
  const bd = bed.y1 - bed.y0
  const cx = (bed.x0 + bed.x1) / 2
  const cz = (bed.y0 + bed.y1) / 2
  const deck = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.07, bd), bedMat)
  deck.position.set(cx, deckY, cz)
  group.add(deck)
  for (const [ox, oz] of [
    [-bw / 2 + 0.08, -bd / 2 + 0.08],
    [bw / 2 - 0.08, -bd / 2 + 0.08],
    [-bw / 2 + 0.08, bd / 2 - 0.08],
    [bw / 2 - 0.08, bd / 2 - 0.08],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, deckY, 6), legMat)
    leg.position.set(cx + ox, deckY / 2, cz + oz)
    group.add(leg)
  }
  return { bw, bd, cx, cz }
}

/** 东侧 ZONE-B：金线莲矮密植（默认叙事） */
function addAnoectochilusBed(
  bed: { x0: number; x1: number; y0: number; y1: number },
  group: THREE.Group,
) {
  const { bd } = addBedFrame(bed, group)
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.95 })
  const leafDark = new THREE.MeshStandardMaterial({ color: 0x1f4a38, roughness: 0.55 })
  const leafVein = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.45, metalness: 0.08 })
  const leafEdge = new THREE.MeshStandardMaterial({ color: 0x2f6b4a, roughness: 0.6 })

  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(bed.x1 - bed.x0 - 0.12, 0.04, bd - 0.1),
    soilMat,
  )
  soil.position.set((bed.x0 + bed.x1) / 2, Z_L0 + 0.055, (bed.y0 + bed.y1) / 2)
  group.add(soil)

  let i = 0
  for (let x = bed.x0 + 0.22; x < bed.x1 - 0.18; x += 0.28) {
    for (const row of [0.28, 0.5, 0.72]) {
      const z = bed.y0 + bd * row + ((i % 2) * 0.04 - 0.02)
      const baseY = Z_L0 + 0.09
      // 3～4 片低平叶，模拟金线莲铺地冠层
      for (let k = 0; k < 4; k++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), k % 2 ? leafVein : leafDark)
        leaf.scale.set(1.35, 0.22, 0.85)
        const ang = (k / 4) * Math.PI * 2 + i * 0.15
        leaf.position.set(x + Math.cos(ang) * 0.045, baseY + 0.02 + k * 0.008, z + Math.sin(ang) * 0.035)
        leaf.rotation.set(0.35, ang, 0.15)
        group.add(leaf)
      }
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), leafEdge)
      tip.scale.set(1.1, 0.35, 0.7)
      tip.position.set(x, baseY + 0.045, z)
      group.add(tip)
      i++
    }
  }
}

/** 东侧 ZONE-B：设施草莓高架槽栽 */
function addStrawberryBed(
  bed: { x0: number; x1: number; y0: number; y1: number },
  group: THREE.Group,
) {
  const { bd } = addBedFrame(bed, group)
  const troughMat = new THREE.MeshStandardMaterial({ color: 0x8a9a88, roughness: 0.7 })
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.92 })
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4a, roughness: 0.55 })
  const leafDeep = new THREE.MeshStandardMaterial({ color: 0x2c6a38, roughness: 0.6 })
  const fruitMat = new THREE.MeshStandardMaterial({ color: 0xc43c2a, roughness: 0.45, metalness: 0.05 })
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.7 })

  for (const row of [0.32, 0.68]) {
    const z = bed.y0 + bd * row
    const trough = new THREE.Mesh(new THREE.BoxGeometry(bed.x1 - bed.x0 - 0.2, 0.12, 0.22), troughMat)
    trough.position.set((bed.x0 + bed.x1) / 2, Z_L0 + 0.1, z)
    group.add(trough)
    const soil = new THREE.Mesh(new THREE.BoxGeometry(bed.x1 - bed.x0 - 0.28, 0.05, 0.14), soilMat)
    soil.position.set((bed.x0 + bed.x1) / 2, Z_L0 + 0.16, z)
    group.add(soil)

    let n = 0
    for (let x = bed.x0 + 0.35; x < bed.x1 - 0.25; x += 0.42) {
      const y0 = Z_L0 + 0.2
      // 三出叶簇
      for (let k = 0; k < 3; k++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), k === 1 ? leafDeep : leafMat)
        leaf.scale.set(1.4, 0.28, 0.9)
        const ang = -0.7 + k * 0.7
        leaf.position.set(x + Math.sin(ang) * 0.06, y0 + 0.04, z + Math.cos(ang) * 0.04)
        leaf.rotation.set(0.5, ang + n * 0.2, 0.2)
        group.add(leaf)
      }
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), leafDeep)
      crown.position.set(x, y0 + 0.02, z)
      group.add(crown)
      if (n % 2 === 0) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), fruitMat)
        fruit.scale.set(0.85, 1.15, 0.85)
        fruit.position.set(x + 0.05, y0 - 0.01, z + 0.06)
        group.add(fruit)
      } else {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), flowerMat)
        flower.position.set(x - 0.04, y0 + 0.05, z + 0.05)
        group.add(flower)
      }
      n++
    }
  }
}

/** 东区三床：南床草莓槽栽，中/北床金线莲密植 */
function addEastCropBed(
  bed: { x0: number; x1: number; y0: number; y1: number },
  group: THREE.Group,
  bedIndex: number,
) {
  if (bedIndex === 0) addStrawberryBed(bed, group)
  else addAnoectochilusBed(bed, group)
}

function rebuildStructure(light: GhEffectiveLight) {
  if (!scene) return
  const L = Number(light.lengthM) || 16
  const W = Number(light.widthM) || 7
  const H = Number(light.ridgeHeightM) || 3.8
  const G = Number(light.gutterHeightM) || 2.8
  const key = `${L}x${W}x${H}-v1.5-ew`
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

  const site = new THREE.Group()
  site.userData.structure = true
  addSiteEnvironment(L, W, site)
  scene.add(site)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d4a40, metalness: 0.2, roughness: 0.6 })
  for (let i = 0; i < 9; i++) {
    const x = lx((i / 8) * L, L)
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
  BEDS_A.forEach((b) => addStackedCrops(mirrorBed(b, L), crops, true))
  BEDS_B.forEach((b, i) => addEastCropBed(mirrorBed(b, L), crops, i))
  scene.add(crops)

  const aisle = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.03, W * 0.92),
    new THREE.MeshStandardMaterial({ color: 0xa8b0a0, roughness: 0.88 }),
  )
  aisle.position.set(lx(8, L), 0.04, W / 2)
  aisle.userData.structure = true
  scene.add(aisle)

  // 棚内南北向作业道
  for (const x of [2.5, 5.5, 10.5, 13.5]) {
    const lane = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.02, W * 0.85),
      new THREE.MeshStandardMaterial({ color: 0x969e90, roughness: 0.9 }),
    )
    lane.position.set(lx(x, L), 0.035, W / 2)
    lane.userData.structure = true
    scene.add(lane)
  }

  // 南侧门斗暗示
  const doorPad = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.05, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x7a7568, roughness: 0.9 }),
  )
  doorPad.position.set(L / 2, 0.04, -0.55)
  doorPad.userData.structure = true
  scene.add(doorPad)
  for (const [cxLay, t] of [
    [4, '外遮阳卷轴·西'],
    [12, '外遮阳卷轴·东'],
  ] as const) {
    const cx = lx(cxLay, L)
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
    ['西 · 石斛双层', [lx(-1.5, L), 1.5, W / 2]],
    ['东 · 南草莓 / 北金线莲', [lx(L + 1.8, L), 1.5, W / 2]],
  ] as const) {
    const s = makeLabelSprite(t)
    s.position.set(p[0], p[1], p[2])
    s.userData.structure = true
    scene.add(s)
  }

  controls!.target.set(L / 2, 1.3, W / 2)
  camera?.position.set(L / 2, H * 1.9, -W * 1.05)
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

  // 布局东 = +layoutX；世界 X 已镜像，故东向取 −sin
  const towardSun = new THREE.Vector3(
    -Math.sin(azR) * Math.cos(elevR),
    Math.sin(elevR),
    Math.cos(azR) * Math.cos(elevR),
  ).normalize()
  // 入射光线方向：太阳 → 棚（与 towardSun 反向，平行光）
  const rayDir = towardSun.clone().negate()

  const center = new THREE.Vector3(L / 2, 1.2, W / 2)
  const dist = 22
  // 太阳、平行光、箭头必须在同一条直线上
  const sunPos = center.clone().addScaledVector(towardSun, dist)

  sunLight.position.copy(sunPos)
  sunLight.target.position.copy(center)
  if (!sunLight.target.parent) scene.add(sunLight.target)
  sunLight.target.updateMatrixWorld()
  sunLight.intensity = elev > 2 ? 0.4 + (elev / 90) * 1.25 : 0.06
  sunLight.color.set(elev > 15 ? 0xfff1c8 : elev > 2 ? 0xffc090 : 0x8899bb)

  if (hemiLight) {
    hemiLight.intensity = elev > 2 ? 0.45 + (elev / 90) * 0.25 : 0.18
    hemiLight.color.set(elev > 15 ? 0xd8ecff : elev > 2 ? 0xffd2a8 : 0x1a2740)
    hemiLight.groundColor.set(elev > 2 ? 0x6a7a55 : 0x2a3030)
  }

  if (skyDome) {
    const mat = skyDome.material as THREE.MeshBasicMaterial
    mat.map?.dispose()
    mat.map = makeSkyTexture(elev)
    mat.needsUpdate = true
  }
  const fogCol = elev < 2 ? 0x1a2740 : elev < 18 ? 0xf0c8a0 : 0xb8d4e8
  scene.background = new THREE.Color(fogCol)
  if (scene.fog instanceof THREE.Fog) scene.fog.color.set(fogCol)

  if (sunDisc) {
    sunDisc.visible = elev > -3
    sunDisc.position.copy(sunPos)
    sunDisc.scale.setScalar(elev > 2 ? 1 : 0.7)
    ;(sunDisc.material as THREE.MeshBasicMaterial).color.set(
      elev > 20 ? 0xfff0a8 : elev > 5 ? 0xffb060 : 0xff8060,
    )
  }

  if (elev > 1) {
    // 箭头紧贴太阳前方，沿 rayDir 指向棚心，保证与太阳—棚心共线
    const arrowLen = 8
    const arrowOrigin = sunPos.clone().addScaledVector(rayDir, 2.2)
    sunArrow = new THREE.ArrowHelper(rayDir, arrowOrigin, arrowLen, 0xffcc44, 0.5, 0.32)
    scene.add(sunArrow)
    const lab = makeLabelSprite(`日光 ${elev.toFixed(0)}°`, 2.8)
    lab.position.copy(arrowOrigin).addScaledVector(rayDir, arrowLen * 0.55).add(new THREE.Vector3(0, 0.7, 0))
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
    // 与 lx() 一致：布局 +X 东 → 画布镜像
    ctx.fillRect(nx - 1 - ix, iy, 1, 1)
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
  shadeClothA = updateShadeRoll(shadeClothA, lx(4, L), 7.6, W, zoneA ? closed : 0.15)
  shadeClothB = updateShadeRoll(shadeClothB, lx(12, L), 7.6, W, !zoneA ? closed : 0.15)

  if (lampGroup && sensorGroup) {
    while (lampGroup.children.length) lampGroup.remove(lampGroup.children[0])
    while (sensorGroup.children.length) sensorGroup.remove(sensorGroup.children[0])
    for (const d of light.devices || []) {
      if (d.posX == null || d.posY == null) continue
      const wx = lx(d.posX, L)
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
        bar.position.set(wx, z, d.posY)
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
        beam.position.set(wx, z - beamH / 2, d.posY)
        beam.rotation.x = Math.PI
        lampGroup.add(beam)
      } else if (d.deviceType === 'PAR_SENSOR') {
        const z = d.posZ ?? 0.9
        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12),
          new THREE.MeshStandardMaterial({ color: 0xdfeee4, emissive: 0x66aa88, emissiveIntensity: 0.35 }),
        )
        disc.position.set(wx, z, d.posY)
        sensorGroup.add(disc)
        const pin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6),
          new THREE.MeshStandardMaterial({ color: 0x889988 }),
        )
        pin.position.set(wx, z - 0.06, d.posY)
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
      <p class="hint">西·石斛双层；东·南草莓 / 北金线莲 · 棚周杂草与远树为环境示意</p>
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
  background: #b8d4e8;
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
