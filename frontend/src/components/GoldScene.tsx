import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Latar 3D halaman login: hamparan partikel champagne yang bergelombang pelan
 * seperti kain sutra, plus cincin tipis yang berputar. Ringan (satu draw call partikel).
 */
export default function GoldScene({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 1.5, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x0f172a, 6, 16)
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50)
    camera.position.set(0, 2.6, 8)
    camera.lookAt(0, 0, 0)

    // ---- Hamparan partikel ----
    const COLS = 180
    const ROWS = 110
    const positions = new Float32Array(COLS * ROWS * 3)
    const seeds = new Float32Array(COLS * ROWS)
    let i = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        positions[i * 3] = (c / (COLS - 1) - 0.5) * 18
        positions[i * 3 + 1] = 0
        positions[i * 3 + 2] = (r / (ROWS - 1) - 0.5) * 12
        seeds[i] = Math.random()
        i++
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

    const uniforms = {
      uTime: { value: 0 },
      uPixel: { value: renderer.getPixelRatio() },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uGold: { value: new THREE.Color('#D4B483') },
      uIvory: { value: new THREE.Color('#FAF8F3') },
    }
    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uPixel; uniform vec2 uMouse;
        attribute float aSeed;
        varying float vH; varying float vFade; varying float vSeed;
        void main() {
          vec3 p = position;
          float t = uTime * 0.35;
          float h = sin(p.x * 0.45 + t) * 0.45
                  + sin(p.z * 0.7 - t * 1.3) * 0.3
                  + sin((p.x + p.z) * 0.25 + t * 0.6) * 0.5;
          float d = distance(p.xz, uMouse * vec2(9.0, 6.0));
          h += exp(-d * d * 0.18) * 0.55 * sin(t * 3.0 - d);
          p.y = h;
          vH = h; vSeed = aSeed;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vFade = smoothstep(16.0, 4.0, -mv.z);
          gl_PointSize = (1.4 + aSeed * 1.6) * uPixel * (7.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uGold; uniform vec3 uIvory; uniform float uTime;
        varying float vH; varying float vFade; varying float vSeed;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          float tw = 0.65 + 0.35 * sin(uTime * 1.5 + vSeed * 40.0);
          vec3 col = mix(uGold, uIvory, smoothstep(0.4, 1.1, vH));
          gl_FragColor = vec4(col, a * vFade * tw * 0.85);
        }`,
    })
    const points = new THREE.Points(geo, mat)
    points.rotation.x = -0.05
    scene.add(points)

    // ---- Cincin emas tipis ----
    const ringGroup = new THREE.Group()
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd4b483, transparent: true, opacity: 0.55 })
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.008, 8, 220), ringMat)
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.005, 8, 220), ringMat.clone())
    ;(ringB.material as THREE.MeshBasicMaterial).opacity = 0.3
    ringA.rotation.x = Math.PI / 2.4
    ringB.rotation.x = Math.PI / 2.1
    ringB.rotation.y = 0.4
    ringGroup.add(ringA, ringB)
    ringGroup.position.set(1.8, 2.2, -1)
    scene.add(ringGroup)

    // ---- Resize ----
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    // ---- Mouse ----
    const target = new THREE.Vector2()
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      target.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove)

    // ---- Loop ----
    const clock = new THREE.Clock()
    let raf = 0
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible || document.hidden) return
      const t = reduce ? 0 : clock.getElapsedTime()
      uniforms.uTime.value = t
      uniforms.uMouse.value.lerp(target, 0.05)
      ringGroup.rotation.z = t * 0.08
      ringA.rotation.y = Math.sin(t * 0.3) * 0.15
      camera.position.x += (target.x * 0.6 - camera.position.x) * 0.03
      camera.position.y += (2.6 - target.y * 0.3 - camera.position.y) * 0.03
      camera.lookAt(0, 0.3, 0)
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      geo.dispose()
      mat.dispose()
      ringA.geometry.dispose()
      ringB.geometry.dispose()
      ringMat.dispose()
      ;(ringB.material as THREE.Material).dispose()
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={host} className={className} aria-hidden="true" />
}
