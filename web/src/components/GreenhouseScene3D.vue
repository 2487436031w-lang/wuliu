<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
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
let lampGroup: THREE.Group | null = null
let sensorGroup: THREE.Group | null = null
let structureKey = ''
let raf = 0
let disposed = false

/** v1.1 高架床 */
const BEDS_A = [
  { x0: 0.5, x1: 7.5, y0: 1.0, y1: 1.8, crop: 'pot' as const },
  { x0: 0.5, x1: 7.5, y0: 3.1, y1: 3.9, crop: 'pot' as const },
  { x0: 0.5, x1: 7.5, y0: 5.2, y1: 6.0, crop: 'pot' as const },
]
const BEDS_B = [
  { x0: 8.5, x1: 15.5, y0: 1.0, y1: 1.8, crop: 'mat' as const },
  { x0: 8.5, x1: 15.5, y0: 3.1, y1: 3.9, crop: 'mat' as const },
  { x0: 8.5, x1: 15.5, y0: 5.2, y1: 6.0, crop: 'mat' as const },
]
const Z_BED = 0.55

function ppfdColor(v: number, maxRef: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v / Math.max(maxRef, 1)))
  return [
    Math.round(18 + t * 210),
    Math.round(48 + t * 140),
    Math.round(42 + (1 - t) * 40),
  ]
}

function makeShadeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1e2822'
  ctx.fillRect(0, 0, 64, 64)
  ctx.strokeStyle = '#3a4a40'
  ctx.lineWidth = 1
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
  tex.repeat.set(12, 8)
  return tex
}

function buildScene(el: HTMLDivElement) {
  const w = el.clientWidth || 800
  const h = el.clientHeight || 420
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xd8e6dc)
  scene.fog = new THREE.Fog(0xd8e6dc, 22, 48)

  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100)
  camera.position.set(12, 10, 16)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  el.innerHTML = ''
  el.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(8, 1.2, 3.5)
  controls.maxPolarAngle = Math.PI * 0.48

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const sun = new THREE.DirectionalLight(0xfff2d6, 0.95)
  sun.position.set(2, 12, -10)
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xdde8f0, 0.25)
  fill.position.set(-4, 6, 8)
  scene.add(fill)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(48, 28),
    new THREE.MeshStandardMaterial({ color: 0x6b7a5a, roughness: 0.95 }),
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  lampGroup = new THREE.Group()
  sensorGroup = new THREE.Group()
  scene.add(lampGroup)
  scene.add(sensorGroup)

  const loop = () => {
    if (disposed) return
    raf = requestAnimationFrame(loop)
    controls?.update()
    if (renderer && scene && camera) renderer.render(scene, camera)
  }
  loop()
}

function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 320, 64)
  ctx.fillStyle = 'rgba(16,32,24,0.72)'
  ctx.fillRect(8, 12, 304, 40)
  ctx.fillStyle = '#e8f2ea'
  ctx.font = '600 20px "Source Sans 3", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, 160, 40)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const spr = new THREE.Sprite(mat)
  spr.scale.set(3.6, 0.72, 1)
  return spr
}

function addCropPots(bed: (typeof BEDS_A)[0], parent: THREE.Group) {
  const potMat = new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.85 })
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d7a52, roughness: 0.7 })
  const x0 = bed.x0 + 0.35
  const x1 = bed.x1 - 0.35
  for (let x = x0; x <= x1; x += 0.55) {
    for (const row of [0.28, 0.52]) {
      const z = bed.y0 + (bed.y1 - bed.y0) * row
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8), potMat)
      pot.position.set(x, Z_BED + 0.06, z)
      parent.add(pot)
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 6), leafMat)
      leaf.position.set(x, Z_BED + 0.28, z)
      parent.add(leaf)
    }
  }
}

function addCropMat(bed: (typeof BEDS_B)[0], parent: THREE.Group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x2f5d3a, roughness: 0.9 })
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(bed.x1 - bed.x0 - 0.15, 0.06, bed.y1 - bed.y0 - 0.12),
    mat,
  )
  pad.position.set((bed.x0 + bed.x1) / 2, Z_BED + 0.08, (bed.y0 + bed.y1) / 2)
  parent.add(pad)
}

