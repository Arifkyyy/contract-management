/**
 * Mode tampilan gelap / terang.
 * Disimpan di localStorage ('cm_theme'). Kalau belum pernah dipilih, pakai mode terang.
 * Atribut <html data-theme> sudah dipasang lebih awal oleh skrip kecil di index.html
 * supaya tidak ada kedipan saat halaman dibuka.
 */
import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'cm_theme'
const listeners = new Set<() => void>()

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

let theme: Theme = stored() ?? 'light'

function apply(next: Theme, animate: boolean) {
  theme = next
  const html = document.documentElement
  if (animate) {
    html.classList.add('theme-anim')
    window.setTimeout(() => html.classList.remove('theme-anim'), 400)
  }
  html.dataset.theme = next
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#F6F7F5' : '#0D1310')
  listeners.forEach((l) => l())
}

apply(theme, false)

export function setTheme(next: Theme) {
  try { localStorage.setItem(KEY, next) } catch { /* abaikan */ }
  apply(next, true)
}

export const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l) } },
    () => theme,
  )
}
