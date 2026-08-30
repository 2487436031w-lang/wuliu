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
let shadeMesh: THREE.Mesh | null = null
let lampGroup: THREE.Group | null = null
let sensorGroup: THREE.Group | null = null
let structureKey = ''
let raf = 0
let disposed = false

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
  scene.fog = new THREE.Fog(0xd8e6dc, 18, 42)

  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100)
  camera.position.set(10, 9, 14)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  el.innerHTML = ''
  el.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(6, 1.2, 3)
  controls.maxPolarAngle = Math.PI * 0.48

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const sun = new THREE.DirectionalLight(0xfff2d6, 0.85)
  sun.position.set(8, 14, 6)
  scene.add(sun)

  // ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 24),
    new THREE.MeshStandardMaterial({ color: 0x6b7a5a, roughness: 0.95 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
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

function rebuildStructure(light: GhEffectiveLight) {
  if (!scene) return
  const L = Number(light.lengthM) || 12
  const W = Number(light.widthM) || 6
  const H = Number(light.ridgeHeightM) || 3.6
  const G = Number(light.gutterHeightM) || 2.8
  const key = `${L}x${W}x${H}x${G}`
  if (key === structureKey) return
  structureKey = key

  const toRemove = scene.children.filter((c) => c.userData.structure)
  toRemove.forEach((c) => {
    scene!.remove(c)
    if (c instanceof THREE.Mesh) {
      c.geometry.dispose()
      const m = c.material
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m.dispose()
    }
  })

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d4a40, metalness: 0.2, roughness: 0.6 })
  const archCount = 6
  for (let i = 0; i < archCount; i++) {
    const x = (i / (archCount - 1)) * L
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.05, 0),
      new THREE.Vector3(x, G, W * 0.15),
      new THREE.Vector3(x, H, W * 0.5),
      new THREE.Vector3(x, G, W * 0.85),
      new THREE.Vector3(x, 0.05, W),
    ])
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.045, 6, false), frameMat)
    tube.userData.structure = true
    scene.add(tube)
  }
  for (const z of [0, W]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, 0.06), frameMat)
    rail.position.set(L / 2, G * 0.55, z)
    rail.userData.structure = true
    scene.add(rail)
  }

  // ridge purlins + end posts for clearer spatial greenhouse
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
      opacity: 0.12,
      roughness: 0.3,
      transmission: 0.55,
      thickness: 0.35,
    }),
  )
  skin.position.set(L / 2, H * 0.46, W / 2)
  skin.userData.structure = true
  scene.add(skin)

  // cultivation beds under canopy
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 })
  const bedCount = 3
  for (let i = 0; i < bedCount; i++) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(L * 0.88, 0.18, W * 0.18), bedMat)
    bed.position.set(L / 2, 0.18, W * (0.22 + i * 0.28))
    bed.userData.structure = true
    scene.add(bed)
  }

  controls!.target.set(L / 2, 1.1, W / 2)
  camera?.position.set(L * 0.85, H * 1.8, W * 2.1)
}

function updateHeatmap(light: GhEffectiveLight) {
  if (!scene) return
  const L = Number(light.lengthM) || 12
  const W = Number(light.widthM) || 6
  const nx = light.nx || 32
  const ny = light.ny || 16
  const grid = light.grid || []
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
    const [r, g, b] = ppfdColor(grid[i].ppfd, maxRef)
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
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    )
    heatMesh.rotation.x = -Math.PI / 2
    heatMesh.position.set(L / 2, 0.52, W / 2)
    scene.add(heatMesh)
  } else {
    ;(heatMesh.material as THREE.MeshBasicMaterial).map?.dispose()
    ;(heatMesh.material as THREE.MeshBasicMaterial).map = tex
    ;(heatMesh.material as THREE.MeshBasicMaterial).needsUpdate = true
  }

  // shade curtain
  const closed = 1 - (light.shadeOpenPercent ?? 100) / 100
  if (!shadeMesh) {
    shadeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(L * 0.96, W * 0.96),
      new THREE.MeshStandardMaterial({
        color: 0x2a332c,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide,
      }),
    )
    shadeMesh.rotation.x = -Math.PI / 2
    scene.add(shadeMesh)
  }
  shadeMesh.position.set(L / 2, (Number(light.ridgeHeightM) || 3.6) - 0.25, W / 2)
  ;(shadeMesh.material as THREE.MeshStandardMaterial).opacity = 0.05 + closed * 0.45

  if (lampGroup && sensorGroup) {
    while (lampGroup.children.length) lampGroup.remove(lampGroup.children[0])
    while (sensorGroup.children.length) sensorGroup.remove(sensorGroup.children[0])
    for (const d of light.devices || []) {
      if (d.posX == null || d.posY == null) continue
      if (d.deviceType === 'GROW_LAMP') {
        const dim = (d.dimmingPercent ?? 0) / 100
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.18 + dim * 0.08, 16, 16),
          new THREE.MeshStandardMaterial({
            color: 0xf0c14a,
            emissive: 0xf0c14a,
            emissiveIntensity: 0.3 + dim * 1.4,
          }),
        )
        bulb.position.set(d.posX, d.posZ ?? 2.2, d.posY)
        lampGroup.add(bulb)
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(0.55, 1.2, 16, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xffe08a,
            transparent: true,
            opacity: 0.08 + dim * 0.22,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        )
        beam.position.set(d.posX, (d.posZ ?? 2.2) - 0.7, d.posY)
        beam.rotation.x = Math.PI
        lampGroup.add(beam)
      } else if (d.deviceType === 'PAR_SENSOR') {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.14, 0.03, 8, 20),
          new THREE.MeshStandardMaterial({ color: 0xe8f2ea, emissive: 0x88aa99, emissiveIntensity: 0.4 }),
        )
        ring.rotation.x = Math.PI / 2
        ring.position.set(d.posX, (d.posZ ?? 0.5) + 0.05, d.posY)
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
  <div ref="hostRef" class="scene" aria-label="智慧光棚三维空间光场" />
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
