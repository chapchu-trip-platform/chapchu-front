'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { NoticeModal } from '@/components/ui/notice-modal'

interface Notice { message: string; returnFocus: HTMLElement | null }
type ShowNotice = (message: string, returnFocus?: HTMLElement | null) => void
const NoticeContext = createContext<ShowNotice | null>(null)

/** One modal per community screen, even when independent requests finish together. */
export function CommunityNoticeProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Notice[]>([])
  const fallbackFocus = useRef<HTMLDivElement>(null)
  const show = useCallback<ShowNotice>((message, returnFocus = null) => {
    setQueue(previous => [...previous, { message, returnFocus }])
  }, [])
  const close = useCallback(() => {
    const [current, ...remaining] = queue
    setQueue(remaining)
    if (!current || remaining.length > 0) return
    window.setTimeout(() => {
      const fallback = fallbackFocus.current?.querySelector<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? fallbackFocus.current
      const target = current.returnFocus?.isConnected && !current.returnFocus.matches(':disabled') ? current.returnFocus : fallback
      target?.focus({ preventScroll: true })
    }, 0)
  }, [queue])
  return <NoticeContext.Provider value={show}>
    <div ref={fallbackFocus} tabIndex={-1} aria-label="커뮤니티 화면" className="flex min-h-0 flex-1 flex-col outline-none">{children}</div>
    <NoticeModal message={queue[0]?.message ?? null} returnFocus={queue[0]?.returnFocus} fallbackFocus={fallbackFocus} onClose={close} />
  </NoticeContext.Provider>
}

export function useCommunityNotice() {
  const show = useContext(NoticeContext)
  if (!show) throw new Error('CommunityNoticeProvider is required for community actions.')
  return show
}
