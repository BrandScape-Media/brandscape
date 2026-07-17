import { useEffect, useRef, useState } from 'react'
import useInViewOnce from '../../lib/useInViewOnce'

/**
 * A number that counts up from 0 when it scrolls into view, easing out as
 * it lands. Interval-driven rather than rAF so it also animates inside
 * throttled embedded browsers. Honors prefers-reduced-motion (jumps to
 * the final value).
 */
export default function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1500,
  className,
}: {
  to: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const [value, setValue] = useState(0)
  const { ref, inView } = useInViewOnce<HTMLSpanElement>()
  const started = useRef(false)

  useEffect(() => {
    if (!inView || started.current) return
    started.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to)
      return
    }
    const t0 = Date.now()
    const timer = window.setInterval(() => {
      const p = Math.min((Date.now() - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(to * eased)
      if (p >= 1) clearInterval(timer)
    }, 33)
    return () => clearInterval(timer)
  }, [inView, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  )
}
