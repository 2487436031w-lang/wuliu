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
let shadeMeshA: THREE.Mesh | null = null
let shadeMeshB: THREE.Mesh | null = null
let lampGroup: THREE.Group | null = null
let sensorGroup: THREE.Group | null = null
let structureKey = ''
let raf = 0
let disposed = false

/** 布局床位（cq-demo-bay-v1）：两区各三床，Y 南北 */
const BEDS = [
  { x0: 0.5, x1: 7.5, y0: 1.0, y1: 1.8 },
  { x0: 0.5, x1: 7.5, y0: 3.1, y1: 3.9 },
  { x0: 0.5, x1: 7.5, y0: 5.2, y1: 6.0 },
  { x0: 8.5, x1: 15.5, y0: 1.0, y1: 1.8 },
  { x0: 8.5, x1: 15.5, y0: 3.1, y1: 3.9 },
  { x0: 8.5, x1: 15.5, y0: 5.2, y1: 6.0 },
]

function ppfdColor(v: number, maxRef: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v / Math.max(maxRef, 1)))
  return [
    Math.round(18 + t * 210),
    Math.round(48 + t * 140),
    Math.round(42 + (1 - t) * 40),
  ]
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
  // 正午光自南（布局 +Y=北 → Three Z=北；南向光 = −Z）
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
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 256, 64)
  ctx.fillStyle = 'rgba(16,32,24,0.72)'
  ctx.fillRect(8, 12, 240, 40)
  ctx.fillStyle = '#e8f2ea'
  ctx.font = '600 22px "Source Sans 3", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, 128, 40)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const spr = new THREE.Sprite(mat)
  spr.scale.set(3.2, 0.8, 1)
  return spr
}

function rebuildStructure(light: GhEffectiveLight) {
  if (!scene) return
  const L = Number(light.lengthM) || 16
  const W = Number(light.widthM) || 7
  const H = Number(light.ridgeHeightM) || 3.8
  const G = Number(light.gutterHeightM) || 2.8
  const key = `${L}x${W}x${H}x${G}-v1`
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
  for (const z of [W * 0.25, W * 0.5, W * 0.75]) {
    const purlin = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, 0.04), frameMat)
    purlin.position.set(L / 2, H - 0.15 - Math.abs(z - W * 0.5) * 0.2, z)
    purlin.userData.structure = true
    scene.add(purlin)
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

  // 栽培床：布局真源尺寸（非均分假床）
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 })
  for (const b of BEDS) {
    const bw = b.x1 - b.x0
    const bd = b.y1 - b.y0
    const bed = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.2, bd), bedMat)
    bed.position.set((b.x0 + b.x1) / 2, 0.2, (b.y0 + b.y1) / 2)
    bed.userData.structure = true
    scene.add(bed)
  }

  // 中央通道示意
  const aisle = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.02, W * 0.92),
    new THREE.MeshStandardMaterial({ color: 0x8a9580, roughness: 0.95 }),
  )
  aisle.position.set(8.0, 0.02, W / 2)
  aisle.userData.structure = true
  scene.add(aisle)

  // 南向采光指示（布局 Y≈0 为南）
  const south = makeLabelSprite('南 · 采光')
  south.position.set(L / 2, 0.55, -0.85)
  south.userData.structure = true
  scene.add(south)
  const north = makeLabelSprite('北')
  north.position.set(L / 2, 0.55, W + 0.85)
  north.userData.structure = true
  scene.add(north)
  const west = makeLabelSprite('西 · ZONE-A')
  west.position.set(-1.2, 1.2, W / 2)
  west.userData.structure = true
  scene.add(west)
  const east = makeLabelSprite('东 · ZONE-B')
  east.position.set(L + 1.2, 1.2, W / 2)
  east.userData.structure = true
  scene.add(east)

  controls!.target.set(L / 2, 1.1, W / 2)
  camera?.position.set(L * 0.72, H * 2.0, -W * 0.55)
}

function updateHeatmap(light: GhEffectiveLight) {
  if (!scene) return
  const L = Number(light.lengthM) || 16
  const W = Number(light.widthM) || 7
  const nx = light.nx || 32
  const ny = light.ny || 14
  const grid = light.grid || []
  const measureZ = Number(light.measurePlaneZ) || 0.5
  const maxRef = Math.max(
    light.recipe?.ppfdHardMax ?? 200,
    ...grid.map((g) => g.ppfd),
    1,
  )

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
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
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
  const shadeY = (Number(light.ridgeHeightM) || 3.8) - 0.3
  const ensureShade = (mesh: THREE.Mesh | null, xCenter: number, span: number): THREE.Mesh => {
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(span, W * 0.92),
        new THREE.MeshStandardMaterial({
          color: 0x2a332c,
          transparent: true,
          opacity: 0.05,
          side: THREE.DoubleSide,
        }),
      )
      mesh.rotation.x = -Math.PI / 2
      scene!.add(mesh)
    }
    mesh.position.set(xCenter, shadeY, W / 2)
    ;(mesh.material as THREE.MeshStandardMaterial).opacity = 0.05 + closed * 0.42
    return mesh
  }
  // 半跨外遮阳：西 0–8 / 东 8–16（当前区开度驱动本区帘；另一半保持轻遮示意）
  const zoneA = light.zoneId === 'ZONE-A'
  shadeMeshA = ensureShade(shadeMeshA, 4, 7.6)
  shadeMeshB = ensureShade(shadeMeshB, 12, 7.6)
  ;(shadeMeshA.material as THREE.MeshStandardMaterial).opacity = zoneA
    ? 0.05 + closed * 0.45
    : 0.08
  ;(shadeMeshB.material as THREE.MeshStandardMaterial).opacity = !zoneA
    ? 0.05 + closed * 0.45
    : 0.08

  if (lampGroup && sensorGroup) {
    while (lampGroup.children.length) lampGroup.remove(lampGroup.children[0])
    while (sensorGroup.children.length) sensorGroup.remove(sensorGroup.children[0])
    for (const d of light.devices || []) {
      if (d.posX == null || d.posY == null) continue
      if (d.deviceType === 'GROW_LAMP') {
        const dim = (d.dimmingPercent ?? 0) / 100
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.16 + dim * 0.08, 16, 16),
          new THREE.MeshStandardMaterial({
            color: 0xf0c14a,
            emissive: 0xf0c14a,
            emissiveIntensity: 0.3 + dim * 1.4,
          }),
        )
        bulb.position.set(d.posX, d.posZ ?? 2.3, d.posY)
        lampGroup.add(bulb)
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1.1, 16, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xffe08a,
            transparent: true,
            opacity: 0.08 + dim * 0.22,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        )
        beam.position.set(d.posX, (d.posZ ?? 2.3) - 0.65, d.posY)
        beam.rotation.x = Math.PI
        lampGroup.add(beam)
      } else if (d.deviceType === 'PAR_SENSOR') {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.12, 0.028, 8, 20),
          new THREE.MeshStandardMaterial({ color: 0xe8f2ea, emissive: 0x88aa99, emissiveIntensity: 0.4 }),
        )
        ring.rotation.x = Math.PI / 2
        ring.position.set(d.posX, (d.posZ ?? 0.5) + 0.04, d.posY)
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
  <div ref="hostRef" class="scene" aria-label="智慧光棚三维空间光场 cq-demo-bay-v1" />
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
