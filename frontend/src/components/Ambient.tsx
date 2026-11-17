import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useLite } from '../lib/perf'

/** Latar belakang ambient: bola cahaya buram yang bergerak sangat pelan + grid halus. */
export default function Ambient() {
  const root = useRef<HTMLDivElement>(null)
  const lite = useLite()
  useGSAP(() => {
    if (lite) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.orb').forEach((el, i) => {
        gsap.to(el, {
          x: gsap.utils.random(-80, 80),
          y: gsap.utils.random(-60, 60),
          scale: gsap.utils.random(0.9, 1.15),
          duration: gsap.utils.random(14, 22),
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: i * 0.8,
        })
      })
    })
  }, { scope: root, dependencies: [lite], revertOnUpdate: true })

  return (
    <div ref={root} className="ambient" aria-hidden="true">
      <div className="orb" style={{ width: 620, height: 620, left: -180, top: -260, background: 'radial-gradient(circle, rgba(212,180,131,.30), transparent 65%)' }} />
      <div className="orb" style={{ width: 720, height: 720, right: -260, top: 120, background: 'radial-gradient(circle, rgba(45,72,128,.45), transparent 65%)' }} />
      <div className="orb" style={{ width: 520, height: 520, left: '35%', bottom: -320, background: 'radial-gradient(circle, rgba(29,121,72,.16), transparent 65%)' }} />
      <div className="grid-lines" />
    </div>
  )
}