function rebuildStructure(light: GhEffectiveLight) {
  if (!scene) return
  const L = Number(light.lengthM) || 16
  const W = Number(light.widthM) || 7
  const H = Number(light.ridgeHeightM) || 3.8
  const G = Number(light.gutterHeightM) || 2.8
  const key = `${L}x${W}x${H}x${G}-v1.1`
  if (key === structureKey) return
  structureKey = key

  const toRemove = scene.children.filter((c) => c.userData.structure)
  toRemove.forEach((c) => {
    scene!.remove(c)
    c.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const m = obj.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
      }
      if (obj instanceof THREE.Sprite) {
        const m = obj.material as THREE.SpriteMaterial
        m.map?.dispose()
        m.dispose()
      }
    })
  })

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d4a40, metalness: 0.2, roughness: 0.6 })
  const archCount = 9
  for (let i = 0; i < archCount; i++) {
    const x = (i / (archCount - 1)) * L
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
  for (const z of [0, W]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, 0.06), frameMat)
    rail.position.set(L / 2, G * 0.55, z)
    rail.userData.structure = true
    scene.add(rail)
  }

  const skin = new THREE.Mesh(
    new THREE.BoxGeometry(L * 0.98, H * 0.92, W * 0.98),
    new THREE.MeshPhysicalMaterial({
      color: 0xe8f4ec,
      transparent: true,
      opacity: 0.1,
      roughness: 0.3,
      transmission: 0.55,
      thickness: 0.35,
    }),
  )
  skin.position.set(L / 2, H * 0.46, W / 2)
  skin.userData.structure = true
  scene.add(skin)

  const cropGroup = new THREE.Group()
  cropGroup.userData.structure = true
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 })
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a3030, metalness: 0.4, roughness: 0.5 })
  for (const b of [...BEDS_A, ...BEDS_B]) {
    const bw = b.x1 - b.x0
    const bd = b.y1 - b.y0
    const top = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.08, bd), bedMat)
    top.position.set((b.x0 + b.x1) / 2, Z_BED, (b.y0 + b.y1) / 2)
    cropGroup.add(top)
    for (const [ox, oz] of [
      [-bw / 2 + 0.1, -bd / 2 + 0.1],
      [bw / 2 - 0.1, -bd / 2 + 0.1],
      [-bw / 2 + 0.1, bd / 2 - 0.1],
      [bw / 2 - 0.1, bd / 2 - 0.1],
    ] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, Z_BED, 6), legMat)
      leg.position.set((b.x0 + b.x1) / 2 + ox, Z_BED / 2, (b.y0 + b.y1) / 2 + oz)
      cropGroup.add(leg)
    }
    if (b.crop === 'pot') addCropPots(b, cropGroup)
    else addCropMat(b, cropGroup)
  }

  // A 区 L1 炼苗搁架（中/北床上方）
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x6a7a6e, roughness: 0.7 })
  for (const b of [BEDS_A[1], BEDS_A[2]]) {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(b.x1 - b.x0 - 0.4, 0.04, b.y1 - b.y0 - 0.1),
      shelfMat,
    )
    shelf.position.set((b.x0 + b.x1) / 2, 1.25, (b.y0 + b.y1) / 2)
    cropGroup.add(shelf)
    for (let i = 0; i < 6; i++) {
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.06, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xc5d4c8 }),
      )
      tray.position.set(b.x0 + 0.8 + i * 0.95, 1.3, (b.y0 + b.y1) / 2)
      cropGroup.add(tray)
    }
  }
  scene.add(cropGroup)

  const aisle = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.02, W * 0.92),
    new THREE.MeshStandardMaterial({ color: 0x8a9580, roughness: 0.95 }),
  )
  aisle.position.set(8.0, 0.02, W / 2)
  aisle.userData.structure = true
  scene.add(aisle)

  // 北侧外遮阳卷轴盒
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x2c3330, metalness: 0.3, roughness: 0.55 })
  for (const [cx, label] of [
    [4, '外遮阳·西半'],
    [12, '外遮阳·东半'],
  ] as const) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.18, 0.22), boxMat)
    box.position.set(cx, 3.55, W - 0.15)
    box.userData.structure = true
    scene.add(box)
    const spr = makeLabelSprite(label)
    spr.position.set(cx, 3.85, W - 0.15)
    spr.userData.structure = true
    scene.add(spr)
  }

  const south = makeLabelSprite('南 · 采光主面')
  south.position.set(L / 2, 0.7, -0.9)
  south.userData.structure = true
  scene.add(south)
  const north = makeLabelSprite('北 · 遮阳卷轴')
  north.position.set(L / 2, 0.7, W + 0.9)
  north.userData.structure = true
  scene.add(north)
  const west = makeLabelSprite('西 · 石斛双层')
  west.position.set(-1.4, 1.4, W / 2)
  west.userData.structure = true
  scene.add(west)
  const east = makeLabelSprite('东 · 金线莲/草莓')
  east.position.set(L + 1.4, 1.4, W / 2)
  east.userData.structure = true
  scene.add(east)

  controls!.target.set(L / 2, 1.2, W / 2)
  camera?.position.set(L * 0.7, H * 1.85, -W * 0.65)
}

