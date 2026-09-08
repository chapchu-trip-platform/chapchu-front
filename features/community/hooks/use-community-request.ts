'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { communityErrorMessage } from '@/features/community/lib/community-model'
import { useCommunityNotice } from '@/features/community/components/community-notice-provider'

/** Callers key their view by resource/sort so drafts and responses cannot cross views. */
export function useCommunityQuery<T>(request: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const epoch = useAuthStore.getState().sessionEpoch
    const current = () => !controller.signal.aborted && epoch === useAuthStore.getState().sessionEpoch
    void request(controller.signal).then(value => {
      if (current()) { setData(value); setLoading(false) }
    }).catch((reason: unknown) => {
      if (current()) { setError(communityErrorMessage(reason)); setLoading(false) }
    })
    return () => controller.abort()
  }, [request, revision])

  const reload = () => {
    setLoading(true)
    setError(null)
    setData(null)
    setRevision(value => value + 1)
  }
  return { data, setData, error, loading, reload }
}

export function useCommunityAction() {
  const showNotice = useCommunityNotice()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const locked = useRef(false)
  const alive = useRef(false)
  const activeRequest = useRef<AbortController | null>(null)
  useEffect(() => { alive.current = true; return () => { alive.current = false; activeRequest.current?.abort() } }, [])

  async function run<T>(request: (context: { isCurrent: () => boolean; signal: AbortSignal }) => Promise<T>, onSuccess: (value: T) => void, message?: string | ((value: T) => string | undefined), errorMessage: (error: unknown) => string = communityErrorMessage) {
    if (locked.current) return
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    locked.current = true
    setBusy(true)
    setError(null)
    setNotice(null)
    const controller = new AbortController()
    activeRequest.current = controller
    const epoch = useAuthStore.getState().sessionEpoch
    const current = () => alive.current && !controller.signal.aborted && epoch === useAuthStore.getState().sessionEpoch
    try {
      const result = await request({ isCurrent: current, signal: controller.signal })
      if (current()) {
        onSuccess(result)
        const feedback = (typeof message === 'function' ? message(result) : message) ?? null
        setNotice(feedback)
        if (feedback) showNotice(feedback, returnFocus)
      }
    } catch (reason) {
      if (current() && !(reason instanceof DOMException && reason.name === 'AbortError')) {
        const feedback = errorMessage(reason)
        setError(feedback)
        showNotice(feedback, returnFocus)
      }
    } finally {
      locked.current = false
      if (current()) setBusy(false)
    }
  }
  const clearFeedback = () => { setError(null); setNotice(null) }
  return { busy, error, notice, run, clearFeedback }
}
