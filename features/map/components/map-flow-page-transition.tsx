'use client'

import type { ReactNode } from 'react'
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react'

const MAP_FLOW_MOTION_EASE = [0.22, 1, 0.36, 1] as const

export default function MapFlowPageTransition({
  children,
  step,
}: {
  children: ReactNode
  step: string
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        key={step}
        data-map-flow-step={step}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.38,
          ease: MAP_FLOW_MOTION_EASE,
        }}
        className="flex min-h-0 flex-1 overflow-hidden"
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}