function updateShadeRoll(mesh: THREE.Mesh | null, xCenter: number, span: number, W: number, closed: number) {
  if (!scene) return mesh
  if (!mesh) {
    mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(span, W * 0.9, 1, 1),
      new THREE.MeshStandardMaterial({
        map: makeShadeTexture(),
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    mesh.rotation.x = -Math.PI / 2
    scene.add(mesh)
  }
  // 自北向南展开：closed=0 缩在北侧；closed=1 满幅
  const coverDepth = Math.max(0.08, W * 0.9 * closed)
  mesh.scale.set(1, 1, Math.max(0.02, closed))
  mesh.position.set(xCenter, 3.45, W - 0.2 - coverDepth / 2)
  ;(mesh.material as THREE.MeshStandardMaterial).opacity = 0.15 + closed * 0.55
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
  const maxRef = Math.max(light.recipe?.ppfdHardMax ?? 200, ...grid.map((g) => g.ppfd), 1)

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
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace

  const needNew =
    !heatMesh ||
    Math.abs((heatMesh.geometry as THREE.PlaneGeometry).parameters.width - L) > 0.01 ||
    Math.abs((heatMesh.geometry as THREE.PlaneGeometry).parameters.height - W) > 0.01

  if (needNew) {
    if (heatMesh) {
      scene.remove(heatMesh)
      heatMesh.geometry.dispose()
      ;(heatMesh.material as THREE.MeshBasicMaterial).map?.dispose()
      ;(heatMesh.material as THREE.MeshBasicMaterial).dispose()
    }
    heatMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(L, W),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
    )
    heatMesh.rotation.x = -Math.PI / 2
    heatMesh.position.set(L / 2, measureZ, W / 2)
    scene.add(heatMesh)
  } else {
    heatMesh.position.y = measureZ
    ;(heatMesh.material as THREE.MeshBasicMaterial).map?.dispose()
    ;(heatMesh.material as THREE.MeshBasicMaterial).map = tex
    ;(heatMesh.material as THREE.MeshBasicMaterial).needsUpdate = true
  }

  const closed = 1 - (light.shadeOpenPercent ?? 100) / 100
  const zoneA = light.zoneId === 'ZONE-A'
  shadeClothA = updateShadeRoll(shadeClothA, 4, 7.6, W, zoneA ? closed : 0.12)
  shadeClothB = updateShadeRoll(shadeClothB, 12, 7.6, W, !zoneA ? closed : 0.12)

  if (lampGroup && sensorGroup) {
    while (lampGroup.children.length) lampGroup.remove(lampGroup.children[0])
    while (sensorGroup.children.length) sensorGroup.remove(sensorGroup.children[0])
    for (const d of light.devices || []) {
      if (d.posX == null || d.posY == null) continue
      if (d.deviceType === 'GROW_LAMP') {
        const dim = (d.dimmingPercent ?? 0) / 100
        const z = d.posZ ?? 1.45
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.06, 0.12),
          new THREE.MeshStandardMaterial({
            color: 0x2a2e2c,
            emissive: 0xf0c14a,
            emissiveIntensity: 0.2 + dim * 1.2,
          }),
        )
        bar.position.set(d.posX, z, d.posY)
        lampGroup.add(bar)
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(0.55, Math.max(0.4, z - measureZ), 16, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xffe08a,
            transparent: true,
            opacity: 0.06 + dim * 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        )
        beam.position.set(d.posX, (z + measureZ) / 2, d.posY)
        beam.rotation.x = Math.PI
        lampGroup.add(beam)
      } else if (d.deviceType === 'PAR_SENSOR') {
        const stand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6),
          new THREE.MeshStandardMaterial({ color: 0x889988 }),
        )
        const z = d.posZ ?? 0.9
        stand.position.set(d.posX, z - 0.02, d.posY)
        sensorGroup.add(stand)
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.1, 0.025, 8, 20),
          new THREE.MeshStandardMaterial({ color: 0xe8f2ea, emissive: 0x88aa99, emissiveIntensity: 0.45 }),
        )
        ring.rotation.x = Math.PI / 2
        ring.position.set(d.posX, z + 0.04, d.posY)
        sensorGroup.add(ring)
      }
    }
  }
}

function apply(light: GhEffectiveLight | null) {
  if (!light || !scene) return
  rebuildStructure(light)
  updateHeatmap(light)
}

function onResize() {
  const host = hostRef.value
  if (!host || !camera || !renderer) return
  const w = host.clientWidth
  const h = host.clientHeight
  camera.aspect = w / Math.max(h, 1)
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
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
  <div ref="hostRef" class="scene" aria-label="智慧光棚三维空间 · cq-demo-bay-v1.1" />
</template>

<style scoped>
.scene {
  width: 100%;
  height: min(52vh, 520px);
  min-height: 360px;
  border-radius: 4px;
  overflow: hidden;
  background: #d8e6dc;
}
</style>
