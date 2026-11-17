import axios, { AxiosError } from 'axios'

const TOKEN_KEY = 'cm_token'

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t) } catch { /* abaikan */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* abaikan */ }
  },
}

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' })

api.interceptors.request.use((config) => {
  const t = tokenStore.get()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      tokenStore.clear()
      if (!location.pathname.startsWith('/login')) location.href = '/login?expired=1'
    }
    return Promise.reject(err)
  },
)

/** Ambil pesan error yang ramah dari response FastAPI. */
export function errMsg(e: unknown, fallback = 'Terjadi kesalahan, coba lagi'): string {
  const err = e as AxiosError<{ detail?: unknown }>
  const d = err?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg).replace('Value error, ', '')
  if (err?.code === 'ERR_NETWORK') return 'Server tidak bisa dihubungi. Pastikan backend sudah berjalan.'
  return fallback
}

/** Download file (export / file kontrak) lewat axios supaya token ikut terkirim. */
export async function downloadBlob(url: string, params?: Record<string, unknown>, fallbackName = 'file') {
  const res = await api.get(url, { params, responseType: 'blob' })
  const cd = res.headers['content-disposition'] as string | undefined
  const match = cd?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  const name = match ? decodeURIComponent(match[1]) : fallbackName
  const href = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
