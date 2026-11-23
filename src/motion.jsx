import React, { useEffect, useRef, useState } from 'react'

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// True once the element has scrolled into view (fires once).
export function useInView(threshold = 0.2) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      setInView(true)
      return undefined
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, { threshold })
    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView]
}

const easeOutCubic = (t) => 1 - (1 - t) ** 3

// Animates from the previous value to the new one (from 0 on first show).
export function useCountUp(target, { duration = 1100, start = true } = {}) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0)
  const fromRef = useRef(prefersReducedMotion() ? target : 0)
  useEffect(() => {
    if (!start || !Number.isFinite(target)) return undefined
    if (prefersReducedMotion()) {
      setValue(target)
      fromRef.current = target
      return undefined
    }
    const from = fromRef.current
    let frame
    const began = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - began) / duration, 1)
      const next = from + (target - from) * easeOutCubic(progress)
      setValue(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      fromRef.current = target
    }
  }, [target, duration, start])
  return value
}

export function AnimatedNumber({ value, format, duration, start = true, className }) {
  const shown = useCountUp(value, { duration, start })
  return <span className={`anim-num ${className || ''}`}>{format(shown)}</span>
}
