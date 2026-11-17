import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

/**
 * Objek 3D kecil untuk kartu utama dashboard: kristal champagne metalik
 * dikelilingi dua cincin tipis. Ringan, berhenti render saat tidak terlihat.
 */
export default function HeroObject({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 1.5, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50)
    camera.position.set(0, 0, 8.2)

    const group = new THREE.Group()
    scene.add(group)

    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xd4b483, metalness: 1, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2, flatShading: true,
    })
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), gold)
    group.add(gem)

    const ringMat = new THREE.MeshPhysicalMaterial({ color: 0xeadab9, metalness: 1, roughness: 0.3 })
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.025, 16, 160), ringMat)
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.012, 16, 160), ringMat)
    ring1.rotation.set(Math.PI / 2.6, 0.3, 0)
    ring2.rotation.set(Math.PI / 2.1, -0.4, 0.2)
    group.add(ring1, ring2)

    // titik-titik kecil mengorbit
    const dotsGeo = new THREE.BufferGeometry()
    const N = 90
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const r = 2.25 + (Math.random() - 0.5) * 0.25
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.15
      pos[i * 3 + 2] = Math.sin(a) * r
    }
    dotsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const dots = new THREE.Points(dotsGeo, new THREE.PointsMaterial({ color: 0xf3e4c4, size: 0.035, transparent: true, opacity: 0.8 }))
    dots.rotation.copy(ring2.rotation)
    group.add(dots)

    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(3, 4, 5)
    scene.add(key, new THREE.AmbientLight(0x8899cc, 0.4))

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const pointer = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)

    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)
    const clock = new THREE.Clock()
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible || document.hidden) return
      const t = reduce ? 0 : clock.getElapsedTime()
      gem.rotation.y = t * 0.35
      gem.rotation.x = Math.sin(t * 0.4) * 0.3
      group.position.y = Math.sin(t * 0.8) * 0.08
      ring1.rotation.z = t * 0.15
      dots.rotation.y = t * 0.1
      group.rotation.y += (pointer.x * 0.35 - group.rotation.y) * 0.04
      group.rotation.x += (pointer.y * 0.2 - group.rotation.x) * 0.04
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      ;[gem.geometry, ring1.geometry, ring2.geometry, dotsGeo].forEach((g) => g.dispose())
      ;[gold, ringMat, dots.material as THREE.Material].forEach((m) => m.dispose())
      envRT.dispose()
      pmrem.dispose()
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={host} className={className} aria-hidden="true" />
}
