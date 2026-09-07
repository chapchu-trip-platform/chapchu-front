'use client'

import { useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function readReducedMotionPreference() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  return mediaQuery && typeof mediaQuery.matches === 'boolean' ? mediaQuery.matches : true
}

function subscribeToReducedMotionPreference(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  if (!mediaQuery || typeof mediaQuery.matches !== 'boolean') return () => undefined

  mediaQuery.addEventListener?.('change', onChange)
  return () => mediaQuery.removeEventListener?.('change', onChange)
}

function readServerReducedMotionPreference() {
  return true
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotionPreference,
    readReducedMotionPreference,
    readServerReducedMotionPreference,
  )
}
