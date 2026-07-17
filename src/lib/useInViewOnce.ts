import { useEffect, useRef, useState } from 'react'

/**
 * True once the element has entered the viewport — checked immediately on
 * mount and again on every scroll/resize. Deliberately listener-based
 * instead of IntersectionObserver: IO callbacks are delivered with the
 * render-frame pipeline, which throttled embedded browsers starve, while
 * scroll events keep firing everywhere. Flips to true exactly once.
 */
export default function useInViewOnce<T extends HTMLElement>(margin = 0.92) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const check = () => {
      const el = ref.current
      if (!el) return false
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (r.top < vh * margin && r.bottom > 0) {
        setInView(true)
        return true
      }
      return false
    }
    if (check()) return

    // scroll/resize for instant response + a slow poll as the safety net
    // (covers viewport changes that never dispatch events)
    const poll = window.setInterval(() => {
      if (check()) detach()
    }, 500)
    const onMove = () => {
      if (check()) detach()
    }
    const detach = () => {
      clearInterval(poll)
      window.removeEventListener('scroll', onMove)
      window.removeEventListener('resize', onMove)
    }
    window.addEventListener('scroll', onMove, { passive: true })
    window.addEventListener('resize', onMove)
    return detach
  }, [inView, margin])

  return { ref, inView }
}
