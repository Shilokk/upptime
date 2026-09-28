import type { Transition, Variants } from 'framer-motion'

/** Shared motion language: short, eased, and calm. Every UI transition stays at or under 400 ms. */
export type Bezier = [number, number, number, number]
export const EASE_OUT: Bezier = [0.22, 1, 0.36, 1]
export const EASE_IN_OUT: Bezier = [0.65, 0, 0.35, 1]
export const EASE_POP: Bezier = [0.34, 1.56, 0.64, 1]

/** Screen-level enter and exit (routes and identify stages). */
export function pageVariants(reduce: boolean): Variants {
  return {
    initial: { opacity: 0, y: reduce ? 0 : 14 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
    exit: { opacity: 0, y: reduce ? 0 : -8, transition: { duration: 0.16, ease: 'easeIn' } },
  }
}

/** Fade and rise into place after `delay` seconds. Spread onto a motion element. */
export function rise(delay = 0, reduce = false, distance = 12) {
  const transition: Transition = { duration: 0.32, ease: EASE_OUT, delay: reduce ? 0 : delay }
  return { initial: { opacity: 0, y: reduce ? 0 : distance }, animate: { opacity: 1, y: 0 }, transition }
}

/** Scroll whichever container holds `from` (the demo phone screen, or the window) back to the top. */
export function scrollContainerToTop(from?: Element | null): void {
  const scroller = from?.closest('.demo-scroller') as HTMLElement | null
  if (scroller) scroller.scrollTop = 0
  else if (typeof window !== 'undefined') window.scrollTo(0, 0)
}
