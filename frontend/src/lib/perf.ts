/**
 * Mode ringan (lite).
 * Aktif otomatis kalau browser tidak memakai GPU (hardware acceleration mati),
 * perangkat lemah, atau frame rate rendah. Bisa juga dinyalakan manual dari menu profil.
 * Saat aktif: efek blur kaca, animasi latar, dan objek 3D dimatikan.
 */
import { useSyncExternalStore } from 'react'

const KEY = 'cm_lite' // 'on' | 'off' | null (otomatis)
type Listener = () => void
const listeners = new Set<Listener>()
let lite = false
let reason = ''

function read(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

function apply(value: boolean, why: string) {
  lite = value
  reason = why
  document.documentElement.classList.toggle('lite', value)
  listeners.forEach((l) => l())
}

/** Cek apakah WebGL berjalan di GPU asli atau software (CPU). */
function softwareRenderer(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return true
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return /swiftshader|llvmpipe|software|basic render/i.test(name)
  } catch {
    return false
  }
}

/** Ukur frame rate selama ~1,5 detik. */
function measureFps(): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0
    const start = performance.now()
    const loop = (t: number) => {
      frames++
      if (t - start < 1500) requestAnimationFrame(loop)
      else resolve((frames * 1000) / (t - start))
    }
    requestAnimationFrame(loop)
  })
}

export async function initPerf() {
  const manual = read()
  if (manual === 'on') return apply(true, 'manual')
  if (manual === 'off') return apply(false, 'manual')

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return apply(true, 'reduced-motion')
  if (softwareRenderer()) return apply(true, 'no-gpu')

  const fps = await measureFps()
  if (fps < 40 && document.visibilityState === 'visible') apply(true, 'low-fps')
}

export function setLite(value: boolean | null) {
  try {
    if (value === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, value ? 'on' : 'off')
  } catch { /* abaikan */ }
  if (value === null) initPerf()
  else apply(value, 'manual')
}

export const isLite = () => lite
export const liteReason = () => reason

export function useLite(): boolean {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => lite,
  )
}
