import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

type Kind = 'success' | 'error' | 'info'
interface Toast { id: number; kind: Kind; title: string; desc?: string }

const Ctx = createContext<{ toast: (kind: Kind, title: string, desc?: string) => void } | null>(null)

function ToastItem({ t, onClose }: { t: Toast; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.fromTo(ref.current, { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' })
  })
  const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? XCircle : Info
  const tone = t.kind === 'success' ? 'text-status-aktif' : t.kind === 'error' ? 'text-status-end' : 'text-champagne-600'
  return (
    <div ref={ref} role="status" className="pointer-events-auto flex w-[22rem] items-start gap-3 rounded-2xl border border-white/[.07] bg-panel/95 p-4 shadow-lift backdrop-blur">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{t.title}</p>
        {t.desc && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{t.desc}</p>}
      </div>
      <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-white/[.06] hover:text-ink" aria-label="Tutup">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const remove = (id: number) => setItems((s) => s.filter((x) => x.id !== id))
  const toast = useCallback((kind: Kind, title: string, desc?: string) => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s, { id, kind, title, desc }])
    setTimeout(() => remove(id), 4500)
  }, [])
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {items.map((t) => <ToastItem key={t.id} t={t} onClose={() => remove(t.id)} />)}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToast harus di dalam ToastProvider')
  return c.toast
}
